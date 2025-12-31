/**
 * Security Testing Tools (CDP-based)
 * Security headers, TLS certificates, mixed content, CSP violations
 */

const { connectToBrowser } = require('../browser');
const { getCDPSession } = require('../cdp');
const { debugLog } = require('../utils');

// Local state for security tools
let cspViolations = [];
let cspMonitoringActive = false;

const definitions = [
    {
        name: 'browser_sec_get_security_headers',
        description: 'Inspect security-related HTTP headers (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_sec_get_certificate_info',
        description: 'Get TLS/SSL certificate details for HTTPS sites (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_sec_detect_mixed_content',
        description: 'Detect mixed content warnings (HTTPS page loading HTTP resources) (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_sec_start_csp_monitoring',
        description: 'Monitor Content Security Policy violations (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_sec_get_csp_violations',
        description: 'Get captured CSP violations (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_sec_stop_csp_monitoring',
        description: 'Stop CSP monitoring and clear violations (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_sec_get_security_headers: async (args) => {
        try {
            const { page } = await connectToBrowser();

            // Get headers from HTTP response or meta tags
            const securityData = await page.evaluate(async () => {
                const result = {
                    headers: null,
                    metaTags: {},
                    protocol: window.location.protocol
                };

                // Try to get headers using fetch (works for HTTP/HTTPS)
                if (window.location.protocol.startsWith('http')) {
                    try {
                        const res = await fetch(window.location.href, { method: 'HEAD' });
                        const headers = {};
                        for (let [key, value] of res.headers.entries()) {
                            headers[key] = value;
                        }
                        result.headers = headers;
                    } catch (e) {
                        // Fetch failed, will fall back to meta tags
                    }
                }

                // Read security-related meta tags (works for file:// and as fallback)
                const metaTags = document.querySelectorAll('meta[http-equiv]');
                metaTags.forEach(tag => {
                    const httpEquiv = tag.getAttribute('http-equiv').toLowerCase();
                    const content = tag.getAttribute('content');
                    if (httpEquiv && content) {
                        result.metaTags[httpEquiv] = content;
                    }
                });

                return result;
            });

            // Build security headers object from HTTP headers or meta tags
            const securityHeaders = {
                'content-security-policy':
                    securityData.headers?.['content-security-policy'] ||
                    securityData.metaTags['content-security-policy'] ||
                    'Not set',
                'strict-transport-security':
                    securityData.headers?.['strict-transport-security'] ||
                    'Not set',
                'x-frame-options':
                    securityData.headers?.['x-frame-options'] ||
                    securityData.metaTags['x-frame-options'] ||
                    'Not set',
                'x-content-type-options':
                    securityData.headers?.['x-content-type-options'] ||
                    'Not set',
                'referrer-policy':
                    securityData.headers?.['referrer-policy'] ||
                    securityData.metaTags['referrer-policy'] ||
                    'Not set',
                'permissions-policy':
                    securityData.headers?.['permissions-policy'] ||
                    'Not set',
                'x-xss-protection':
                    securityData.headers?.['x-xss-protection'] ||
                    'Not set (deprecated)'
            };

            const source = securityData.headers ? 'HTTP headers' : 'meta tags';

            return {
                content: [{
                    type: 'text',
                    text: `🔒 Security Headers (from ${source}):\n\n${JSON.stringify(securityHeaders, null, 2)}`
                }]
            };
        } catch (error) {
            debugLog(`Error in browser_sec_get_security_headers: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_sec_get_certificate_info: async (args) => {
        try {
            const { page } = await connectToBrowser();
            const url = page.url();

            if (!url.startsWith('https://')) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ Certificate information only available for HTTPS sites.\n\nCurrent page is not using HTTPS.'
                    }]
                };
            }

            const cdp = await getCDPSession();
            await cdp.send('Security.enable');

            // Get security state which includes certificate info
            const securityState = await page.evaluate(async () => {
                // Try to get security info from the page context
                return {
                    url: window.location.href,
                    protocol: window.location.protocol
                };
            });

            // Note: Getting detailed certificate info via CDP is complex
            // as it requires monitoring security state changes during navigation
            // For now, provide basic HTTPS validation info

            const certInfo = {
                url: url,
                protocol: 'HTTPS',
                secure: true,
                note: 'Detailed certificate inspection requires monitoring during page load. For full certificate details, use browser DevTools Security panel.'
            };

            await cdp.send('Security.disable');

            return {
                content: [{
                    type: 'text',
                    text: `🔒 Certificate Information:\n\n${JSON.stringify(certInfo, null, 2)}\n\nNote: For detailed certificate information (issuer, expiry, subject), use:\n1. Chrome DevTools > Security panel\n2. Or start network monitoring before navigation to capture TLS details`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_sec_get_certificate_info: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_sec_detect_mixed_content: async (args) => {
        try {
            const { page } = await connectToBrowser();
            const url = page.url();

            if (!url.startsWith('https://')) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ Mixed content detection only applies to HTTPS pages.\n\nCurrent page is not using HTTPS.'
                    }]
                };
            }

            // Detect mixed content by analyzing resources
            const mixedContent = await page.evaluate(() => {
                const issues = [];

                // Check all loaded resources
                performance.getEntriesByType('resource').forEach(entry => {
                    if (entry.name.startsWith('http://')) {
                        issues.push({
                            url: entry.name,
                            type: entry.initiatorType,
                            blocked: false
                        });
                    }
                });

                // Check scripts
                document.querySelectorAll('script[src]').forEach(script => {
                    if (script.src.startsWith('http://')) {
                        issues.push({
                            url: script.src,
                            type: 'script',
                            blocked: true  // Mixed scripts are usually blocked
                        });
                    }
                });

                // Check stylesheets
                document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                    if (link.href.startsWith('http://')) {
                        issues.push({
                            url: link.href,
                            type: 'stylesheet',
                            blocked: false
                        });
                    }
                });

                // Check images
                document.querySelectorAll('img[src]').forEach(img => {
                    if (img.src.startsWith('http://')) {
                        issues.push({
                            url: img.src,
                            type: 'image',
                            blocked: false
                        });
                    }
                });

                return issues;
            });

            if (mixedContent.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: '✅ No mixed content detected.\n\nAll resources are loaded over HTTPS.'
                    }]
                };
            }

            const summary = {
                total: mixedContent.length,
                blocked: mixedContent.filter(i => i.blocked).length,
                issues: mixedContent.slice(0, 20)
            };

            return {
                content: [{
                    type: 'text',
                    text: `⚠️ Mixed Content Detected:\n\n${JSON.stringify(summary, null, 2)}\n\nNote: Showing first 20 issues. Mixed content can be a security risk.`
                }]
            };
        } catch (error) {
            debugLog(`Error in browser_sec_detect_mixed_content: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_sec_start_csp_monitoring: async (args) => {
        try {
            if (cspMonitoringActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ CSP monitoring is already active.\n\nUse browser_sec_get_csp_violations to view violations or browser_sec_stop_csp_monitoring to stop.'
                    }]
                };
            }

            const cdp = await getCDPSession();
            cspViolations = [];

            // Enable Log domain to capture CSP violations
            await cdp.send('Log.enable');

            // Listen for log entries
            cdp.on('Log.entryAdded', (params) => {
                const entry = params.entry;

                // CSP violations appear as console errors with specific text
                if (entry.source === 'security' ||
                    (entry.text && entry.text.includes('Content Security Policy')) ||
                    (entry.text && entry.text.includes('CSP'))) {

                    cspViolations.push({
                        timestamp: new Date(entry.timestamp).toISOString(),
                        text: entry.text,
                        level: entry.level,
                        source: entry.source,
                        url: entry.url,
                        lineNumber: entry.lineNumber
                    });
                }
            });

            cspMonitoringActive = true;

            debugLog('Started CSP violation monitoring');

            return {
                content: [{
                    type: 'text',
                    text: '✅ CSP violation monitoring started\n\nCapturing Content Security Policy violations...\n\nUse browser_sec_get_csp_violations to view captured violations.'
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_sec_start_csp_monitoring: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nPossible causes:\n- CDP session disconnected\n- Log domain not supported`
                }],
                isError: true
            };
        }
    },

    browser_sec_get_csp_violations: async (args) => {
        try {
            if (!cspMonitoringActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ CSP monitoring is not active.\n\nUse browser_sec_start_csp_monitoring to start monitoring first.'
                    }]
                };
            }

            if (cspViolations.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: 'No CSP violations detected yet.\n\nMonitoring is active - violations will appear if any occur.'
                    }]
                };
            }

            const summary = {
                total: cspViolations.length,
                violations: cspViolations.map(v => ({
                    timestamp: v.timestamp,
                    message: v.text,
                    level: v.level,
                    source: v.url || 'unknown'
                }))
            };

            return {
                content: [{
                    type: 'text',
                    text: `⚠️ CSP Violations (${cspViolations.length}):\n\n${JSON.stringify(summary, null, 2)}`
                }]
            };
        } catch (error) {
            debugLog(`Error in browser_sec_get_csp_violations: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_sec_stop_csp_monitoring: async (args) => {
        try {
            if (!cspMonitoringActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ CSP monitoring is not active.'
                    }]
                };
            }

            const cdp = await getCDPSession();
            await cdp.send('Log.disable');

            // Remove listener
            cdp.removeAllListeners('Log.entryAdded');

            const count = cspViolations.length;
            cspViolations = [];
            cspMonitoringActive = false;

            debugLog('Stopped CSP violation monitoring');

            return {
                content: [{
                    type: 'text',
                    text: `✅ CSP monitoring stopped\n\nCaptured ${count} violations.\nData has been cleared.`
                }]
            };
        } catch (error) {
            cspMonitoringActive = false;
            debugLog(`CDP error in browser_sec_stop_csp_monitoring: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nMonitoring has been stopped.`
                }],
                isError: true
            };
        }
    }
};

module.exports = { definitions, handlers };
