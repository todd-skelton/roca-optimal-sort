import Papa from 'papaparse'
import type { CardRow, ParsedFile } from '../types'

function extractSetId(number: string): string {
  const dashIdx = number.indexOf('-')
  return dashIdx === -1 ? number : number.slice(0, dashIdx)
}

export function parseCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete(results) {
        const rows = results.data
        if (rows.length < 2) {
          reject(new Error(`${file.name}: no data rows found`))
          return
        }

        // Find column indices from header
        const header = rows[0].map((h) => h.trim())
        const numberIdx = header.indexOf('Number')
        const totalQtyIdx = header.indexOf('Total Quantity')
        const addQtyIdx = header.indexOf('Add to Quantity')
        const nameIdx = header.indexOf('Product Name')
        const setNameIdx = header.indexOf('Set Name')
        const rarityIdx = header.indexOf('Rarity')
        const tcgplayerIdIdx = header.indexOf('TCGplayer Id')

        if (numberIdx === -1) {
          reject(new Error(`${file.name}: missing required column (Number)`))
          return
        }
        if (totalQtyIdx === -1 && addQtyIdx === -1) {
          reject(new Error(`${file.name}: missing required columns (Total Quantity or Add to Quantity)`))
          return
        }

        const cards: CardRow[] = []
        const seenSetIds: string[] = []
        const setIdSet = new Set<string>()

        // The column we'll write the merged quantity into
        const quantityColIndex = totalQtyIdx !== -1 ? totalQtyIdx : addQtyIdx

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          const number = row[numberIdx]?.trim()
          if (!number) continue

          // Parse each quantity column independently
          const totalQtyRaw = totalQtyIdx !== -1 ? row[totalQtyIdx]?.trim() : ''
          const addQtyRaw = addQtyIdx !== -1 ? row[addQtyIdx]?.trim() : ''
          const totalQuantity = totalQtyRaw ? parseInt(totalQtyRaw, 10) : 0
          const addQuantity = addQtyRaw ? parseInt(addQtyRaw, 10) : 0
          // Effective quantity for batch planning: prefer Total Quantity, fall back to Add to Quantity
          const quantity = (totalQuantity > 0 ? totalQuantity : addQuantity)
          if (isNaN(quantity) || quantity <= 0) continue

          const setId = extractSetId(number)

          cards.push({
            number,
            setId,
            quantity,
            totalQuantity,
            addQuantity,
            productName: nameIdx !== -1 ? row[nameIdx]?.trim() ?? '' : '',
            setName: setNameIdx !== -1 ? row[setNameIdx]?.trim() ?? '' : '',
            rarity: rarityIdx !== -1 ? row[rarityIdx]?.trim() ?? '' : '',
            tcgplayerId: tcgplayerIdIdx !== -1 ? row[tcgplayerIdIdx]?.trim() ?? '' : '',
            rawValues: row.map((v) => v ?? ''),
          })

          if (!setIdSet.has(setId)) {
            setIdSet.add(setId)
            seenSetIds.push(setId)
          }
        }

        const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0)

        resolve({
          fileName: file.name,
          cards,
          totalCards,
          setIds: seenSetIds,
          headers: header,
          quantityColIndex,
        })
      },
      error(err) {
        reject(new Error(`${file.name}: ${err.message}`))
      },
    })
  })
}
