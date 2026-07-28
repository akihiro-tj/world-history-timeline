import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// Why: Node 25+ は Web Storage API がデフォルト有効になり、vitest の jsdom 環境が
// window.localStorage を注入する仕組みと衝突して localStorage が undefined になる。
// Node 24 以前には存在しない挙動なので、該当バージョンでのみ無効化する。
const nodeMajorVersion = Number(process.versions.node.split('.')[0])

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    execArgv: nodeMajorVersion >= 25 ? ['--no-experimental-webstorage'] : [],
    // Why: playwright-bdd generates *.feature.spec.js files that use the
    // Playwright test runner's own test.describe, which vitest's default
    // include glob would otherwise pick up and fail to run.
    exclude: [...configDefaults.exclude, '.features-gen/**', 'tests/e2e/**'],
  },
})
