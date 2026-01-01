# Browser MCP Server

A universal browser automation MCP server using Playwright. Control Chrome programmatically through the Model Context Protocol.

**63 powerful browser automation tools** including multi-tab management, media monitoring/control, low-level interaction, session recording, CDP-based performance profiling, network analysis, security testing, and on-demand documentation.

## Features

- ✅ **Smart Chrome Detection**: Automatically finds and uses system Chrome/Chromium
- ✅ **Three-Tier Strategy**: Antigravity Chrome → System Chrome → Playwright Chromium
- ✅ **Universal**: Works with Antigravity, Claude Desktop, and any MCP client
- ✅ **63 Tools**: Media control, multi-tab, pixel-based interaction, CDP power user tools, and more
- ✅ **On-Demand Docs**: Built-in documentation tool with return schemas and examples
- ✅ **Auto-Install**: Playwright installed automatically via npm (no manual setup)
- ✅ **Safe**: Isolated browser profile (won't touch your personal Chrome)
- ✅ **Console Capture**: Debug JavaScript errors in real-time
- ✅ **Session Recording**: Playwright traces with screenshots, DOM, and network activity
- ✅ **Auto-Reconnect**: Handles browser crashes gracefully

## Quick Reference

| Installation Method | Best For | Setup Time |
|-------------------|----------|------------|
| **NPM Package** | Production use, easy updates | 30 seconds |
| **Clone Repository** | Development, contributing | 2 minutes |
| **Direct Download** | Quick testing, minimal setup | 1 minute |

| MCP Client | Config File Location |
|------------|---------------------|
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)<br>`%APPDATA%/Claude/claude_desktop_config.json` (Windows) |
| **Antigravity** | `~/.gemini/antigravity/mcp_config.json` |
| **Claude Code** | Use `claude mcp add` command |
| **Gemini CLI** | Use `gemini mcp add` command |

