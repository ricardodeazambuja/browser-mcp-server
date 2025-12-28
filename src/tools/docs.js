const definitions = [
    {
        name: 'browser_docs',
        description: 'Get detailed documentation, return values, examples, and caveats for any browser tool',
        inputSchema: {
            type: 'object',
            properties: {
                toolName: {
                    type: 'string',
                    description: 'Name of the tool to get docs for (e.g., browser_navigate, browser_get_audio_analysis)'
                }
            },
            required: ['toolName'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const toolDocs = {
    // Navigation
    browser_navigate: `
📖 browser_navigate(url)

Navigate to a URL in the browser.

Parameters:
  • url (string, required) - The URL to navigate to

Returns:
  { content: [{ type: 'text', text: 'Navigated to <url>' }] }

Behavior:
  • Waits for 'domcontentloaded' event (not full page load)
  • For SPAs or slow-loading pages, consider using browser_wait_for_selector after

Example:
  browser_navigate({ url: 'https://example.com' })
`,

    browser_reload: `
📖 browser_reload()

Reload the current page.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Reloaded page' }] }

Behavior:
  • Waits for 'domcontentloaded' event

Example:
  browser_reload({})
`,

    browser_go_back: `
📖 browser_go_back()

Navigate back in browser history.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Navigated back' }] }

Example:
  browser_go_back({})
`,

    browser_go_forward: `
📖 browser_go_forward()

Navigate forward in browser history.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Navigated forward' }] }

Example:
  browser_go_forward({})
`,

    // Interaction
    browser_click: `
📖 browser_click(selector)

Click an element using a Playwright selector.

Parameters:
  • selector (string, required) - Playwright selector for the element

Selector Syntax:
  • CSS: '#id', '.class', 'button.primary'
  • Text: 'text=Click me', 'text="exact match"'
  • Data attributes: '[data-testid="submit"]'
  • Chaining: 'div.container >> button'

Returns:
  { content: [{ type: 'text', text: 'Clicked <selector>' }] }

Example:
  browser_click({ selector: 'button.submit' })
  browser_click({ selector: 'text=Login' })
`,

    browser_type: `
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
  • For appending, use browser_evaluate to set element.value

Example:
  browser_type({ selector: '#username', text: 'john@example.com' })
`,

    browser_hover: `
📖 browser_hover(selector)

Hover over an element.

Parameters:
  • selector (string, required) - Playwright selector for the element

Returns:
  { content: [{ type: 'text', text: 'Hovered over <selector>' }] }

Example:
  browser_hover({ selector: '.menu-item' })
`,

    browser_focus: `
📖 browser_focus(selector)

Focus an element.

Parameters:
  • selector (string, required) - Playwright selector for the element

Returns:
  { content: [{ type: 'text', text: 'Focused <selector>' }] }

Example:
  browser_focus({ selector: 'input[name="email"]' })
`,

    browser_select: `
📖 browser_select(selector, values)

Select options in a dropdown.

Parameters:
  • selector (string, required) - Playwright selector for the select element
  • values (array of strings, required) - Values to select

Returns:
  { content: [{ type: 'text', text: 'Selected values in <selector>' }] }

Example:
  browser_select({ selector: '#country', values: ['US'] })
  browser_select({ selector: '#colors', values: ['red', 'blue'] })
`,

    browser_scroll: `
📖 browser_scroll(x?, y?)

Scroll the page to specific coordinates.

Parameters:
  • x (number, optional) - Horizontal scroll position (default: 0)
  • y (number, optional) - Vertical scroll position (default: 0)

Returns:
  { content: [{ type: 'text', text: 'Scrolled to (x, y)' }] }

Example:
  browser_scroll({ y: 1000 })  // Scroll down 1000px
  browser_scroll({ x: 500, y: 800 })
`,

    // Mouse & Keyboard
    browser_mouse_move: `
📖 browser_mouse_move(x, y)

Move mouse to pixel coordinates.

Parameters:
  • x (number, required) - X coordinate in pixels
  • y (number, required) - Y coordinate in pixels

Returns:
  { content: [{ type: 'text', text: 'Moved mouse to (x, y)' }] }

Example:
  browser_mouse_move({ x: 500, y: 300 })
`,

    browser_mouse_click: `
📖 browser_mouse_click(x?, y?, button?, clickCount?)

Click at pixel coordinates or current position.

Parameters:
  • x (number, optional) - X coordinate
  • y (number, optional) - Y coordinate
  • button (string, optional) - 'left', 'right', or 'middle' (default: 'left')
  • clickCount (number, optional) - 1 for single, 2 for double (default: 1)

Returns:
  { content: [{ type: 'text', text: 'Clicked at (x, y)' }] }

Example:
  browser_mouse_click({ x: 100, y: 200 })
  browser_mouse_click({ button: 'right' })  // Right-click at current position
  browser_mouse_click({ x: 100, y: 200, clickCount: 2 })  // Double-click
`,

    browser_mouse_drag: `
📖 browser_mouse_drag(fromX, fromY, toX, toY)

Drag from one position to another.

Parameters:
  • fromX (number, required) - Starting X coordinate
  • fromY (number, required) - Starting Y coordinate
  • toX (number, required) - Ending X coordinate
  • toY (number, required) - Ending Y coordinate

Returns:
  { content: [{ type: 'text', text: 'Dragged from (fromX, fromY) to (toX, toY)' }] }

Example:
  browser_mouse_drag({ fromX: 100, fromY: 100, toX: 300, toY: 300 })
`,

    browser_mouse_wheel: `
📖 browser_mouse_wheel(deltaX, deltaY)

Scroll the mouse wheel.

Parameters:
  • deltaX (number, required) - Horizontal scroll amount
  • deltaY (number, required) - Vertical scroll amount

Returns:
  { content: [{ type: 'text', text: 'Mouse wheel scrolled' }] }

Example:
  browser_mouse_wheel({ deltaX: 0, deltaY: 100 })  // Scroll down
`,

    browser_press_key: `
📖 browser_press_key(key)

Send a keyboard event.

Parameters:
  • key (string, required) - Key to press (e.g., 'Enter', 'Escape', 'Control+A')

Returns:
  { content: [{ type: 'text', text: 'Pressed key: <key>' }] }

Common Keys:
  • 'Enter', 'Escape', 'Tab', 'Backspace', 'Delete'
  • 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
  • 'Control+A', 'Control+C', 'Control+V'
  • 'Shift+Tab', 'Alt+F4'

Example:
  browser_press_key({ key: 'Enter' })
  browser_press_key({ key: 'Control+A' })
`,

    // Pages
    browser_list_pages: `
📖 browser_list_pages()

List all open browser tabs/pages.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: JSON with array of pages }] }

Return Structure:
  [
    { index: 0, url: 'https://...', title: '...' },
    { index: 1, url: 'https://...', title: '...' }
  ]

Example:
  browser_list_pages({})
`,

    browser_new_page: `
📖 browser_new_page(url?)

Open a new browser tab.

Parameters:
  • url (string, optional) - URL to navigate to in the new tab

Returns:
  { content: [{ type: 'text', text: 'Opened new page...' }] }

Example:
  browser_new_page({})  // Blank tab
  browser_new_page({ url: 'https://example.com' })
`,

    browser_switch_page: `
📖 browser_switch_page(index)

Switch to a different browser tab.

Parameters:
  • index (number, required) - The index of the page to switch to (from browser_list_pages)

Returns:
  { content: [{ type: 'text', text: 'Switched to page <index>' }] }

Example:
  browser_switch_page({ index: 0 })
`,

    browser_close_page: `
📖 browser_close_page(index?)

Close a browser tab.

Parameters:
  • index (number, optional) - Index of page to close (closes current page if not specified)

Returns:
  { content: [{ type: 'text', text: 'Closed page...' }] }

Example:
  browser_close_page({})  // Close current page
  browser_close_page({ index: 1 })  // Close specific page
`,

    // Info
    browser_screenshot: `
📖 browser_screenshot(fullPage?)

Take a screenshot of the current page.

Parameters:
  • fullPage (boolean, optional) - Capture full page (default: false)

Returns:
  { content: [{ type: 'image', data: '<base64>', mimeType: 'image/png' }] }

⚠️ Important:
  • Returns base64-encoded PNG image data
  • fullPage=true captures entire scrollable page
  • fullPage=false captures visible viewport only

Example:
  browser_screenshot({})  // Viewport only
  browser_screenshot({ fullPage: true })  // Entire page
`,

    browser_get_text: `
📖 browser_get_text(selector)

Get text content from an element.

Parameters:
  • selector (string, required) - Playwright selector for the element

Returns:
  { content: [{ type: 'text', text: '<text content of element>' }] }

Example:
  browser_get_text({ selector: '.main-heading' })
`,

    browser_evaluate: `
📖 browser_evaluate(code)

Execute JavaScript in the browser context.

Parameters:
  • code (string, required) - JavaScript code to execute

Returns:
  { content: [{ type: 'text', text: JSON.stringify(result) }] }

⚠️ Important:
  • Code runs in browser sandbox (no access to host system)
  • Result is JSON-serialized (functions/DOM nodes won't serialize)
  • Return primitive values, objects, or arrays

Example:
  browser_evaluate({ code: 'document.title' })
  browser_evaluate({ code: 'window.location.href' })
  browser_evaluate({ code: '[...document.querySelectorAll("a")].length' })
`,

    browser_get_dom: `
📖 browser_get_dom(selector?)

Get DOM structure of document or specific element.

Parameters:
  • selector (string, optional) - Selector for specific element (omit for full document)

Returns:
  { content: [{ type: 'text', text: JSON }] }

Return Structure:
  {
    outerHTML: string,        // Full HTML of element
    textContent: string,      // Text content
    attributes: [             // Array of {name, value}
      { name: 'class', value: '...' },
      { name: 'id', value: '...' }
    ],
    children: number          // Number of child elements
  }

Example:
  browser_get_dom({})  // Entire document
  browser_get_dom({ selector: '.container' })  // Specific element
`,

    browser_read_page: `
📖 browser_read_page()

Get metadata about the current page.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: JSON }] }

Return Structure:
  {
    title: string,           // Page title
    url: string,             // Current URL
    viewport: {              // Viewport size
      width: number,
      height: number
    },
    contentLength: number    // Length of HTML content
  }

Example:
  browser_read_page({})
`,

    // Media
    browser_get_media_summary: `
📖 browser_get_media_summary()

Get summary of all audio and video elements on the page.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: JSON array }] }

Return Structure (array of):
  {
    index: number,
    tagName: 'audio' | 'video',
    id: string | null,
    src: string,
    state: {
      paused: boolean,
      muted: boolean,
      ended: boolean,
      loop: boolean,
      playbackRate: number,
      volume: number
    },
    timing: {
      currentTime: number,    // Seconds
      duration: number        // Seconds
    },
    buffer: {
      readyState: number,
      buffered: [[start, end], ...]  // Buffered time ranges
    },
    videoSpecs: {             // Only for video elements
      videoWidth: number,
      videoHeight: number
    }
  }

Example:
  browser_get_media_summary({})
`,

    browser_get_audio_analysis: `
📖 browser_get_audio_analysis(durationMs?, selector?)

Analyze audio output from media elements.

Parameters:
  • durationMs (number, optional) - Duration to analyze in milliseconds (default: 2000)
  • selector (string, optional) - Selector for specific media element (uses first playing element if omitted)

Returns:
  { content: [{ type: 'text', text: JSON }] }

Return Structure:
  {
    element: {
      tagName: string,
      id: string,
      src: string
    },
    isSilent: boolean,           // true if max volume < 5
    averageVolume: number,       // 0-255
    peakVolume: number,          // 0-255
    activeFrequencies: [         // Array of active frequency ranges
      'bass' | 'mid' | 'treble'
    ]
  }

⚠️ Important:
  • Requires CORS headers for cross-origin media
  • May return { error: "Cannot connect to media source: ... (Check CORS headers)" }
  • Samples audio 10 times per second during analysis period

Example:
  browser_get_audio_analysis({ durationMs: 2000 })
  browser_get_audio_analysis({ selector: 'video', durationMs: 3000 })
`,

    browser_control_media: `
📖 browser_control_media(selector, action, value?)

Control a media element (play, pause, seek, mute).

Parameters:
  • selector (string, required) - Selector for audio/video element
  • action (string, required) - 'play' | 'pause' | 'mute' | 'unmute' | 'seek'
  • value (number, optional) - Time in seconds (required for 'seek' action)

Returns:
  { content: [{ type: 'text', text: JSON }] }

Return Structure:
  { status: 'playing' | 'paused' | 'muted' | 'unmuted' | 'seeked', newTime?: number }
  or
  { error: string }

Example:
  browser_control_media({ selector: 'video', action: 'play' })
  browser_control_media({ selector: 'audio', action: 'seek', value: 30 })
  browser_control_media({ selector: 'video', action: 'mute' })
`,

    // Console
    browser_console_start: `
📖 browser_console_start(level?)

Start capturing browser console logs.

Parameters:
  • level (string, optional) - Filter: 'log' | 'error' | 'warn' | 'info' | 'debug' | 'all'

Returns:
  { content: [{ type: 'text', text: 'Console logging started...' }] }

⚠️ Important:
  • Stateful: Captures ALL subsequent console output until browser_console_clear is called
  • Logs include timestamp and source location
  • Use browser_console_get to retrieve captured logs

Example:
  browser_console_start({})
  browser_console_start({ level: 'error' })  // Only capture errors
`,

    browser_console_get: `
📖 browser_console_get(filter?)

Get all captured console logs.

Parameters:
  • filter (string, optional) - Filter by level: 'log' | 'error' | 'warn' | 'info' | 'debug' | 'all'

Returns:
  { content: [{ type: 'text', text: 'Formatted log entries...' }] }

Return Format:
  📋 Captured N console logs:

  1. ❌ [ERROR] 2025-12-27T10:30:45.123Z
     Error message text
     Location: file.js:42

  2. 📝 [LOG] 2025-12-27T10:30:46.456Z
     Log message text

⚠️ Important:
  • Returns empty message if browser_console_start hasn't been called
  • Use filter to narrow down results after capture

Example:
  browser_console_get({})
  browser_console_get({ filter: 'error' })
`,

    browser_console_clear: `
📖 browser_console_clear()

Clear all captured console logs and stop listening.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Cleared N console logs...' }] }

⚠️ Important:
  • Stops console capture completely
  • Clears all previously captured logs
  • Must call browser_console_start again to resume capture

Example:
  browser_console_clear({})
`,

    // System
    browser_wait: `
📖 browser_wait(ms)

Pause execution for a duration.

Parameters:
  • ms (number, required) - Milliseconds to wait

Returns:
  { content: [{ type: 'text', text: 'Waited <ms>ms' }] }

Example:
  browser_wait({ ms: 1000 })  // Wait 1 second
`,

    browser_resize_window: `
📖 browser_resize_window(width, height)

Resize the browser window.

Parameters:
  • width (number, required) - Window width in pixels
  • height (number, required) - Window height in pixels

Returns:
  { content: [{ type: 'text', text: 'Resized window...' }] }

Use Cases:
  • Testing responsive designs
  • Triggering mobile/tablet layouts
  • Capturing screenshots at specific sizes

Example:
  browser_resize_window({ width: 375, height: 667 })  // iPhone size
  browser_resize_window({ width: 1920, height: 1080 })  // Full HD
`,

    browser_wait_for_selector: `
📖 browser_wait_for_selector(selector, timeout?)

Wait for an element to appear on the page.

Parameters:
  • selector (string, required) - Playwright selector to wait for
  • timeout (number, optional) - Timeout in milliseconds (default: 30000)

Returns:
  { content: [{ type: 'text', text: 'Element appeared: <selector>' }] }

⚠️ Important:
  • Throws error if element doesn't appear within timeout
  • Useful after navigation or when waiting for dynamic content

Example:
  browser_wait_for_selector({ selector: '.loaded-content' })
  browser_wait_for_selector({ selector: '#modal', timeout: 5000 })
`,

    browser_start_video_recording: `
📖 browser_start_video_recording(path?)

Start recording browser session as video.

Parameters:
  • path (string, optional) - Path to save video file

Returns:
  { content: [{ type: 'text', text: 'Started video recording...' }] }

⚠️ Important:
  • Records all browser interactions until browser_stop_video_recording is called
  • Must call stop to finalize the video file

Example:
  browser_start_video_recording({ path: '/tmp/session.webm' })
`,

    browser_stop_video_recording: `
📖 browser_stop_video_recording()

Stop video recording and save the file.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Stopped video recording...' }] }

Example:
  browser_stop_video_recording({})
`,

    browser_health_check: `
📖 browser_health_check()

Check browser connection status and environment info.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Browser health status...' }] }

Information Returned:
  • Connection mode (Antigravity / System Chrome / Playwright Chromium)
  • Browser profile location
  • Current page URL
  • Playwright version

Example:
  browser_health_check({})
`
};

const handlers = {
    browser_docs: async (args) => {
        const toolName = args.toolName;

        if (!toolName) {
            const toolList = Object.keys(toolDocs).sort().join('\n  • ');
            return {
                content: [{
                    type: 'text',
                    text: `📚 Browser Tools Documentation

Available tools:
  • ${toolList}

Usage:
  browser_docs({ toolName: 'browser_navigate' })

Tip: Tool names use the prefix 'browser_' followed by the action.`
                }]
            };
        }

        const doc = toolDocs[toolName];

        if (!doc) {
            const suggestions = Object.keys(toolDocs)
                .filter(name => name.includes(toolName.replace('browser_', '')))
                .slice(0, 5);

            return {
                content: [{
                    type: 'text',
                    text: `❌ No documentation found for '${toolName}'

${suggestions.length > 0 ? `Did you mean:\n  • ${suggestions.join('\n  • ')}` : ''}

Use browser_docs({}) to see all available tools.`
                }]
            };
        }

        return {
            content: [{
                type: 'text',
                text: doc.trim()
            }]
        };
    }
};

module.exports = { definitions, handlers };
