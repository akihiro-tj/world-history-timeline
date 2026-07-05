import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { testDataset } from '../test/fixtures'
import { TimelinePage } from './TimelinePage'

beforeEach(() => {
  localStorage.setItem('whtl:onboarding:v1', 'done')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const barHeight = (name: RegExp) =>
  Number(screen.getByRole('button', { name }).getAttribute('height'))

const clickFitAll = () => userEvent.click(screen.getByRole('button', { name: '全体表示' }))

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

test('初期表示は1500年周辺の tier 2 で、全体表示に切り替えると importance 2 は消える', async () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.getByRole('button', { name: /北条時宗/ })).toBeInTheDocument()
  await clickFitAll()
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
  await clickFitAll()
  fireEvent.scroll(screen.getByTestId('timeline-scroll'), { target: { scrollTop: 1000 } })
  const before = barHeight(/エドワード1世/)
  await userEvent.click(screen.getByRole('button', { name: '拡大' }))
  expect(barHeight(/エドワード1世/)).toBeGreaterThan(before)
})

test('拡大してその時代へスクロールすると importance 2 のエントリが現れる', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await clickFitAll()
  expect(screen.queryByRole('button', { name: /北条時宗/ })).not.toBeInTheDocument()
  const zoomIn = screen.getByRole('button', { name: '拡大' })
  for (let i = 0; i < 10; i++) {
    await userEvent.click(zoomIn)
  }
  fireEvent.scroll(screen.getByTestId('timeline-scroll'), {
    target: { scrollTop: (1268 - -800) * 8 - 400 },
  })
  expect(screen.getByRole('button', { name: /北条時宗/ })).toBeInTheDocument()
})

test('全体表示ボタンで俯瞰スケールに戻る', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await clickFitAll()
  const before = barHeight(/エドワード1世/)
  await userEvent.click(screen.getByRole('button', { name: '拡大' }))
  await clickFitAll()
  expect(barHeight(/エドワード1世/)).toBeCloseTo(before)
})

test('Ctrl+ホイールでズームする', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await clickFitAll()
  fireEvent.scroll(screen.getByTestId('timeline-scroll'), { target: { scrollTop: 1000 } })
  const before = barHeight(/エドワード1世/)
  fireEvent.wheel(screen.getByTestId('timeline-scroll'), {
    deltaY: -100,
    ctrlKey: true,
    clientY: 400,
  })
  expect(barHeight(/エドワード1世/)).toBeGreaterThan(before)
})

test('ホイールズームのアンカーはヘッダー高さを補正する', () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  fireEvent.scroll(scroll, { target: { scrollTop: 1000 } })
  fireEvent.wheel(scroll, { deltaY: -100, ctrlKey: true, clientY: 400 })
  expect(scroll.scrollTop).toBeCloseTo(1360 * 1.25 - 360)
})

test('バーをクリックすると詳細パネルが開き、閉じるで消える', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  expect(screen.getByRole('complementary', { name: '詳細' })).toBeInTheDocument()
  expect(screen.getByText('テスト用エントリ。')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
  expect(screen.queryByRole('complementary', { name: '詳細' })).not.toBeInTheDocument()
})

test('パネル表示中はズームボタンがパネルを避ける位置に移動する', async () => {
  render(<TimelinePage dataset={testDataset} />)
  const zoomIn = screen.getByRole('button', { name: '拡大' })
  expect(zoomIn.parentElement?.className).not.toContain('md:right-[336px]')
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  expect(zoomIn.parentElement?.className).toContain('md:right-[336px]')
})

test('パネルを閉じるとスクロール位置がコンテンツ範囲内にクランプされる', async () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  Object.defineProperty(scroll, 'scrollWidth', { value: 1000, configurable: true })
  Object.defineProperty(scroll, 'clientWidth', { value: 800, configurable: true })
  Object.defineProperty(scroll, 'scrollHeight', { value: 2000, configurable: true })
  Object.defineProperty(scroll, 'clientHeight', { value: 800, configurable: true })
  scroll.scrollLeft = 500
  await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
  expect(scroll.scrollLeft).toBe(200)
})

test('直接クリックでは隠れる場合のみ最小スクロールで可視領域に入れる', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await clickFitAll()
  const scroll = screen.getByTestId('timeline-scroll')
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  expect(scroll.scrollTop).toBeCloseTo((1272 - -800) * (2000 / 3000) - 400 + 16)
  expect(scroll.scrollLeft).toBe(0)
})

test('直接クリックで既に可視領域内なら画面は動かない', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await clickFitAll()
  const scroll = screen.getByTestId('timeline-scroll')
  const targetY = (1272 - -800) * (2000 / 3000) - 100
  fireEvent.scroll(scroll, { target: { scrollTop: targetY } })
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  expect(scroll.scrollTop).toBeCloseTo(targetY)
})

test('同時代リンクで選択が移動する', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await clickFitAll()
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  const list = screen.getByRole('list', { name: '同時代' })
  await userEvent.click(within(list).getByRole('button', { name: /フビライ・ハン/ }))
  expect(screen.getByRole('heading', { name: 'フビライ・ハン' })).toBeInTheDocument()
  expect(screen.getByTestId('timeline-scroll').scrollTop).toBeCloseTo(
    (1260 - -800) * (2000 / 3000) - 200,
  )
})

