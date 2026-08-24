/**
 * IframeStreamExtractor
 * Extracts direct playable video streams (.m3u8/.mp4) or isolated iframe embed players
 * from any anime website HTML.
 */

const NON_VIDEO_IFRAME_PATTERNS = [
    'google', 'facebook', 'twitter', 'disqus', 'recaptcha', 'adservice',
    'doubleclick', 'analytics', 'histats', 'cloudflare', 'widget', 'comment',
    'banner', 'popunder', 'syndication', 'scorecard', 'advertisement',
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico', '.avif', '.css', '.js'
];

const KNOWN_VIDEO_HOST_PATTERNS = [
    'bibiemb', 'bibi', 'vivibebe', 'otakuhg', 'megacloud', 'rapid-cloud', 'streamtape', 'mp4upload',
    'playtaku', 'vidstream', 'dood', 'filemoon', 'streamwish', 'voe', 'mixdrop',
    'vizcloud', 'kwik', 'vidcloud', 'gogo', 'anitaku', 'anikai', 'animekai',
    '/embed/', '/e/', '/v/', '/player/', '/video/', 'streaming.php', 'player.php', 'embed.html'
];

// In-Memory & LocalStorage High-Speed Stream Extraction Cache
const extractionMemoryCache = new Map();
const CACHE_STORAGE_KEY = 'mugen_stream_extract_cache';

const loadSavedCache = () => {
    try {
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem(CACHE_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    Object.entries(parsed).forEach(([k, v]) => extractionMemoryCache.set(k, v));
                }
            }
        }
    } catch {
        // ignore safely
    }
};
loadSavedCache();

const saveToCache = (pageUrl, data) => {
    if (!pageUrl || !data) return;
    extractionMemoryCache.set(pageUrl, data);
    try {
        if (typeof localStorage !== 'undefined') {
            const obj = {};
            // Keep the latest 100 extracted streams in local storage
            const entries = Array.from(extractionMemoryCache.entries()).slice(-100);
            entries.forEach(([k, v]) => { obj[k] = v; });
            localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
        }
    } catch {
        // ignore safely
    }
};

