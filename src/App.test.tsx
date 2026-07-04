import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('タイトルを表示する', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: '世界史タイムライン' })).toBeInTheDocument()
})
