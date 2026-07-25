export type ColorTheme = 'light' | 'dark'

export function resolveInitialTheme(stored: string | null, prefersDark: boolean): ColorTheme {
  if (stored === 'light' || stored === 'dark') return stored
  return prefersDark ? 'dark' : 'light'
}

export function toggleColorTheme(theme: ColorTheme): ColorTheme {
  return theme === 'dark' ? 'light' : 'dark'
}
