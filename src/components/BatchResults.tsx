import type { Batch, ParsedFile } from '../types'
import BatchCard from './BatchCard'

interface Props {
  batches: Batch[]
  files: ParsedFile[]
}

export default function BatchResults({ batches, files }: Props) {
  if (batches.length === 0) return null

  const grandTotal = files.reduce((s, f) => s + f.totalCards, 0)
  const targetPerBatch = Math.round(grandTotal / batches.length)

  return (
    <div className="mt-8">
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h2 className="text-xl font-bold text-blue-900 mb-1">
          Second Pass Instructions
        </h2>
        <p className="text-sm text-blue-700">
          Run the sorter <strong>{batches.length} times</strong>. For each run, pull the cards
          listed below from each physical stack and combine them into one pile before loading
          into the sorter. After all {batches.length} runs, stack the results in order (Run 1
          on top) for a globally sorted collection.
        </p>
        <p className="text-sm text-blue-600 mt-1">
          Target: ~{targetPerBatch.toLocaleString()} cards per run &middot;{' '}
          {grandTotal.toLocaleString()} total cards
        </p>
      </div>

      <div className="grid gap-6">
        {batches.map((batch) => (
          <BatchCard key={batch.batchNumber} batch={batch} targetPerBatch={targetPerBatch} />
        ))}
      </div>
    </div>
  )
}
