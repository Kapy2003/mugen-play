/**
 * BaseSourceAdapter
 * Common abstract interface for all Mugen Play source adapters.
 */
export class BaseSourceAdapter {
    constructor(meta = {}) {
        this.id = meta.id || 'unknown_source';
        this.name = meta.name || 'Unknown Source';
        this.baseUrl = meta.baseUrl || '';
        this.type = meta.type || 'stream'; // 'metadata' | 'stream' | 'nsfw'
        this.enabled = meta.enabled !== false;
        this.isCore = !!meta.isCore;
        this.icon = meta.icon || 'film';
        this.description = meta.description || '';
    }

    /**
     * Search for anime given a text query
     * @param {string} query
     * @param {number} page
     * @returns {Promise<Array<CanonicalAnime>>}
     */
    async search(query, page = 1) { // eslint-disable-line no-unused-vars
        throw new Error(`search() not implemented in ${this.name}`);
    }

    /**
     * Get details for an anime by its source ID
     * @param {string|number} id
     * @returns {Promise<CanonicalAnime|null>}
     */
    async getDetails(id) { // eslint-disable-line no-unused-vars
        throw new Error(`getDetails() not implemented in ${this.name}`);
    }

    /**
     * Get episode list for an anime
     * @param {string|number} animeId
     * @param {number} totalEpisodes
     * @returns {Promise<Array<CanonicalEpisode>>}
     */
    async getEpisodes(animeId, totalEpisodes = 12) { // eslint-disable-line no-unused-vars
        throw new Error(`getEpisodes() not implemented in ${this.name}`);
    }

    /**
     * Resolve stream URL and servers for an episode
     * @param {Object} anime
     * @param {number} episodeNumber
     * @returns {Promise<{ streamUrl: string, servers: Array }>}
     */
    async resolveStream(anime, episodeNumber = 1) { // eslint-disable-line no-unused-vars
        throw new Error(`resolveStream() not implemented in ${this.name}`);
    }

    /**
     * Perform health check ping
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        return true;
    }
}
