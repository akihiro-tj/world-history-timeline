import { useCallback, useLayoutEffect, useState } from 'react'
import { type ColorTheme, resolveInitialTheme, toggleColorTheme } from '../domain/colorTheme'

const DARK_SCHEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

// Warning: this key is duplicated in index.html's pre-hydration script, which sets
// data-color-theme before React mounts to avoid a flash of the wrong theme.
// Keep both in sync if this key ever changes.
const STORAGE_KEY = 'whtl:color-theme:v1'

function readStoredTheme(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredTheme(theme: ColorTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Do nothing here — the theme still applies for this session even if it can't persist
  }
}

function prefersDarkColorScheme(): boolean {
  return window.matchMedia(DARK_SCHEME_MEDIA_QUERY).matches
}

export function useColorTheme() {
  const [theme, setTheme] = useState<ColorTheme>(() =>
    resolveInitialTheme(readStoredTheme(), prefersDarkColorScheme()),
  )

  useLayoutEffect(() => {
    document.documentElement.dataset.colorTheme = theme
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = toggleColorTheme(prev)
      writeStoredTheme(next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
