# Changelog - Version 1.0.2

## Release Date
2025-12-26

## Summary
Enhanced browser detection and standalone mode support. The MCP server now intelligently searches for and uses system Chrome/Chromium installations, eliminating the need for redundant browser downloads.

## New Features

### 1. Smart Chrome/Chromium Detection
- **New function**: `findChromeExecutable()` searches for Chrome/Chromium in common system locations
- **Search locations**:
  - Linux: `/usr/bin/google-chrome`, `/usr/bin/chromium`, `/usr/bin/chromium-browser`, `/snap/bin/chromium`
  - macOS: `/Applications/Google Chrome.app`, `/Applications/Chromium.app`
  - Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
  - Also uses `which` command as fallback on Unix systems

### 2. Three-Tier Browser Strategy
The server now tries browsers in this order:
1. **Antigravity Mode**: Connect to existing Chrome on port 9222 (if available)
2. **System Browser**: Use system-installed Chrome/Chromium (if found)
3. **Playwright Chromium**: Fall back to Playwright's Chromium (if installed)

### 3. Improved Error Messages
When no browser is found, users get clear, actionable instructions:

```
❌ No Chrome/Chromium browser found!

This MCP server needs a Chrome or Chromium browser to work.

Option 1 - Install Chrome/Chromium on your system:
  • Ubuntu/Debian: sudo apt install google-chrome-stable
  • Ubuntu/Debian: sudo apt install chromium-browser
  • Fedora: sudo dnf install google-chrome-stable
  • macOS: brew install --cask google-chrome
  • Or download from: https://www.google.com/chrome/

Option 2 - Install Playwright's Chromium:
  npm install playwright
  npx playwright install chromium

Option 3 - Use with Antigravity:
  Open Antigravity and click the Chrome logo (top right) to start the browser.
  This MCP server will automatically connect to it.
```

## Bug Fixes

### 1. Browser Reconnection
- Fixed browser disconnection detection
- Improved reconnection logic after browser crashes or closures

## Changes

### package.json
- Moved Playwright from `peerDependencies` to `dependencies` (^1.57.0)
- Removed `postinstall` script (no longer auto-installs Chromium)
- Users can now choose: system Chrome, Chromium, or Playwright Chromium

### browser-mcp-server-playwright.js
- Added `findChromeExecutable()` function (+43 lines)
- Enhanced browser launch logic with Chrome detection
- Improved error handling with context-aware messages
- Better debug logging for troubleshooting

## Benefits

✅ **No Redundant Downloads**: Uses existing Chrome/Chromium installations
✅ **Disk Space Savings**: Avoids downloading ~275MB Playwright Chromium if system browser exists
✅ **Faster Installation**: No browser download during npm install
✅ **Better UX**: Clear error messages guide users to solutions
✅ **Flexible**: Works with Antigravity, system browsers, OR Playwright Chromium
✅ **Cross-Platform**: Supports Linux, macOS, and Windows

## Compatibility

- **Node.js**: >=16.0.0
- **Playwright**: ^1.57.0
- **Browsers**: Chrome, Chromium, or Playwright Chromium

## Testing

All 16 browser automation tools tested and verified:
- ✅ browser_navigate
- ✅ browser_click
- ✅ browser_screenshot
- ✅ browser_get_text
- ✅ browser_type
- ✅ browser_evaluate
- ✅ browser_wait_for_selector
- ✅ browser_scroll
- ✅ browser_resize_window
- ✅ browser_get_dom
- ✅ browser_start_video_recording
- ✅ browser_stop_video_recording
- ✅ browser_health_check
- ✅ browser_console_start
- ✅ browser_console_get
- ✅ browser_console_clear

## Migration Guide

### From v1.0.1 to v1.0.2

**No action required!** The update is fully backward compatible.

**If you had Playwright Chromium installed:**
- It will still work as a fallback
- But the server will prefer your system Chrome/Chromium if available

**If you didn't have any browser:**
- The new error messages will guide you through installation options
- Choose the option that works best for your system

## Debug Logs

Server logs are written to: `/tmp/mcp-browser-server.log`

Example log output:
```
Found Chrome at: /usr/bin/google-chrome
Using system Chrome/Chromium: /usr/bin/google-chrome
✅ Successfully launched new Chrome instance (Standalone mode)
```
