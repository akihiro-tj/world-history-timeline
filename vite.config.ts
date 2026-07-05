import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Why: Node 25+ は Web Storage API がデフォルト有効になり、vitest の jsdom 環境が
// window.localStorage を注入する仕組みと衝突して localStorage が undefined になる。
// Node 24 以前には存在しない挙動なので、該当バージョンでのみ無効化する。
const nodeMajorVersion = Number(process.versions.node.split('.')[0])
if (nodeMajorVersion >= 25) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--no-experimental-webstorage']
    .filter(Boolean)
    .join(' ')
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
