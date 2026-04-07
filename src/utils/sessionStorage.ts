import type { CardRow, ParsedFile } from '../types'

const DATABASE_NAME = 'roca-optimal-sort'
const DATABASE_VERSION = 1
const STORE_NAME = 'session-store'
const SESSION_KEY = 'current-session'

export interface PersistedSessionV1 {
  version: 1
  files: ParsedFile[]
  hasComputedResults: boolean
}

interface StoredSessionRecord {
  id: string
  value: PersistedSessionV1
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser'))
      return
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isCardRow(value: unknown): value is CardRow {
  if (!value || typeof value !== 'object') return false

  const row = value as Partial<CardRow>
  return (
    typeof row.number === 'string' &&
    typeof row.setId === 'string' &&
    isFiniteNumber(row.quantity) &&
    isFiniteNumber(row.totalQuantity) &&
    isFiniteNumber(row.addQuantity) &&
    typeof row.productName === 'string' &&
    typeof row.setName === 'string' &&
    typeof row.rarity === 'string' &&
    typeof row.tcgplayerId === 'string' &&
    isStringArray(row.rawValues)
  )
}

function isParsedFile(value: unknown): value is ParsedFile {
  if (!value || typeof value !== 'object') return false

  const file = value as Partial<ParsedFile>
  return (
    typeof file.fileName === 'string' &&
    Array.isArray(file.cards) &&
    file.cards.every(isCardRow) &&
    isFiniteNumber(file.totalCards) &&
    isStringArray(file.setIds) &&
    isStringArray(file.headers) &&
    Number.isInteger(file.quantityColIndex)
  )
}

function isPersistedSession(value: unknown): value is PersistedSessionV1 {
  if (!value || typeof value !== 'object') return false

  const session = value as Partial<PersistedSessionV1>
  return (
    session.version === 1 &&
    Array.isArray(session.files) &&
    session.files.every(isParsedFile) &&
    typeof session.hasComputedResults === 'boolean'
  )
}

export async function loadSession(): Promise<PersistedSessionV1 | null> {
  try {
    const database = await openDatabase()

    return await new Promise<PersistedSessionV1 | null>((resolve, reject) => {
      let loadedValue: PersistedSessionV1 | null = null

      const transaction = database.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(SESSION_KEY)

      request.onsuccess = () => {
        const result = request.result as StoredSessionRecord | undefined
        loadedValue = isPersistedSession(result?.value) ? result.value : null
      }

      request.onerror = () => reject(request.error ?? new Error('Failed to load saved session'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Failed to load saved session'))
      transaction.oncomplete = () => resolve(loadedValue)
    }).finally(() => {
      database.close()
    })
  } catch {
    return null
  }
}

export async function saveSession(session: PersistedSessionV1): Promise<void> {
  try {
    const database = await openDatabase()

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      store.put({
        id: SESSION_KEY,
        value: session,
      } satisfies StoredSessionRecord)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to save session'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Failed to save session'))
    }).finally(() => {
      database.close()
    })
  } catch {
    // If persistence is unavailable, keep the current in-memory session working.
  }
}

export async function clearSession(): Promise<void> {
  try {
    const database = await openDatabase()

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      store.delete(SESSION_KEY)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to clear session'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Failed to clear session'))
    }).finally(() => {
      database.close()
    })
  } catch {
    // If persistence is unavailable, there is nothing else to clear.
  }
}
