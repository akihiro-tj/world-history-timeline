import { defineConfig, devices } from '@playwright/test'
import { defineBddProject } from 'playwright-bdd'

const isCI = !!process.env.CI
// Why: CI serves the production build (`vite preview`, default port 4173) built
// earlier in the same job, while local runs reuse a fast dev server (`vite dev`,
// default port 5173) so `pnpm dev` left running is picked up instead of restarted.
const port = isCI ? 4173 : 5173
const baseURL = `http://localhost:${port}`

const featuresAndSteps = {
  features: 'tests/e2e/features/**/*.feature',
  steps: 'tests/e2e/steps/**/*.ts',
}

export default defineConfig({
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: isCI ? 'pnpm preview' : 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !isCI,
  },
  projects: [
    {
      ...defineBddProject({
        name: 'desktop',
        ...featuresAndSteps,
        tags: 'not @mobile',
      }),
      use: { ...devices['Desktop Chrome'] },
    },
    {
      ...defineBddProject({
        name: 'mobile',
        ...featuresAndSteps,
        tags: '@mobile',
      }),
      use: { ...devices['Pixel 7'] },
    },
  ],
})
