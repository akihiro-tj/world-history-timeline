import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { testDataset } from '../test/fixtures'
import { SearchBar } from './SearchBar'

test('名前入力で候補を表示し、選択で onSelectEntry が呼ばれる', async () => {
  const onSelectEntry = vi.fn()
  render(
    <SearchBar
      entries={testDataset.entries}
      onJumpToYear={() => {}}
      onSelectEntry={onSelectEntry}
    />,
  )
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), 'マルコ')
  await userEvent.click(screen.getByRole('option', { name: /マルコ・ポーロ/ }))
  expect(onSelectEntry).toHaveBeenCalledWith('marco-polo')
})

test('年入力で Enter するとジャンプする', async () => {
  const onJumpToYear = vi.fn()
  render(
    <SearchBar
      entries={testDataset.entries}
      onJumpToYear={onJumpToYear}
      onSelectEntry={() => {}}
    />,
  )
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), '1300{Enter}')
  expect(onJumpToYear).toHaveBeenCalledWith(1300)
})

test('「前300」で紀元前にジャンプする', async () => {
  const onJumpToYear = vi.fn()
  render(
    <SearchBar
      entries={testDataset.entries}
      onJumpToYear={onJumpToYear}
      onSelectEntry={() => {}}
    />,
  )
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), '前300{Enter}')
  expect(onJumpToYear).toHaveBeenCalledWith(-300)
})

test('候補選択後は入力と候補がクリアされる', async () => {
  render(
    <SearchBar entries={testDataset.entries} onJumpToYear={() => {}} onSelectEntry={() => {}} />,
  )
  const input = screen.getByRole('searchbox', { name: '検索' })
  await userEvent.type(input, 'マルコ')
  await userEvent.click(screen.getByRole('option', { name: /マルコ・ポーロ/ }))
  expect(input).toHaveValue('')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

test('プレースホルダーに名前と年の例を示す', () => {
  render(
    <SearchBar entries={testDataset.entries} onJumpToYear={() => {}} onSelectEntry={() => {}} />,
  )
  expect(screen.getByPlaceholderText('名前または年（例: 信長 / 1600）')).toBeInTheDocument()
})
