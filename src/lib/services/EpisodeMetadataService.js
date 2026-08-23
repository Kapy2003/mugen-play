import { ConsumetService } from './ConsumetService.js';

/**
 * EpisodeMetadataService
 * Enriches anime episodes with real episode titles, still screencap thumbnails,
 * descriptions, and air dates using Kitsu API and Consumet (TMDB) fallback.
 */
export const EpisodeMetadataService = {
    cache: new Map(),
    animeIdCache: new Map(),
    CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours

    /**
     * Resilient fetcher supporting direct & multi-proxy fallbacks for CORS
     */
    async fetchWithProxyFallback(targetUrl, timeoutMs = 4500) {
        const PROXIES = [
            (url) => url,
            (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
            (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
        ];

        for (const proxyFn of PROXIES) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                const proxied = proxyFn(targetUrl);
                const res = await fetch(proxied, {
                    signal: controller.signal,
                    headers: { 'Accept': 'application/vnd.api+json' }
                });
                clearTimeout(timeoutId);

                if (res && res.ok) {
                    const data = await res.json();
                    if (data) return data;
                }
            } catch (err) { // eslint-disable-line no-unused-vars
                continue;
            }
        }
        return null;
    },

    /**
     * Search Kitsu for an anime by title to get its Kitsu Media ID
     * @param {string} rawTitle - Anime title (English or Romaji)
     * @returns {Promise<string|null>}
     */
    async searchKitsuAnimeId(rawTitle) {
        if (!rawTitle) return null;
        const cleanTitle = rawTitle.replace(/ - Episode \d+/i, '').replace(/\(TV\)/i, '').trim();
        const cacheKey = `kitsu_id_${cleanTitle.toLowerCase()}`;

        if (this.animeIdCache.has(cacheKey)) {
            return this.animeIdCache.get(cacheKey);
        }

        const data = await this.fetchWithProxyFallback(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(cleanTitle)}&page[limit]=1`);
        const anime = data?.data?.[0];

        if (anime?.id) {
            this.animeIdCache.set(cacheKey, anime.id);
            return anime.id;
        }

        return null;
    },

    /**
     * Fetch enriched episode metadata from Kitsu
     * @param {string} kitsuId - Kitsu Anime ID
     * @param {number} offset - Episode offset (0-indexed)
     * @param {number} limit - Number of episodes to fetch (max 20)
     * @returns {Promise<Array<Object>>}
     */
    async fetchKitsuEpisodes(kitsuId, offset = 0, limit = 20) {
        if (!kitsuId) return [];
        const cacheKey = `kitsu_eps_${kitsuId}_${offset}_${limit}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const url = `https://kitsu.io/api/edge/episodes?filter[mediaId]=${kitsuId}&page[limit]=${limit}&page[offset]=${offset}&sort=number`;
        const data = await this.fetchWithProxyFallback(url);

        if (Array.isArray(data?.data) && data.data.length > 0) {
            const mapped = data.data.map(item => {
                const attr = item.attributes || {};
                const epNum = attr.number || attr.relativeNumber || 1;
                const canonical = attr.canonicalTitle || attr.titles?.en_us || attr.titles?.en_jp || attr.titles?.en || '';
                let cleanTitle = `Episode ${epNum}`;
                if (canonical && !canonical.match(/^(?:untitled|n\/a|tbd|null|undefined|episode\s*\d+)$/i)) {
                    cleanTitle = canonical;
                }
                const thumb = attr.thumbnail?.original || attr.thumbnail?.large || null;

                return {
                    number: epNum,
                    title: cleanTitle,
                    fullTitle: `Episode ${epNum}: ${cleanTitle}`,
                    thumbnail: thumb,
                    description: attr.synopsis || attr.description || '',
                    airDate: attr.airdate || null
                };
            });

            this.cache.set(cacheKey, mapped);
            return mapped;
        }

        return [];
    },

    /**
     * Enriches an anime's full episode playlist with specific titles, screencaps, and descriptions
     * @param {Object} anime - The anime object containing title, bannerUrl, episodesList, etc.
     * @param {number} maxEpisodes - Maximum episodes to fetch (default: 1200)
     * @returns {Promise<Array<Object>|null>}
     */
    async enrichAnimeEpisodes(anime, maxEpisodes = 1200) {
        if (!anime) return null;
        const animeTitle = anime.title?.english || anime.title?.romaji || (typeof anime.title === 'string' ? anime.title : '') || anime.name || '';
        if (!animeTitle) return null;

        const totalEpisodes = anime.episodes || anime.episodesList?.length || 24;
        const kitsuId = await this.searchKitsuAnimeId(animeTitle);
        const allFetchedEpisodes = [];

        if (kitsuId) {
            const totalToFetch = Math.min(totalEpisodes, maxEpisodes);
            const pages = Math.ceil(totalToFetch / 20);

            // Fetch in concurrent chunks of 5 pages (100 episodes per batch)
            for (let i = 0; i < pages; i += 5) {
                const batchPromises = [];
                for (let j = i; j < Math.min(i + 5, pages); j++) {
                    batchPromises.push(this.fetchKitsuEpisodes(kitsuId, j * 20, 20));
                }
                const batchResults = await Promise.all(batchPromises);
                allFetchedEpisodes.push(...batchResults.flat());
            }
        }

        // If Kitsu didn't have episodes, fallback to TMDB via ConsumetService
        if (allFetchedEpisodes.length === 0) {
            if (anime.id) {
                try {
                    const consumetData = await ConsumetService.fetchAnimeInfo(anime.id);
                    if (consumetData?.episodes?.length > 0) {
                        return ConsumetService.mapEpisodes(consumetData.episodes, anime);
                    }
                } catch (e) { // eslint-disable-line no-unused-vars
                }
            }
            return null;
        }

        const epMap = new Map();
        allFetchedEpisodes.forEach(ep => {
            if (ep.number) epMap.set(ep.number, ep);
        });

        const dynamicTotal = Math.max(totalEpisodes, allFetchedEpisodes.length);
        const fallbackThumb = anime.bannerUrl || anime.coverUrl;
        const baseList = anime.episodesList && anime.episodesList.length >= dynamicTotal
            ? anime.episodesList
            : Array.from({ length: dynamicTotal }, (_, idx) => ({ number: idx + 1, title: `Episode ${idx + 1}` }));

        const enrichedList = baseList.map(baseEp => {
            const epNum = baseEp.number;
            const fetched = epMap.get(epNum);

            if (fetched) {
                return {
                    ...baseEp,
                    number: epNum,
                    title: fetched.title,
                    fullTitle: fetched.fullTitle,
                    thumbnail: fetched.thumbnail || baseEp.thumbnail || fallbackThumb,
                    description: fetched.description || baseEp.description || '',
                    airDate: fetched.airDate || baseEp.airDate || null
                };
            }

            return {
                ...baseEp,
                thumbnail: baseEp.thumbnail || fallbackThumb
            };
        });

        return enrichedList;
    },

    /**
     * On-demand slice enrichment when navigating pagination or jumping to an episode
     */
    async enrichAnimeSlice(anime, targetEpisodeNum, count = 24) {
        if (!anime || !targetEpisodeNum) return null;
        const animeTitle = anime.title?.english || anime.title?.romaji || (typeof anime.title === 'string' ? anime.title : '') || anime.name || '';
        if (!animeTitle) return null;

        const kitsuId = await this.searchKitsuAnimeId(animeTitle);
        if (!kitsuId) return null;

        const offset = Math.max(0, targetEpisodeNum - 1);
        const fetched = await this.fetchKitsuEpisodes(kitsuId, offset, count);
        return fetched;
    }
};