**Key Points:**
- ✅ Requires Node.js >= 16.0.0
- ✅ Playwright installs automatically (via npm) or manually (via git clone)
- ✅ Automatically detects and uses system Chrome/Chromium
- ✅ Uses absolute paths in config files
- ✅ Isolated browser profile (won't touch personal Chrome)
- ✅ Restart MCP client after config changes

## Quick Start

### Installation

#### Method 1: NPM Package (Recommended)

```bash
# Install globally (Playwright installs automatically)
npm install -g @ricardodeazambuja/browser-mcp-server

# Or use directly with npx (no installation needed)
npx @ricardodeazambuja/browser-mcp-server
```

**Note:** Playwright is installed automatically as a dependency. The server will automatically detect and use your system Chrome/Chromium if available, or fall back to Playwright's Chromium.

#### Method 2: Clone Repository (For Development)

```bash
# Clone the repository
git clone https://github.com/ricardodeazambuja/browser-mcp-server.git
cd browser-mcp-server

# Install dependencies (includes Playwright)
npm install

# Optional: Install Chromium browser if not using system Chrome
npx playwright install chromium
```

#### Method 3: Direct Download (Single File)

```bash
# Download the main file directly (no git required)
curl -o src/index.js \
  https://raw.githubusercontent.com/ricardodeazambuja/browser-mcp-server/main/src/index.js

# Install Playwright
npm install playwright

# Optional: Install Chromium browser if not using system Chrome
npx playwright install chromium
```

### Usage with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

**Using local installation:**
```json
{
  "mcpServers": {
    "browser-tools": {
      "command": "node",
      "args": ["/absolute/path/to/src/index.js"]
    }
  }
}
```

**Using NPM:**
```json
{
  "mcpServers": {
    "browser-tools": {
      "command": "npx",
      "args": ["-y", "@ricardodeazambuja/browser-mcp-server"]
    }
  }
}
```

**Note:** Replace `/absolute/path/to/` with the actual path where you installed the file.

### Usage with Antigravity

Add to `~/.gemini/antigravity/mcp_config.json`:

**Using local installation:**
```json
{
  "mcpServers": {
    "browser-tools": {
      "command": "node",
      "args": ["/home/username/.gemini/antigravity/src/index.js"]
    }
  }
}
```

**Using NPM:**
```json
{
  "mcpServers": {
    "browser-tools": {
      "command": "npx",
      "args": ["-y", "@ricardodeazambuja/browser-mcp-server"]
    }
  }
}
```

Then refresh MCP servers in Antigravity.

### Usage with Claude Code

Add the browser-mcp-server using the Claude CLI:

**Using local installation:**
```bash
# Install the MCP server with default isolated profile
claude mcp add --transport stdio browser \
  -- node /absolute/path/to/src/index.js

# Or with custom browser profile for more control
claude mcp add --transport stdio browser \
  --env MCP_BROWSER_PROFILE=/path/to/custom/profile \
  -- node /absolute/path/to/src/index.js
```

**Using NPM:**
```bash
# Install using npx (no local installation needed)
claude mcp add --transport stdio browser \
  -- npx -y @ricardodeazambuja/browser-mcp-server

# With custom browser profile
claude mcp add --transport stdio browser \
  --env MCP_BROWSER_PROFILE=/path/to/custom/profile \
  -- npx -y @ricardodeazambuja/browser-mcp-server
```

**Verify installation:**
```bash
# List all MCP servers
claude mcp list

# Check server status
claude mcp get browser
```

**Example usage in Claude Code:**

```bash
# Natural language commands
> Navigate to https://example.com and take a screenshot
> Click the login button and fill in the username field
> What's the text in the .main-content selector?

# Direct tool invocation via slash commands
> /mcp__browser__browser_navigate https://example.com
> /mcp__browser__browser_screenshot
```

**Note:** The server uses an isolated browser profile at `/tmp/chrome-mcp-profile` by default, ensuring it won't access your personal Chrome cookies or data.

### Usage with Gemini CLI

Add the browser-mcp-server using the Gemini CLI commands:

**Using local installation:**
```bash
# Install the MCP server with default isolated profile
gemini mcp add browser node /absolute/path/to/src/index.js

# Or with custom browser profile
gemini mcp add -e MCP_BROWSER_PROFILE=/path/to/custom/profile browser \
  node /absolute/path/to/src/index.js
```

**Using NPM:**
```bash
# Install using npx (no local installation needed)
gemini mcp add browser npx -y @ricardodeazambuja/browser-mcp-server

# With custom browser profile
gemini mcp add -e MCP_BROWSER_PROFILE=/path/to/custom/profile browser \
  npx -y @ricardodeazambuja/browser-mcp-server
```

**Management commands:**
```bash
# List all configured MCP servers
gemini mcp list

# Remove the server if needed
gemini mcp remove browser
```

**Example usage in Gemini CLI:**

```bash
# Natural language commands
> Navigate to https://github.com and take a screenshot
> Click the search button and type "MCP servers"
> Get the text from the .repository-content selector

# The CLI will use the browser automation tools automatically
```

**Advanced options:**

```bash
# Add with specific scope (user vs project)
gemini mcp add -s user browser node /path/to/src/index.js

# Add with timeout configuration
gemini mcp add --timeout 30000 browser node /path/to/src/index.js

# Skip tool confirmation prompts (use with caution)
gemini mcp add --trust browser node /path/to/src/index.js
```

## 🚀 Dynamic Module System (The "Token Diet")

To save tokens and reduce the cognitive load on the LLM, this server uses a **Micro-Kernel architecture**. Only 6 core tools are loaded by default. All other 57+ power-user tools are available as on-demand modules.

### The "Minimalist 6" Core (Always Available)
1. **browser_docs(toolName?)** - Discovery & detailed on-demand documentation
2. **browser_manage_modules(action, module?)** - List, load, or unload power-user modules
3. **browser_navigate(url)** - Navigate to a URL
4. **browser_action(action, selector?, text?, x?, y?)** - Consolidated interaction (click, type, hover, scroll, focus)
5. **browser_screenshot(fullPage?)** - Capture visual feedback
6. **browser_evaluate(code)** - JavaScript execution escape hatch

### How to use Power-User Tools
When the LLM needs advanced features, it dynamically "learns" them by loading a module:

```javascript
// 1. List available modules
browser_manage_modules({ action: 'list' })

// 2. Load the network module
browser_manage_modules({ action: 'load', module: 'network' })

// 3. Now 7 new network tools are available in the context!
browser_net_start_monitoring({})
```

---

## Available Modules

### 🌐 Network Analysis (`network`)
- **browser_net_start_monitoring** - Monitor network requests
- **browser_net_get_requests** - Get captured requests with timing
- **browser_net_stop_monitoring** - Stop monitoring and clear log
- **browser_net_export_har** - Export HTTP Archive log
- **browser_net_get_websocket_frames** - Inspect WebSocket frames
- **browser_net_set_request_blocking** - Block URL patterns
- **browser_net_emulate_conditions** - Network throttling

### 🔬 Performance Profiling (`performance`)
- **browser_perf_start_profile** - Start CPU profiling
- **browser_perf_stop_profile** - Get CPU profile data
- **browser_perf_take_heap_snapshot** - Capture memory snapshot
- **browser_perf_get_heap_usage** - JS heap statistics
- **browser_perf_get_metrics** - Runtime metrics
- **browser_perf_get_performance_metrics** - Web vitals (FCP, LCP, etc.)
- **browser_perf_start_coverage** - Track code coverage
- **browser_perf_stop_coverage** - Get coverage results

### 🔒 Security Testing (`security`)
- **browser_sec_get_security_headers** - Inspect security headers
- **browser_sec_get_certificate_info** - TLS/SSL certificate details
- **browser_sec_detect_mixed_content** - Find insecure resources
- **browser_sec_start_csp_monitoring** - Monitor CSP violations
- **browser_sec_get_csp_violations** - Get violation log
- **browser_sec_stop_csp_monitoring** - Stop monitoring

### 💾 Storage & Service Workers (`storage`)
- **browser_storage_get_indexeddb** - Inspect IndexedDB
- **browser_storage_get_cache_storage** - List Cache Storage entries
- **browser_storage_delete_cache** - Delete cache
- **browser_storage_get_service_workers** - Service worker state
- **browser_storage_unregister_service_worker** - Unregister worker

### 🎵 Media Awareness & Control (`media`)
- **browser_get_media_summary** - List all audio/video elements
- **browser_get_audio_analysis** - Analyze audio (volume, spectrum)
- **browser_control_media** - Play, pause, mute, seek

### 🛠️ Advanced Tools (`advanced`)
- **Multi-Tab**: `browser_list_pages`, `browser_new_page`, `browser_switch_page`, `browser_close_page`
- **Low-Level**: `browser_mouse_move`, `browser_mouse_click`, `browser_mouse_drag`, `browser_mouse_wheel`, `browser_press_key`
- **Console**: `browser_console_start`, `browser_console_get`, `browser_console_clear`
- **Utilities**: `browser_wait`, `browser_resize_window`, `browser_wait_for_selector`, `browser_health_check`
- **Recording**: `browser_start_video_recording`, `browser_stop_video_recording`
- **Extra Extraction**: `browser_get_text`, `browser_get_dom`, `browser_read_page`
- **Legacy Navigation**: `browser_reload`, `browser_go_back`, `browser_go_forward`

---

## 📖 On-Demand Documentation

The `browser_docs` tool provides comprehensive documentation for all browser tools **without increasing token overhead** in normal operations.

### Why This Matters

- **Token Efficient**: Tool descriptions stay concise (saving tokens on every request)
- **Comprehensive**: Detailed docs available when needed (return schemas, examples, caveats)
- **Self-Documenting**: AI agents can discover tool capabilities on-demand

### What You Get

When calling `browser_docs(toolName)`, you receive:
- **Parameter Details**: Types, optionality, defaults, enums
- **Return Value Schemas**: Exact structure of what the tool returns
- **Selector Syntax**: How to write Playwright selectors (CSS, text, data attributes)
- **Important Caveats**: Warnings about CORS, clearing behavior, state management
- **Practical Examples**: Real-world usage patterns

### Usage

```javascript
// Get docs for a specific tool
browser_docs({ toolName: 'browser_get_audio_analysis' })

// List all available tools
browser_docs({})

// Invalid tool name suggests similar tools
browser_docs({ toolName: 'navigate' })
// → Did you mean: browser_navigate, browser_go_back, ...
```

### Example Output

```
📖 browser_type(selector, text)

Type text into an input field.

Parameters:
  • selector (string, required) - Playwright selector for the input
  • text (string, required) - Text to type

Returns:
  { content: [{ type: 'text', text: 'Typed into <selector>' }] }

⚠️ Important:
  • Uses page.fill() which CLEARS the field first, then types
  • Does NOT append to existing text

Example:
  browser_type({ selector: '#username', text: 'john@example.com' })
```

## Examples

### Navigate and Screenshot
```javascript
// Agent uses:
browser_navigate("https://example.com")
browser_screenshot(fullPage: true)
```

### Debug JavaScript Errors
```javascript
// Agent uses:
browser_console_start()
browser_navigate("https://myapp.com")
browser_click("#submit-button")
browser_console_get(filter: "error")
// Shows: ❌ [ERROR] Uncaught TypeError: ...
```

### Media Monitoring & Control
```javascript
// Agent uses:
browser_navigate("https://youtube.com/watch?v=...")
browser_get_media_summary() // See active video state
browser_control_media(selector: "video", action: "play")
browser_get_audio_analysis(durationMs: 2000) // "Hear" the volume
```

### Multi-Tab Automation
```javascript
// Agent uses:
browser_navigate("https://wikipedia.org")
browser_new_page("https://google.com")
browser_list_pages() // Shows 2 pages
browser_switch_page(0) // Back to Wikipedia
```

### Pixel-Based Interaction
```javascript
// Agent uses:
browser_mouse_move(500, 300)
browser_mouse_click(button: "right")
browser_press_key("Enter")
```

### Get Tool Documentation
```javascript
// Agent uses:
browser_docs(toolName: "browser_get_audio_analysis")
// Returns:
// 📖 browser_get_audio_analysis(durationMs?, selector?)
//
// Parameters:
//   • durationMs (number, optional) - Duration to analyze in ms (default: 2000)
//   • selector (string, optional) - Selector for specific media element
//
// Returns: { isSilent: boolean, averageVolume: number, ... }
// ⚠️ Important: Requires CORS headers for cross-origin media

// List all tools:
browser_docs()  // Shows all 63 tools
```

## How It Works

### Three-Tier Browser Strategy (Automatic)

The server automatically chooses the best browser option:

**Tier 1 - Antigravity Mode:**
- Detects Chrome on port 9222
- Connects to existing Antigravity browser
- Uses Antigravity's browser profile
- No new browser window

**Tier 2 - System Chrome/Chromium:**
- Searches common locations: `/usr/bin/google-chrome`, `/usr/bin/chromium`, etc.
- Uses system-installed Chrome if found
- Saves ~275MB (no Chromium download needed)
- Uses isolated profile (`/tmp/chrome-mcp-profile`)

**Tier 3 - Playwright Chromium:**
- Falls back to Playwright's bundled Chromium
- Requires: `npx playwright install chromium`
- Uses isolated profile (`/tmp/chrome-mcp-profile`)
- New browser window appears

### Safety Features

- **Isolated Profile**: Uses `/tmp/chrome-mcp-profile` (not your personal Chrome!)
- **No Setup Dialogs**: Silent startup with `--no-first-run` flags
- **Clean Environment**: No extensions, sync, or background updates
- **Reproducible**: Same behavior across systems

## Security

This MCP server provides powerful browser automation capabilities. Please review these security considerations:

### Isolated Browser Profile
- Uses `/tmp/chrome-mcp-profile` by default (configurable via `MCP_BROWSER_PROFILE`)
- **Does NOT access your personal Chrome data** (cookies, passwords, history)
- Each instance runs in a clean, isolated environment

### Tool Safety

**browser_evaluate**: Executes arbitrary JavaScript in the browser context
- Code runs in browser sandbox (no access to your host system)
- Only executes when explicitly called by MCP client
- Requires user approval in most MCP clients
- **Recommendation**: Only use with trusted MCP clients and review code when possible

**browser_navigate**: Navigates to any URL
- Can visit any website the browser can access
- Uses isolated profile to prevent cookie/session theft
- **Recommendation**: Be cautious with URLs from untrusted sources

### Debug Logs
- Server logs to `/tmp/mcp-browser-server.log`
- Logs may contain visited URLs and error messages
- Log file is cleared on system reboot (stored in `/tmp`)
- **Does NOT log** page content or sensitive data

### Best Practices
- ✅ Only use with trusted MCP clients (Claude Desktop, Antigravity, etc.)
- ✅ Review automation scripts before execution when possible
- ✅ Use the default isolated profile (don't point to your personal Chrome)
- ✅ Report security issues via [GitHub Issues](https://github.com/ricardodeazambuja/browser-mcp-server/issues)

## Configuration

### Environment Variables

```bash
# Custom browser profile location (optional)
export MCP_BROWSER_PROFILE="$HOME/.mcp-browser-profile"

# Then run the server
node src/index.js
```

### MCP Config with Environment Variables

```json
{
  "mcpServers": {
    "browser-tools": {
      "command": "node",
      "args": ["/path/to/src/index.js"],
      "env": {
        "MCP_BROWSER_PROFILE": "/tmp/my-custom-profile"
      }
    }
  }
}
```

## Troubleshooting

### "No Chrome/Chromium browser found"

The server provides helpful error messages with multiple solutions:

**Option 1 - Install system Chrome/Chromium (Recommended):**
```bash
# Ubuntu/Debian
sudo apt install google-chrome-stable
# or
sudo apt install chromium-browser

# Fedora
sudo dnf install google-chrome-stable

# macOS
brew install --cask google-chrome
```

**Option 2 - Install Playwright's Chromium:**
```bash
npm install playwright
npx playwright install chromium
```

**Option 3 - Use with Antigravity:**
- Click the Chrome logo (top right) to launch browser
- The MCP server will automatically connect

### Check Server Status

Use the `browser_health_check` tool to verify:
- Which mode is active (Antigravity / System Chrome / Playwright Chromium)
- Playwright source
- Browser profile location
- Current page URL

### Check Server Status

Use the `browser_health_check` tool to verify:
- Connection mode (Antigravity vs Standalone)
- Playwright source
- Browser profile location
- Current page URL

## Development

### Project Structure

```
browser-mcp-server/
├── src/index.js                      # Main server entry point
├── src/                              # Source code
│   ├── index.js                      # Main server class
│   ├── browser.js                    # Browser management
│   ├── tools/                        # Tool modules
│   └── utils.js                      # Utilities
├── tests/                            # Test suite
├── plugins/                          # Plugin directory
├── package.json                      # npm package config
├── README.md                         # This file
└── LICENSE                           # MIT license
```

### Testing

```bash
# Test server initialization
npm test

# Manual test
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node src/index.js
```

### Debug Logging

Check `/tmp/mcp-browser-server.log` for detailed logs:
- Playwright loading attempts
- Browser connection/launch status
- Console capture events
- Tool execution

## Technical Details

### MCP Protocol
- Implements MCP 2024-11-05 protocol
- JSON-RPC 2.0 over stdio
- Supports `initialize`, `notifications/initialized`, `tools/list`, `tools/call`

### Browser Control
- Uses Playwright for automation
- Connects via Chrome DevTools Protocol (CDP)
- Port 9222 for remote debugging

### Chrome Launch Flags
```bash
--remote-debugging-port=9222          # Enable CDP
--user-data-dir=/tmp/chrome-mcp-profile  # Isolated profile
--no-first-run                        # Skip setup
--no-default-browser-check            # No popups
--disable-fre                         # No first-run experience
--disable-sync                        # No Google sync
--disable-component-update            # No auto-updates
# + more stability flags
```

## Compatibility

### Tested With
- ✅ Antigravity
- ✅ Claude Desktop (macOS, Windows, Linux)
- ✅ Other MCP clients via stdio

### Requirements
- Node.js >= 16.0.0
- Playwright ^1.57.0 (installed automatically via npm)
- Chrome/Chromium browser (automatically detected, or uses Playwright's Chromium)

### Platforms
- ✅ Linux
- ✅ macOS
- ✅ Windows

## Comparison with Other Tools

### vs. Puppeteer MCP Servers
- ✅ More tools (63 vs typical 8-10)
- ✅ Console capture built-in
- ✅ Better error messages
- ✅ Hybrid mode (connect OR launch)

### vs. Selenium Grid
- ✅ Simpler setup (no grid needed)
- ✅ MCP protocol integration
- ✅ Built for AI agents
- ✅ Lightweight (single process)

### vs. Browser Extensions
- ✅ Works headlessly if needed
- ✅ No extension installation
- ✅ Programmable via MCP
- ✅ Works with any MCP client

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file

## Credits

- Built with [Playwright](https://playwright.dev/)
- Implements [Model Context Protocol](https://modelcontextprotocol.io/)
- Originally developed for [Antigravity](https://antigravity.google/)

## Support

- 🐛 [Report Issues](https://github.com/ricardodeazambuja/browser-mcp-server/issues)
- 💬 [Discussions](https://github.com/ricardodeazambuja/browser-mcp-server/discussions)
- 📧 Contact: Via GitHub Issues

## Changelog

### v1.4.0 (2026-01-01) ⭐ NEW
- ✅ **Full Power User Suite**: Added 26 CDP-based tools for performance, network, security, and storage analysis (63 tools total)
- ✅ **Version Unification**: Centralized version management to use `package.json` as the single source of truth
- ✅ **Performance Profiling**: Added CPU profiling, heap snapshots, and web vitals monitoring
- ✅ **Network Analysis**: Added request monitoring, HAR export, and WebSocket inspection
- ✅ **Security Testing**: Added security header inspection, CSP monitoring, and certificate details
- ✅ **Storage Inspection**: Added IndexedDB, Cache Storage, and Service Worker management

### v1.3.0 (2025-12-27)
- ✅ **On-Demand Documentation**: New `browser_docs` tool provides detailed specs, return schemas, examples, and caveats for all 37 tools
- ✅ **Modular Architecture**: Complete refactor into `src/` modules for better maintainability
- ✅ **Plugin System**: New `plugins/` directory for extending functionality
- ✅ **Improved Testing**: Dedicated `tests/` directory with fixtures
- ✅ **Core Stability**: Separated browser logic, tools, and protocol handling
- ✅ **Token Efficient**: Documentation loaded on-demand, keeping tool descriptions concise

### v1.2.0 (2025-12-27)
- ✅ **Media Awareness**: Added audio/video inspection, spectral analysis, and control tools (36 tools total)
- ✅ **Tool**: `browser_get_media_summary`, `browser_get_audio_analysis`, `browser_control_media`

### v1.1.0 (2025-12-27)
- ✅ **Tool Parity**: Achieved parity with `browser-subagent` (33 tools total)
- ✅ **Multi-Page**: Added support for multiple browser tabs/pages
- ✅ **Low-Level Control**: Added keyboard/mouse event tools (pixel-based)
- ✅ **Utilities**: Added `reload`, `go_back`, `go_forward`, `wait`, `hover`, `focus`, `select`
- ✅ **Testing**: Updated test suites to include new tools

### v1.0.3 (2025-12-26)
- ✅ **Documentation**: Updated README with v1.0.2 features and clearer installation instructions
- ✅ **Code Comments**: Updated header to reflect universal compatibility and all features
- ✅ **Package Files**: Included test suites and changelog in npm package

### v1.0.2 (2025-12-26)
- ✅ **Smart Chrome Detection**: Automatically finds system Chrome/Chromium across Linux, macOS, Windows
- ✅ **Three-Tier Strategy**: Antigravity Chrome → System Chrome → Playwright Chromium
- ✅ **Auto-Install**: Playwright now installed automatically as dependency (via npm)
- ✅ **Better Errors**: Helpful error messages with platform-specific installation instructions
- ✅ **Resource Efficient**: Uses system Chrome when available (~275MB savings)
- ✅ **Test Suites**: Includes comprehensive test scripts
- ✅ **Auto-Reconnect**: Improved browser disconnection handling
- ✅ **Documentation**: Added detailed CHANGELOG-v1.0.2.md

### v1.0.1 (2025-12-26)
- ✅ Fixed CLI bin path for npm installation
- ✅ Improved package configuration

### v1.0.0 (2025-12-26)
- ✅ Initial release
- ✅ 16 browser automation tools
- ✅ Console capture (start/get/clear)
- ✅ Hybrid mode (connect OR launch)
- ✅ Safe Chrome launch with isolated profile
- ✅ Multi-source Playwright loading
- ✅ Universal compatibility (Antigravity + Claude Desktop + more)

---

**Made with ❤️ for the MCP community**
