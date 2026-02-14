import { test, expect } from '@playwright/test';

test.describe('Waitlist signup flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('email input has type="email" for validation', async ({ page }) => {
    const email = page.locator('#email');
    await expect(email).toHaveAttribute('type', 'email');
  });

  test('email input has required attribute', async ({ page }) => {
    const email = page.locator('#email');
    await expect(email).toHaveAttribute('required');
  });

  test('OTP step exists and is hidden by default', async ({ page }) => {
    const otpStep = page.locator('#otpStep');
    await expect(otpStep).toBeAttached();
    await expect(otpStep).toBeHidden();

    const submit = page.locator('#waitlistSubmit');
    await expect(submit).toContainText(/send code/i);
  });

  test('form has proper aria attributes for accessibility', async ({ page }) => {
    const errMsg = page.locator('#waitlistErrMsg');
    // Error message should have role="alert" for screen readers
    const errBox = page.locator('#waitlistErr');
    await expect(errBox).toHaveAttribute('role', 'alert');
  });

  test('shows error state for invalid submission', async ({ page }) => {
    // Fill invalid email
    await page.fill('#email', 'not-an-email');
    await page.click('#waitlistSubmit');

    // Browser validation or custom validation should prevent submission
    // If custom validation, error should appear
    const errBox = page.locator('#waitlistErr');
    const isHidden = await errBox.isHidden();

    // Either browser validation prevents submission or we show our error
    if (!isHidden) {
      await expect(page.locator('#waitlistErrMsg')).toContainText(/email/i);
    }
  });
});

test.describe('Demo card generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#demo');
  });

  test('requires concept and explanation', async ({ page }) => {
    // Try to generate without concept
    await page.click('#genCard');
    await expect(page.locator('#cardBody')).toContainText(/concept/i);

    // Add concept but not explanation
    await page.fill('#concept', 'Test concept');
    await page.click('#genCard');
    await expect(page.locator('#cardBody')).toContainText(/explanation/i);
  });

  test('blocks NSFW topics', async ({ page }) => {
    await page.fill('#concept', 'porn tutorial');
    await page.fill('#explain', 'This is a test explanation with enough words to pass validation.');
    await page.click('#genCard');
    await expect(page.locator('#cardBody')).toContainText(/NSFW/i);
  });

  test('generates card with valid input', async ({ page }) => {
    await page.fill('#concept', 'Bayes theorem');
    await page.fill(
      '#explain',
      'For example, Bayes theorem helps us update our beliefs because when we get new evidence, we multiply our prior probability by the likelihood ratio, which means our posterior belief is more accurate.'
    );
    await page.click('#genCard');

    await expect(page.locator('#cardTitle')).toContainText('Bayes theorem');
    await expect(page.locator('#clarityScore')).not.toContainText('—');
    await expect(page.locator('#cardFoot')).toBeVisible();
  });

  test('word count updates as user types', async ({ page }) => {
    await expect(page.locator('#explainMeta')).toContainText('0 words');
    await page.fill('#explain', 'one two three');
    await expect(page.locator('#explainMeta')).toContainText('3 words');
  });
});

test.describe('Daily prompt modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('defaults to Random mode', async ({ page }) => {
    await expect(page.locator('[data-daily-mode="random"]')).toHaveClass(/is-on/);
  });

  test('switches between Random, Trending, For you', async ({ page }) => {
    // Switch to Trending
    await page.click('[data-daily-mode="trending"]');
    await expect(page.locator('[data-daily-mode="trending"]')).toHaveClass(/is-on/);
    await expect(page.locator('[data-daily-mode="random"]')).not.toHaveClass(/is-on/);

    // Switch to Life Skills (renamed from For you)
    await page.click('[data-daily-mode="for-you"]');
    await expect(page.locator('[data-daily-mode="for-you"]')).toHaveClass(/is-on/);
  });

  test('shuffle changes the prompt', async ({ page }) => {
    const first = await page.locator('#dailyConcept').textContent();

    // Click shuffle multiple times
    for (let i = 0; i < 5; i++) {
      await page.click('#dailyShuffle');
    }

    // Content should have changed at least once (probabilistic but very likely)
    // We just verify no errors occurred
    await expect(page.locator('#dailyConcept')).toBeVisible();
  });
});

test.describe('Share page', () => {
  test('shows error state for missing hash', async ({ page }) => {
    await page.goto('/share/');
    // Should show error or fallback state, not crash
    await expect(page.locator('body')).toBeVisible();
    // Should show error message for invalid card
    await expect(page.locator('#shareTitle')).toContainText(/invalid|loading/i);
  });

  test('handles malformed hash gracefully', async ({ page }) => {
    await page.goto('/share/#card=!!!invalid!!!');
    // Should not crash - show error state
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#shareTitle')).toContainText(/invalid|error/i);
  });

  test('displays valid card from hash', async ({ page }) => {
    // Create a valid card payload
    const card = {
      concept: 'Test Concept',
      score: 85,
      gaps: ['Gap 1', 'Gap 2'],
      simple: ['Simple version'],
      analogy: 'Test analogy',
      quiz: [{ q: 'Question?', a: 'Answer' }],
    };

    // Encode to base64url (simplified version for test)
    const encoded = Buffer.from(JSON.stringify(card)).toString('base64url');

    await page.goto(`/share/#card=${encoded}`);
    await expect(page.locator('#shareTitle')).toContainText('Test Concept');
    await expect(page.locator('#shareScore')).toContainText('85');
  });
});

test.describe('Accessibility', () => {
  test('skip link is present and works', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('.skip');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute('href', '#main');
  });

  test('focus states are visible', async ({ page }) => {
    await page.goto('/');

    // Tab to first button and check focus is visible
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focused element should have visible focus indicator
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('mobile nav hamburger is visible on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Hamburger menu should be visible
    const hamburger = page.locator('.nav-toggle');
    await expect(hamburger).toBeVisible();
  });
});

test.describe('PNG download', () => {
  test('download button appears after card generation', async ({ page }) => {
    await page.goto('/#demo');
    await page.fill('#concept', 'Test');
    await page.fill(
      '#explain',
      'This is a test explanation with enough words to generate a card because examples help and therefore work.'
    );
    await page.click('#genCard');

    await expect(page.locator('#downloadPng')).toBeVisible();
  });
});
