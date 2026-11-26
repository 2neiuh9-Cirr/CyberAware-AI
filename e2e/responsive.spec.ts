import { test } from '@playwright/test';
import { checkResponsiveJourney } from './responsive-journey';

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`Chromium public journeys fit ${viewport.width}px viewport`, async ({ page }) => {
    await checkResponsiveJourney(page, viewport);
  });
}
