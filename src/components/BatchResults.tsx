import type { Batch, ParsedFile } from '../types'
import BatchCard from './BatchCard'

interface Props {
  batches: Batch[]
  files: ParsedFile[]
  maxCardsPerRun: number
}

export default function BatchResults({ batches, files, maxCardsPerRun }: Props) {
  if (batches.length === 0) return null

  const grandTotal = files.reduce((s, f) => s + f.totalCards, 0)
  const avgPerBatch = Math.round(grandTotal / batches.length)
  const hasMidSetSplits = batches.some((b) =>
    b.slices.some((s) => s.startsInMiddleOfSet || s.endsInMiddleOfSet),
  )

  return (
    <div className="mt-8">
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-1">
          Second Pass Instructions
        </h2>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Run the sorter <strong>{batches.length} times</strong>. For each run, pull the cards
          listed below from each physical stack and combine them into one pile before loading
          into the sorter. After all {batches.length} runs, stack the results in order (Run 1
          on top) for a globally sorted collection.
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
          Max {maxCardsPerRun.toLocaleString()} cards per run &middot; avg&nbsp;
          ~{avgPerBatch.toLocaleString()} &middot; {grandTotal.toLocaleString()} total
        </p>
        {hasMidSetSplits && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 font-medium">
            Some runs split a set mid-way to stay within the card limit — indicated below.
          </p>
        )}
      </div>

      <div className="grid gap-6">
        {batches.map((batch) => (
          <BatchCard key={batch.batchNumber} batch={batch} targetPerBatch={avgPerBatch} />
        ))}
      </div>
    </div>
  )
}
