/**
 * Storage & Service Workers Tools (CDP-based)
 * IndexedDB, Cache Storage, Service Worker inspection and control
 */

const { connectToBrowser } = require('../browser');
const { getCDPSession } = require('../cdp');
const { debugLog } = require('../utils');

const definitions = [
    {
        name: 'browser_storage_get_indexeddb',
        description: 'Inspect IndexedDB databases and their data (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                databaseName: {
                    type: 'string',
                    description: 'Specific database to inspect (optional)'
                },
                objectStoreName: {
                    type: 'string',
                    description: 'Specific object store to query (optional, requires databaseName)'
                }
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
                cacheName: {
                    type: 'string',
                    description: 'Specific cache to inspect (optional)'
                }
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
                cacheName: {
                    type: 'string',
                    description: 'Cache name to delete'
                }
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
                scopeURL: {
                    type: 'string',
                    description: 'Scope URL of service worker to unregister'
                }
            },
            required: ['scopeURL'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_storage_get_indexeddb: async (args) => {
        try {
            const { page } = await connectToBrowser();
            const cdp = await getCDPSession();

            // Get security origin for current page
            const origin = await page.evaluate(() => window.location.origin);

            // Request database names
            const { databaseNames } = await cdp.send('IndexedDB.requestDatabaseNames', {
                securityOrigin: origin
            });

            if (databaseNames.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: 'No IndexedDB databases found for this origin.\n\nThe page may not be using IndexedDB.'
                    }]
                };
            }

            // If no specific database requested, list all databases
            if (!args.databaseName) {
                return {
                    content: [{
                        type: 'text',
                        text: `📊 IndexedDB Databases:\n\n${JSON.stringify({ origin, databases: databaseNames }, null, 2)}\n\nUse databaseName parameter to inspect a specific database.`
                    }]
                };
            }

            // Get database structure
            const dbInfo = await cdp.send('IndexedDB.requestDatabase', {
                securityOrigin: origin,
                databaseName: args.databaseName
            });

            if (!args.objectStoreName) {
                // Return database structure
                const structure = {
                    name: dbInfo.databaseWithObjectStores.name,
                    version: dbInfo.databaseWithObjectStores.version,
                    objectStores: dbInfo.databaseWithObjectStores.objectStores.map(store => ({
                        name: store.name,
                        keyPath: store.keyPath,
                        autoIncrement: store.autoIncrement,
                        indexes: store.indexes.map(idx => ({
                            name: idx.name,
                            keyPath: idx.keyPath,
                            unique: idx.unique,
                            multiEntry: idx.multiEntry
                        }))
                    }))
                };

                return {
                    content: [{
                        type: 'text',
                        text: `📊 IndexedDB Database Structure:\n\n${JSON.stringify(structure, null, 2)}\n\nUse objectStoreName parameter to query data from a specific object store.`
                    }]
                };
            }

            // Get object store data
            const { objectStoreDataEntries, hasMore } = await cdp.send('IndexedDB.requestData', {
                securityOrigin: origin,
                databaseName: args.databaseName,
                objectStoreName: args.objectStoreName,
                indexName: '',
                skipCount: 0,
                pageSize: 100
            });

            const data = {
                objectStore: args.objectStoreName,
                entries: objectStoreDataEntries.length,
                hasMore: hasMore,
                data: objectStoreDataEntries.map(entry => ({
                    key: entry.key,
                    primaryKey: entry.primaryKey,
                    value: entry.value
                }))
            };

            return {
                content: [{
                    type: 'text',
                    text: `📊 IndexedDB Data:\n\n${JSON.stringify(data, null, 2)}\n\nNote: Limited to 100 entries.${hasMore ? ' More entries available.' : ''}`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_storage_get_indexeddb: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nPossible causes:\n- IndexedDB not accessible\n- Invalid database or object store name\n- CDP session disconnected`
                }],
                isError: true
            };
        }
    },

    browser_storage_get_cache_storage: async (args) => {
        try {
            const { page } = await connectToBrowser();
            const cdp = await getCDPSession();

            // Get security origin
            const origin = await page.evaluate(() => window.location.origin);

            // Request cache names
            const { caches } = await cdp.send('CacheStorage.requestCacheNames', {
                securityOrigin: origin
            });

            if (caches.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: 'No Cache Storage caches found for this origin.\n\nThe page may not be using Cache Storage API.'
                    }]
                };
            }

            // If no specific cache requested, list all caches
            if (!args.cacheName) {
                return {
                    content: [{
                        type: 'text',
                        text: `📊 Cache Storage Caches:\n\n${JSON.stringify({ origin, caches: caches.map(c => c.cacheName) }, null, 2)}\n\nUse cacheName parameter to inspect entries in a specific cache.`
                    }]
                };
            }

            // Find the cache ID
            const cache = caches.find(c => c.cacheName === args.cacheName);
            if (!cache) {
                return {
                    content: [{
                        type: 'text',
                        text: `⚠️ Cache "${args.cacheName}" not found.\n\nAvailable caches:\n${caches.map(c => `  • ${c.cacheName}`).join('\n')}`
                    }]
                };
            }

            // Get cache entries
            const { cacheDataEntries, returnCount } = await cdp.send('CacheStorage.requestEntries', {
                cacheId: cache.cacheId,
                skipCount: 0,
                pageSize: 50
            });

            const entries = {
                cacheName: args.cacheName,
                entryCount: returnCount,
                entries: cacheDataEntries.map(entry => ({
                    requestURL: entry.requestURL,
                    requestMethod: entry.requestMethod,
                    responseStatus: entry.responseStatus,
                    responseStatusText: entry.responseStatusText,
                    responseType: entry.responseType
                }))
            };

            return {
                content: [{
                    type: 'text',
                    text: `📊 Cache Storage Entries:\n\n${JSON.stringify(entries, null, 2)}\n\nNote: Limited to 50 entries.`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_storage_get_cache_storage: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nPossible causes:\n- Cache Storage not accessible\n- Invalid cache name\n- CDP session disconnected`
                }],
                isError: true
            };
        }
    },

    browser_storage_delete_cache: async (args) => {
        try {
            const { page } = await connectToBrowser();
            const cdp = await getCDPSession();

            // Get security origin
            const origin = await page.evaluate(() => window.location.origin);

            // Request cache names to find the cache ID
            const { caches } = await cdp.send('CacheStorage.requestCacheNames', {
                securityOrigin: origin
            });

            const cache = caches.find(c => c.cacheName === args.cacheName);
            if (!cache) {
                return {
                    content: [{
                        type: 'text',
                        text: `⚠️ Cache "${args.cacheName}" not found.\n\nAvailable caches:\n${caches.map(c => `  • ${c.cacheName}`).join('\n')}`
                    }]
                };
            }

            // Delete the cache
            await cdp.send('CacheStorage.deleteCache', {
                cacheId: cache.cacheId
            });

            debugLog(`Deleted cache: ${args.cacheName}`);

            return {
                content: [{
                    type: 'text',
                    text: `✅ Cache deleted successfully: ${args.cacheName}`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_storage_delete_cache: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nFailed to delete cache.`
                }],
                isError: true
            };
        }
    },

    browser_storage_get_service_workers: async (args) => {
        try {
            const { page } = await connectToBrowser();
            const cdp = await getCDPSession();

            // Enable ServiceWorker domain
            await cdp.send('ServiceWorker.enable');

            // Get service worker registrations
            const { registrations } = await cdp.send('ServiceWorker.getServiceWorker', {});

            if (registrations.length === 0) {
                await cdp.send('ServiceWorker.disable');
                return {
                    content: [{
                        type: 'text',
                        text: 'No service workers found.\n\nThe page may not have registered any service workers.'
                    }]
                };
            }

            const workers = registrations.map(reg => ({
                registrationId: reg.registrationId,
                scopeURL: reg.scopeURL,
                isDeleted: reg.isDeleted
            }));

            await cdp.send('ServiceWorker.disable');

            return {
                content: [{
                    type: 'text',
                    text: `📊 Service Workers:\n\n${JSON.stringify(workers, null, 2)}`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_storage_get_service_workers: ${error.message}`);

            // Try alternative approach using page.evaluate
            try {
                const { page } = await connectToBrowser();
                const swInfo = await page.evaluate(async () => {
                    if (!('serviceWorker' in navigator)) {
                        return { supported: false };
                    }

                    const registrations = await navigator.serviceWorker.getRegistrations();
                    return {
                        supported: true,
                        registrations: registrations.map(reg => ({
                            scope: reg.scope,
                            active: reg.active ? {
                                scriptURL: reg.active.scriptURL,
                                state: reg.active.state
                            } : null,
                            installing: reg.installing ? {
                                scriptURL: reg.installing.scriptURL,
                                state: reg.installing.state
                            } : null,
                            waiting: reg.waiting ? {
                                scriptURL: reg.waiting.scriptURL,
                                state: reg.waiting.state
                            } : null
                        }))
                    };
                });

                if (!swInfo.supported) {
                    return {
                        content: [{
                            type: 'text',
                            text: '⚠️ Service Workers not supported in this browser/context.'
                        }]
                    };
                }

                return {
                    content: [{
                        type: 'text',
                        text: `📊 Service Workers:\n\n${JSON.stringify(swInfo.registrations, null, 2)}`
                    }]
                };
            } catch (fallbackError) {
                debugLog(`Fallback error in browser_storage_get_service_workers: ${fallbackError.message}`);
                return {
                    content: [{
                        type: 'text',
                        text: `❌ Error: ${error.message}\n\nCould not retrieve service worker information.`
                    }],
                    isError: true
                };
            }
        }
    },

    browser_storage_unregister_service_worker: async (args) => {
        try {
            const { page } = await connectToBrowser();

            // Use page.evaluate to unregister via JavaScript API
            const result = await page.evaluate(async (scopeURL) => {
                if (!('serviceWorker' in navigator)) {
                    return { success: false, error: 'Service Workers not supported' };
                }

                const registrations = await navigator.serviceWorker.getRegistrations();
                const registration = registrations.find(reg => reg.scope === scopeURL);

                if (!registration) {
                    return { success: false, error: 'Service worker not found for scope: ' + scopeURL };
                }

                const unregistered = await registration.unregister();
                return { success: unregistered };
            }, args.scopeURL);

            if (!result.success) {
                return {
                    content: [{
                        type: 'text',
                        text: `⚠️ ${result.error}`
                    }]
                };
            }

            debugLog(`Unregistered service worker: ${args.scopeURL}`);

            return {
                content: [{
                    type: 'text',
                    text: `✅ Service worker unregistered successfully\n\nScope: ${args.scopeURL}`
                }]
            };
        } catch (error) {
            debugLog(`Error in browser_storage_unregister_service_worker: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ Error: ${error.message}\n\nFailed to unregister service worker.`
                }],
                isError: true
            };
        }
    }
};

module.exports = { definitions, handlers };
