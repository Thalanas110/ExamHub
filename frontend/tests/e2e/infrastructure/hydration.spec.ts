import { expect, test } from '@playwright/test';
import { createAllData, mockDataAll } from '../../fixtures/mock-api';

test('root route hydrates without replacing the server-rendered document', async ({ page }) => {
  const hydrationMessages: string[] = [];

  page.on('console', message => {
    if (message.type() === 'error' && /hydration/i.test(message.text())) {
      hydrationMessages.push(message.text());
    }
  });
  page.on('pageerror', error => {
    if (/hydration/i.test(error.message)) {
      hydrationMessages.push(error.message);
    }
  });

  await mockDataAll(page, createAllData());
  await page.goto('/');

  await expect(page.getByText('Exams that are hard')).toBeVisible();
  expect(hydrationMessages).toEqual([]);
});
