/**
 * Storage & Service Workers Tools (CDP-based)
 */

const { withPage } = require('../browser');
const { getCDPSession } = require('../cdp');
const { debugLog } = require('../utils');

const definitions = [
    {
        name: 'browser_storage_get_indexeddb',
        description: 'Inspect IndexedDB databases and their data (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                databaseName: { type: 'string', description: 'Specific database to inspect (optional)' },
                objectStoreName: { type: 'string', description: 'Specific object store to query (optional, requires databaseName)' }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_storage_get_cache_storage',
        description: 'List Cache Storage API caches and their entries (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                cacheName: { type: 'string', description: 'Specific cache to inspect (optional)' }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_storage_delete_cache',
        description: 'Delete a specific cache from Cache Storage (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                cacheName: { type: 'string', description: 'Cache name to delete' }
            },
            required: ['cacheName'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_storage_get_service_workers',
        description: 'Get service worker registrations and their state (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_storage_unregister_service_worker',
        description: 'Unregister a service worker (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                scopeURL: { type: 'string', description: 'Scope URL of service worker to unregister' }
            },
            required: ['scopeURL'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_storage_get_indexeddb: withPage(async (page, args) => {
        try {
            const cdp = await getCDPSession();
            const origin = await page.evaluate(() => window.location.origin);
            const { databaseNames } = await cdp.send('IndexedDB.requestDatabaseNames', { securityOrigin: origin });

            if (databaseNames.length === 0) return { content: [{ type: 'text', text: 'No IndexedDB databases found.' }] };
            if (!args.databaseName) return { content: [{ type: 'text', text: `📊 IndexedDB Databases: ${JSON.stringify(databaseNames, null, 2)}` }] };

            const dbInfo = await cdp.send('IndexedDB.requestDatabase', { securityOrigin: origin, databaseName: args.databaseName });
            if (!args.objectStoreName) return { content: [{ type: 'text', text: `📊 Structure: ${JSON.stringify(dbInfo.databaseWithObjectStores, null, 2)}` }] };

            const { objectStoreDataEntries, hasMore } = await cdp.send('IndexedDB.requestData', {
                securityOrigin: origin, databaseName: args.databaseName, objectStoreName: args.objectStoreName,
                indexName: '', skipCount: 0, pageSize: 100
            });

            return { content: [{ type: 'text', text: `📊 Data (100 max): ${JSON.stringify(objectStoreDataEntries, null, 2)}` }] };
        } catch (error) {
            return { content: [{ type: 'text', text: `❌ CDP Error: ${error.message}` }], isError: true };
        }
    }),

    browser_storage_get_cache_storage: withPage(async (page, args) => {
        try {
            const cdp = await getCDPSession();
            const origin = await page.evaluate(() => window.location.origin);
            const { caches } = await cdp.send('CacheStorage.requestCacheNames', { securityOrigin: origin });

            if (caches.length === 0) return { content: [{ type: 'text', text: 'No Cache Storage found.' }] };
            if (!args.cacheName) return { content: [{ type: 'text', text: `📊 Caches: ${JSON.stringify(caches.map(c => c.cacheName), null, 2)}` }] };

            const cache = caches.find(c => c.cacheName === args.cacheName);
            if (!cache) return { content: [{ type: 'text', text: `⚠️ Cache "${args.cacheName}" not found.` }] };

            const { cacheDataEntries } = await cdp.send('CacheStorage.requestEntries', { cacheId: cache.cacheId, skipCount: 0, pageSize: 50 });
            return { content: [{ type: 'text', text: `📊 Entries (50 max): ${JSON.stringify(cacheDataEntries, null, 2)}` }] };
        } catch (error) {
            return { content: [{ type: 'text', text: `❌ CDP Error: ${error.message}` }], isError: true };
        }
    }),

    browser_storage_delete_cache: withPage(async (page, args) => {
        try {
            const cdp = await getCDPSession();
            const origin = await page.evaluate(() => window.location.origin);
            const { caches } = await cdp.send('CacheStorage.requestCacheNames', { securityOrigin: origin });
            const cache = caches.find(c => c.cacheName === args.cacheName);
            if (!cache) return { content: [{ type: 'text', text: `⚠️ Cache "${args.cacheName}" not found.` }] };

            await cdp.send('CacheStorage.deleteCache', { cacheId: cache.cacheId });
            return { content: [{ type: 'text', text: `✅ Cache deleted: ${args.cacheName}` }] };
        } catch (error) {
            return { content: [{ type: 'text', text: `❌ CDP Error: ${error.message}` }], isError: true };
        }
    }),

    browser_storage_get_service_workers: withPage(async (page) => {
        try {
            const cdp = await getCDPSession();
            await cdp.send('ServiceWorker.enable');
            const { registrations } = await cdp.send('ServiceWorker.getServiceWorker', {});
            await cdp.send('ServiceWorker.disable');

            if (registrations.length === 0) return { content: [{ type: 'text', text: 'No service workers found.' }] };
            return { content: [{ type: 'text', text: `📊 Service Workers: ${JSON.stringify(registrations, null, 2)}` }] };
        } catch (error) {
            const swInfo = await page.evaluate(async () => {
                if (!('serviceWorker' in navigator)) return { supported: false };
                const registrations = await navigator.serviceWorker.getRegistrations();
                return {
                    supported: true,
                    registrations: registrations.map(reg => ({
                        scope: reg.scope,
                        active: reg.active ? { scriptURL: reg.active.scriptURL, state: reg.active.state } : null
                    }))
                };
            });
            if (!swInfo.supported) return { content: [{ type: 'text', text: '⚠️ Service Workers not supported.' }] };
            return { content: [{ type: 'text', text: `📊 Service Workers: ${JSON.stringify(swInfo.registrations, null, 2)}` }] };
        }
    }),

    browser_storage_unregister_service_worker: withPage(async (page, args) => {
        try {
            const result = await page.evaluate(async (scopeURL) => {
                if (!('serviceWorker' in navigator)) return { success: false, error: 'Not supported' };
                const registrations = await navigator.serviceWorker.getRegistrations();
                const registration = registrations.find(reg => reg.scope === scopeURL);
                if (!registration) return { success: false, error: 'Not found' };
                return { success: await registration.unregister() };
            }, args.scopeURL);

            if (!result.success) return { content: [{ type: 'text', text: `⚠️ ${result.error}` }] };
            return { content: [{ type: 'text', text: `✅ Unregistered: ${args.scopeURL}` }] };
        } catch (error) {
            return { content: [{ type: 'text', text: `❌ Error: ${error.message}` }], isError: true };
        }
    })
};

module.exports = { definitions, handlers };