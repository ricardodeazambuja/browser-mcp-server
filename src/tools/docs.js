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
    browser_action: `
📖 browser_action(action, selector?, text?, x?, y?)

Perform interaction actions like click, type, hover, scroll, and focus.

Parameters:
  • action (string, required) - "click", "type", "hover", "scroll", or "focus"
  • selector (string, optional) - Playwright selector for the element
  • text (string, optional) - Text to type (required for "type" action)
  • x (number, optional) - Horizontal scroll position (for "scroll")
  • y (number, optional) - Vertical scroll position (for "scroll")

Returns:
  { content: [{ type: 'text', text: 'Action <action> performed...' }] }

Example:
  browser_action({ action: 'click', selector: 'button.submit' })
  browser_action({ action: 'type', selector: '#search', text: 'MCP servers' })
  browser_action({ action: 'scroll', y: 500 })
`,

    browser_click: `
📖 browser_click(selector) [DEPRECATED]

⚠️ Please use browser_action({ action: 'click', selector: '...' }) instead.
`,

    browser_type: `
📖 browser_type(selector, text) [DEPRECATED]

⚠️ Please use browser_action({ action: 'type', selector: '...', text: '...' }) instead.
`,

    browser_hover: `
📖 browser_hover(selector) [DEPRECATED]

⚠️ Please use browser_action({ action: 'hover', selector: '...' }) instead.
`,

    browser_focus: `
📖 browser_focus(selector) [DEPRECATED]

⚠️ Please use browser_action({ action: 'focus', selector: '...' }) instead.
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
`,

    browser_scroll: `
📖 browser_scroll(x?, y?) [DEPRECATED]

⚠️ Please use browser_action({ action: 'scroll', x: ..., y: ... }) instead.
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
`,

    // ========================================
    // Performance Profiling Tools (CDP)
    // ========================================

    browser_perf_start_profile: `
📖 browser_perf_start_profile(sampleInterval?)

Start CPU profiling to track JavaScript execution performance.

Parameters:
  • sampleInterval (number, optional) - Microseconds between samples (default: 100)

Returns:
  { content: [{ type: 'text', text: 'CPU profiling started...' }] }

Behavior:
  • Uses Chrome DevTools Protocol Profiler domain
  • Captures JavaScript call stacks at regular intervals
  • Must call browser_perf_stop_profile to get results
  • Profiling remains active across page navigations

⚠️ Important:
  • Profiling adds performance overhead
  • Profile data can be very large (10,000+ nodes for complex apps)
  • Use for debugging/optimization, not production monitoring
  • Only one profile session can be active at a time

Example:
  browser_perf_start_profile({})
  browser_perf_start_profile({ sampleInterval: 50 })  // More granular sampling
`,

    browser_perf_stop_profile: `
📖 browser_perf_stop_profile()

Stop CPU profiling and get profile data with summary statistics.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'CPU Profile Results: {...summary...}' }] }

Return Structure:
  {
    totalNodes: number,
    totalSamples: number,
    durationMicroseconds: number,
    durationMs: string,
    topFunctions: [
      { function: string, url: string, line: number }
    ]
  }

⚠️ Important:
  • Must call browser_perf_start_profile first
  • Returns summarized data - full profile too large to display
  • Top 15 functions shown by default
  • Use Chrome DevTools for detailed profile analysis

Example:
  browser_perf_stop_profile({})
`,

    browser_perf_take_heap_snapshot: `
📖 browser_perf_take_heap_snapshot(reportProgress?)

Capture a heap snapshot for memory analysis and leak detection.

Parameters:
  • reportProgress (boolean, optional) - Report progress events (default: false)

Returns:
  { content: [{ type: 'text', text: 'Heap Snapshot Captured: X KB...' }] }

Return Structure:
  {
    size: string,  // In KB
    chunks: number
  }

⚠️ Important:
  • Snapshot can be very large (10+ MB for complex apps)
  • May freeze browser briefly during capture
  • Full snapshot data not returned (use Chrome DevTools to analyze)
  • Useful for detecting memory leaks

Example:
  browser_perf_take_heap_snapshot({})
  browser_perf_take_heap_snapshot({ reportProgress: true })
`,

    browser_perf_get_heap_usage: `
📖 browser_perf_get_heap_usage()

Get current JavaScript heap usage statistics.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'JavaScript Heap Usage: {...}' }] }

Return Structure:
  {
    usedSize: number,     // Bytes
    usedSizeMB: string,
    totalSize: number,    // Bytes
    totalSizeMB: string,
    limit: number,        // Max heap size
    limitMB: string,
    usagePercent: string
  }

Use Case:
  • Monitor memory usage in real-time
  • Detect potential memory leaks
  • Track memory growth over time

Example:
  browser_perf_get_heap_usage({})
`,

    browser_perf_get_metrics: `
📖 browser_perf_get_metrics()

Get runtime performance metrics (DOM nodes, event listeners, JS heap).

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Runtime Performance Metrics: [...]' }] }

Return Structure:
  [
    { name: 'Timestamp', value: number },
    { name: 'Documents', value: number },
    { name: 'Frames', value: number },
    { name: 'JSEventListeners', value: number },
    { name: 'Nodes', value: number },
    { name: 'LayoutCount', value: number },
    { name: 'RecalcStyleCount', value: number },
    { name: 'JSHeapUsedSize', value: number },
    { name: 'JSHeapTotalSize', value: number }
  ]

Use Case:
  • Track DOM complexity
  • Monitor event listener count
  • Measure layout/style recalculations

Example:
  browser_perf_get_metrics({})
`,

    browser_perf_get_performance_metrics: `
📖 browser_perf_get_performance_metrics()

Get web vitals and navigation timing (FCP, LCP, CLS, TTFB).

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Web Performance Metrics: {...}' }] }

Return Structure:
  {
    navigation: {
      domContentLoaded: number,  // ms
      loadComplete: number,
      domInteractive: number,
      ttfb: number  // Time to First Byte
    },
    paint: {
      'first-paint': number,
      'first-contentful-paint': number
    },
    webVitals: {
      lcp: number,  // Largest Contentful Paint
      cls: number   // Cumulative Layout Shift
    }
  }

⚠️ Note:
  • Some metrics may not be available depending on page state
  • Web vitals require user interaction for accuracy
  • Metrics based on Performance API

Example:
  browser_perf_get_performance_metrics({})
`,

    browser_perf_start_coverage: `
📖 browser_perf_start_coverage(resetOnNavigation?)

Start tracking CSS and JavaScript code coverage.

Parameters:
  • resetOnNavigation (boolean, optional) - Reset coverage on navigation (default: true)

Returns:
  { content: [{ type: 'text', text: 'Code coverage started...' }] }

Behavior:
  • Tracks which CSS rules and JS code are executed
  • Helps identify unused code for optimization
  • Must call browser_perf_stop_coverage to get results

Use Case:
  • Find unused CSS/JS for code splitting
  • Optimize bundle size
  • Identify dead code

Example:
  browser_perf_start_coverage({})
  browser_perf_start_coverage({ resetOnNavigation: false })
`,

    browser_perf_stop_coverage: `
📖 browser_perf_stop_coverage()

Stop coverage tracking and get results showing used vs unused code.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Code Coverage Results: {...}' }] }

Return Structure:
  {
    javascript: {
      filesAnalyzed: number,
      topFiles: [
        { url: string, usedBytes: number, totalBytes: number, coverage: string }
      ]
    },
    css: {
      rulesAnalyzed: number,
      topRules: [
        { used: boolean, styleSheetId: string, ... }
      ]
    }
  }

⚠️ Important:
  • Must call browser_perf_start_coverage first
  • Shows top 10 files by default
  • Full coverage data available via CDP

Example:
  browser_perf_stop_coverage({})
`,

    // ========================================
    // Network Analysis Tools (CDP)
    // ========================================

    browser_net_start_monitoring: `
📖 browser_net_start_monitoring(patterns?)

Start monitoring network requests with detailed timing.

Parameters:
  • patterns (array, optional) - URL patterns to monitor (default: all)

Returns:
  { content: [{ type: 'text', text: 'Network monitoring started...' }] }

Behavior:
  • Captures all network requests and responses
  • Records detailed timing information
  • Tracks WebSocket frames
  • Limited to 500 requests to prevent memory issues

Use Case:
  • Debug API calls
  • Analyze network performance
  • Inspect request/response details

Example:
  browser_net_start_monitoring({})
  browser_net_start_monitoring({ patterns: ['https://api.example.com/*'] })
`,

    browser_net_get_requests: `
📖 browser_net_get_requests(filter?)

Get captured network requests with timing breakdown.

Parameters:
  • filter (string, optional) - Filter by URL substring

Returns:
  { content: [{ type: 'text', text: 'Network Requests: {...}' }] }

Return Structure:
  {
    totalCaptured: number,
    filtered: number,
    requests: [
      {
        method: string,
        url: string,
        status: number,
        type: string,
        size: string,
        timing: string,
        failed: boolean,
        fromCache: boolean
      }
    ]
  }

⚠️ Important:
  • Must call browser_net_start_monitoring first
  • Limited to 50 requests in output for readability
  • Use filter parameter to narrow results

Example:
  browser_net_get_requests({})
  browser_net_get_requests({ filter: 'api' })
`,

    browser_net_stop_monitoring: `
📖 browser_net_stop_monitoring()

Stop network monitoring and clear request log.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Network monitoring stopped. Captured X requests...' }] }

Behavior:
  • Disables network tracking
  • Clears all captured requests
  • Removes event listeners

Example:
  browser_net_stop_monitoring({})
`,

    browser_net_export_har: `
📖 browser_net_export_har(includeContent?)

Export full network activity log in HAR (HTTP Archive) format.

Parameters:
  • includeContent (boolean, optional) - Include response bodies (default: false)

Returns:
  { content: [{ type: 'text', text: 'HAR Export: {...}' }] }

Return Structure:
  {
    log: {
      version: '1.2',
      creator: { name: string, version: string },
      entries: [
        {
          startedDateTime: string,
          time: number,
          request: { method: string, url: string, headers: [...] },
          response: { status: number, headers: [...], content: {...} },
          timings: { send: number, wait: number, receive: number }
        }
      ]
    }
  }

⚠️ Important:
  • Must have network monitoring active
  • HAR data can be very large
  • Compatible with HAR viewers and analysis tools

Example:
  browser_net_export_har({})
  browser_net_export_har({ includeContent: true })
`,

    browser_net_get_websocket_frames: `
📖 browser_net_get_websocket_frames(requestId)

Get WebSocket frames for inspecting real-time communication.

Parameters:
  • requestId (string, required) - Request ID from network monitoring

Returns:
  { content: [{ type: 'text', text: 'WebSocket Frames: [...]' }] }

Return Structure:
  [
    {
      direction: 'sent' | 'received',
      opcode: number,
      payloadLength: number,
      payload: string,  // First 100 chars
      timestamp: string
    }
  ]

Use Case:
  • Debug WebSocket communication
  • Inspect real-time message flow
  • Analyze WebSocket protocols

Example:
  browser_net_get_websocket_frames({ requestId: '1234.5' })
`,

    browser_net_set_request_blocking: `
📖 browser_net_set_request_blocking(patterns)

Block requests matching URL patterns.

Parameters:
  • patterns (array, required) - URL patterns to block (e.g., ["*.jpg", "*analytics*"])

Returns:
  { content: [{ type: 'text', text: 'Request blocking enabled...' }] }

Behavior:
  • Blocks requests before they're sent
  • Supports wildcard patterns
  • Useful for testing without certain resources

Use Case:
  • Block ads and trackers
  • Test page without images
  • Simulate missing resources

Example:
  browser_net_set_request_blocking({ patterns: ['*.jpg', '*.png'] })
  browser_net_set_request_blocking({ patterns: ['*analytics*', '*tracking*'] })
`,

    browser_net_emulate_conditions: `
📖 browser_net_emulate_conditions(offline, latency, downloadThroughput, uploadThroughput)

Emulate network conditions (throttling).

Parameters:
  • offline (boolean, required) - Emulate offline mode
  • latency (number, required) - Round-trip latency in ms
  • downloadThroughput (number, required) - Download speed in bytes/second (-1 for unlimited)
  • uploadThroughput (number, required) - Upload speed in bytes/second (-1 for unlimited)

Returns:
  { content: [{ type: 'text', text: 'Network conditions applied: {...}' }] }

Common Presets:
  • Fast 3G: { offline: false, latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84000 }
  • Slow 3G: { offline: false, latency: 2000, downloadThroughput: 50000, uploadThroughput: 50000 }
  • Offline: { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }

Use Case:
  • Test on slow connections
  • Simulate offline behavior
  • Performance testing

Example:
  browser_net_emulate_conditions({ offline: false, latency: 100, downloadThroughput: 1000000, uploadThroughput: 500000 })
`,

    // ========================================
    // Security Testing Tools (CDP)
    // ========================================

    browser_sec_get_security_headers: `
📖 browser_sec_get_security_headers()

Inspect security-related HTTP headers.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Security Headers: {...}' }] }

Return Structure:
  {
    'content-security-policy': string,
    'strict-transport-security': string,
    'x-frame-options': string,
    'x-content-type-options': string,
    'referrer-policy': string,
    'permissions-policy': string
  }

Use Case:
  • Security audits
  • Verify CSP configuration
  • Check HTTPS enforcement

⚠️ Note:
  • May require network monitoring for some headers
  • Shows 'Not set' for missing headers

Example:
  browser_sec_get_security_headers({})
`,

    browser_sec_get_certificate_info: `
📖 browser_sec_get_certificate_info()

Get TLS/SSL certificate details for HTTPS sites.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Certificate Information: {...}' }] }

⚠️ Important:
  • Only works on HTTPS pages
  • Returns error on HTTP pages
  • Detailed certificate info requires monitoring during page load

Use Case:
  • Verify certificate validity
  • Check TLS configuration
  • Security compliance testing

Example:
  browser_sec_get_certificate_info({})
`,

    browser_sec_detect_mixed_content: `
📖 browser_sec_detect_mixed_content()

Detect mixed content warnings (HTTPS page loading HTTP resources).

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Mixed Content Detected: {...}' }] }

Return Structure:
  {
    total: number,
    blocked: number,
    issues: [
      { url: string, type: 'script' | 'image' | 'stylesheet', blocked: boolean }
    ]
  }

⚠️ Important:
  • Only applies to HTTPS pages
  • Scripts are usually blocked by browser
  • Images/stylesheets may load with warning

Use Case:
  • Security audits
  • HTTPS migration testing
  • Find insecure resources

Example:
  browser_sec_detect_mixed_content({})
`,

    browser_sec_start_csp_monitoring: `
📖 browser_sec_start_csp_monitoring()

Monitor Content Security Policy violations.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'CSP violation monitoring started...' }] }

Behavior:
  • Captures CSP violation console messages
  • Must call browser_sec_get_csp_violations to view
  • Call browser_sec_stop_csp_monitoring to stop

Use Case:
  • Debug CSP configuration
  • Find policy violations
  • Security testing

Example:
  browser_sec_start_csp_monitoring({})
`,

    browser_sec_get_csp_violations: `
📖 browser_sec_get_csp_violations()

Get captured CSP violations.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'CSP Violations: {...}' }] }

Return Structure:
  {
    total: number,
    violations: [
      {
        timestamp: string,
        message: string,
        level: string,
        source: string
      }
    ]
  }

⚠️ Important:
  • Must call browser_sec_start_csp_monitoring first
  • Violations captured in real-time

Example:
  browser_sec_get_csp_violations({})
`,

    browser_sec_stop_csp_monitoring: `
📖 browser_sec_stop_csp_monitoring()

Stop CSP monitoring and clear violations.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'CSP monitoring stopped. Captured X violations...' }] }

Behavior:
  • Stops monitoring
  • Clears violation log
  • Removes event listeners

Example:
  browser_sec_stop_csp_monitoring({})
`,

    // ========================================
    // Storage & Service Workers Tools (CDP)
    // ========================================

    browser_storage_get_indexeddb: `
📖 browser_storage_get_indexeddb(databaseName?, objectStoreName?)

Inspect IndexedDB databases and their data.

Parameters:
  • databaseName (string, optional) - Specific database to inspect
  • objectStoreName (string, optional) - Specific object store to query (requires databaseName)

Returns:
  { content: [{ type: 'text', text: 'IndexedDB Databases/Data: {...}' }] }

Return Structure (no params):
  { origin: string, databases: string[] }

Return Structure (databaseName only):
  {
    name: string,
    version: number,
    objectStores: [
      { name: string, keyPath: any, autoIncrement: boolean, indexes: [...] }
    ]
  }

Return Structure (both params):
  {
    objectStore: string,
    entries: number,
    hasMore: boolean,
    data: [ { key: any, primaryKey: any, value: any } ]
  }

⚠️ Important:
  • Limited to 100 entries per query
  • May require page to have used IndexedDB first

Example:
  browser_storage_get_indexeddb({})
  browser_storage_get_indexeddb({ databaseName: 'myDB' })
  browser_storage_get_indexeddb({ databaseName: 'myDB', objectStoreName: 'users' })
`,

    browser_storage_get_cache_storage: `
📖 browser_storage_get_cache_storage(cacheName?)

List Cache Storage API caches and their entries.

Parameters:
  • cacheName (string, optional) - Specific cache to inspect

Returns:
  { content: [{ type: 'text', text: 'Cache Storage Caches/Entries: {...}' }] }

Return Structure (no cacheName):
  { origin: string, caches: string[] }

Return Structure (with cacheName):
  {
    cacheName: string,
    entryCount: number,
    entries: [
      {
        requestURL: string,
        requestMethod: string,
        responseStatus: number,
        responseType: string
      }
    ]
  }

⚠️ Important:
  • Limited to 50 entries per cache
  • Requires page to use Cache Storage API

Example:
  browser_storage_get_cache_storage({})
  browser_storage_get_cache_storage({ cacheName: 'my-cache-v1' })
`,

    browser_storage_delete_cache: `
📖 browser_storage_delete_cache(cacheName)

Delete a specific cache from Cache Storage.

Parameters:
  • cacheName (string, required) - Cache name to delete

Returns:
  { content: [{ type: 'text', text: 'Cache deleted successfully: ...' }] }

⚠️ Warning:
  • This permanently deletes the cache
  • Cannot be undone
  • May affect offline functionality

Example:
  browser_storage_delete_cache({ cacheName: 'old-cache-v1' })
`,

    browser_storage_get_service_workers: `
📖 browser_storage_get_service_workers()

Get service worker registrations and their state.

Parameters:
  None

Returns:
  { content: [{ type: 'text', text: 'Service Workers: {...}' }] }

Return Structure:
  [
    {
      scope: string,
      active: { scriptURL: string, state: string },
      installing: { scriptURL: string, state: string },
      waiting: { scriptURL: string, state: string }
    }
  ]

States:
  • installing - Being installed
  • installed - Installed, waiting to activate
  • activating - Being activated
  • activated - Active and running
  • redundant - Replaced by newer version

Example:
  browser_storage_get_service_workers({})
`,

    browser_storage_unregister_service_worker: `
📖 browser_storage_unregister_service_worker(scopeURL)

Unregister a service worker.

Parameters:
  • scopeURL (string, required) - Scope URL of service worker to unregister

Returns:
  { content: [{ type: 'text', text: 'Service worker unregistered successfully...' }] }

⚠️ Warning:
  • This removes the service worker registration
  • May affect offline functionality
  • Page may need reload to take effect

Example:
  browser_storage_unregister_service_worker({ scopeURL: 'https://example.com/' })
`,

    browser_manage_modules: `
📖 browser_manage_modules(action, module?)

List, load, or unload power-user modules to save tokens.

Parameters:
  • action (string, required) - "list", "load", or "unload"
  • module (string, optional) - Name of the module (required for "load" and "unload")

Modules available:
  • network - Network monitoring and HAR export
  • performance - CPU profiling and metrics
  • security - Security headers and CSP monitoring
  • storage - IndexedDB and Cache Storage
  • media - Audio/Video inspection and control
  • tabs - Multi-tab management
  • extraction - Advanced DOM extraction
  • advanced - Low-level interaction and system info

Returns:
  { content: [{ type: 'text', text: 'Module <name> <status>...' }] }

Example:
  browser_manage_modules({ action: 'list' })
  browser_manage_modules({ action: 'load', module: 'network' })
`
};

