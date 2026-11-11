# Frontend Playwright E2E Tests

End-to-end browser test suite for `dashboard/index.html` and `dashboard/js/main.js` using `@playwright/test` and system Google Chrome (`channel: 'chrome'`).

## Install

```powershell
cd frontend_test
npm.cmd install
```

*(Uses the installed Google Chrome binary, so downloading Playwright's Chromium binary is not required.)*

## Run Tests

```powershell
cd frontend_test

# Run all 10 tests (headless)
npm.cmd test

# Run all 10 tests in a visible browser window
npm.cmd run test:headed

# Run Playwright interactive UI mode
npm.cmd run test:ui
```
