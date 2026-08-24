import { Extension } from './ExtensionSDK.js';

/**
 * UniversalExtension
 * Wraps dynamic remote URL extension manifests and APIs into the standard ExtensionSDK interface.
 */
export class UniversalExtension extends Extension {
    constructor(manifest) {
        super({
            id: manifest.id || `url_ext_${Date.now()}`,
            name: manifest.name || 'Remote URL Extension',
            version: manifest.version || '1.0.0',
            icon: manifest.icon || 'globe',
            type: manifest.type || 'source'
        });

        this.baseUrl = manifest.baseUrl || manifest.url || '';
        this.endpoints = manifest.endpoints || {};
        this.headers = manifest.headers || {};
        this.corsProxy = manifest.corsProxy || 'https://api.allorigins.win/raw?url=';
        this.rawManifest = manifest;
    }

    /**
     * Helper to perform fetch with optional CORS proxy fallback
     */
    async fetchWithFallback(targetUrl, options = {}) {
        try {
            const res = await fetch(targetUrl, {
                ...options,
                headers: { ...this.headers, ...(options.headers || {}) }
            });
            if (res.ok) return await res.json();
        } catch (err) {
            console.warn(`[UniversalExtension] Direct fetch failed for ${targetUrl}, trying CORS proxy:`, err);
        }

        // Fallback to CORS proxy
        const proxiedUrl = `${this.corsProxy}${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxiedUrl, options);
        if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
        return await res.json();
    }

    /**
     * Fetch trending / home anime list
     */
    async getTrending(filters = {}) {
        if (this.endpoints.trending) {
            const url = this.buildUrl(this.endpoints.trending, filters);
            const data = await this.fetchWithFallback(url);
            return this.normalizeCatalogResponse(data);
        }
        return this.search('', filters);
    }

    /**
     * Search anime catalog
     */
    async search(query = '', filters = {}) {
        if (!this.endpoints.search && !this.baseUrl) {
            return { results: [], meta: { hasNextPage: false, lastPage: 1 } };
        }

        const endpoint = this.endpoints.search || `${this.baseUrl}/search`;
        const url = this.buildUrl(endpoint, { q: query, query, ...filters });

        try {
            const data = await this.fetchWithFallback(url);
            return this.normalizeCatalogResponse(data);
        } catch (err) {
            console.error(`[UniversalExtension] Search failed for ${this.name}:`, err);
            return { results: [], meta: { hasNextPage: false, lastPage: 1 } };
        }
    }

    /**
     * Get episode list for an anime
     */
    async getEpisodes(animeId) {
        if (!this.endpoints.episodes && !this.baseUrl) return [];
        const endpoint = this.endpoints.episodes || `${this.baseUrl}/episodes/${animeId}`;
        const url = this.buildUrl(endpoint, { id: animeId });

        try {
            const data = await this.fetchWithFallback(url);
            return this.normalizeEpisodesResponse(data);
        } catch (err) {
            console.error(`[UniversalExtension] Get episodes failed for ${animeId}:`, err);
            return [];
        }
    }

    /**
     * Get stream URL for an episode
     */
    async getStream(anime) {
        // If stream URL is already present directly on anime object
        if (anime?.streamUrl || anime?.url) {
            return anime.streamUrl || anime.url;
        }

        if (!this.endpoints.stream && !this.baseUrl) {
            throw new Error(`No stream endpoint configured for ${this.name}`);
        }

        const episodeId = anime?.episodeId || anime?.id || anime;
        const endpoint = this.endpoints.stream || `${this.baseUrl}/stream/${episodeId}`;
        const url = this.buildUrl(endpoint, { id: episodeId });

        try {
            const data = await this.fetchWithFallback(url);
            return data.streamUrl || data.url || data.file || (typeof data === 'string' ? data : null);
        } catch (err) {
            console.error(`[UniversalExtension] Get stream failed for episode ${episodeId}:`, err);
            throw err;
        }
    }

    /**
     * Parameter Replacer & Query String Builder
     */
    buildUrl(templateUrl, params = {}) {
        let result = templateUrl;
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                result = result.replace(`{${key}}`, encodeURIComponent(params[key]));
            }
        });

        // Append remaining non-path params if URL is static
        if (!templateUrl.includes('{')) {
            const urlObj = new URL(result, this.baseUrl || 'https://placeholder.local');
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null && !urlObj.searchParams.has(key)) {
                    urlObj.searchParams.set(key, params[key]);
                }
            });
            return urlObj.toString();
        }

        return result;
    }

    /**
     * Standardizes catalog responses into Mugen Play schema
     */
    normalizeCatalogResponse(data) {
        const items = Array.isArray(data) ? data : (data.results || data.items || data.data || []);
        const results = items.map((item, idx) => ({
            id: item.id?.toString() || item.slug || `item_${idx}`,
            title: item.title?.english || item.title?.romaji || item.title || item.name || 'Untitled Anime',
            description: item.description || item.synopsis || '',
            synopsis: item.description || item.synopsis || '',
            coverUrl: item.coverUrl || item.image || item.poster || item.coverImage || '',
            bannerUrl: item.bannerUrl || item.banner || item.coverUrl || item.image || '',
            rating: item.rating || item.score ? (item.rating || item.score) : 0,
            episodes: item.episodes || item.totalEpisodes || null,
            genres: item.genres || [],
            year: item.year || item.seasonYear || null,
            type: 'custom_url_extension'
        }));

        return {
            results,
            meta: {
                hasNextPage: data.hasNextPage || data.meta?.hasNextPage || false,
                lastPage: data.lastPage || data.meta?.lastPage || 1
            }
        };
    }

    /**
     * Standardizes episode list responses
     */
    normalizeEpisodesResponse(data) {
        const episodes = Array.isArray(data) ? data : (data.episodes || data.items || []);
        return episodes.map((ep, idx) => ({
            id: ep.id?.toString() || ep.url || `ep_${idx + 1}`,
            number: ep.number || ep.episode || (idx + 1),
            title: ep.title || `Episode ${ep.number || (idx + 1)}`,
            url: ep.url || ep.streamUrl || ''
        }));
    }
}
