import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { testDataset } from '../test/fixtures'
import { DetailPanel } from './DetailPanel'

const edward = testDataset.entries.find((e) => e.id === 'edward-1')
if (!edward) throw new Error('fixture missing')

test('名前・期間・種別・所属・解説を表示する', () => {
  render(
    <DetailPanel entry={edward} dataset={testDataset} onSelect={() => {}} onClose={() => {}} />,
  )
  expect(screen.getByRole('heading', { name: 'エドワード1世' })).toBeInTheDocument()
  expect(screen.getByText(/1272年〜1307年/)).toBeInTheDocument()
  expect(screen.getByText(/統治者/)).toBeInTheDocument()
  expect(screen.getByText(/イングランド/)).toBeInTheDocument()
  expect(screen.getByText('テスト用エントリ。')).toBeInTheDocument()
})

test('同時代リストに他地域のエントリを表示する', () => {
  render(
    <DetailPanel entry={edward} dataset={testDataset} onSelect={() => {}} onClose={() => {}} />,
  )
  const list = screen.getByRole('list', { name: '同時代' })
  expect(list).toHaveTextContent('フビライ・ハン')
  expect(list).toHaveTextContent('北条時宗')
  expect(list).not.toHaveTextContent('フィリップ4世')
})

test('同時代エントリのクリックで onSelect が呼ばれる', async () => {
  const onSelect = vi.fn()
  render(
    <DetailPanel entry={edward} dataset={testDataset} onSelect={onSelect} onClose={() => {}} />,
  )
  await userEvent.click(screen.getByRole('button', { name: /フビライ・ハン/ }))
  expect(onSelect).toHaveBeenCalledWith('kublai-khan')
})

test('閉じるボタンで onClose が呼ばれる', async () => {
  const onClose = vi.fn()
  render(<DetailPanel entry={edward} dataset={testDataset} onSelect={() => {}} onClose={onClose} />)
  await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
  expect(onClose).toHaveBeenCalled()
})
