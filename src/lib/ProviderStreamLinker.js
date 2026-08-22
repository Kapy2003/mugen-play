import { AnimePaheApi } from './AnimePaheApi.js';

const CACHE_KEY = 'mugen_provider_stream_links';

const PROXIES = [
    (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

/**
 * ProviderStreamLinker
 * Dynamically queries streaming providers using the anime's search query,
 * extracts their internal hexadecimal session hashes / video IDs,
 * and links them directly to the in-app player with permanent local caching.
 */
export const ProviderStreamLinker = {
    /**
     * Get cached provider link map from localStorage
     */
    getCache() {
        try {
            const saved = localStorage.getItem(CACHE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    },

    /**
     * Save a resolved provider link to cache
     */
    saveLink(animeId, providerKey, data) {
        try {
            const cache = this.getCache();
            const key = `${animeId}_${providerKey}`;
            cache[key] = {
                ...data,
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch {
            // Ignore cache write error
        }
    },

    /**
     * Look up cached provider link
     */
    getCachedLink(animeId, providerKey) {
        const cache = this.getCache();
        const key = `${animeId}_${providerKey}`;
        const entry = cache[key];
        if (entry && (Date.now() - entry.timestamp < 7 * 24 * 3600 * 1000)) { // 7 day cache
            return entry;
        }
        return null;
    },

    /**
     * Main resolver: dynamically search provider, extract hexadecimal ID / session, and return stream info
     * @param {Object} anime - Anime object
     * @param {number} episodeNum - Episode number
     * @param {Object} extension - Selected provider extension
     * @returns {Promise<{ streamUrl?: string, session?: string, episodeSession?: string, servers?: Array } | null>}
     */
    async linkAndResolve(anime, episodeNum = 1, extension = null) {
        if (!anime) return null;

        const ep = Math.max(1, parseInt(episodeNum, 10) || 1);
        const animeId = anime.id || anime.slug || 'anime';
        const title = (anime.title?.english || anime.title?.romaji || (typeof anime.title === 'string' ? anime.title : '') || anime.name || '').split(' - Episode')[0].trim();
        const host = (extension?.baseUrl || extension?.url || '').toLowerCase();

        // 1. Check if already cached
        const providerKey = host.includes('animepahe') ? 'animepahe'
            : host.includes('hanime') ? 'hanime'
            : host.includes('hianime') || host.includes('aniwatch') ? 'hianime'
            : host.includes('anitaku') || host.includes('gogo') ? 'gogo'
            : 'universal';

        const cached = this.getCachedLink(animeId, providerKey);
        if (cached && cached.episodes && cached.episodes[ep]) {
            return {
                streamUrl: cached.episodes[ep].url,
                session: cached.session,
                episodeSession: cached.episodes[ep].session,
                isLinked: true
            };
        }

        // 2. Provider-Specific Hexadecimal & Session Resolvers
        if (providerKey === 'animepahe') {
            try {
                // Query AnimePahe Search API (.pw / .si / .ru)
                const searchRes = await AnimePaheApi.searchAnime(title);
                if (searchRes && searchRes.session) {
                    const animeSession = searchRes.session;
                    const page = Math.ceil(ep / 30);
                    const epData = await AnimePaheApi.getEpisodes(animeSession, page);

                    let targetEpSession = null;
                    if (epData && Array.isArray(epData.data)) {
                        const match = epData.data.find(d => parseInt(d.episode, 10) === ep);
                        if (match) {
                            targetEpSession = match.session;
                        }
                    }

                    const playUrl = targetEpSession
                        ? `https://animepahe.pw/play/${animeSession}/${targetEpSession}`
                        : `https://animepahe.pw/play/${animeSession}`;

                    // Cache discovered session hashes
                    const episodeMap = cached?.episodes || {};
                    if (targetEpSession) {
                        episodeMap[ep] = { session: targetEpSession, url: playUrl };
                    }

                    this.saveLink(animeId, 'animepahe', {
                        session: animeSession,
                        animeId,
                        title: searchRes.title,
                        episodes: episodeMap
                    });

                    return {
                        streamUrl: playUrl,
                        session: animeSession,
                        episodeSession: targetEpSession,
                        isLinked: true
                    };
                }
            } catch (err) {
                console.warn('[ProviderStreamLinker] AnimePahe dynamic search error:', err);
            }
        } else if (providerKey === 'hanime') {
            // HAnime Native CDN / Stream Manifest Scraper
            const cleanSlug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
            const targetApi = `https://members.hanime.tv/api/v8/video?id=${cleanSlug}`;

            for (const proxyFn of PROXIES) {
                try {
                    const proxied = proxyFn(targetApi);
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), 3500);

                    const res = await fetch(proxied, { signal: controller.signal });
                    clearTimeout(timer);

                    if (res.ok) {
                        const json = await res.json();
                        const manifest = json?.videos_manifest?.servers;
                        if (Array.isArray(manifest) && manifest.length > 0 && manifest[0].streams?.length > 0) {
                            const directStream = manifest[0].streams[0].url;
                            if (directStream) {
                                return {
                                    streamUrl: directStream,
                                    session: cleanSlug,
                                    isLinked: true
                                };
                            }
                        }
                    }
                } catch {
                    // Try next proxy
                }
            }

            // Fallback to high-compatibility 18+ player embed
            const fallbackEmbed = `https://hanime.tv/embed/${cleanSlug}`;
            return {
                streamUrl: fallbackEmbed,
                session: cleanSlug,
                isLinked: true
            };
        }

        return null;
    }
};
