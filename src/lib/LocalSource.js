import animeData from '../data/anime_data.json';

class LocalSource {
    constructor() {
        this.data = animeData;
    }

    /**
     * Search for anime by query.
     * Searches both title and ID (slug).
     * @param {string} query 
     * @returns {Array} List of matching anime objects
     */
    search(query) {
        if (!query) return [];
        const lowerQuery = query.toLowerCase().trim();

        // Convert map to array and filter
        return Object.values(this.data).filter(anime => {
            const lowerTitle = anime.title.toLowerCase();
            const lowerId = anime.id.toLowerCase();

            // Check basic containment
            const titleMatch = lowerTitle.includes(lowerQuery);
            const idMatch = lowerId.includes(lowerQuery);

            if (!titleMatch && !idMatch) return false;

            // Strictness Check:
            // If the Result is a "Special", "OVA", or "Movie", but the Query DID NOT ask for it, skip it.
            // This prevents "Jujutsu Kaisen" from automatically linking to "Jujutsu Kaisen: Specials"

            const isSpecial = lowerTitle.includes('special') || lowerTitle.includes('ova') || lowerTitle.includes('movie');
            const queryAskingForSpecial = lowerQuery.includes('special') || lowerQuery.includes('ova') || lowerQuery.includes('movie');

            if (isSpecial && !queryAskingForSpecial) {
                // If query is EXACT match to the start of title, maybe allow it? 
                // But generally "Title" shouldn't map to "Title: Specials" unless asking.
                return false;
            }

            return true;
        });
    }

    /**
     * Get episode list for a given ID.
     * @param {string} id 
     * @returns {Array} List of episodes or empty array if not found
     */
    getEpisodes(id) {
        if (!id || !this.data[id]) {
            return [];
        }
        return this.data[id].episodes;
    }

    /**
     * Get anime details by ID.
     * @param {string} id
     * @returns {Object|null}
     */
    getAnime(id) {
        return this.data[id] || null;
    }
}

export default new LocalSource();
