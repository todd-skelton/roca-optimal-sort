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
      return merged
    })
    setBatches([])

    setErrors(errs)
    setLoading(false)
  }, [])

  const handleRemove = useCallback((fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.fileName !== fileName))
    setBatches([])
  }, [])

  const handleRun = useCallback(() => {
    setBatches(computeBatches(files))
  }, [files])

  const handleClear = () => {
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

        {files.length >= 2 && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleRun}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Run
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-2 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {files.length > 0 && files.length < 2 && (
          <div className="mt-6">
            <button
              onClick={handleClear}
              className="px-6 py-2 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        <BatchResults batches={batches} files={files} />
      </main>
    </div>
  )
}
