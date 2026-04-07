import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { makeCard, makeParsedFile } from './test/fixtures'
import type { PersistedSessionV1 } from './utils/sessionStorage'

const { loadSessionMock, saveSessionMock, clearSessionMock } = vi.hoisted(() => ({
  loadSessionMock: vi.fn<() => Promise<PersistedSessionV1 | null>>(),
  saveSessionMock: vi.fn<() => Promise<void>>(),
  clearSessionMock: vi.fn<() => Promise<void>>(),
}))

vi.mock('./utils/sessionStorage', () => ({
  loadSession: loadSessionMock,
  saveSession: saveSessionMock,
  clearSession: clearSessionMock,
}))

describe('App', () => {
  beforeEach(() => {
    loadSessionMock.mockReset()
    saveSessionMock.mockReset()
    clearSessionMock.mockReset()
    loadSessionMock.mockResolvedValue(null)
    saveSessionMock.mockResolvedValue()
    clearSessionMock.mockResolvedValue()
    localStorage.clear()
    vi.useRealTimers()
  })

  it('restores a saved session and recomputes visible batch results', async () => {
    loadSessionMock.mockResolvedValue({
      version: 1,
      files: [
        makeParsedFile({
          fileName: 'stack-a.csv',
          cards: [
            makeCard({ number: 'A-001', setId: 'A', quantity: 2 }),
            makeCard({ number: 'B-001', setId: 'B', quantity: 2 }),
          ],
        }),
        makeParsedFile({
          fileName: 'stack-b.csv',
          cards: [
            makeCard({ number: 'A-010', setId: 'A', quantity: 2 }),
            makeCard({ number: 'B-010', setId: 'B', quantity: 2 }),
          ],
        }),
      ],
      hasComputedResults: true,
    })

    render(<App />)

    expect(await screen.findByText('Restored your previous session from this browser.')).toBeInTheDocument()
    expect(screen.getByText('Loaded Stacks (2)')).toBeInTheDocument()
    expect(await screen.findByText('Second Pass Instructions')).toBeInTheDocument()
    expect(screen.getByText('Run 1')).toBeInTheDocument()
    expect(saveSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 1,
        hasComputedResults: true,
        files: expect.arrayContaining([
          expect.objectContaining({ fileName: 'stack-a.csv' }),
          expect.objectContaining({ fileName: 'stack-b.csv' }),
        ]),
      }),
    )
  })

  it('downloads a merged master csv from the current loaded files', async () => {
    loadSessionMock.mockResolvedValue({
      version: 1,
      files: [
        makeParsedFile({
          fileName: 'stack-a.csv',
          headers: [
            'Number',
            'TCGplayer Id',
            'Total Quantity',
            'Add to Quantity',
            'Product Name',
            'Set Name',
            'Rarity',
          ],
          cards: [
            makeCard({
              number: 'A-001',
              setId: 'A',
              quantity: 2,
              totalQuantity: 2,
              addQuantity: 1,
              tcgplayerId: 'shared-1',
              productName: 'Alpha',
              rawValues: ['A-001', 'shared-1', '2', '1', 'Alpha', 'Set A', 'Common'],
            }),
            makeCard({
              number: 'B-001',
              setId: 'B',
              quantity: 1,
              totalQuantity: 1,
              addQuantity: 0,
              tcgplayerId: 'solo-2',
              productName: 'Beta',
              rawValues: ['B-001', 'solo-2', '1', '', 'Beta', 'Set B', 'Rare'],
            }),
          ],
        }),
        makeParsedFile({
          fileName: 'stack-b.csv',
          headers: [
            'Number',
            'TCGplayer Id',
            'Total Quantity',
            'Add to Quantity',
            'Product Name',
            'Set Name',
            'Rarity',
            'Notes',
          ],
          cards: [
            makeCard({
              number: 'A-001',
              setId: 'A',
              quantity: 3,
              totalQuantity: 3,
              addQuantity: 2,
              tcgplayerId: 'shared-1',
              productName: 'Alpha',
              rawValues: ['A-001', 'shared-1', '3', '2', 'Alpha', 'Set A', 'Common', 'keep'],
            }),
            makeCard({
              number: 'C-001',
              setId: 'C',
              quantity: 4,
              totalQuantity: 0,
              addQuantity: 4,
              tcgplayerId: 'solo-3',
              productName: 'Gamma',
              rawValues: ['C-001', 'solo-3', '', '4', 'Gamma', 'Set C', 'Ultra', 'keep'],
            }),
          ],
        }),
      ],
      hasComputedResults: false,
    })

    let createdBlob: unknown = null
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
      createdBlob = blob
      return 'blob:master-csv'
    })
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    let downloadedFileName = ''
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFileName = this.download
    })

    render(<App />)

    await screen.findByText('Loaded Stacks (2)')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Download Master CSV' }))

    await waitFor(() => {
      expect(createdBlob).not.toBeNull()
    })

    if (!(createdBlob instanceof Blob)) {
      throw new Error('Expected a Blob to be generated for the master CSV download')
    }

    const csv = await createdBlob.text()
    expect(csv).toBe(
      [
        'Number,TCGplayer Id,Total Quantity,Add to Quantity,Product Name,Set Name,Rarity,Notes',
        'A-001,shared-1,5,3,Alpha,Set A,Common,',
        'B-001,solo-2,1,,Beta,Set B,Rare,',
        'C-001,solo-3,,4,Gamma,Set C,Ultra,keep',
      ].join('\n'),
    )
    expect(downloadedFileName).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-Master\.csv$/)
    expect(createObjectUrl).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:master-csv')

    createObjectUrl.mockRestore()
    revokeObjectUrl.mockRestore()
    clickSpy.mockRestore()
  })
})
