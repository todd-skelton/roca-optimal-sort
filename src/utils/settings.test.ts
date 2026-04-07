import { describe, expect, it, beforeEach } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings'

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when nothing is saved', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to defaults for malformed or invalid settings', () => {
    localStorage.setItem('roca-settings', '{not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)

    localStorage.setItem('roca-settings', JSON.stringify({ maxCardsPerRun: -10 }))
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('persists and reloads saved settings', () => {
    saveSettings({ maxCardsPerRun: 2400 })

    expect(localStorage.getItem('roca-settings')).toBe(JSON.stringify({ maxCardsPerRun: 2400 }))
    expect(loadSettings()).toEqual({ maxCardsPerRun: 2400 })
  })
})
