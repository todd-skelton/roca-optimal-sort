import type { ParsedFile } from '../types'

interface Props {
  files: ParsedFile[]
  onRemove: (fileName: string) => void
}

export default function FileList({ files, onRemove }: Props) {
  if (files.length === 0) return null

  const grandTotal = files.reduce((s, f) => s + f.totalCards, 0)
  const avg = Math.round(grandTotal / files.length)

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Loaded Stacks ({files.length})
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {grandTotal.toLocaleString()} total cards &middot; ~{avg.toLocaleString()} avg per stack
        </div>
      </div>
      <div className="grid gap-2">
        {files.map((f) => (
          <div
            key={f.fileName}
            className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 shadow-sm"
          >
            <div>
              <span className="font-mono text-sm text-gray-800 dark:text-gray-100">{f.fileName}</span>
              <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">
                {f.totalCards.toLocaleString()} cards &middot; {f.setIds.length} sets (
                {f.setIds[0]} &rarr; {f.setIds[f.setIds.length - 1]})
              </span>
            </div>
            <button
              onClick={() => onRemove(f.fileName)}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors text-lg leading-none"
              title="Remove file"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
