import { describe, expect, it } from 'vitest'
import { computeBatches } from './batchCalculator'
import { makeCard, makeParsedFile } from '../test/fixtures'

describe('computeBatches', () => {
  it('splits batches across sets and marks mid-set continuations', () => {
    const files = [
      makeParsedFile({
        fileName: 'stack-a.csv',
        cards: [
          makeCard({ number: 'A-001', setId: 'A', quantity: 2 }),
          makeCard({ number: 'B-001', setId: 'B', quantity: 3 }),
          makeCard({ number: 'C-001', setId: 'C', quantity: 2 }),
        ],
      }),
      makeParsedFile({
        fileName: 'stack-b.csv',
        cards: [
          makeCard({ number: 'A-010', setId: 'A', quantity: 2 }),
          makeCard({ number: 'B-010', setId: 'B', quantity: 3 }),
          makeCard({ number: 'C-010', setId: 'C', quantity: 2 }),
        ],
      }),
    ]

    const batches = computeBatches(files, 6)

    expect(batches).toHaveLength(3)
    expect(batches.map((batch) => batch.totalCards)).toEqual([6, 6, 2])
    expect(batches.map((batch) => batch.setIds)).toEqual([['A', 'B'], ['B', 'C'], ['C']])

    expect(batches[0].slices).toEqual([
      expect.objectContaining({
        fileName: 'stack-a.csv',
        startCard: 1,
        endCard: 3,
        cardCount: 3,
        startsInMiddleOfSet: false,
        endsInMiddleOfSet: true,
        splitEndCard: expect.objectContaining({
          cardNumber: 'B-001',
          quantityNeeded: 1,
          quantityTotal: 3,
        }),
      }),
      expect.objectContaining({
        fileName: 'stack-b.csv',
        startCard: 1,
        endCard: 3,
        cardCount: 3,
        endsInMiddleOfSet: true,
      }),
    ])

    expect(batches[1].slices).toEqual([
      expect.objectContaining({
        fileName: 'stack-a.csv',
        startCard: 4,
        endCard: 6,
        cardCount: 3,
        startsInMiddleOfSet: true,
        endsInMiddleOfSet: true,
      }),
      expect.objectContaining({
        fileName: 'stack-b.csv',
        startCard: 4,
        endCard: 6,
        cardCount: 3,
        startsInMiddleOfSet: true,
        endsInMiddleOfSet: true,
      }),
    ])

    expect(batches[2].slices).toEqual([
      expect.objectContaining({
        fileName: 'stack-a.csv',
        startCard: 7,
        endCard: 7,
        cardCount: 1,
        startsInMiddleOfSet: true,
        endsInMiddleOfSet: false,
      }),
      expect.objectContaining({
        fileName: 'stack-b.csv',
        startCard: 7,
        endCard: 7,
        cardCount: 1,
        startsInMiddleOfSet: true,
        endsInMiddleOfSet: false,
      }),
    ])
  })

  it('returns empty slices for files that do not contribute to a batch', () => {
    const batches = computeBatches(
      [
        makeParsedFile({
          fileName: 'stack-a.csv',
          cards: [makeCard({ number: 'A-001', setId: 'A', quantity: 2 })],
        }),
        makeParsedFile({
          fileName: 'stack-b.csv',
          cards: [makeCard({ number: 'B-001', setId: 'B', quantity: 2 })],
        }),
      ],
      2,
    )

    expect(batches).toHaveLength(2)
    expect(batches[0].slices[1]).toMatchObject({
      fileName: 'stack-b.csv',
      cardCount: 0,
      startCard: 0,
      endCard: 0,
      sets: [],
    })
    expect(batches[1].slices[0]).toMatchObject({
      fileName: 'stack-a.csv',
      cardCount: 0,
      startCard: 0,
      endCard: 0,
      sets: [],
    })
  })
})
