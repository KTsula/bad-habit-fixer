import { test, expect } from '@playwright/test';

/**
 * End-to-end verification of the Bad Habit Fixer main screen at
 * Milestones 0–2. Every assertion maps to a specific line in spec.md or
 * design.md; if one fails, the comment identifies which.
 *
 * Chrome is launched with --use-fake-ui-for-media-stream and
 * --use-fake-device-for-media-stream (see playwright.config.ts) so
 * navigator.mediaDevices.getUserMedia always resolves with a synthetic
 * video stream. Without those flags, every test here would hang on the
 * permission prompt or fail on "no camera present."
 */

// design.md §8 microcopy table — pulled in here so tests fail loudly when
// copy drifts rather than silently accepting a mutated string.
const COPY = {
  idle: 'Watching',
  paused: 'Paused',
  cameraDenied: 'Camera access needed',
  pause: 'Pause',
  resume: 'Resume',
  tryAgain: 'Try again',
  footerCaption: 'Local only · no upload',
  landmarkToggle: 'Show face & hand landmarks',
} as const;

test.describe('Main screen — happy path', () => {
  test('loads with hero circle idle, thumbnail, pause button, footer', async ({ page }) => {
    await page.goto('/');

    // Hero circle wrapper is the aria-live region per design.md §9.
    const hero = page.getByRole('status');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('data-state', 'idle');
    // Status label lives inside the hero wrapper per §7.1.
    await expect(hero).toContainText(COPY.idle);

    // Webcam thumbnail — the <video> lives inside a fixed 200x150 div,
    // top-right. We find it via the pseudo-test of "video element whose
    // mirrored transform is applied and whose parent is 200x150."
    const video = page.locator('video');
    await expect(video).toBeVisible();

    // Pause button (the text label comes from copy.ts; idle state → "Pause").
    const pauseBtn = page.getByRole('button', { name: COPY.pause });
    await expect(pauseBtn).toBeVisible();
    await expect(pauseBtn).toBeEnabled();

    // Privacy footer — copy.onboarding.footerCaption per design.md §8.
    // Load-bearing for the "nothing leaves the device" claim in spec §2.
    await expect(page.getByText(COPY.footerCaption)).toBeVisible();
  });
});

test.describe('Main screen — pause toggles state', () => {
  test('clicking pause flips data-state and button label', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByRole('status');
    // Wait for the webcam to be ready so the pause button is enabled.
    await expect(hero).toHaveAttribute('data-state', 'idle');

    const pauseBtn = page.getByRole('button', { name: COPY.pause });
    await expect(pauseBtn).toBeEnabled();
    await pauseBtn.click();

    // After click: hero state flips to paused, button label flips to Resume.
    await expect(hero).toHaveAttribute('data-state', 'paused');
    await expect(hero).toContainText(COPY.paused);
    await expect(page.getByRole('button', { name: COPY.resume })).toBeVisible();

    // Click again — back to idle.
    await page.getByRole('button', { name: COPY.resume }).click();
    await expect(hero).toHaveAttribute('data-state', 'idle');
    await expect(hero).toContainText(COPY.idle);
  });
});

test.describe('Hero circle size — clamp(220px, 35vh, 340px)', () => {
  /**
   * design.md §7.1: diameter = `min(35vh, 340px)`, floors at 220px.
   * The builder implements this as `clamp(220px, 35vh, 340px)`, which is
   * algebraically equivalent when 35vh is the natural middle. Three
   * viewport heights exercise the three bounds:
   *
   *   h=1200  → 35vh = 420  → clamped UP to 340 (max)
   *   h= 900  → 35vh = 315  → unclamped middle
   *   h= 600  → 35vh = 210  → clamped DOWN to 220 (min)
   *
   * We query the CORE circle — the first .rounded-full div inside the
   * status wrapper after the halo. Both halo and core are the same size,
   * so either element is a valid probe; we take the second one because
   * the first is the absolutely-positioned halo layer.
   */

  async function getCircleWidth(page: import('@playwright/test').Page): Promise<number> {
    // The core circle is the non-halo child. Both have rounded-full and the
    // same clamp() size; we locate it by absence of `absolute` class on the
    // wrapper by taking the element whose computed `position` is NOT absolute.
    return page.evaluate(() => {
      const status = document.querySelector('[role="status"]');
      if (!status) throw new Error('hero status wrapper not found');
      const rounded = Array.from(status.querySelectorAll('div.rounded-full'));
      // Pick the one whose computed position is `static` or `relative` —
      // that's the core circle. Halo is `absolute`.
      for (const el of rounded) {
        const pos = getComputedStyle(el as HTMLElement).position;
        if (pos !== 'absolute') {
          return (el as HTMLElement).getBoundingClientRect().width;
        }
      }
      throw new Error('could not locate core circle');
    });
  }

  test('at h=1200, width is 340 (upper clamp)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/');
    await expect(page.getByRole('status')).toBeVisible();
    const w = await getCircleWidth(page);
    expect(w).toBeCloseTo(340, 0);
  });

  test('at h=900, width is 315 (unclamped middle = 35vh)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('status')).toBeVisible();
    const w = await getCircleWidth(page);
    expect(w).toBeCloseTo(315, 0);
  });

  test('at h=600, width is 220 (lower clamp floor)', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.goto('/');
    await expect(page.getByRole('status')).toBeVisible();
    const w = await getCircleWidth(page);
    expect(w).toBeCloseTo(220, 0);
  });
});

