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

function fileAvatarLabel(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '')
  const finalSegment = withoutExtension.split(/[-_]/).filter(Boolean).pop() ?? withoutExtension
  return finalSegment.slice(-2).toUpperCase() || '--'
}

export default function BatchCard({ batch, targetPerBatch }: Props) {
  const color = COLORS[(batch.batchNumber - 1) % COLORS.length]
  const v = variance(batch.totalCards, targetPerBatch)
  const firstSet = batch.setIds[0] ?? '-'
  const lastSet = batch.setIds[batch.setIds.length - 1] ?? '-'
  const hasMidSet = batch.slices.some((s) => s.startsInMiddleOfSet || s.endsInMiddleOfSet)

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${color}`}>
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
            cards{' '}
            {v && (
              <span
                className={
                  v.startsWith('+')
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-blue-600 dark:text-blue-400'
                }
              >
                {v}
              </span>
            )}
          </div>
        </div>
      </div>

      {batch.setIds.length > 0 && (
        <details className="px-5 py-2 text-xs">
          <summary className="cursor-pointer opacity-60 hover:opacity-100 select-none">
            Show all {batch.setIds.length} sets in this run
          </summary>
          <div className="mt-2 flex flex-wrap gap-1">
            {batch.setIds.map((s) => (
              <span
                key={s}
                className="bg-white/60 dark:bg-gray-800/60 border border-current/20 rounded px-1.5 py-0.5 font-mono"
              >
                {s}
              </span>
            ))}
          </div>
        </details>
      )}

      <div className="space-y-2 p-2 bg-white/30 dark:bg-gray-900/20">
        {batch.slices.map((slice, index) => {
          const rowTone =
            index % 2 === 0
              ? 'bg-white/80 dark:bg-gray-950/50 border-white/70 dark:border-gray-700/70'
              : 'bg-white/55 dark:bg-gray-900/60 border-white/50 dark:border-gray-700/60'
          const badgeTone =
            index % 2 === 0
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
          const finalSetId = slice.lastSetId || slice.firstSetId || '-'
          const finalCardNumber = slice.splitEndCard?.cardNumber
          const finalCardName = slice.splitEndCard?.productName
          const avatarLabel = fileAvatarLabel(slice.fileName)

          if (slice.cardCount === 0) {
            return (
              <div
                key={slice.fileName}
                data-testid={`batch-row-${index + 1}`}
                className={`rounded-xl border px-4 py-3 shadow-sm ${rowTone}`}
              >
                <div className="flex items-center gap-3 opacity-50">
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeTone}`}
                  >
                    {avatarLabel}
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-xs truncate" title={slice.fileName}>
                      {slice.fileName}
                    </div>
                    <div className="mt-0.5 text-sm italic">No cards in this range</div>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div
              key={slice.fileName}
              data-testid={`batch-row-${index + 1}`}
              className={`rounded-xl border px-4 py-3 shadow-sm ${rowTone}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1.5 pt-0.5">
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeTone}`}
                  >
                    {avatarLabel}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-full min-h-10 w-px rounded-full bg-current/20"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                    <div className="font-mono text-xs truncate font-semibold" title={slice.fileName}>
                      {slice.fileName}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-white/85 dark:bg-gray-800/80 border border-current/20 rounded px-2 py-0.5 text-xs font-mono font-bold shadow-sm">
                        #{slice.startCard} - #{slice.endCard}
                      </span>
                      <span className="text-sm font-semibold">
                        {slice.cardCount.toLocaleString()} cards
                      </span>
                      <span className="text-xs opacity-60">
                        ~{(slice.cardCount / 80).toFixed(1)}"
                      </span>
                    </div>
                  </div>

                  <div className="mt-1.5 text-sm leading-5">
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] md:items-start">
                      <div>
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
                        <span className="opacity-60">
                          &nbsp;({slice.sets.length} set{slice.sets.length !== 1 ? 's' : ''})
                        </span>
                        {slice.endsInMiddleOfSet && (
                          <span className="ml-2 text-amber-700 dark:text-amber-400 font-semibold">
                            &#8629;&nbsp;mid-set stop
                          </span>
                        )}
                      </div>

                      <div
                        data-testid={`final-target-${index + 1}`}
                        className="rounded-lg border border-current/15 bg-white/75 px-3 py-2 shadow-sm dark:bg-gray-900/50"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">
                          Final pull target
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-mono font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                            {finalSetId}
                          </span>
                          {finalCardNumber ? (
                            <span className="text-sm font-mono font-semibold">
                              {finalCardNumber}
                            </span>
                          ) : (
                            <span className="text-xs opacity-60">Entire last set</span>
                          )}
                        </div>
                        {finalCardName && (
                          <div className="mt-1 text-sm font-semibold leading-5">
                            {finalCardName}
                          </div>
                        )}
                        {slice.splitEndCard &&
                          slice.splitEndCard.quantityNeeded < slice.splitEndCard.quantityTotal && (
                            <div className="mt-1 text-xs opacity-75">
                              Pull {slice.splitEndCard.quantityNeeded} of{' '}
                              {slice.splitEndCard.quantityTotal} copies from this card.
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
