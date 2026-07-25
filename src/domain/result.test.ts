import { expect, test } from 'vitest'
import { err, ok, type Result } from './result'

test('ok は成功値を保持する Result を返す', () => {
  const result: Result<number, string> = ok(1)
  expect(result).toEqual({ ok: true, value: 1 })
})

test('err は失敗値を保持する Result を返す', () => {
  const result: Result<number, string> = err('failed')
  expect(result).toEqual({ ok: false, error: 'failed' })
})
