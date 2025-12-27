# Changelog v1.1.0 (2025-12-27)

## Summary
Achieved tool parity with internal `browser-subagent`, expanding the toolset from 16 to 33 tools. Introduced multi-page (tab) management and low-level interaction capabilities.

## New Features
- ✅ **Multi-Page Support**: Added tools to list, open, switch, and close browser tabs.
  - `browser_list_pages`
  - `browser_new_page`
  - `browser_switch_page`
  - `browser_close_page`
- ✅ **Low-Level Interactions**: Added coordinate-based mouse control and generic keyboard press.
  - `browser_mouse_move`
  - `browser_mouse_click` (pixel-based)
  - `browser_mouse_drag`
  - `browser_mouse_wheel`
  - `browser_press_key` (generic, e.g., "Control+A", "Enter")
- ✅ **Navigation & Utility Tools**:
  - `browser_read_page` (metadata and content length)
  - `browser_reload`
  - `browser_go_back`
  - `browser_go_forward`
  - `browser_wait` (pause for specified duration)
  - `browser_hover`
  - `browser_focus`
  - `browser_select`

## Improvements
- 🛠️ **Multi-Tab Mechanism**: The server now tracks an `activePageIndex`, allowing tools to operate on specific tabs. All existing tools (screenshot, navigate, etc.) automatically use the currently active tab.
- 🛠️ **Smart Recloning**: Improved `connectToBrowser` logic for better tab handling and persistence.
- 🛠️ **Version Bump**: Server internal version and npm package updated to `1.1.0`.

## Testing
- Updated `test-browser-automation.js` to include new tool tests.
- Created `test-mcp-parity.js` for focused verification of new capabilities.
