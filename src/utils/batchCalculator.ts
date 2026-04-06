import type { Batch, ParsedFile, StackSlice } from '../types'

interface BatchSegment {
  setId: string
  /** Total cards across all files assigned to this segment */
  globalCards: number
  /** True if this segment picks up a set that started in a previous batch */
  isMidSetStart: boolean
  /** True if this set is not finished — more cards continue in the next batch */
  isMidSetEnd: boolean
}

/**
 * Given N parsed sorted files and a max-cards-per-run limit, compute batches
 * for the second pass.
 *
 * Strategy:
 * 1. Collect all unique set IDs across all files, sorted alphabetically.
 * 2. Greedily assign consecutive sets to batches, capping each batch at
 *    maxCardsPerRun total cards.
 * 3. When adding a full set would exceed the cap, split it mid-set so the
 *    batch fills exactly to maxCardsPerRun. The remainder opens the next batch.
 * 4. For each batch + file, compute the physical card positions in that stack.
 *    Mid-set splits are allocated proportionally across files.
 */
export function computeBatches(files: ParsedFile[], maxCardsPerRun: number): Batch[] {
  const N = files.length
  if (N === 0) return []

  // --- 1. Collect all unique set IDs, globally sorted ---
  const allSetIds = Array.from(new Set(files.flatMap((f) => f.setIds))).sort()

  // --- 2. Total cards per set across ALL files, and per file ---
  const totalBySet = new Map<string, number>()
  const cardsBySetByFile = new Map<string, Map<string, number>>()

  for (const file of files) {
    const fileSetCards = new Map<string, number>()
    for (const card of file.cards) {
      totalBySet.set(card.setId, (totalBySet.get(card.setId) ?? 0) + card.quantity)
      fileSetCards.set(card.setId, (fileSetCards.get(card.setId) ?? 0) + card.quantity)
    }
    cardsBySetByFile.set(file.fileName, fileSetCards)
  }

  // --- 3. Greedy batch assignment, splitting mid-set when necessary ---
  const batchSegments: BatchSegment[][] = []
  let current: BatchSegment[] = []
  let currentTotal = 0

  for (const setId of allSetIds) {
    let remaining = totalBySet.get(setId) ?? 0
    let isFirstSegment = true

    while (remaining > 0) {
      // Flush if current batch is full
      if (currentTotal >= maxCardsPerRun) {
        batchSegments.push(current)
        current = []
        currentTotal = 0
      }

      const available = maxCardsPerRun - currentTotal

      if (remaining <= available) {
        // Entire remaining portion fits in the current batch
        current.push({
          setId,
          globalCards: remaining,
          isMidSetStart: !isFirstSegment,
          isMidSetEnd: false,
        })
        currentTotal += remaining
        remaining = 0
      } else {
        // Must split mid-set — fill the batch to its cap
        current.push({
          setId,
          globalCards: available,
          isMidSetStart: !isFirstSegment,
          isMidSetEnd: true,
        })
        currentTotal += available
        remaining -= available
        isFirstSegment = false
        batchSegments.push(current)
        current = []
        currentTotal = 0
      }
    }
  }

  if (current.length > 0) {
    batchSegments.push(current)
  }

  // --- 4. For each file, precompute cumulative card position per set ID ---
  const positionMap = new Map<string, Map<string, { start: number; end: number }>>()

  for (const file of files) {
    const setPos = new Map<string, { start: number; end: number }>()
    let pos = 1
    let i = 0
    while (i < file.cards.length) {
      const setId = file.cards[i].setId
      const start = pos
      while (i < file.cards.length && file.cards[i].setId === setId) {
        pos += file.cards[i].quantity
        i++
      }
      setPos.set(setId, { start, end: pos - 1 })
    }
    positionMap.set(file.fileName, setPos)
  }

  // Track cards already consumed per set per file (needed for mid-set continuations)
  const usedPerSetPerFile = new Map<string, Map<string, number>>()
  for (const file of files) {
    usedPerSetPerFile.set(file.fileName, new Map())
  }

  // --- 5. Build Batch objects ---
  return batchSegments.map((segments, batchIdx) => {
    const setIds = [...new Set(segments.map((s) => s.setId))]
    const slices: StackSlice[] = []

    for (const file of files) {
      const setPos = positionMap.get(file.fileName)!
      const fileSetCards = cardsBySetByFile.get(file.fileName)!
      const usedInFile = usedPerSetPerFile.get(file.fileName)!

      let sliceStart = Infinity
      let sliceEnd = -Infinity
      let totalCount = 0
      const presentSets: string[] = []
      let firstContributing: BatchSegment | null = null
      let lastContributing: BatchSegment | null = null
      let splitEndCard: { cardNumber: string; productName: string; quantityNeeded: number; quantityTotal: number } | undefined

      for (const seg of segments) {
        const pos = setPos.get(seg.setId)
        if (!pos) continue // Set not present in this file

        const fileTotal = fileSetCards.get(seg.setId) ?? 0
        const globalTotal = totalBySet.get(seg.setId) ?? 0
        const alreadyUsed = usedInFile.get(seg.setId) ?? 0
        const remainingInFile = fileTotal - alreadyUsed

        if (remainingInFile <= 0) continue

        let cardsForFile: number
        if (seg.isMidSetEnd) {
          // Proportional share of the partial global allocation
          cardsForFile = Math.round((seg.globalCards * fileTotal) / globalTotal)
          cardsForFile = Math.min(Math.max(cardsForFile, 0), remainingInFile)
        } else {
          // Last (or only) segment for this set: take all remaining cards
          cardsForFile = remainingInFile
        }

        if (cardsForFile === 0) continue

        const segStart = pos.start + alreadyUsed
        const segEnd = segStart + cardsForFile - 1

        if (firstContributing === null) {
          firstContributing = seg
          sliceStart = segStart
        }
        lastContributing = seg
        sliceEnd = segEnd

        // Find which specific card this slice lands on so the UI can tell the user where to stop.
        const offsetInSet = segEnd - pos.start + 1 // 1-based within the set
        let accumulated = 0
        splitEndCard = undefined
        for (const card of file.cards) {
          if (card.setId !== seg.setId) continue
          const prev = accumulated
          accumulated += card.quantity
          if (accumulated >= offsetInSet) {
            splitEndCard = {
              cardNumber: card.number,
              productName: card.productName,
              quantityNeeded: offsetInSet - prev,
              quantityTotal: card.quantity,
            }
            break
          }
        }

        totalCount += cardsForFile
        if (!presentSets.includes(seg.setId)) presentSets.push(seg.setId)

        usedInFile.set(seg.setId, alreadyUsed + cardsForFile)
      }

      if (presentSets.length === 0 || totalCount === 0) {
        slices.push({
          fileName: file.fileName,
          firstSetId: '',
          lastSetId: '',
          cardCount: 0,
          startCard: 0,
          endCard: 0,
          sets: [],
          startsInMiddleOfSet: false,
          endsInMiddleOfSet: false,
        })
      } else {
        slices.push({
          fileName: file.fileName,
          firstSetId: presentSets[0],
          lastSetId: presentSets[presentSets.length - 1],
          cardCount: totalCount,
          startCard: sliceStart,
          endCard: sliceEnd,
          sets: presentSets,
          startsInMiddleOfSet: firstContributing?.isMidSetStart ?? false,
          endsInMiddleOfSet: lastContributing?.isMidSetEnd ?? false,
          splitEndCard,
        })
      }
    }

    const totalCards = slices.reduce((s, sl) => s + sl.cardCount, 0)

    return {
      batchNumber: batchIdx + 1,
      setIds,
      slices,
      totalCards,
    }
  })
}
