import { useRef, useState } from 'react'
import type { ParsedFile } from '../types'

interface Props {
  files: ParsedFile[]
  onRemove: (fileName: string) => void
  onReorder: (sourceIndex: number, targetIndex: number) => void
}

export default function FileList({ files, onRemove, onReorder }: Props) {
  const draggedIndexRef = useRef<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)

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
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Drag and drop stacks to set the processing order for runs and the master CSV.
      </p>
      <div className="grid gap-2">
        {files.map((f, index) => (
          <div
            key={f.fileName}
            draggable
            onDragStart={(event) => {
              draggedIndexRef.current = index
              setDropTargetIndex(index)
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', f.fileName)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              if (dropTargetIndex !== index) {
                setDropTargetIndex(index)
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (draggedIndexRef.current !== null) {
                onReorder(draggedIndexRef.current, index)
              }
              draggedIndexRef.current = null
              setDropTargetIndex(null)
            }}
            onDragEnd={() => {
              draggedIndexRef.current = null
              setDropTargetIndex(null)
            }}
            className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-sm cursor-move transition-colors ${
              dropTargetIndex === index
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300"
                aria-hidden="true"
              >
                {index + 1}
              </div>
              <div className="text-gray-400 dark:text-gray-500" aria-hidden="true">
                &#9776;
              </div>
              <div className="min-w-0">
                <span className="font-mono text-sm text-gray-800 dark:text-gray-100 break-all">{f.fileName}</span>
                <span className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {f.totalCards.toLocaleString()} cards &middot; {f.setIds.length} sets (
                  {f.setIds[0]} &rarr; {f.setIds[f.setIds.length - 1]})
                </span>
              </div>
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
