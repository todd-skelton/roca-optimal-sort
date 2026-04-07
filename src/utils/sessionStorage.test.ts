import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, loadSession, saveSession, type PersistedSessionV1 } from './sessionStorage'
import { makeCard, makeParsedFile } from '../test/fixtures'

interface MockRequest<T> {
  result: T
  error: Error | null
  onsuccess: null | (() => void)
  onerror: null | (() => void)
  onupgradeneeded?: null | (() => void)
}

function createIndexedDbMock() {
  const records = new Map<string, unknown>()
  let hasStore = false

  const createTransaction = () => {
    const transaction = {
      error: null as Error | null,
      oncomplete: null as null | (() => void),
      onerror: null as null | (() => void),
      onabort: null as null | (() => void),
      objectStore: () => ({
        get: (key: string) => {
          const request: MockRequest<unknown> = {
            result: undefined,
            error: null,
            onsuccess: null,
            onerror: null,
          }

          queueMicrotask(() => {
            request.result = records.get(key)
            request.onsuccess?.()
            transaction.oncomplete?.()
          })

          return request
        },
        put: (value: { id: string; value: unknown }) => {
          queueMicrotask(() => {
            records.set(value.id, value)
            transaction.oncomplete?.()
          })
        },
        delete: (key: string) => {
          queueMicrotask(() => {
            records.delete(key)
            transaction.oncomplete?.()
          })
        },
      }),
    }

    return transaction
  }

  const database = {
    objectStoreNames: {
      contains: (name: string) => hasStore && name === 'session-store',
    },
    createObjectStore: () => {
      hasStore = true
      return {}
    },
    transaction: () => createTransaction(),
    close: () => {},
  }

  return {
    records,
    indexedDB: {
      open: () => {
        const request: MockRequest<typeof database> = {
          result: database,
          error: null,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
        }

        queueMicrotask(() => {
          if (!hasStore) {
            request.onupgradeneeded?.()
          }
          request.onsuccess?.()
        })

        return request
      },
    },
  }
}

function makeSession(): PersistedSessionV1 {
  return {
    version: 1,
    files: [
      makeParsedFile({
        fileName: 'stack.csv',
        cards: [makeCard({ number: 'SET-001', setId: 'SET', quantity: 3 })],
      }),
    ],
    hasComputedResults: true,
  }
}

describe('sessionStorage', () => {
  beforeEach(() => {
    delete (globalThis as { indexedDB?: unknown }).indexedDB
  })

  it('saves, loads, and clears a valid persisted session', async () => {
    const mock = createIndexedDbMock()
    globalThis.indexedDB = mock.indexedDB as unknown as typeof indexedDB
    const session = makeSession()

    await saveSession(session)
    await expect(loadSession()).resolves.toEqual(session)

    await clearSession()
    await expect(loadSession()).resolves.toBeNull()
  })

  it('returns null when IndexedDB is unavailable', async () => {
    await expect(loadSession()).resolves.toBeNull()
    await expect(saveSession(makeSession())).resolves.toBeUndefined()
    await expect(clearSession()).resolves.toBeUndefined()
  })

  it('ignores malformed saved records', async () => {
    const mock = createIndexedDbMock()
    globalThis.indexedDB = mock.indexedDB as unknown as typeof indexedDB
    mock.records.set('current-session', {
      id: 'current-session',
      value: { version: 99, files: [], hasComputedResults: 'yes' },
    })

    await expect(loadSession()).resolves.toBeNull()
  })
})
