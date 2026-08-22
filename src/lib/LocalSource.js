class LocalSource {
    constructor() {
        this.data = {};
        this.isLoaded = false;
        // Start loading immediately
        this.init();
    }

    async init() {
        try {
            console.log("Fetching local data...");
            const res = await fetch('/anime_data.json');
            if (res.ok) {
                const json = await res.json();
                // Ensure data structure structure matches expectations (Object of IDs)
                // If the JSON is array, convert to map? Check prior logic: "Object.values(this.data)" implied it's an object/map.
                this.data = json;
                this.isLoaded = true;
                console.log("Local Data Loaded keys:", Object.keys(this.data).length);
            } else {
                console.error("Failed to fetch anime_data.json");
            }
        } catch (err) {
            console.error("Error loading local data:", err);
        }
    }

    /**
     * Search for anime by query.
     * Searches both title and ID (slug).
     * @param {string} query 
     * @returns {Array} List of matching anime objects
     */
    search(query) {
        if (!query || !this.isLoaded) return [];
        const lowerQuery = query.toLowerCase().trim();

        // Filter results first
        const results = Object.values(this.data).filter(anime => {
            const lowerTitle = (anime.title || '').toLowerCase();
            const lowerId = (anime.id || '').toLowerCase();

            // Check basic containment
            const titleMatch = lowerTitle.includes(lowerQuery);
            const idMatch = lowerId.includes(lowerQuery);

            if (!titleMatch && !idMatch) return false;

            // Strictness Check:
            const isSpecial = lowerTitle.includes('special') || lowerTitle.includes('ova') || lowerTitle.includes('movie');
            const queryAskingForSpecial = lowerQuery.includes('special') || lowerQuery.includes('ova') || lowerQuery.includes('movie');

            if (isSpecial && !queryAskingForSpecial) {
                return false;
            }

            return true;
        });

        // Sort results to prioritize best matches
        return results.sort((a, b) => {
            const aTitle = (a.title || '').toLowerCase();
            const bTitle = (b.title || '').toLowerCase();
            const aId = a.id.toLowerCase();
            const bId = b.id.toLowerCase();

            // 1. Exact ID match (highest priority)
            if (aId === lowerQuery && bId !== lowerQuery) return -1;
            if (bId === lowerQuery && aId !== lowerQuery) return 1;

            // 2. Exact Title match
            if (aTitle === lowerQuery && bTitle !== lowerQuery) return -1;
            if (bTitle === lowerQuery && aTitle !== lowerQuery) return 1;

            // 3. Starts with Query
            const aStarts = aTitle.startsWith(lowerQuery);
            const bStarts = bTitle.startsWith(lowerQuery);
            if (aStarts && !bStarts) return -1;
            if (!bStarts && aStarts) return 1; // logical equivalent

            // 4. Shorter Title (Likely the main series vs a spinoff)
            return aTitle.length - bTitle.length;
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

    /**
     * Check if data is empty
     * @returns {boolean}
     */
    isEmpty() {
        return !this.isLoaded || Object.keys(this.data).length === 0;
    }
}

export default new LocalSource();
