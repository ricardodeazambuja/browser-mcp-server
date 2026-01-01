# Changelog - v1.5.0 (2026-01-01)

- ✅ **The "Token Diet" Architecture**: Implemented a Micro-Kernel design reducing the initial footprint to only 6 core tools.
- ✅ **Dynamic Module Loading**: Added the ability to load/unload power-user modules (Network, Performance, Security, etc.) on-demand via `browser_manage_modules`.
- ✅ **MCP Push Notifications**: Server now signals the client to refresh the tool list using `notifications/tools/list_changed` for a seamless "learning" experience.
- ✅ **Tool Consolidation**: Merged click, type, hover, scroll, and focus into a single `browser_action` tool.
- ✅ **Major Cleanup**: Centralized configuration, removed redundant boilerplate with the `withPage` wrapper, and eliminated "AI slop" (useless comments).
- ✅ **Enhanced Stability**: Refactored all 8 test suites to support the new architecture and use local fixtures to avoid flaky network tests.
- ✅ **Refined Documentation**: Completely updated help system and README to reflect the modular system.
