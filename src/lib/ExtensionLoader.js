import { UniversalExtension } from './UniversalExtension';
import { ExtensionHealthChecker } from './ExtensionHealthChecker';

/**
 * ExtensionLoader
 * Automated URL Extension Engine for Mugen Play.
 * Auto-detects extension manifests, REST APIs, or streaming sites from user-supplied URLs.
 */
export const ExtensionLoader = {
    /**
     * Auto-detect and load extension from a given URL
     * @param {string} url - The URL pasted by the user
     * @param {string} customName - Optional user defined name
     * @returns {Promise<{ extension: UniversalExtension, manifest: Object }>}
     */
    async loadFromUrl(url, customName = '') {
        if (!url || !url.startsWith('http')) {
            throw new Error('Please enter a valid HTTP/HTTPS URL.');
        }

        const trimmedUrl = url.trim();
        console.log(`[ExtensionLoader] Auto-detecting extension from: ${trimmedUrl}`);

        let manifest = null;
        let fetchedData = null;

        // Try direct fetch first for JSON manifests
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(trimmedUrl, { signal: controller.signal });
            clearTimeout(timer);

            if (res.ok) {
                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('application/json') || trimmedUrl.endsWith('.json')) {
                    fetchedData = await res.json();
                } else {
                    const text = await res.text();
                    try {
                        fetchedData = JSON.parse(text);
                    } catch {
                        fetchedData = text;
                    }
                }
            }
        } catch (err) {
            console.warn(`[ExtensionLoader] Direct fetch failed for ${trimmedUrl}:`, err);
        }

        // If direct fetch failed or returned non-JSON, try via CORS proxy
        if (!fetchedData) {
            try {
                const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(trimmedUrl)}`;
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 5000);
                const res = await fetch(proxied, { signal: controller.signal });
                clearTimeout(timer);

                if (res.ok) {
                    const text = await res.text();
                    try {
                        fetchedData = JSON.parse(text);
                    } catch {
                        fetchedData = text;
                    }
                }
            } catch (err) {
                console.warn(`[ExtensionLoader] Proxy fetch failed for ${trimmedUrl}:`, err);
            }
        }

        // Check overall reachability if no structured JSON was returned
        if (!fetchedData || typeof fetchedData !== 'object') {
            const ping = await ExtensionHealthChecker.pingUrl(trimmedUrl, 6000);
            if (!ping.isHealthy) {
                throw new Error(`The URL "${trimmedUrl}" appears unreachable or down.`);
            }
        }

        // Parse and Build Manifest
        if (fetchedData && typeof fetchedData === 'object' && !Array.isArray(fetchedData)) {
            // Case 1: Full Extension Manifest Object
            manifest = {
                id: fetchedData.id || `url_ext_${Date.now()}`,
                name: customName || fetchedData.name || this.extractDomainName(trimmedUrl),
                version: fetchedData.version || '1.0.0',
                icon: fetchedData.icon || 'globe',
                type: fetchedData.type || 'source',
                baseUrl: fetchedData.baseUrl || trimmedUrl,
                endpoints: fetchedData.endpoints || {
                    trending: fetchedData.trendingEndpoint || `${trimmedUrl}/trending`,
                    search: fetchedData.searchEndpoint || `${trimmedUrl}/search`,
                    episodes: fetchedData.episodesEndpoint || `${trimmedUrl}/episodes/{id}`,
                    stream: fetchedData.streamEndpoint || `${trimmedUrl}/stream/{id}`
                },
                headers: fetchedData.headers || {},
                enabled: true,
                status: 'installed'
            };
        } else {
            // Case 2: Generic Streaming Site / REST URL fallback auto-configuration
            const domainName = this.extractDomainName(trimmedUrl);
            manifest = {
                id: `url_ext_${Date.now()}`,
                name: customName || domainName,
                version: '1.0.0',
                icon: 'globe',
                type: 'source',
                baseUrl: trimmedUrl,
                endpoints: {
                    search: `${trimmedUrl}?search={query}`,
                    trending: `${trimmedUrl}`,
                    stream: `${trimmedUrl}`
                },
                enabled: true,
                status: 'installed'
            };
        }

        const extension = new UniversalExtension(manifest);
        return { extension, manifest };
    },

    /**
     * Extracts readable domain name from a URL string
     */
    extractDomainName(urlStr) {
        try {
            const parsed = new URL(urlStr);
            const host = parsed.hostname.replace('www.', '');
            return host.charAt(0).toUpperCase() + host.slice(1);
        } catch {
            return 'Custom Anime Source';
        }
    }
};
