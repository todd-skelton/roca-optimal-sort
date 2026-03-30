import { useState, useCallback } from 'react'
import FileUpload from './components/FileUpload'
import FileList from './components/FileList'
import BatchResults from './components/BatchResults'
import { parseCSV } from './utils/csvParser'
import { computeBatches } from './utils/batchCalculator'
import type { ParsedFile, Batch } from './types'

export default function App() {
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleNewFiles = useCallback(async (newFileList: File[]) => {
    setLoading(true)
    setErrors([])

    const errs: string[] = []
    const parsed: ParsedFile[] = []

    await Promise.all(
      newFileList.map(async (f) => {
        try {
          const result = await parseCSV(f)
          parsed.push(result)
        } catch (e) {
          errs.push((e as Error).message)
        }
      }),
    )

    setFiles((prev) => {
      const existingNames = new Set(prev.map((p) => p.fileName))
      const merged = [
        ...prev,
        ...parsed.filter((p) => !existingNames.has(p.fileName)),
      ].sort((a, b) => a.fileName.localeCompare(b.fileName))
      const newBatches = merged.length >= 2 ? computeBatches(merged) : []
      setBatches(newBatches)
      return merged
    })

    setErrors(errs)
    setLoading(false)
  }, [])

  const handleRemove = useCallback((fileName: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.fileName !== fileName)
      setBatches(next.length >= 2 ? computeBatches(next) : [])
      return next
    })
  }, [])

  const handleReset = () => {
    setFiles([])
    setBatches([])
    setErrors([])
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roca Optimal Sort</h1>
            <p className="text-sm text-gray-500">Second-pass global sort planner</p>
          </div>
          {files.length > 0 && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <FileUpload onFiles={handleNewFiles} disabled={loading} />

        {loading && (
          <div className="mt-4 text-center text-gray-600 animate-pulse">
            Parsing files…
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-lg">
            <p className="font-semibold text-red-800 mb-1">Errors:</p>
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-red-700">{e}</p>
            ))}
          </div>
        )}

        <FileList files={files} onRemove={handleRemove} />

        {files.length === 1 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
            Add at least one more file to generate second-pass instructions.
          </div>
        )}

        <BatchResults batches={batches} files={files} />
      </main>
    </div>
  )
}
