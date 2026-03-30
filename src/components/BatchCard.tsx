import type { Batch } from '../types'

interface Props {
  batch: Batch
  targetPerBatch: number
}

const COLORS = [
  'bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-100',
  'bg-green-100 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-100',
  'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-100',
  'bg-pink-100 border-pink-300 text-pink-900 dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-100',
  'bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-100',
  'bg-teal-100 border-teal-300 text-teal-900 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-100',
  'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-100',
  'bg-indigo-100 border-indigo-300 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-100',
]

function variance(actual: number, target: number): string {
  const diff = actual - target
  const pct = Math.round((diff / target) * 100)
  if (Math.abs(pct) < 3) return ''
  return diff > 0 ? `+${pct}%` : `${pct}%`
}

export default function BatchCard({ batch, targetPerBatch }: Props) {
  const color = COLORS[(batch.batchNumber - 1) % COLORS.length]
  const v = variance(batch.totalCards, targetPerBatch)
  const firstSet = batch.setIds[0] ?? '—'
  const lastSet = batch.setIds[batch.setIds.length - 1] ?? '—'
  const hasMidSet = batch.slices.some((s) => s.startsInMiddleOfSet || s.endsInMiddleOfSet)

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${color}`}>
      {/* Header */}
      <div className={`px-5 py-4 flex items-center justify-between border-b ${color}`}>
        <div>
          <h3 className="text-lg font-bold">
            Run {batch.batchNumber}
            {hasMidSet && (
              <span className="ml-2 text-xs font-normal opacity-70 italic">(mid-set split)</span>
            )}
          </h3>
          <p className="text-sm opacity-75">
            Sets&nbsp;
            <span className="font-mono font-semibold">{firstSet}</span>
            &nbsp;&rarr;&nbsp;
            <span className="font-mono font-semibold">{lastSet}</span>
            &nbsp;({batch.setIds.length} set{batch.setIds.length !== 1 ? 's' : ''})
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{batch.totalCards.toLocaleString()}</div>
          <div className="text-sm opacity-75">
            cards {v && <span className={v.startsWith('+') ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}>{v}</span>}
          </div>
        </div>
      </div>

      {/* Per-file slices */}
      <div className="divide-y divide-white/40 dark:divide-gray-600/40 bg-white/30 dark:bg-gray-900/20">
        {batch.slices.map((slice) => {
          if (slice.cardCount === 0) {
            return (
              <div key={slice.fileName} className="px-5 py-3 flex items-center gap-4 opacity-40">
                <div className="font-mono text-xs truncate" title={slice.fileName}>
                  {slice.fileName}
                </div>
                <div className="text-sm italic">No cards in this range</div>
              </div>
            )
          }

          return (
            <div key={slice.fileName} className="px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1">
              {/* File name */}
              <div className="font-mono text-xs truncate font-semibold" title={slice.fileName}>
                {slice.fileName}
              </div>

              {/* Physical position badge */}
              <div className="flex items-center gap-2">
                <span className="bg-white/70 dark:bg-gray-800/70 border border-current rounded px-2 py-0.5 text-xs font-mono font-bold">
                  #{slice.startCard} – #{slice.endCard}
                </span>
                <span className="text-sm font-semibold">
                  {slice.cardCount.toLocaleString()} cards
                </span>
                <span className="text-xs opacity-60">
                  ~{(slice.cardCount / 80).toFixed(1)}"
                </span>
              </div>

              {/* Set range */}
              <div className="text-sm">
                {slice.startsInMiddleOfSet ? (
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">
                    &#8627;&nbsp;cont.&nbsp;<span className="font-mono">{slice.firstSetId}</span>
                  </span>
                ) : (
                  <>
                    <span className="opacity-60">Pull&nbsp;</span>
                    <span className="font-mono font-semibold">{slice.firstSetId}</span>
                  </>
                )}
                {slice.firstSetId !== slice.lastSetId && (
                  <>
                    <span className="opacity-60">&nbsp;through&nbsp;</span>
                    <span className="font-mono font-semibold">{slice.lastSetId}</span>
                  </>
                )}
                {slice.endsInMiddleOfSet ? (
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">
                    &nbsp;&#8629;&nbsp;
                    {slice.splitEndCard ? (
                      <>
                        stop at <span className="font-mono">{slice.splitEndCard.cardNumber}</span>
                        {slice.splitEndCard.quantityNeeded < slice.splitEndCard.quantityTotal && (
                          <span className="opacity-80">
                            &nbsp;({slice.splitEndCard.quantityNeeded}/{slice.splitEndCard.quantityTotal})
                          </span>
                        )}
                      </>
                    ) : (
                      '(partial)'
                    )}
                  </span>
                ) : (
                  <span className="opacity-60">&nbsp;({slice.sets.length} set{slice.sets.length !== 1 ? 's' : ''})</span>
                )}
              </div>

            </div>
          )
        })}
      </div>

      {/* Set list detail */}
      {batch.setIds.length > 0 && (
        <details className="px-5 py-2 text-xs">
          <summary className="cursor-pointer opacity-60 hover:opacity-100 select-none">
            Show all {batch.setIds.length} sets in this run
          </summary>
          <div className="mt-2 flex flex-wrap gap-1">
            {batch.setIds.map((s) => (
              <span key={s} className="bg-white/60 dark:bg-gray-800/60 border border-current/20 rounded px-1.5 py-0.5 font-mono">
                {s}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
