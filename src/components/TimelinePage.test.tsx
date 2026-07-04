import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { testDataset } from '../test/fixtures'
import { TimelinePage } from './TimelinePage'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('地域ヘッダーを order 順に表示する', () => {
  render(<TimelinePage dataset={testDataset} />)
  const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
  expect(headers).toEqual(['西欧', '東アジア', '日本'])
})

test('importance 1 のエントリをバーとして描画する', () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.getByRole('button', { name: 'エドワード1世 1272年〜1307年' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'フビライ・ハン 1260年〜1294年' })).toBeInTheDocument()
})

test('初期ズーム（全体表示）では importance 2 を描画しない', () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.queryByRole('button', { name: /北条時宗/ })).not.toBeInTheDocument()
})

test('点イベントを ◆ マーカーとして描画する', () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.getByRole('button', { name: 'アナーニ事件 1303年' })).toBeInTheDocument()
})

test('開始年の差がバーの Y 座標に反映される', () => {
  render(<TimelinePage dataset={testDataset} />)
  const edward = screen.getByRole('button', { name: /エドワード1世/ })
  const kublai = screen.getByRole('button', { name: /フビライ・ハン/ })
  const yOf = (el: HTMLElement) => Number(el.getAttribute('y'))
  expect(yOf(kublai)).toBeLessThan(yOf(edward))
})

test('年目盛を表示する', () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.getAllByText('前500年').length).toBeGreaterThan(0)
  expect(screen.getAllByText('1000年').length).toBeGreaterThan(0)
})
