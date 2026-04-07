import { useState, useCallback, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import FileList from './components/FileList'
import BatchResults from './components/BatchResults'
import SettingsPanel from './components/SettingsPanel'
import { parseCSV } from './utils/csvParser'
import { computeBatches } from './utils/batchCalculator'
import { loadSettings, saveSettings } from './utils/settings'
import { loadSession, saveSession, clearSession } from './utils/sessionStorage'
import type { AppSettings } from './utils/settings'
import type { ParsedFile, Batch, CardRow } from './types'

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function generateMasterCSV(files: ParsedFile[]): string {
  if (files.length === 0) return ''

  // Use the file with the most columns as the header source
  const referenceFile = files.reduce((a, b) => a.headers.length >= b.headers.length ? a : b)
  const headers = referenceFile.headers

  // Resolve output column indices from reference headers once
  const outTcgplayerIdIdx = headers.indexOf('TCGplayer Id')
  const outTotalQtyIdx = headers.indexOf('Total Quantity')
  const outAddQtyIdx = headers.indexOf('Add to Quantity')

  // Merge cards by TCGplayer Id
  const merged = new Map<string, CardRow>()
  for (const file of files) {
    for (const card of file.cards) {
      const key = card.tcgplayerId || card.number
      const existing = merged.get(key)
      if (existing) {
        existing.totalQuantity += card.totalQuantity
        existing.addQuantity += card.addQuantity
        existing.quantity += card.quantity
      } else {
        merged.set(key, { ...card, rawValues: [...card.rawValues] })
      }
    }
  }

  const entries = [...merged.values()].sort((a, b) => {
    const setCompare = a.setId.localeCompare(b.setId)
    return setCompare !== 0 ? setCompare : a.number.localeCompare(b.number)
  })

  const lines = [headers.map(csvEscape).join(',')]
  for (const card of entries) {
    const values = [...card.rawValues]
    while (values.length < headers.length) values.push('')
    // Explicitly write fields we parse so they're always correct regardless of column order
    if (outTcgplayerIdIdx >= 0) values[outTcgplayerIdIdx] = card.tcgplayerId
    if (outTotalQtyIdx >= 0) values[outTotalQtyIdx] = card.totalQuantity > 0 ? String(card.totalQuantity) : ''
    if (outAddQtyIdx >= 0) values[outAddQtyIdx] = card.addQuantity > 0 ? String(card.addQuantity) : ''
    lines.push(values.map(csvEscape).join(','))
  }
  return lines.join('\n')
}

export default function App() {
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [hasComputedResults, setHasComputedResults] = useState(false)
  const [hydratedSession, setHydratedSession] = useState(false)
  const [showRestoreNotice, setShowRestoreNotice] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function hydrateSession() {
      const session = await loadSession()
      if (cancelled) return

      if (session) {
        setFiles(session.files)
        setHasComputedResults(session.hasComputedResults)
        if (session.hasComputedResults) {
          setBatches(computeBatches(session.files, settings.maxCardsPerRun))
        }
        if (session.files.length > 0) {
          setShowRestoreNotice(true)
        }
      }

      setHydratedSession(true)
    }

    void hydrateSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydratedSession) return

    if (files.length === 0) {
      void clearSession()
      return
    }

    void saveSession({
      version: 1,
      files,
      hasComputedResults,
    })
  }, [files, hasComputedResults, hydratedSession])

  useEffect(() => {
    if (!showRestoreNotice) return

    const timeoutId = window.setTimeout(() => {
      setShowRestoreNotice(false)
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [showRestoreNotice])

  const handleSettingsChange = useCallback((next: AppSettings) => {
    setSettings(next)
    saveSettings(next)
    setBatches([])
    setHasComputedResults(false)
  }, [])

  const handleNewFiles = useCallback(async (newFileList: File[]) => {
    setLoading(true)
    setErrors([])

    const results = await Promise.all(
      newFileList.map(async (f) => {
        try {
          return { parsed: await parseCSV(f), error: null as string | null }
        } catch (e) {
          return { parsed: null as ParsedFile | null, error: (e as Error).message }
        }
      }),
    )

    const parsed = results.flatMap((result) => (result.parsed ? [result.parsed] : []))
    const errs = results.flatMap((result) => (result.error ? [result.error] : []))

    setFiles((prev) => {
      const existingNames = new Set(prev.map((p) => p.fileName))
      return [
        ...prev,
        ...parsed.filter((p) => !existingNames.has(p.fileName)),
      ]
    })
    setBatches([])
    setHasComputedResults(false)

    setErrors(errs)
    setLoading(false)
  }, [])

  const handleRemove = useCallback((fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.fileName !== fileName))
    setBatches([])
    setHasComputedResults(false)
  }, [])

  const handleReorder = useCallback((sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return

    setFiles((prev) => {
      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex >= prev.length ||
        targetIndex >= prev.length
      ) {
        return prev
      }

      const next = [...prev]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    setBatches([])
    setHasComputedResults(false)
  }, [])

  const handleRun = useCallback(() => {
    const nextBatches = computeBatches(files, settings.maxCardsPerRun)
    setBatches(nextBatches)
    setHasComputedResults(nextBatches.length > 0)
  }, [files, settings.maxCardsPerRun])

  const handleDownloadMasterCSV = useCallback(() => {
    const csv = generateMasterCSV(files)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
    a.download = `${timestamp}-Master.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [files])

  const handleClear = useCallback(() => {
    setFiles([])
    setBatches([])
    setErrors([])
    setHasComputedResults(false)
    void clearSession()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Roca Optimal Sort</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Second-pass global sort planner</p>
          </div>
          <button
            onClick={() => setShowSettings((v) => !v)}
            title="Settings"
            aria-label="Toggle settings"
            className={`p-2 rounded-lg transition-colors ${
              showSettings
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {showSettings && (
        <SettingsPanel settings={settings} onChange={handleSettingsChange} />
      )}

      <main className="max-w-5xl mx-auto px-6 py-8">
        <FileUpload onFiles={handleNewFiles} disabled={loading} />

        {showRestoreNotice && (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-lg text-sm text-emerald-800 dark:text-emerald-300">
            Restored your previous session from this browser.
          </div>
        )}

        {loading && (
          <div className="mt-4 text-center text-gray-600 dark:text-gray-300 animate-pulse">
            Parsing files...
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
            <p className="font-semibold text-red-800 dark:text-red-300 mb-1">Errors:</p>
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-red-700 dark:text-red-400">{e}</p>
            ))}
          </div>
        )}

        <FileList files={files} onRemove={handleRemove} onReorder={handleReorder} />

        {files.length === 1 && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
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
              onClick={handleDownloadMasterCSV}
              className="px-6 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 hover:border-green-300 dark:hover:border-green-700 transition-colors"
            >
              Download Master CSV
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {files.length > 0 && files.length < 2 && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleDownloadMasterCSV}
              className="px-6 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 hover:border-green-300 dark:hover:border-green-700 transition-colors"
            >
              Download Master CSV
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        <BatchResults batches={batches} files={files} maxCardsPerRun={settings.maxCardsPerRun} />
      </main>
    </div>
  )
}
