/**
 * ConsumetService
 * Connects to Consumet Meta-AniList API to fetch rich TMDB episode metadata
 * (titles, still thumbnails, descriptions, air dates).
 */
export const ConsumetService = {
    // Multi-mirror fallback list for high availability
    MIRRORS: [
        'https://api.consumet.org',
        'https://consumet-api-clone.vercel.app',
        'https://api-consumet.vercel.app',
        'https://c.delusionz.xyz'
    ],

    cache: new Map(),
    CACHE_TTL: 10 * 60 * 1000, // 10 minutes cache

    /**
     * Fetch enriched anime info containing TMDB episode metadata
     * @param {string|number} anilistId - AniList anime ID
     * @param {number} timeoutMs - Timeout per mirror request
     * @returns {Promise<Object|null>}
     */
    async fetchAnimeInfo(anilistId, timeoutMs = 4000) {
        if (!anilistId) return null;
        const id = anilistId.toString().trim();
        const cacheKey = `info_${id}`;

        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        for (const mirror of this.MIRRORS) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

                const endpoint = `${mirror}/meta/anilist/info/${id}`;
                const res = await fetch(endpoint, {
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                });
                clearTimeout(timeoutId);

                if (!res.ok) continue;
                const data = await res.json();

                if (data && (Array.isArray(data.episodes) || data.id)) {
                    // Keep cache bounded
                    if (this.cache.size > 100) {
                        const oldestKey = this.cache.keys().next().value;
                        this.cache.delete(oldestKey);
                    }
                    this.cache.set(cacheKey, { data, timestamp: Date.now() });
                    return data;
                }
            } catch (err) { // eslint-disable-line no-unused-vars
                // Mirror failed or timed out, attempt next mirror
                continue;
            }
        }

        return null;
    },

    /**
     * Map Consumet episode list to Mugen Play standardized episode objects
     * @param {Array} consumetEpisodes - Raw episodes array from Consumet
     * @param {Object} fallbackAnime - Base anime metadata for banner/cover fallbacks
     * @returns {Array<Object>}
     */
    mapEpisodes(consumetEpisodes = [], fallbackAnime = {}) {
        if (!Array.isArray(consumetEpisodes) || consumetEpisodes.length === 0) {
            return [];
        }

        const fallbackThumb = fallbackAnime.bannerUrl || fallbackAnime.coverUrl || fallbackAnime.bannerImage;

        return consumetEpisodes.map((ep, idx) => {
            const epNum = ep.number !== undefined ? ep.number : (idx + 1);
            let rawTitle = ep.title || '';
            if (rawTitle) {
                rawTitle = rawTitle.replace(/^(?:Episode|Ep)\s*\d+\s*[-:—–]\s*/i, '').trim();
            }
            const cleanTitle = rawTitle || `Episode ${epNum}`;

            return {
                id: ep.id || `ep-${epNum}`,
                number: epNum,
                title: cleanTitle,
                fullTitle: `Episode ${epNum}: ${cleanTitle}`,
                thumbnail: ep.image || ep.thumbnail || fallbackThumb,
                description: ep.description || ep.summary || '',
                airDate: ep.airDate || ep.aired || null,
                url: ep.url || null,
                site: 'TMDB'
            };
        });
    }
};
