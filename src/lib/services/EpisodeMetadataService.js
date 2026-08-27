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
    async fetchWithProxyFallback(targetUrl, timeoutMs = 3500) {
        const PROXY_BUILDERS = [
            (url) => url,
            (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
        ];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const promises = PROXY_BUILDERS.map(async (proxyFn) => {
                const proxied = proxyFn(targetUrl);
                const res = await fetch(proxied, {
                    signal: controller.signal,
                    headers: { 'Accept': 'application/vnd.api+json, application/json' }
                });
                if (!res.ok) throw new Error(`Proxy ${res.status}`);
                const data = await res.json();
                if (!data) throw new Error('Empty JSON');
                return data;
            });

            const winningData = await Promise.any(promises);
            clearTimeout(timeoutId);
            try { controller.abort(); } catch {}
            return winningData;
        } catch {
            clearTimeout(timeoutId);
            return null;
        }
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
     * Fetch enriched episode titles from Jikan (MyAnimeList API)
     * @param {string|number} malId - MyAnimeList Anime ID
     * @param {number} page - Page number (1-indexed, 100 eps per page)
     * @returns {Promise<Array<Object>>}
     */
    async fetchJikanEpisodes(malId, page = 1) {
        if (!malId) return [];
        const cacheKey = `jikan_eps_${malId}_${page}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        const url = `https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`;
        const data = await this.fetchWithProxyFallback(url);

        if (Array.isArray(data?.data) && data.data.length > 0) {
            const mapped = data.data.map(item => ({
                number: item.mal_id,
                title: item.title && !item.title.match(/^episode\s*\d+$/i) ? item.title : `Episode ${item.mal_id}`,
                romajiTitle: item.title_romanji || '',
                airDate: item.aired || null,
                score: item.score || null
            }));
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

        const isOnePiece = animeTitle.toLowerCase().includes('one piece');
        const totalEpisodes = anime.episodes || anime.episodesList?.length || (isOnePiece ? 1200 : 24);
        const targetEpisode = anime.currentEpisode || 1;
        const kitsuId = isOnePiece ? '12' : await this.searchKitsuAnimeId(animeTitle);
        const allFetchedEpisodes = [];

        const startOffset = Math.max(0, Math.floor((targetEpisode - 1) / 100) * 100);

        // 1. Fetch from Kitsu (up to 100 episodes centered around target episode)
        if (kitsuId) {
            const totalToFetch = Math.min(totalEpisodes - startOffset, 100);
            const pages = Math.ceil(totalToFetch / 20);

            const batchPromises = [];
            for (let j = 0; j < pages; j++) {
                batchPromises.push(this.fetchKitsuEpisodes(kitsuId, startOffset + (j * 20), 20));
            }
            const batchResults = await Promise.all(batchPromises);
            allFetchedEpisodes.push(...batchResults.flat());
        }

        // 2. Fetch official titles from Jikan (MyAnimeList API) for One Piece or if Kitsu missing titles
        const malId = isOnePiece ? 21 : anime.idMal;
        let jikanEpisodes = [];
        if (malId) {
            try {
                const jikanPage = Math.floor(startOffset / 100) + 1;
                const jikanResults = await this.fetchJikanEpisodes(malId, jikanPage);
                jikanEpisodes = jikanResults || [];
            } catch {}
        }

        // 3. Fallback to TMDB via ConsumetService if both Kitsu & Jikan empty
        if (allFetchedEpisodes.length === 0 && jikanEpisodes.length === 0) {
            if (anime.id) {
                try {
                    const consumetData = await ConsumetService.fetchAnimeInfo(anime.id);
                    if (consumetData?.episodes?.length > 0) {
                        return ConsumetService.mapEpisodes(consumetData.episodes, anime);
                    }
                } catch {}
            }
            return null;
        }

        const kitsuMap = new Map();
        allFetchedEpisodes.forEach(ep => {
            if (ep.number) kitsuMap.set(ep.number, ep);
        });

        const jikanMap = new Map();
        jikanEpisodes.forEach(ep => {
            if (ep.number) jikanMap.set(ep.number, ep);
        });

        const dynamicTotal = Math.max(totalEpisodes, allFetchedEpisodes.length, jikanEpisodes.length);
        const fallbackThumb = anime.bannerUrl || anime.coverUrl;
        const baseList = anime.episodesList && anime.episodesList.length >= dynamicTotal
            ? anime.episodesList
            : Array.from({ length: dynamicTotal }, (_, idx) => ({ number: idx + 1, title: `Episode ${idx + 1}` }));

        return baseList.map(baseEp => {
            const epNum = baseEp.number;
            const kitsu = kitsuMap.get(epNum);
            const jikan = jikanMap.get(epNum);

            let bestTitle = `Episode ${epNum}`;
            if (kitsu?.title && !kitsu.title.match(/^episode\s*\d+$/i)) {
                bestTitle = kitsu.title;
            } else if (jikan?.title && !jikan.title.match(/^episode\s*\d+$/i)) {
                bestTitle = jikan.title;
            } else if (baseEp.title && !baseEp.title.match(/^episode\s*\d+$/i)) {
                bestTitle = baseEp.title;
            }

            return {
                ...baseEp,
                number: epNum,
                title: bestTitle,
                fullTitle: `Episode ${epNum}: ${bestTitle}`,
                thumbnail: kitsu?.thumbnail || baseEp.thumbnail || fallbackThumb,
                description: kitsu?.description || baseEp.description || '',
                airDate: kitsu?.airDate || jikan?.airDate || baseEp.airDate || null
            };
        });
    },

    /**
     * On-demand slice enrichment when navigating pagination or jumping to an episode
     * Fetches up to `count` episodes from Kitsu / Jikan starting from `startEpisodeNum`
     */
    async enrichAnimeSlice(anime, startEpisodeNum = 1, count = 100) {
        if (!anime || !startEpisodeNum) return null;
        const animeTitle = anime.title?.english || anime.title?.romaji || (typeof anime.title === 'string' ? anime.title : '') || anime.name || '';
        if (!animeTitle) return null;

        const isOnePiece = animeTitle.toLowerCase().includes('one piece');
        const kitsuId = isOnePiece ? '12' : await this.searchKitsuAnimeId(animeTitle);
        const offset = Math.max(0, startEpisodeNum - 1);
        const pages = Math.ceil(count / 20);

        const batchPromises = [];
        if (kitsuId) {
            for (let i = 0; i < pages; i++) {
                batchPromises.push(this.fetchKitsuEpisodes(kitsuId, offset + (i * 20), 20));
            }
        }

        // Also fetch Jikan page corresponding to this range
        const malId = isOnePiece ? 21 : anime.idMal;
        const jikanPage = Math.floor(offset / 100) + 1;
        let jikanPromise = null;
        if (malId) {
            jikanPromise = this.fetchJikanEpisodes(malId, jikanPage).catch(() => []);
        }

        const [kitsuResults, jikanResults] = await Promise.all([
            Promise.all(batchPromises).then(r => r.flat()),
            jikanPromise || Promise.resolve([])
        ]);

        const kitsuMap = new Map((kitsuResults || []).map(ep => [ep.number, ep]));
        const jikanMap = new Map((jikanResults || []).map(ep => [ep.number, ep]));

        const fallbackThumb = anime.bannerUrl || anime.coverUrl;
        const slice = [];

        for (let num = startEpisodeNum; num < startEpisodeNum + count; num++) {
            const kitsu = kitsuMap.get(num);
            const jikan = jikanMap.get(num);

            if (kitsu || jikan) {
                let title = `Episode ${num}`;
                if (kitsu?.title && !kitsu.title.match(/^episode\s*\d+$/i)) {
                    title = kitsu.title;
                } else if (jikan?.title && !jikan.title.match(/^episode\s*\d+$/i)) {
                    title = jikan.title;
                }

                slice.push({
                    number: num,
                    title: title,
                    fullTitle: `Episode ${num}: ${title}`,
                    thumbnail: kitsu?.thumbnail || fallbackThumb,
                    description: kitsu?.description || '',
                    airDate: kitsu?.airDate || jikan?.airDate || null
                });
            }
        }

        return slice;
    }
};
