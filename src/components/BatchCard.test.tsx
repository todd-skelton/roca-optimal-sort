import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BatchCard from './BatchCard'
import type { Batch } from '../types'

describe('BatchCard', () => {
  it('renders visually distinct filename avatars for each stack slice', () => {
    const batch: Batch = {
      batchNumber: 1,
      totalCards: 240,
      setIds: ['A', 'B', 'C'],
      slices: [
        {
          fileName: '2026-03-28_21-39-03-Redo-LP-ABC-A6.csv',
          firstSetId: 'A',
          lastSetId: 'B',
          cardCount: 120,
          startCard: 1,
          endCard: 120,
          sets: ['A', 'B'],
          startsInMiddleOfSet: false,
          endsInMiddleOfSet: false,
        },
        {
          fileName: '2026-03-28_21-39-04-Redo-LP-ABC-B7.csv',
          firstSetId: 'B',
          lastSetId: 'C',
          cardCount: 120,
          startCard: 121,
          endCard: 240,
          sets: ['B', 'C'],
          startsInMiddleOfSet: false,
          endsInMiddleOfSet: true,
          splitEndCard: {
            cardNumber: 'C-015',
            productName: 'Card C-015',
            quantityNeeded: 2,
            quantityTotal: 3,
          },
        },
      ],
    }

    render(<BatchCard batch={batch} targetPerBatch={240} />)

    expect(screen.getByTestId('batch-row-1')).toHaveTextContent('2026-03-28_21-39-03-Redo-LP-ABC-A6.csv')
    expect(screen.getByTestId('batch-row-2')).toHaveTextContent('2026-03-28_21-39-04-Redo-LP-ABC-B7.csv')
    expect(within(screen.getByTestId('batch-row-1')).getByText('A6')).toBeInTheDocument()
    expect(within(screen.getByTestId('batch-row-2')).getByText('B7')).toBeInTheDocument()
    expect(screen.getByText('#1 - #120')).toBeInTheDocument()
    expect(screen.getByText('#121 - #240')).toBeInTheDocument()
  })

  it('renders the set list toggle above the slice rows', () => {
    const batch: Batch = {
      batchNumber: 1,
      totalCards: 240,
      setIds: ['A', 'B', 'C'],
      slices: [
        {
          fileName: 'stack-a.csv',
          firstSetId: 'A',
          lastSetId: 'B',
          cardCount: 120,
          startCard: 1,
          endCard: 120,
          sets: ['A', 'B'],
          startsInMiddleOfSet: false,
          endsInMiddleOfSet: false,
        },
      ],
    }

    render(<BatchCard batch={batch} targetPerBatch={240} />)

    const toggle = screen.getByText('Show all 3 sets in this run')
    const firstRow = screen.getByTestId('batch-row-1')

    expect(toggle.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('highlights the final set code and card name for a pull', () => {
    const batch: Batch = {
      batchNumber: 2,
      totalCards: 120,
      setIds: ['AA', 'BB', 'CC'],
      slices: [
        {
          fileName: 'stack-c.csv',
          firstSetId: 'BB',
          lastSetId: 'CC',
          cardCount: 120,
          startCard: 241,
          endCard: 360,
          sets: ['BB', 'CC'],
          startsInMiddleOfSet: false,
          endsInMiddleOfSet: true,
          splitEndCard: {
            cardNumber: 'CC-015',
            productName: 'Crystal Dragon',
            quantityNeeded: 2,
            quantityTotal: 3,
          },
        },
      ],
    }

    render(<BatchCard batch={batch} targetPerBatch={120} />)

    const row = screen.getByTestId('batch-row-1')
    const finalTarget = screen.getByTestId('final-target-1')

    expect(within(row).getByText('Final pull target')).toBeInTheDocument()
    expect(within(finalTarget).getByText('CC')).toBeInTheDocument()
    expect(within(finalTarget).getByText('CC-015')).toBeInTheDocument()
    expect(within(finalTarget).getByText('Crystal Dragon')).toBeInTheDocument()
    expect(within(finalTarget).getByText('Pull 2 of 3 copies from this card.')).toBeInTheDocument()
  })
})
