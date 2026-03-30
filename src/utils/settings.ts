export interface AppSettings {
  maxCardsPerRun: number;
}

const SETTINGS_KEY = "roca-settings";

export const DEFAULT_SETTINGS: AppSettings = {
  maxCardsPerRun: 1000,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      maxCardsPerRun:
        typeof parsed.maxCardsPerRun === "number" && parsed.maxCardsPerRun > 0
          ? parsed.maxCardsPerRun
          : DEFAULT_SETTINGS.maxCardsPerRun,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
