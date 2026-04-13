import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Bad Habit Fixer e2e tests.
 *
 * Camera fakery
 * -------------
 * `--use-fake-ui-for-media-stream` auto-grants getUserMedia without showing
 * a prompt (which would hang headless runs). `--use-fake-device-for-media-stream`
 * makes Chrome synthesize a moving pattern instead of touching a real camera
 * — essential for CI and any run without a physical webcam attached.
 *
 * Both flags must be passed at the browser-launch level via `launchOptions.args`.
 * `permissions` on the context is a belt-and-suspenders grant in case the flag
 * is stripped by a Playwright upgrade.
 *
 * Web server
 * ----------
 * Playwright boots `vite preview` against the built bundle so tests run against
 * the same output that `npm run build` produces. This catches build-only
 * regressions that dev mode would hide.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // avoid camera-device contention across workers
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
    permissions: ['camera'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
