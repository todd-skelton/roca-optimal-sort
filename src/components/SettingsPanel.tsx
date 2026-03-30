import type { AppSettings } from '../utils/settings'

interface Props {
  settings: AppSettings
  onChange: (settings: AppSettings) => void
}

export default function SettingsPanel({ settings, onChange }: Props) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
          Settings
        </h2>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">Max cards per run</span>
            <input
              type="number"
              min={100}
              step={100}
              value={settings.maxCardsPerRun}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (v > 0) onChange({ ...settings, maxCardsPerRun: v })
              }}
              className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Runs that would exceed this limit are split, even mid-set if needed.
            Changes are saved automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
