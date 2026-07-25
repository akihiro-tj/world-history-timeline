import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

let prefersDark = false

// Lets tests simulate the OS-level dark mode setting that useColorTheme reads via matchMedia.
export function setPrefersDark(matches: boolean): void {
  prefersDark = matches
}

// jsdom doesn't implement window.matchMedia, so stub it for all tests
window.matchMedia ??= (query: string) =>
  ({
    matches: query === DARK_SCHEME_QUERY ? prefersDark : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

afterEach(() => {
  cleanup()
  prefersDark = false
})
