# Changelog - v1.3.0 (2025-12-27)

This is a major architectural release that modularizes the entire codebase for better maintainability, testing, and extensibility.

## ⭐ New Features

- **Modular Architecture**: The codebase is now organization into focused modules in `src/`:
  - `src/index.js`: Main entry point and MCP protocol handler
  - `src/browser.js`: Centralized browser connection and state management
  - `src/tools/`: Dedicated modules for each tool category (navigation, interaction, media, etc.)
  - `src/utils.js`: Shared utilities
- **Plugin System**: New `plugins/` directory allows adding specialized tool modules that are auto-discovered by `src/tools/index.js`.
- **Improved Test Suite**: Tests are now organized in the `tests/` directory with `fixtures/`.
- **Reduced Bundle Size**: The main entry point is now cleaner and easier to maintain.

## 🛠 Refactoring

- **Source Code**: Moved all source code from the root directory to `src/`.
- **Entry Point**: Replaced the monolithic `browser-mcp-server-playwright.js` with `src/index.js`.
- **Tool Logic**: Extracted tool implementations from the main server file into:
  - `src/tools/navigation.js`
  - `src/tools/interaction.js`
  - `src/tools/media.js`
  - `src/tools/system.js`
  - `src/tools/console.js`
  - `src/tools/info.js`
  - `src/tools/mouse.js`
  - `src/tools/keyboard.js`
  - `src/tools/pages.js`
- **Utilities**: Extracted `debugLog`, `loadPlaywright`, and `findChromeExecutable` to `src/utils.js`.

## 🧹 Cleanup

- Removed the legacy `browser-mcp-server-playwright.js` wrapper file.
- Removed old `.tgz` build artifacts.
- Updated `package.json` to point `main` and `bin` to `src/index.js`.

## 🧪 Testing

- Verified all 36 tools function correctly after modularization.
- Verified MCP protocol communication.
- Verified browser connection strategies (Antigravity, System Chrome, Playwright).
