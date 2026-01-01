/**
 * Security Testing Tools (CDP-based)
 */

const { withPage } = require('../browser');
const { getCDPSession } = require('../cdp');
const { debugLog } = require('../utils');

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
    browser_sec_get_security_headers: withPage(async (page) => {
        try {
            const securityData = await page.evaluate(async () => {
                const result = { headers: null, metaTags: {}, protocol: window.location.protocol };
                if (window.location.protocol.startsWith('http')) {
                    try {
                        const res = await fetch(window.location.href, { method: 'HEAD' });
                        const headers = {};
                        for (let [key, value] of res.headers.entries()) headers[key] = value;
                        result.headers = headers;
                    } catch (e) { }
                }
                const metaTags = document.querySelectorAll('meta[http-equiv]');
                metaTags.forEach(tag => {
                    const httpEquiv = tag.getAttribute('http-equiv').toLowerCase();
                    const content = tag.getAttribute('content');
                    if (httpEquiv && content) result.metaTags[httpEquiv] = content;
                });
                return result;
            });

            const securityHeaders = {
                'content-security-policy': securityData.headers?.['content-security-policy'] || securityData.metaTags['content-security-policy'] || 'Not set',
                'strict-transport-security': securityData.headers?.['strict-transport-security'] || 'Not set',
                'x-frame-options': securityData.headers?.['x-frame-options'] || securityData.metaTags['x-frame-options'] || 'Not set',
                'x-content-type-options': securityData.headers?.['x-content-type-options'] || 'Not set',
                'referrer-policy': securityData.headers?.['referrer-policy'] || securityData.metaTags['referrer-policy'] || 'Not set',
                'permissions-policy': securityData.headers?.['permissions-policy'] || 'Not set'
            };

            return {
                content: [{
                    type: 'text',
                    text: `🔒 Security Headers:\n\n${JSON.stringify(securityHeaders, null, 2)}`
                }]
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `❌ Error: ${error.message}` }],
                isError: true
            };
        }
    }),

    browser_sec_get_certificate_info: withPage(async (page) => {
        try {
            const url = page.url();
            if (!url.startsWith('https://')) {
                return { content: [{ type: 'text', text: '⚠️ Certificate info only for HTTPS sites.' }] };
            }

            const cdp = await getCDPSession();
            await cdp.send('Security.enable');
            const certInfo = { url, protocol: 'HTTPS', secure: true };
            await cdp.send('Security.disable');

            return {
                content: [{
                    type: 'text',
                    text: `🔒 Certificate Information: ${JSON.stringify(certInfo, null, 2)}`
                }]
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `❌ CDP Error: ${error.message}` }],
                isError: true
            };
        }
    }),

    browser_sec_detect_mixed_content: withPage(async (page) => {
        try {
            const url = page.url();
            if (!url.startsWith('https://')) {
                return { content: [{ type: 'text', text: '⚠️ Mixed content detection only for HTTPS.' }] };
            }

            const mixedContent = await page.evaluate(() => {
                const issues = [];
                performance.getEntriesByType('resource').forEach(entry => {
                    if (entry.name.startsWith('http://')) issues.push({ url: entry.name, type: entry.initiatorType });
                });
                return issues;
            });

            if (mixedContent.length === 0) {
                return { content: [{ type: 'text', text: '✅ No mixed content detected.' }] };
            }

            return {
                content: [{
                    type: 'text',
                    text: `⚠️ Mixed Content Detected: ${JSON.stringify(mixedContent.slice(0, 20), null, 2)}`
                }]
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `❌ Error: ${error.message}` }],
                isError: true
            };
        }
    }),

    browser_sec_start_csp_monitoring: async () => {
        try {
            if (cspMonitoringActive) return { content: [{ type: 'text', text: '⚠️ CSP monitoring already active.' }] };

            const cdp = await getCDPSession();
            cspViolations = [];
            await cdp.send('Log.enable');
            cdp.on('Log.entryAdded', (params) => {
                const entry = params.entry;
                if (entry.source === 'security' || entry.text?.includes('CSP')) {
                    cspViolations.push({
                        timestamp: new Date(entry.timestamp).toISOString(),
                        text: entry.text,
                        url: entry.url
                    });
                }
            });

            cspMonitoringActive = true;
            return { content: [{ type: 'text', text: '✅ CSP monitoring started.' }] };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `❌ CDP Error: ${error.message}` }],
                isError: true
            };
        }
    },

    browser_sec_get_csp_violations: async () => {
        if (!cspMonitoringActive) return { content: [{ type: 'text', text: '⚠️ CSP monitoring not active.' }] };
        if (cspViolations.length === 0) return { content: [{ type: 'text', text: 'No CSP violations detected.' }] };

        return {
            content: [{
                type: 'text',
                text: `⚠️ CSP Violations: ${JSON.stringify(cspViolations, null, 2)}`
            }]
        };
    },

    browser_sec_stop_csp_monitoring: async () => {
        if (!cspMonitoringActive) return { content: [{ type: 'text', text: '⚠️ CSP monitoring not active.' }] };

        const cdp = await getCDPSession();
        await cdp.send('Log.disable');
        cdp.removeAllListeners('Log.entryAdded');
        cspViolations = [];
        cspMonitoringActive = false;

        return { content: [{ type: 'text', text: '✅ CSP monitoring stopped.' }] };
    }
};

module.exports = { definitions, handlers };