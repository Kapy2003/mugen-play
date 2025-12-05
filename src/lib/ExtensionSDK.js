/**
 * Base class for all Mugen-Play extensions.
 * Extensions must implement these methods to provide content.
 */
export class Extension {
    constructor(metadata) {
        this.name = metadata.name;
        this.version = metadata.version;
        this.id = metadata.id;
        this.icon = metadata.icon;
        this.type = metadata.type || 'video';
    }

    /**
     * Fetch trending anime.
     * @returns {Promise<Array>} Array of anime objects
     */
    async getTrending() {
        throw new Error('getTrending not implemented');
    }

    /**
     * Search for anime.
     * @param {string} query 
     * @returns {Promise<Array>} Array of anime objects
     */
    async search() {
        throw new Error('search not implemented');
    }

    /**
     * Get details for a specific anime.
     * @param {string} id 
     * @returns {Promise<Object>} Anime details object
     */
    async getDetails() {
        throw new Error('getDetails not implemented');
    }

    /**
     * Get the stream URL for playback.
     * @param {string} id Anime ID or Episode ID
     * @returns {Promise<string>} Stream URL
     */
    async getStream() {
        throw new Error('getStream not implemented');
    }
}