test('ジャンプはパネルを除いた可視領域の中心に縦横合わせる', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await clickFitAll()
  const scroll = screen.getByTestId('timeline-scroll')
  Object.defineProperty(scroll, 'clientWidth', { value: 600, configurable: true })
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), '終端')
  await userEvent.click(screen.getByRole('option', { name: /年表終端/ }))
  expect(scroll.scrollTop).toBeCloseTo((2100 - -800) * (2000 / 3000) - 200)
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
  await clickFitAll()
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
  expect(screen.queryByText('2200年')).not.toBeInTheDocument()
})

test('ユーザー操作前は実測高さで初期ズームを再導出する', () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  Object.defineProperty(scroll, 'clientHeight', { value: 400, configurable: true })
  fireEvent(window, new Event('resize'))
  expect(barHeight(/エドワード1世/)).toBeCloseTo(35 * (400 / 500), 1)
})

test('ズーム操作後はリサイズしても倍率を再導出しない', async () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  await userEvent.click(screen.getByRole('button', { name: '拡大' }))
  const zoomed = barHeight(/エドワード1世/)
  Object.defineProperty(scroll, 'clientHeight', { value: 400, configurable: true })
  fireEvent(window, new Event('resize'))
  expect(barHeight(/エドワード1世/)).toBeCloseTo(zoomed)
})

test('選択中エントリにアクセント色のリングが付く', async () => {
  const { container } = render(<TimelinePage dataset={testDataset} />)
  expect(container.querySelector('[stroke="var(--color-accent)"]')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  expect(container.querySelector('rect[stroke="var(--color-accent)"]')).toBeInTheDocument()
})

test('マウスドラッグでスクロールする', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await clickFitAll()
  const scroll = screen.getByTestId('timeline-scroll')
  fireEvent.pointerDown(scroll, {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    clientX: 200,
    clientY: 300,
  })
  fireEvent.pointerMove(scroll, { pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 250 })
  expect(scroll.scrollTop).toBe(50)
})

test('ドラッグ直後のクリックはエントリ選択にならない', async () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  const bar = screen.getByRole('button', { name: /エドワード1世/ })
  fireEvent.pointerDown(scroll, {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    clientX: 200,
    clientY: 300,
  })
  fireEvent.pointerMove(scroll, { pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 250 })
  fireEvent.pointerUp(window, { pointerId: 1 })
  fireEvent.click(bar)
  expect(screen.queryByRole('complementary', { name: '詳細' })).not.toBeInTheDocument()
  await userEvent.click(bar)
  expect(screen.getByRole('complementary', { name: '詳細' })).toBeInTheDocument()
})

test('初回訪問時はウェルカムオーバーレイを表示し、閉じると次回は出ない', async () => {
  localStorage.clear()
  const { unmount } = render(<TimelinePage dataset={testDataset} />)
  expect(screen.getByRole('dialog', { name: 'つかいかた' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'はじめる' }))
  expect(screen.queryByRole('dialog', { name: 'つかいかた' })).not.toBeInTheDocument()
  unmount()
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.queryByRole('dialog', { name: 'つかいかた' })).not.toBeInTheDocument()
})

test('ヘルプボタンでオーバーレイを再表示できる', async () => {
  localStorage.setItem('whtl:onboarding:v1', 'done')
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.queryByRole('dialog', { name: 'つかいかた' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'つかいかた' }))
  expect(screen.getByRole('dialog', { name: 'つかいかた' })).toBeInTheDocument()
})

test('スクロール残量のある方向に端フェードを表示する', () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  Object.defineProperty(scroll, 'scrollHeight', { value: 3000, configurable: true })
  Object.defineProperty(scroll, 'scrollWidth', { value: 2000, configurable: true })
  Object.defineProperty(scroll, 'clientHeight', { value: 800, configurable: true })
  Object.defineProperty(scroll, 'clientWidth', { value: 600, configurable: true })
  fireEvent.scroll(scroll, { target: { scrollTop: 100 } })
  expect(screen.getByTestId('fade-top')).toBeInTheDocument()
  expect(screen.getByTestId('fade-bottom')).toBeInTheDocument()
  expect(screen.getByTestId('fade-right')).toBeInTheDocument()
  expect(screen.queryByTestId('fade-left')).not.toBeInTheDocument()
})

test('スクロールせずにズームしても端フェードが更新される', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await clickFitAll()
  const scroll = screen.getByTestId('timeline-scroll')
  Object.defineProperty(scroll, 'scrollHeight', { value: 3000, configurable: true })
  Object.defineProperty(scroll, 'clientHeight', { value: 800, configurable: true })
  Object.defineProperty(scroll, 'scrollWidth', { value: 2000, configurable: true })
  Object.defineProperty(scroll, 'clientWidth', { value: 600, configurable: true })
  expect(screen.queryByTestId('fade-bottom')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '拡大' }))
  expect(screen.getByTestId('fade-bottom')).toBeInTheDocument()
  expect(screen.getByTestId('fade-right')).toBeInTheDocument()
})

test('初期表示では国名の2段目ヘッダーが見え、全体表示では消える', async () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.getByText('イングランド')).toBeInTheDocument()
  await clickFitAll()
  expect(screen.queryByText('イングランド')).not.toBeInTheDocument()
})
