import type { CardRow, ParsedFile } from '../types'

const DEFAULT_HEADERS = [
  'Number',
  'TCGplayer Id',
  'Total Quantity',
  'Add to Quantity',
  'Product Name',
  'Set Name',
  'Rarity',
]

export function makeCard(overrides: Partial<CardRow> & Pick<CardRow, 'number' | 'setId' | 'quantity'>): CardRow {
  const totalQuantity = overrides.totalQuantity ?? overrides.quantity
  const addQuantity = overrides.addQuantity ?? 0
  const productName = overrides.productName ?? `${overrides.number} name`
  const setName = overrides.setName ?? `${overrides.setId} set`
  const rarity = overrides.rarity ?? 'Common'
  const tcgplayerId = overrides.tcgplayerId ?? overrides.number
  const rawValues = overrides.rawValues ?? [
    overrides.number,
    tcgplayerId,
    totalQuantity > 0 ? String(totalQuantity) : '',
    addQuantity > 0 ? String(addQuantity) : '',
    productName,
    setName,
    rarity,
  ]

  return {
    number: overrides.number,
    setId: overrides.setId,
    quantity: overrides.quantity,
    totalQuantity,
    addQuantity,
    productName,
    setName,
    rarity,
    tcgplayerId,
    rawValues,
  }
}

export function makeParsedFile(args: {
  fileName: string
  cards: CardRow[]
  headers?: string[]
  quantityColIndex?: number
}): ParsedFile {
  const headers = args.headers ?? DEFAULT_HEADERS
  const setIds: string[] = []
  const seen = new Set<string>()

  for (const card of args.cards) {
    if (!seen.has(card.setId)) {
      seen.add(card.setId)
      setIds.push(card.setId)
    }
  }

  return {
    fileName: args.fileName,
    cards: args.cards,
    totalCards: args.cards.reduce((total, card) => total + card.quantity, 0),
    setIds,
    headers,
    quantityColIndex: args.quantityColIndex ?? headers.indexOf('Total Quantity'),
  }
}
