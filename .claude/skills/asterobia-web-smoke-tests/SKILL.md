---
name: asterobia-web-smoke-tests
description: Automated browser testing (Playwright) for regression checks using the Web Testing Skill principles.
---

# Asterobia Web Smoke Tests Skill

## When to use
- When creating new end-to-end (E2E) tests.
- When verifying "Smoke Test" criteria.
- Use to automate browser interactions (load page, click button, check canvas).

## Toolkit
-   **Playwright / Puppeteer**: For headless browser control.
-   **Vitest / Jest**: For assertions.

## Smoke Test Pattern
A good smoke test for Asterobia:
1.  **Launch**: Open `http://localhost:8081`.
2.  **Load**: Wait for `canvas` element and "Game Loaded" console log.
3.  **Interact**:
    -   Simulate keypress (e.g., `Escape` for menu).
    -   Click elements (HUD buttons).
4.  **Verify**:
    -   Check for JS errors in console.
    -   Check for critical DOM elements (`#r011-dev-hud`).
    -   (Advanced) Capture screenshot for visual regression.

## Usage Example (Playwright)
```javascript
import { test, expect } from '@playwright/test';

test('Game Loads Successfully', async ({ page }) => {
  await page.goto('http://localhost:8081');
  
  // Wait for canvas
  await page.waitForSelector('canvas');
  
  // Check for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.error(`PAGE ERROR: ${msg.text()}`);
  });
  
  // Check title
  await expect(page).toHaveTitle(/Asterobia/);
});
```

## Performance Testing
-   Use `chrome-devtools` protocol (CDP) to capture performance traces.
-   Measure FPS stability if possible (or check for lag spikes).
