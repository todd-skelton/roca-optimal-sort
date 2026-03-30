import type { Batch } from '../types'

interface Props {
  batch: Batch
  targetPerBatch: number
}

const COLORS = [
  'bg-orange-100 border-orange-300 text-orange-900',
  'bg-green-100 border-green-300 text-green-900',
  'bg-purple-100 border-purple-300 text-purple-900',
  'bg-pink-100 border-pink-300 text-pink-900',
  'bg-yellow-100 border-yellow-300 text-yellow-900',
  'bg-teal-100 border-teal-300 text-teal-900',
  'bg-red-100 border-red-300 text-red-900',
  'bg-indigo-100 border-indigo-300 text-indigo-900',
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

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${color}`}>
      {/* Header */}
      <div className={`px-5 py-4 flex items-center justify-between border-b ${color}`}>
        <div>
          <h3 className="text-lg font-bold">
            Run {batch.batchNumber}
          </h3>
          <p className="text-sm opacity-75">
            Sets&nbsp;
            <span className="font-mono font-semibold">{firstSet}</span>
            &nbsp;&rarr;&nbsp;
            <span className="font-mono font-semibold">{lastSet}</span>
            &nbsp;({batch.setIds.length} sets)
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{batch.totalCards.toLocaleString()}</div>
          <div className="text-sm opacity-75">
            cards {v && <span className={v.startsWith('+') ? 'text-orange-600' : 'text-blue-600'}>{v}</span>}
          </div>
        </div>
      </div>

      {/* Per-file slices */}
      <div className="divide-y divide-white/40 bg-white/30">
        {batch.slices.map((slice) => {
          const shortName = slice.fileName.replace(/\.\w+$/, '')
          if (slice.cardCount === 0) {
            return (
              <div key={slice.fileName} className="px-5 py-3 flex items-center gap-4 opacity-40">
                <div className="font-mono text-xs w-56 truncate" title={slice.fileName}>
                  {shortName}
                </div>
                <div className="text-sm italic">No cards in this range</div>
              </div>
            )
          }

          return (
            <div key={slice.fileName} className="px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1">
              {/* File name */}
              <div className="font-mono text-xs w-56 truncate font-semibold" title={slice.fileName}>
                {shortName}
              </div>

              {/* Physical position badge */}
              <div className="flex items-center gap-2">
                <span className="bg-white/70 border border-current rounded px-2 py-0.5 text-xs font-mono font-bold">
                  #{slice.startCard} – #{slice.endCard}
                </span>
                <span className="text-sm font-semibold">
                  {slice.cardCount.toLocaleString()} cards
                </span>
              </div>

              {/* Set range */}
              <div className="text-sm">
                <span className="opacity-60">Pull&nbsp;</span>
                <span className="font-mono font-semibold">{slice.firstSetId}</span>
                {slice.firstSetId !== slice.lastSetId && (
                  <>
                    <span className="opacity-60">&nbsp;through&nbsp;</span>
                    <span className="font-mono font-semibold">{slice.lastSetId}</span>
                  </>
                )}
                <span className="opacity-60">&nbsp;({slice.sets.length} set{slice.sets.length !== 1 ? 's' : ''})</span>
              </div>

              {/* Separator hint */}
              <div className="ml-auto text-xs opacity-60">
                {slice.startCard > 1 && (
                  <span>Split after card&nbsp;<strong>#{slice.startCard - 1}</strong></span>
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
              <span key={s} className="bg-white/60 border border-current/20 rounded px-1.5 py-0.5 font-mono">
                {s}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
