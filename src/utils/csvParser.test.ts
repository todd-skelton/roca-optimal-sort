import { describe, expect, it } from 'vitest'
import { parseCSV } from './csvParser'

describe('parseCSV', () => {
  it('parses rows, keeps set order, and prefers total quantity over add quantity', async () => {
    const csv = [
      'Number,Total Quantity,Add to Quantity,Product Name,Set Name,Rarity,TCGplayer Id',
      'SET2-003,2,5,Third Card,Set Two,Common,300',
      'SET2-004,0,4,Fourth Card,Set Two,Rare,400',
      'SET1-001,3,,First Card,Set One,Ultra,100',
      'SET1-002,,,Skipped Card,Set One,Common,200',
      ',1,1,Blank Number,Set One,Common,201',
    ].join('\n')

    const parsed = await parseCSV(new File([csv], 'stack.csv', { type: 'text/csv' }))

    expect(parsed.fileName).toBe('stack.csv')
    expect(parsed.totalCards).toBe(9)
    expect(parsed.setIds).toEqual(['SET2', 'SET1'])
    expect(parsed.quantityColIndex).toBe(1)
    expect(parsed.cards).toHaveLength(3)
    expect(parsed.cards[0]).toMatchObject({
      number: 'SET2-003',
      setId: 'SET2',
      quantity: 2,
      totalQuantity: 2,
      addQuantity: 5,
      productName: 'Third Card',
      tcgplayerId: '300',
    })
    expect(parsed.cards[1]).toMatchObject({
      number: 'SET2-004',
      quantity: 4,
      totalQuantity: 0,
      addQuantity: 4,
    })
  })

  it('uses Add to Quantity when Total Quantity is not present', async () => {
    const csv = [
      'Number,Add to Quantity,Product Name',
      'SET9-001,7,Only Add Quantity',
    ].join('\n')

    const parsed = await parseCSV(new File([csv], 'add-only.csv', { type: 'text/csv' }))

    expect(parsed.quantityColIndex).toBe(1)
    expect(parsed.totalCards).toBe(7)
    expect(parsed.cards[0]).toMatchObject({
      number: 'SET9-001',
      quantity: 7,
      totalQuantity: 0,
      addQuantity: 7,
      productName: 'Only Add Quantity',
    })
  })

  it('rejects files that are missing required columns', async () => {
    const csv = [
      'Product Name,Set Name',
      'Card Name,Example Set',
    ].join('\n')

    await expect(parseCSV(new File([csv], 'broken.csv', { type: 'text/csv' }))).rejects.toThrow(
      'broken.csv: missing required column (Number)',
    )
  })
})
