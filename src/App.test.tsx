import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'
import { stubFetch, testDataset } from './test/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('ロード完了までローディングを表示する', async () => {
  stubFetch(testDataset)
  render(<App />)
  expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  expect(await screen.findByRole('columnheader', { name: '西欧' })).toBeInTheDocument()
})

test('fetch 失敗でエラーと再試行ボタンを表示し、再試行で回復する', async () => {
  const failing = vi.fn(async () => new Response('oops', { status: 500 }))
  vi.stubGlobal('fetch', failing)
  render(<App />)
  const retry = await screen.findByRole('button', { name: '再試行' })
  stubFetch(testDataset)
  await userEvent.click(retry)
  expect(await screen.findByRole('columnheader', { name: '西欧' })).toBeInTheDocument()
})