export const IframeStreamExtractor = {
    /**
     * Synchronous instant cache lookup
     */
    getCached(pageUrl) {
        if (!pageUrl) return null;
        return extractionMemoryCache.get(pageUrl) || null;
    },

    /**
     * Resolves a relative or protocol-relative URL against the base page URL.
     */
    resolveUrl(targetUrl, baseUrl) {
        if (!targetUrl || typeof targetUrl !== 'string') return null;
        const trimmed = targetUrl.trim();
        if (trimmed.startsWith('//')) {
            return `https:${trimmed}`;
        }
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }
        try {
            return new URL(trimmed, baseUrl).href;
        } catch {
            return trimmed;
        }
    },

    /**
     * Extracts direct video stream or player iframe src from HTML string.
     * @param {string} html
     * @param {string} pageUrl
     * @returns {{ streamUrl: string, type: 'hls'|'native'|'iframe' } | null}
     */
    extractStreamFromHtml(html, pageUrl) {
        if (!html || typeof html !== 'string') return null;

        // 1. Direct .m3u8 or .mp4 URL inside <video>, <source>, or JavaScript variables
        const m3u8Match = html.match(/(?:file|source|src)\s*(?::|=)\s*["'](https?:[^"']+\.m3u8[^"']*)["']/i)
            || html.match(/["'](https?:[^"']+\.m3u8[^"']*)["']/i);
        if (m3u8Match) {
            return {
                streamUrl: m3u8Match[1],
                type: 'hls'
            };
        }

        const mp4Match = html.match(/(?:file|source|src)\s*(?::|=)\s*["'](https?:[^"']+\.mp4(?:\?[^"']*)?)["']/i);
        if (mp4Match) {
            return {
                streamUrl: mp4Match[1],
                type: 'native'
            };
        }

        const isNonVideoUrl = (u) => {
            if (!u || typeof u !== 'string') return true;
            const lower = u.toLowerCase();
            if (NON_VIDEO_IFRAME_PATTERNS.some(p => lower.includes(p))) return true;
            if (u.match(/\.(webp|jpg|jpeg|png|gif|svg|ico|avif|bmp|tiff|css|js|woff2?)(\?.*)?$/i)) return true;
            return false;
        };

        // 2. Search for <iframe> tags and extract src / data-src
        const iframeRegex = /<iframe\b[^>]*?(?:src|data-src|data-video|data-embed|data-player)=["']([^"']+)["'][^>]*>/gi;
        const candidates = [];
        let match;

        while ((match = iframeRegex.exec(html)) !== null) {
            const rawSrc = match[1];
            const resolved = this.resolveUrl(rawSrc, pageUrl);
            if (!resolved || isNonVideoUrl(resolved)) continue;

            const lower = resolved.toLowerCase();
            const isKnownVideo = KNOWN_VIDEO_HOST_PATTERNS.some(p => lower.includes(p));
            candidates.push({
                url: resolved,
                isKnownVideo
            });
        }

        // Also check for server/player buttons with data-src or data-video
        const buttonRegex = /(?:data-src|data-video|data-embed|data-player)=["']([^"']+)["']/gi;
        while ((match = buttonRegex.exec(html)) !== null) {
            const rawSrc = match[1];
            const resolved = this.resolveUrl(rawSrc, pageUrl);
            if (!resolved || isNonVideoUrl(resolved)) continue;

            const lower = resolved.toLowerCase();
            const isKnownVideo = KNOWN_VIDEO_HOST_PATTERNS.some(p => lower.includes(p));
            if (isKnownVideo && !candidates.some(c => c.url === resolved)) {
                candidates.push({
                    url: resolved,
                    isKnownVideo: true
                });
            }
        }

        if (candidates.length === 0) return null;

        const isHiAnimePage = Boolean(pageUrl && (pageUrl.includes('hianime') || pageUrl.includes('aniwatch')));
        const isAniKaiPage = Boolean(pageUrl && (pageUrl.includes('anikai') || pageUrl.includes('animekai')));

        // Source-aware candidate prioritization:
        // - HiAnime natively uses MegaCloud / RapidCloud / VidStream
        // - AniKai natively uses BibiEmb / ViviBebe
        let bestCandidate = null;

        if (isHiAnimePage) {
            bestCandidate = candidates.find(c => c.url.includes('megacloud') || c.url.includes('rapid-cloud') || c.url.includes('vidstream') || c.url.includes('streamtape'))
                || candidates.find(c => c.isKnownVideo);
        } else if (isAniKaiPage) {
            bestCandidate = candidates.find(c => c.url.includes('bibiemb') || c.url.includes('vivibebe'))
                || candidates.find(c => c.isKnownVideo);
        } else {
            bestCandidate = candidates.find(c => c.isKnownVideo) || (candidates[0]?.isKnownVideo ? candidates[0] : null);
        }

        if (!bestCandidate) return null;

        if (bestCandidate.url.endsWith('.m3u8') || bestCandidate.url.includes('.m3u8')) {
            return {
                streamUrl: bestCandidate.url,
                type: 'hls'
            };
        }

        if (bestCandidate.url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
            return {
                streamUrl: bestCandidate.url,
                type: 'native'
            };
        }

        return {
            streamUrl: bestCandidate.url,
            type: 'iframe'
        };
    },

    /**
     * Ultra-fast parallel extraction with Promise.any racing and zero-latency caching
     * @param {string} pageUrl
     * @param {AbortSignal} [signal]
     * @returns {Promise<{ streamUrl: string, type: 'hls'|'native'|'iframe', isExtracted: boolean } | null>}
     */
    async fetchAndExtract(pageUrl, signal = null) {
        if (!pageUrl || !pageUrl.startsWith('http')) return null;

        // 1. Zero-latency instant cache check (0ms)
        const cached = this.getCached(pageUrl);
        if (cached) {
            return { ...cached, isExtracted: true, fromCache: true };
        }

        // 2. Direct video file bypass
        if (pageUrl.match(/\.m3u8(\?.*)?$/i)) {
            return { streamUrl: pageUrl, type: 'hls', isExtracted: false };
        }
        if (pageUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
            return { streamUrl: pageUrl, type: 'native', isExtracted: false };
        }

        // 3. Ultra-Fast Parallel Racing: Direct + Multiple Fast Proxies
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const raceSignal = signal || controller.signal;

        const makeDirectFetch = async () => {
            const res = await fetch(pageUrl, {
                signal: raceSignal,
                headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml' }
            });
            if (!res.ok) throw new Error(`Direct ${res.status}`);
            const text = await res.text();
            if (!text || text.length < 50) throw new Error('Direct empty');
            return text;
        };

        const makeCodeTabs = async () => {
            const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(pageUrl)}`, {
                signal: raceSignal
            });
            if (!res.ok) throw new Error(`CodeTabs ${res.status}`);
            const text = await res.text();
            if (!text || text.length < 50) throw new Error('CodeTabs empty');
            return text;
        };

        const makeCorsProxy = async () => {
            const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(pageUrl)}`, {
                signal: raceSignal
            });
            if (!res.ok) throw new Error(`CorsProxy ${res.status}`);
            const text = await res.text();
            if (!text || text.length < 50) throw new Error('CorsProxy empty');
            return text;
        };

        const makeAllOriginsRaw = async () => {
            const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(pageUrl)}`, {
                signal: raceSignal
            });
            if (!res.ok) throw new Error(`AllOriginsRaw ${res.status}`);
            const text = await res.text();
            if (!text || text.length < 50) throw new Error('AllOriginsRaw empty');
            return text;
        };

        const makeAllOriginsGet = async () => {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(pageUrl)}`, {
                signal: raceSignal
            });
            if (!res.ok) throw new Error(`AllOrigins ${res.status}`);
            const json = await res.json();
            if (!json.contents || json.contents.length < 50) throw new Error('AllOrigins empty');
            return json.contents;
        };

        try {
            const winningHtml = await Promise.any([
                makeDirectFetch(),
                makeCodeTabs(),
                makeCorsProxy(),
                makeAllOriginsRaw(),
                makeAllOriginsGet()
            ]);
            clearTimeout(timeoutId);
            try { controller.abort(); } catch {} // Immediately terminate losing proxy streams

            // Check for 404 Not Found response in page contents
            if (winningHtml && typeof winningHtml === 'string') {
                const lower = winningHtml.toLowerCase();
                const is404Text = lower.includes('404 not found') ||
                    lower.includes('oops! 404') ||
                    lower.includes('page not found') ||
                    lower.includes('episode not found') ||
                    lower.includes('video not found') ||
                    lower.includes('404 - not found') ||
                    lower.includes('this episode is not available');

                if (is404Text) {
                    console.warn('[IframeStreamExtractor] Remote page indicates 404 Not Found:', pageUrl);
                    return { is404: true, streamUrl: null, type: 'iframe', isExtracted: false };
                }
            }

            const extracted = this.extractStreamFromHtml(winningHtml, pageUrl);
            if (extracted && extracted.streamUrl && extracted.streamUrl !== pageUrl) {
                saveToCache(pageUrl, extracted);
                return {
                    ...extracted,
                    isExtracted: true
                };
            }
        } catch (err) {
            clearTimeout(timeoutId);
            console.warn('[IframeStreamExtractor] Parallel extraction race completed without match:', err);
        }

        return null;
    },

    /**
     * Background prefetch for next episode to achieve 0ms transition
     */
    prefetch(pageUrl) {
        if (!pageUrl || typeof pageUrl !== 'string' || !pageUrl.startsWith('http')) return;
        if (this.getCached(pageUrl)) return;
        // Run in background without blocking
        setTimeout(() => {
            this.fetchAndExtract(pageUrl).catch(() => {});
        }, 800);
    }
};
