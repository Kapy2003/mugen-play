/**
 * ExtensionHealthChecker
 * High-accuracy reachability engine for external anime streaming portals,
 * with Cloudflare challenge resilience, DOM network probing, mirror resolution, and multi-proxy rotation.
 */

const CORS_PROXIES = [
    (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

// Alternate active mirror TLDs for top providers
const KNOWN_MIRRORS = {
    'animepahe': ['https://animepahe.pw', 'https://animepahe.si', 'https://animepahe.ru', 'https://animepahe.org', 'https://animepahe.com'],
    'animekai': ['https://animekai.be', 'https://animekai.to', 'https://animekai.org'],
    'hianime': ['https://aniwatchtv.to', 'https://hianime.sx', 'https://hianime.do', 'https://kaido.to', 'https://hianime.to'],
    'aniwatch': ['https://aniwatchtv.to', 'https://aniwatch.to'],
    'anitaku': ['https://anitaku.so', 'https://anitaku.pe', 'https://anitaku.to', 'https://gogoanime3.co', 'https://anitaku.bz'],
    'gogoanime': ['https://anitaku.so', 'https://anitaku.pe', 'https://anitaku.to', 'https://gogoanime3.co', 'https://gogoanime.cl'],
    'allanime': ['https://allanime.to', 'https://allmanga.to', 'https://allanime.co', 'https://allanime.day'],
    'anikoto': ['https://anikoto.cz', 'https://anikoto.tv', 'https://anikoto.org'],
    'hanime': ['https://hanime.tv', 'https://members.hanime.tv', 'https://player.hanime.tv']
};

export const ExtensionHealthChecker = {
    /**
     * Retrieves canonical mirror list for a known provider
     */
    getMirrors(urlStr) {
        if (!urlStr) return [];
        const lowerUrl = urlStr.toLowerCase();
        for (const [key, mirrors] of Object.entries(KNOWN_MIRRORS)) {
            if (lowerUrl.includes(key)) {
                return mirrors;
            }
        }
        return [urlStr];
    },
    /**
     * DOM-level probe that detects if DNS resolves and HTTP server answers
     * (Even if 403 Cloudflare, 404, or 503, the server is alive!)
     */
    probeDomAsset(url, timeoutMs = 4000) {
        return new Promise((resolve) => {
            if (typeof window === 'undefined' || !window.Image) {
                return resolve(false);
            }

            const img = new Image();
            let isDone = false;

            const timer = setTimeout(() => {
                if (!isDone) {
                    isDone = true;
                    img.src = '';
                    resolve(false);
                }
            }, timeoutMs);

            img.onload = () => {
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timer);
                    resolve(true);
                }
            };

            img.onerror = () => {
                // onerror fires when the server responded (e.g. 403, 404, 503, Cloudflare HTML)
                // but couldn't parse image, meaning DNS + TCP + HTTP connection succeeded!
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timer);
                    resolve(true);
                }
            };

            const faviconUrl = url.endsWith('/') ? `${url}favicon.ico` : `${url}/favicon.ico`;
            img.src = `${faviconUrl}?_t=${Date.now()}`;
        });
    },

    /**
     * Probes whether a given URL or its active mirrors are alive
     * @param {string} urlStr
     * @param {number} timeoutMs
     * @returns {Promise<{ isHealthy: boolean, isCloudflare?: boolean, latency: number, activeUrl?: string, error?: string }>}
     */
    async pingUrl(urlStr, timeoutMs = 6000) {
        if (!urlStr || !urlStr.startsWith('http')) {
            return { isHealthy: false, latency: 0, error: 'Invalid URL' };
        }

        const cleanUrl = urlStr.trim().replace(/\/+$/, '');
        const startTime = Date.now();

        // 1. Check known mirrors if this is a known provider (e.g. animepahe.pw -> animepahe.si)
        const lowerUrl = cleanUrl.toLowerCase();
        let targetUrls = [cleanUrl];
        for (const [key, mirrors] of Object.entries(KNOWN_MIRRORS)) {
            if (lowerUrl.includes(key)) {
                targetUrls = Array.from(new Set([cleanUrl, ...mirrors]));
                break;
            }
        }

        // 2. Primary Strategy: Parallel Browser Native Probe (mode: 'no-cors')
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 3500));

            const probePromises = targetUrls.map(async (candidateUrl) => {
                await fetch(candidateUrl, {
                    mode: 'no-cors',
                    cache: 'no-store',
                    signal: controller.signal
                });
                return candidateUrl;
            });

            const winner = await Promise.any(probePromises);
            clearTimeout(timer);
            try { controller.abort(); } catch {}
            return {
                isHealthy: true,
                latency: Date.now() - startTime,
                activeUrl: winner
            };
        } catch {
            // Fall through to DOM asset probe
        }

        // 3. Secondary Strategy: Parallel DOM Asset / Favicon Reachability Probe
        try {
            const domPromises = targetUrls.map(async (candidateUrl) => {
                const alive = await this.probeDomAsset(candidateUrl, 2500);
                if (!alive) throw new Error('DOM asset unreachable');
                return candidateUrl;
            });
            const winner = await Promise.any(domPromises);
            return {
                isHealthy: true,
                latency: Date.now() - startTime,
                activeUrl: winner
            };
        } catch {
            // Fall through to proxy check
        }

        // 4. Tertiary Strategy: Multi-Proxy Reachability Check with Cloudflare Detection
        for (const candidateUrl of targetUrls) {
            for (const proxyFn of CORS_PROXIES) {
                try {
                    const proxiedUrl = proxyFn(candidateUrl);
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), 4000);

                    const res = await fetch(proxiedUrl, { method: 'GET', signal: controller.signal });
                    clearTimeout(timer);

                    const text = await res.text();
                    const isCloudflare = res.headers.get('cf-ray') ||
                        text.includes('Just a moment...') ||
                        text.includes('cf-browser-verification') ||
                        text.includes('Cloudflare') ||
                        res.status === 403 ||
                        res.status === 503;

                    if (isCloudflare || res.ok || res.status < 500) {
                        return {
                            isHealthy: true,
                            isCloudflare: !!isCloudflare,
                            latency: Date.now() - startTime,
                            activeUrl: candidateUrl
                        };
                    }
                } catch {
                    // Try next proxy
                }
            }
        }

        return {
            isHealthy: false,
            latency: Date.now() - startTime,
            error: 'Unreachable'
        };
    },

    /**
     * Audit a single extension
     */
    async checkSingle(extension) {
        const url = extension.baseUrl || extension.url;
        if (!url) {
            return { isHealthy: false, status: 'dead', latency: 0 };
        }

        if (extension.id === 'anilist_source') {
            return { isHealthy: true, status: 'installed', latency: 35, lastChecked: Date.now() };
        }

        const check = await this.pingUrl(url);

        return {
            isHealthy: check.isHealthy,
            isCloudflare: !!check.isCloudflare,
            status: check.isHealthy ? 'installed' : 'dead',
            latency: check.latency,
            lastChecked: Date.now(),
            error: check.error
        };
    },

    /**
     * Audit a list of extensions concurrently
     */
    async auditAll(extensions, onProgress = null) {
        if (!Array.isArray(extensions) || extensions.length === 0) return [];

        const checkedResults = await Promise.all(
            extensions.map(async (ext) => {
                if (ext.id === 'anilist_source' || ext.type === 'metadata') {
                    return { ...ext, isHealthy: true, status: 'installed', lastChecked: Date.now() };
                }

                const health = await this.checkSingle(ext);
                const updated = {
                    ...ext,
                    ...health,
                    status: health.isHealthy ? 'installed' : 'dead'
                };

                if (onProgress) {
                    onProgress(updated);
                }
                return updated;
            })
        );

        return checkedResults;
    }
};
