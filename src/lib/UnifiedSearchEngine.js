import { CanonicalAnime } from '../models/CanonicalAnime.js';
import { GlobalSourceRegistry } from './SourceRegistry.js';

export const UnifiedSearchEngine = {
    /**
     * Search across active metadata sources and return ranked, deduplicated CanonicalAnime list
     * @param {string} query
     * @param {number} page
     * @param {Object} filters
     * @param {Array} installedExtensions
     * @param {number} timeoutMs
     * @returns {Promise<Array<CanonicalAnime>>}
     */
    async search(query, page = 1, filters = {}, timeoutMs = 4000) {
        const metadataAdapter = GlobalSourceRegistry.metadataAdapter;

        try {
            const searchPromise = metadataAdapter.search(query, page, filters);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Search Timeout')), timeoutMs)
            );

            const rawResults = await Promise.race([searchPromise, timeoutPromise]);
            const canonicalResults = (rawResults || []).map(r => r instanceof CanonicalAnime ? r : new CanonicalAnime(r));

            if (!query || !query.trim()) {
                return canonicalResults;
            }

            return this.rankResults(canonicalResults, query.trim());
        } catch (error) {
            console.warn("Unified Search Notice:", error.message);
            return [];
        }
    },

    /**
     * Rank search results by relevance
     * 1. Exact canonical title match
     * 2. Exact English / Romaji match
     * 3. Starts with query
     * 4. Includes query
     * 5. Popularity / Rating
     */
    rankResults(results, query) {
        if (!Array.isArray(results) || results.length === 0) return [];
        const q = query.toLowerCase().trim();

        return [...results].sort((a, b) => {
            const aCanonical = (a.title?.canonical || '').toLowerCase();
            const bCanonical = (b.title?.canonical || '').toLowerCase();
            const aEnglish = (a.title?.english || '').toLowerCase();
            const bEnglish = (b.title?.english || '').toLowerCase();
            const aRomaji = (a.title?.romaji || '').toLowerCase();
            const bRomaji = (b.title?.romaji || '').toLowerCase();

            // 1. Exact Match
            const aExact = aCanonical === q || aEnglish === q || aRomaji === q;
            const bExact = bCanonical === q || bEnglish === q || bRomaji === q;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            // 2. Starts with query
            const aStarts = aCanonical.startsWith(q) || aEnglish.startsWith(q);
            const bStarts = bCanonical.startsWith(q) || bEnglish.startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            // 3. Fall back to rating / score
            return (b.rating || 0) - (a.rating || 0);
        });
    }
};
