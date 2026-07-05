import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { testDataset } from '../test/fixtures'
import { TimelinePage } from './TimelinePage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const barHeight = (name: RegExp) =>
  Number(screen.getByRole('button', { name }).getAttribute('height'))

test('トップバーにタイトルと検索ボックスを表示する', () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.getByRole('heading', { name: '世界史タイムライン' })).toBeInTheDocument()
  expect(screen.getByRole('banner')).toContainElement(
    screen.getByRole('searchbox', { name: '検索' }),
  )
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

test('拡大ボタンでバーが高くなる', async () => {
  render(<TimelinePage dataset={testDataset} />)
  fireEvent.scroll(screen.getByTestId('timeline-scroll'), { target: { scrollTop: 1000 } })
  const before = barHeight(/エドワード1世/)
  await userEvent.click(screen.getByRole('button', { name: '拡大' }))
  expect(barHeight(/エドワード1世/)).toBeGreaterThan(before)
})

test('拡大してその時代へスクロールすると importance 2 のエントリが現れる', async () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.queryByRole('button', { name: /北条時宗/ })).not.toBeInTheDocument()
  const zoomIn = screen.getByRole('button', { name: '拡大' })
  for (let i = 0; i < 10; i++) {
    await userEvent.click(zoomIn)
  }
  fireEvent.scroll(screen.getByTestId('timeline-scroll'), {
    target: { scrollTop: (1268 - -700) * 8 - 400 },
  })
  expect(screen.getByRole('button', { name: /北条時宗/ })).toBeInTheDocument()
})

test('全体表示ボタンで初期スケールに戻る', async () => {
  render(<TimelinePage dataset={testDataset} />)
  const before = barHeight(/エドワード1世/)
  await userEvent.click(screen.getByRole('button', { name: '拡大' }))
  await userEvent.click(screen.getByRole('button', { name: '全体表示' }))
  expect(barHeight(/エドワード1世/)).toBeCloseTo(before)
})

test('Ctrl+ホイールでズームする', () => {
  render(<TimelinePage dataset={testDataset} />)
  fireEvent.scroll(screen.getByTestId('timeline-scroll'), { target: { scrollTop: 1000 } })
  const before = barHeight(/エドワード1世/)
  fireEvent.wheel(screen.getByTestId('timeline-scroll'), {
    deltaY: -100,
    ctrlKey: true,
    clientY: 400,
  })
  expect(barHeight(/エドワード1世/)).toBeGreaterThan(before)
})

test('バーをクリックすると詳細パネルが開き、閉じるで消える', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  expect(screen.getByRole('complementary', { name: '詳細' })).toBeInTheDocument()
  expect(screen.getByText('テスト用エントリ。')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
  expect(screen.queryByRole('complementary', { name: '詳細' })).not.toBeInTheDocument()
})

test('同時代リンクで選択が移動する', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  const list = screen.getByRole('list', { name: '同時代' })
  await userEvent.click(within(list).getByRole('button', { name: /フビライ・ハン/ }))
  expect(screen.getByRole('heading', { name: 'フビライ・ハン' })).toBeInTheDocument()
  expect(screen.getByTestId('timeline-scroll').scrollTop).toBeCloseTo(
    (1260 - -700) * (2000 / 2800) - 200,
  )
})

test('ジャンプはパネルを除いた可視領域の中心に縦横合わせる', async () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  Object.defineProperty(scroll, 'clientWidth', { value: 600, configurable: true })
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), '終端')
  await userEvent.click(screen.getByRole('option', { name: /年表終端/ }))
  expect(scroll.scrollTop).toBeCloseTo((2100 - -700) * (2000 / 2800) - 200)
  expect(scroll.scrollLeft).toBeCloseTo(632 - 64 - (600 - 64) / 2)
})

test('検索候補の選択で詳細パネルが開く', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), 'マルコ')
  await userEvent.click(screen.getByRole('option', { name: /マルコ・ポーロ/ }))
  expect(screen.getByRole('heading', { name: 'マルコ・ポーロ' })).toBeInTheDocument()
})

test('検索で選択した非表示階層のエントリもハイライトされる', async () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.queryByRole('button', { name: /北条時宗/ })).not.toBeInTheDocument()
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), '北条')
  await userEvent.click(screen.getByRole('option', { name: /北条時宗/ }))
  expect(screen.getByRole('button', { name: '北条時宗 1268年〜1284年' })).toBeInTheDocument()
})

test('年軸はデータ範囲までで、それを超える年は表示しない', () => {
  render(<TimelinePage dataset={{ ...testDataset, config: { minYear: -3000, maxYear: 3000 } }} />)
  expect(screen.getAllByText('2000年').length).toBeGreaterThan(0)
  expect(screen.queryByText('2500年')).not.toBeInTheDocument()
  expect(screen.queryByText('3000年')).not.toBeInTheDocument()
})
