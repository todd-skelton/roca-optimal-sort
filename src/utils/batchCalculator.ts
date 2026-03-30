import type { Batch, ParsedFile, StackSlice } from '../types'

/**
 * Given N parsed sorted files, compute N batches for the second pass.
 *
 * Strategy:
 * 1. Collect all unique set IDs across all files, sorted alphabetically.
 * 2. Compute total card count across all files.
 * 3. Target per batch = total / N (average).
 * 4. Greedily assign consecutive set IDs to batches, splitting only on set
 *    boundaries, aiming for the target size. If the last sets would make a
 *    tiny final batch they're folded into the previous one instead.
 * 5. For each batch + file, compute the physical card positions in that stack.
 */
export function computeBatches(files: ParsedFile[]): Batch[] {
  const N = files.length
  if (N === 0) return []

  // --- 1. Collect all unique set IDs, globally sorted ---
  const allSetIds = Array.from(
    new Set(files.flatMap((f) => f.setIds)),
  ).sort()

  // --- 2. Total cards per set ID (across ALL files) ---
  const totalBySet = new Map<string, number>()
  for (const file of files) {
    for (const card of file.cards) {
      totalBySet.set(card.setId, (totalBySet.get(card.setId) ?? 0) + card.quantity)
    }
  }

  const grandTotal = Array.from(totalBySet.values()).reduce((a, b) => a + b, 0)
  const targetPerBatch = grandTotal / N

  // --- 3. Greedy split into N batches ---
  // Each batch is a list of set IDs
  const batchSets: string[][] = []
  let current: string[] = []
  let currentCount = 0

  for (let i = 0; i < allSetIds.length; i++) {
    const setId = allSetIds[i]
    const setCount = totalBySet.get(setId) ?? 0
    current.push(setId)
    currentCount += setCount

    const batchesLeft = N - batchSets.length
    const setsLeft = allSetIds.length - i - 1

    // Flush when we've hit target AND there are enough sets left for remaining batches
    if (
      currentCount >= targetPerBatch &&
      batchSets.length < N - 1 &&
      setsLeft >= batchesLeft - 1
    ) {
      batchSets.push(current)
      current = []
      currentCount = 0
    }
  }

  // Remaining sets go into the last batch (may be folded into previous if tiny)
  if (current.length > 0) {
    if (batchSets.length < N) {
      batchSets.push(current)
    } else {
      // Fold into last batch if we already have N
      batchSets[batchSets.length - 1].push(...current)
    }
  }

  // If we ended up with fewer than N batches (all sets fit into fewer groups),
  // add empty placeholders so batch count equals file count
  while (batchSets.length < N) {
    batchSets.push([])
  }

  // --- 4. For each file, precompute cumulative card position per set ID ---
  // positionMap[fileName][setId] = { start, end } (1-based, inclusive)
  const positionMap = new Map<string, Map<string, { start: number; end: number }>>()

  for (const file of files) {
    const setPos = new Map<string, { start: number; end: number }>()
    let pos = 1
    // Cards in the file are in sorted order; group consecutive same-set rows
    // (the file is already sorted by setId)
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

  // --- 5. Build Batch objects ---
  return batchSets.map((setIds, batchIdx) => {
    const slices: StackSlice[] = []

    for (const file of files) {
      const setPos = positionMap.get(file.fileName)!
      // Which of this batch's set IDs actually appear in this file?
      const presentSets = setIds.filter((s) => setPos.has(s))
      if (presentSets.length === 0) {
        slices.push({
          fileName: file.fileName,
          firstSetId: '',
          lastSetId: '',
          cardCount: 0,
          startCard: 0,
          endCard: 0,
          sets: [],
        })
        continue
      }

      const firstPos = setPos.get(presentSets[0])!
      const lastPos = setPos.get(presentSets[presentSets.length - 1])!
      const cardCount = presentSets.reduce((sum, s) => {
        const p = setPos.get(s)!
        return sum + (p.end - p.start + 1)
      }, 0)

      slices.push({
        fileName: file.fileName,
        firstSetId: presentSets[0],
        lastSetId: presentSets[presentSets.length - 1],
        cardCount,
        startCard: firstPos.start,
        endCard: lastPos.end,
        sets: presentSets,
      })
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