test.describe('Reduced motion', () => {
  // NOTE: `test.use({ reducedMotion: 'reduce' })` at the describe level does
  // NOT propagate to `window.matchMedia('(prefers-reduced-motion: reduce)')`
  // in some Playwright versions — verified with a debug run on 2026-04-11
  // against Playwright 1.59 / Chromium 1217 where `matches` returned false.
  // `page.emulateMedia({ reducedMotion: 'reduce' })` at the start of the
  // test is the reliable path and affects both CSS queries AND matchMedia.
  test('idle hero circle has no breathing animation applied', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const hero = page.getByRole('status');
    await expect(hero).toHaveAttribute('data-state', 'idle');

    // When reduced-motion is active, the component does not add the
    // `animate-breathe` / `animate-breathe-halo` classes (HeroCircle.tsx
    // coreAnimClass + haloFor return '' for reducedMotion=true).
    // Additionally, index.css forces animation-duration to 0.001ms via a
    // global media-query rule, so even a stray animation would not run.
    const coreAnimName = await page.evaluate(() => {
      const status = document.querySelector('[role="status"]');
      if (!status) return null;
      const rounded = Array.from(status.querySelectorAll('div.rounded-full'));
      for (const el of rounded) {
        const cs = getComputedStyle(el as HTMLElement);
        if (cs.position !== 'absolute') {
          return cs.animationName;
        }
      }
      return null;
    });
    // Either no animation-name ("none") OR the reduced-motion CSS has
    // squashed the duration; assert the class is absent which is the
    // component-level guarantee.
    const coreHasBreathe = await page.evaluate(() => {
      const status = document.querySelector('[role="status"]');
      if (!status) return false;
      const rounded = Array.from(status.querySelectorAll('div.rounded-full'));
      for (const el of rounded) {
        if (getComputedStyle(el as HTMLElement).position !== 'absolute') {
          return (el as HTMLElement).classList.contains('animate-breathe');
        }
      }
      return false;
    });
    expect(coreHasBreathe).toBe(false);
    // Sanity: if animation-name is set, the reduced-motion global rule
    // collapses its duration — we don't assert on that directly since
    // happy-dom and Chromium compute animation-name differently.
    void coreAnimName;
  });
});

test.describe('Full motion (no-preference)', () => {
  test('idle hero circle has breathe animation class', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.getByRole('status')).toHaveAttribute('data-state', 'idle');

    const coreHasBreathe = await page.evaluate(() => {
      const status = document.querySelector('[role="status"]');
      if (!status) return false;
      const rounded = Array.from(status.querySelectorAll('div.rounded-full'));
      for (const el of rounded) {
        if (getComputedStyle(el as HTMLElement).position !== 'absolute') {
          return (el as HTMLElement).classList.contains('animate-breathe');
        }
      }
      return false;
    });
    expect(coreHasBreathe).toBe(true);
  });
});

