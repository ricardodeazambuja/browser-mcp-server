# Browser MCP Server

A universal browser automation MCP server using Playwright. Control Chrome programmatically through the Model Context Protocol.

**16 powerful browser automation tools** including navigation, clicking, typing, screenshots, console capture, and session recording.

## Features

- ✅ **Smart Chrome Detection**: Automatically finds and uses system Chrome/Chromium
- ✅ **Three-Tier Strategy**: Antigravity Chrome → System Chrome → Playwright Chromium
- ✅ **Universal**: Works with Antigravity, Claude Desktop, and any MCP client
- ✅ **16 Tools**: Navigate, click, type, screenshot, console logs, and more
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
curl -o browser-mcp-server-playwright.js \
  https://raw.githubusercontent.com/ricardodeazambuja/browser-mcp-server/main/browser-mcp-server-playwright.js

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
      "args": ["/absolute/path/to/browser-mcp-server-playwright.js"]
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
      "args": ["/home/username/.gemini/antigravity/browser-mcp-server-playwright.js"]
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
  -- node /absolute/path/to/browser-mcp-server-playwright.js

# Or with custom browser profile for more control
claude mcp add --transport stdio browser \
  --env MCP_BROWSER_PROFILE=/path/to/custom/profile \
  -- node /absolute/path/to/browser-mcp-server-playwright.js
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
gemini mcp add browser node /absolute/path/to/browser-mcp-server-playwright.js

# Or with custom browser profile
gemini mcp add -e MCP_BROWSER_PROFILE=/path/to/custom/profile browser \
  node /absolute/path/to/browser-mcp-server-playwright.js
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
gemini mcp add -s user browser node /path/to/browser-mcp-server-playwright.js

# Add with timeout configuration
gemini mcp add --timeout 30000 browser node /path/to/browser-mcp-server-playwright.js

# Skip tool confirmation prompts (use with caution)
gemini mcp add --trust browser node /path/to/browser-mcp-server-playwright.js
```

## Available Tools (16)

### Navigation & Interaction
1. **browser_navigate(url)** - Navigate to a URL
2. **browser_click(selector)** - Click an element
3. **browser_type(selector, text)** - Type text into an input
4. **browser_scroll(x?, y?)** - Scroll the page

### Information Gathering
5. **browser_screenshot(fullPage?)** - Capture screenshot
6. **browser_get_text(selector)** - Get text from element
7. **browser_get_dom(selector?)** - Get DOM structure
8. **browser_evaluate(code)** - Execute JavaScript

### Console Debugging ⭐ NEW
9. **browser_console_start(level?)** - Start capturing console logs
10. **browser_console_get(filter?)** - Get captured logs
11. **browser_console_clear()** - Clear logs and stop

### Advanced
12. **browser_wait_for_selector(selector, timeout?)** - Wait for element
13. **browser_resize_window(width, height)** - Resize browser window
14. **browser_start_video_recording(path?)** - Start recording session (Playwright traces)
15. **browser_stop_video_recording()** - Stop and save recording
16. **browser_health_check()** - Verify browser connection

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

### Automate Form Submission
```javascript
// Agent uses:
browser_navigate("https://example.com/login")
browser_type("#username", "user@example.com")
browser_type("#password", "secret")
browser_click("#login-button")
browser_wait_for_selector(".dashboard")
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
node browser-mcp-server-playwright.js
```

### MCP Config with Environment Variables

```json
{
  "mcpServers": {
    "browser-tools": {
      "command": "node",
      "args": ["/path/to/browser-mcp-server-playwright.js"],
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
├── browser-mcp-server-playwright.js  # Main server
├── package.json                      # npm package config
├── README.md                         # This file
└── LICENSE                           # MIT license
```

### Testing

```bash
# Test server initialization
npm test

# Manual test
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node browser-mcp-server-playwright.js
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
- ✅ More tools (16 vs typical 8-10)
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
