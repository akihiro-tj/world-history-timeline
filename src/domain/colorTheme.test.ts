import { describe, expect, test } from 'vitest'
import { resolveInitialTheme, toggleColorTheme } from './colorTheme'

describe('resolveInitialTheme', () => {
  test('保存値が dark なら OS 設定より優先する', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark')
  })

  test('保存値が light なら OS 設定より優先する', () => {
    expect(resolveInitialTheme('light', true)).toBe('light')
  })

  test('未保存で OS がダーク設定なら dark を返す', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
  })

  test('未保存で OS がライト設定なら light を返す', () => {
    expect(resolveInitialTheme(null, false)).toBe('light')
  })

  test('想定外の保存値は OS 設定にフォールバックする', () => {
    expect(resolveInitialTheme('sepia', true)).toBe('dark')
    expect(resolveInitialTheme('sepia', false)).toBe('light')
  })
})

describe('toggleColorTheme', () => {
  test('light から dark へ反転する', () => {
    expect(toggleColorTheme('light')).toBe('dark')
  })

  test('dark から light へ反転する', () => {
    expect(toggleColorTheme('dark')).toBe('light')
  })
})