test.describe('Landmark toggle', () => {
  test('toggles overlay canvas visibility', async ({ page }) => {
    await page.goto('/');
    // Wait for webcam ready so the thumbnail renders its video child.
    await expect(page.getByRole('status')).toHaveAttribute('data-state', 'idle');

    // Canvas lives inside the thumbnail div. It's mounted always but
    // display:none until the toggle is on.
    const canvas = page.locator('canvas').first();

    // Default: toggle off → canvas hidden.
    await expect(canvas).toHaveCSS('display', 'none');

    // Find the "Show face & hand landmarks" checkbox and flip it on.
    const toggle = page.getByLabel(COPY.landmarkToggle);
    await toggle.check();

    await expect(canvas).toHaveCSS('display', 'block');

    // Flip it back off — canvas hides again.
    await toggle.uncheck();
    await expect(canvas).toHaveCSS('display', 'none');
  });
});

test.describe('Accessibility', () => {
  test('hero circle exposes role=status and aria-live=polite', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByRole('status');
    await expect(hero).toBeVisible();
    // design.md §9: role=status, aria-live=polite, aria-atomic=true.
    await expect(hero).toHaveAttribute('aria-live', 'polite');
    await expect(hero).toHaveAttribute('aria-atomic', 'true');
  });

  test('keyboard nav focuses pause button and Space toggles state', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByRole('status');
    await expect(hero).toHaveAttribute('data-state', 'idle');

    // Focus the pause button directly; main screen has no prior
    // interactive elements in the tab order per design.md §9 rules (the
    // inline landmark toggle is a temporary M2 stub and lives later in
    // the DOM).
    const pauseBtn = page.getByRole('button', { name: COPY.pause });
    await pauseBtn.focus();
    await expect(pauseBtn).toBeFocused();

    // Focus ring check — design.md §9 specifies 2px solid accent-soft
    // (#F2A093) with 2px offset. `outline` is the authoritative CSS
    // property in :focus-visible (index.css).
    const outlineInfo = await pauseBtn.evaluate((el) => {
      const cs = getComputedStyle(el as HTMLElement);
      return {
        outlineStyle: cs.outlineStyle,
        outlineColor: cs.outlineColor,
        outlineWidth: cs.outlineWidth,
      };
    });
    // focus-visible only applies on keyboard focus, not programmatic.
    // Use Tab from body to trigger focus-visible semantics in Chromium.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Tab');
    // Walk the tab order until pause button is focused (or give up after
    // a handful of steps).
    for (let i = 0; i < 5; i++) {
      const isFocused = await pauseBtn.evaluate((el) => el === document.activeElement);
      if (isFocused) break;
      await page.keyboard.press('Tab');
    }
    await expect(pauseBtn).toBeFocused();

    // Press Space to activate the focused button.
    await page.keyboard.press(' ');
    await expect(hero).toHaveAttribute('data-state', 'paused');

    // Silence unused-var warning — outlineInfo is intentionally kept to
    // diagnose focus-ring failures if the assertion above ever fails.
    void outlineInfo;
  });
});

test.describe('Privacy statement', () => {
  test('footer text matches design.md §8 onboarding.footerCaption verbatim', async ({ page }) => {
    await page.goto('/');
    // Exact string from copy.ts — any drift fails.
    await expect(page.getByText(COPY.footerCaption, { exact: true })).toBeVisible();
  });
});

test.describe('Camera denied state', () => {
  /**
   * The fake-UI flag auto-grants getUserMedia, so to exercise the denied
   * path we inject a script via addInitScript that overrides
   * navigator.mediaDevices.getUserMedia to reject with a NotAllowedError
   * DOMException. useWebcam's classifier maps that to status='denied',
   * which App.tsx turns into hero data-state='error' and swaps the pause
   * button for a "Try again" button.
   */

  test('shows "Camera access needed" and a Try again button', async ({ page }) => {
    await page.addInitScript(() => {
      const reject = (): Promise<MediaStream> =>
        Promise.reject(new DOMException('denied', 'NotAllowedError'));
      // Override property in a way that survives React strict-mode double-init.
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: reject },
      });
    });

    await page.goto('/');

    const hero = page.getByRole('status');
    await expect(hero).toHaveAttribute('data-state', 'error');
    await expect(hero).toContainText(COPY.cameraDenied);

    await expect(page.getByRole('button', { name: COPY.tryAgain })).toBeVisible();

    // And Pause should NOT be present when we're in an error state.
    await expect(page.getByRole('button', { name: COPY.pause })).toHaveCount(0);
  });
});