const toolToModule = {
    // Network
    browser_net_start_monitoring: 'network',
    browser_net_get_requests: 'network',
    browser_net_stop_monitoring: 'network',
    browser_net_export_har: 'network',
    browser_net_get_websocket_frames: 'network',
    browser_net_set_request_blocking: 'network',
    browser_net_emulate_conditions: 'network',
    // Performance
    browser_perf_start_profile: 'performance',
    browser_perf_stop_profile: 'performance',
    browser_perf_take_heap_snapshot: 'performance',
    browser_perf_get_heap_usage: 'performance',
    browser_perf_get_metrics: 'performance',
    browser_perf_get_performance_metrics: 'performance',
    browser_perf_start_coverage: 'performance',
    browser_perf_stop_coverage: 'performance',
    // Security
    browser_sec_get_security_headers: 'security',
    browser_sec_get_certificate_info: 'security',
    browser_sec_detect_mixed_content: 'security',
    browser_sec_start_csp_monitoring: 'security',
    browser_sec_get_csp_violations: 'security',
    browser_sec_stop_csp_monitoring: 'security',
    // Storage
    browser_storage_get_indexeddb: 'storage',
    browser_storage_get_cache_storage: 'storage',
    browser_storage_delete_cache: 'storage',
    browser_storage_get_service_workers: 'storage',
    browser_storage_unregister_service_worker: 'storage',
    // Media
    browser_get_media_summary: 'media',
    browser_get_audio_analysis: 'media',
    browser_control_media: 'media',
    // Tabs
    browser_list_pages: 'tabs',
    browser_new_page: 'tabs',
    browser_switch_page: 'tabs',
    browser_close_page: 'tabs',
    // Extraction
    browser_get_text: 'extraction',
    browser_get_dom: 'extraction',
    browser_read_page: 'extraction',
    // Advanced
    browser_console_start: 'advanced',
    browser_console_get: 'advanced',
    browser_console_clear: 'advanced',
    browser_health_check: 'advanced',
    browser_wait: 'advanced',
    browser_resize_window: 'advanced',
    browser_wait_for_selector: 'advanced',
    browser_start_video_recording: 'advanced',
    browser_stop_video_recording: 'advanced',
    browser_mouse_move: 'advanced',
    browser_mouse_click: 'advanced',
    browser_mouse_drag: 'advanced',
    browser_mouse_wheel: 'advanced',
    browser_press_key: 'advanced',
    // Extra core (optional versions)
    browser_reload: 'advanced',
    browser_go_back: 'advanced',
    browser_go_forward: 'advanced',
    browser_select: 'advanced'
};

const coreDefinitions = definitions;

const coreHandlers = {
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

Tip: Tool names use the prefix 'browser_' followed by the action.
Note: Some tools require loading their respective module via browser_manage_modules.`
                }]
            };
        }

        const doc = toolDocs[toolName];

        if (!doc) {
            const suggestions = Object.keys(toolDocs)
                .filter(name => name.includes(toolName.replace('browser_', '')))
                .slice(0, 5);

            const moduleName = toolToModule[toolName];
            const moduleInfo = moduleName ? `\n\n💡 This tool is part of the '${moduleName}' module. Load it first using:\nbrowser_manage_modules({ action: 'load', module: '${moduleName}' })` : '';

            return {
                content: [{
                    type: 'text',
                    text: `❌ No documentation found for '${toolName}'${moduleInfo}

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

module.exports = { 
    definitions, 
    handlers: coreHandlers,
    coreDefinitions,
    coreHandlers,
    toolToModule 
};
