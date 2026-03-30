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

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          const number = row[numberIdx]?.trim()
          if (!number) continue

          // Prefer Total Quantity; fall back to Add to Quantity (TCGplayer files
          // often leave Total Quantity blank and populate Add to Quantity instead)
          const totalQtyRaw = totalQtyIdx !== -1 ? row[totalQtyIdx]?.trim() : ''
          const addQtyRaw = addQtyIdx !== -1 ? row[addQtyIdx]?.trim() : ''
          const qtyRaw = (totalQtyRaw && totalQtyRaw !== '0') ? totalQtyRaw : addQtyRaw
          const quantity = qtyRaw ? parseInt(qtyRaw, 10) : 1
          if (isNaN(quantity) || quantity <= 0) continue

          const setId = extractSetId(number)

          cards.push({
            number,
            setId,
            quantity,
            productName: nameIdx !== -1 ? row[nameIdx]?.trim() ?? '' : '',
            setName: setNameIdx !== -1 ? row[setNameIdx]?.trim() ?? '' : '',
            rarity: rarityIdx !== -1 ? row[rarityIdx]?.trim() ?? '' : '',
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
        })
      },
      error(err) {
        reject(new Error(`${file.name}: ${err.message}`))
      },
    })
  })
}
