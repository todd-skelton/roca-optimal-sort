import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BatchCard from './BatchCard'
import type { Batch } from '../types'

describe('BatchCard', () => {
  it('renders visually distinct numbered rows for each stack slice', () => {
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
        {
          fileName: 'stack-b.csv',
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

    expect(screen.getByTestId('batch-row-1')).toHaveTextContent('stack-a.csv')
    expect(screen.getByTestId('batch-row-2')).toHaveTextContent('stack-b.csv')
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('#1 - #120')).toBeInTheDocument()
    expect(screen.getByText('#121 - #240')).toBeInTheDocument()
  })
})
