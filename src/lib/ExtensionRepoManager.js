import { ANIYOMI_SOURCES } from '../data/extension_repo.js';

const STORAGE_KEY = 'mugen_custom_repo_sources';

const NON_ANIME_KEYWORDS = [
    'manga', 'reading', 'read', 'comic', 'novel', 'scan', 'manhua', 'manhwa',
    'webtoon', 'doujin', 'hentaistube', 'hentaizm', 'jav', 'xnxx', 'xvideos',
    'missav', 'jable', 'newgrounds', 'drive.google', 'voircartoon'
];

let inMemoryStore = [];

/**
 * ExtensionRepoManager
 * Manages built-in and user-discovered extension repository sources.
 */
export const ExtensionRepoManager = {
    /**
     * Get user-added repository sources from localStorage (strictly anime video streaming only)
     */
    getCustomSources() {
        try {
            if (typeof localStorage === 'undefined') {
                return inMemoryStore;
            }
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) return [];

            // Automatically purge any legacy manga/non-anime sources
            const sanitized = parsed.filter(item => {
                const nameLower = (item.name || '').toLowerCase();
                const urlLower = (item.baseUrl || item.url || '').toLowerCase();
                for (const kw of NON_ANIME_KEYWORDS) {
                    if (nameLower.includes(kw) || urlLower.includes(kw)) {
                        return false;
                    }
                }
                return true;
            });

            if (sanitized.length !== parsed.length) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
            }

            return sanitized;
        } catch {
            return inMemoryStore;
        }
    },

    /**
     * Get combined repository sources (User Custom + Built-in)
     */
    getAllSources() {
        const custom = this.getCustomSources();
        const existingUrls = new Set(
            ANIYOMI_SOURCES.map(s => this.normalizeUrl(s.baseUrl))
        );

        const uniqueCustom = custom.filter(
            c => c.baseUrl && !existingUrls.has(this.normalizeUrl(c.baseUrl))
        );

        return [...uniqueCustom, ...ANIYOMI_SOURCES];
    },

    /**
     * Appends a new source to the repository if not already present
     * @param {Object} source
     * @returns {boolean} true if added, false if already existed
     */
    appendIfMissing(source) {
        const targetUrl = source.baseUrl || source.url;
        if (!targetUrl || !targetUrl.startsWith('http')) return false;

        // Ensure not a manga/non-anime link
        const nameLower = (source.name || '').toLowerCase();
        const urlLower = targetUrl.toLowerCase();
        for (const kw of NON_ANIME_KEYWORDS) {
            if (nameLower.includes(kw) || urlLower.includes(kw)) {
                return false;
            }
        }

        const normalized = this.normalizeUrl(targetUrl);
        const all = this.getAllSources();

        const exists = all.some(
            s => s.baseUrl && this.normalizeUrl(s.baseUrl) === normalized
        );

        if (!exists) {
            const custom = this.getCustomSources();
            const newEntry = {
                id: source.id || `custom_repo_${Date.now()}`,
                name: source.name || this.extractDomain(targetUrl),
                lang: source.lang || 'all',
                baseUrl: targetUrl,
                nsfw: !!source.nsfw,
                isUserAdded: true,
                addedAt: Date.now()
            };

            const updated = [newEntry, ...custom];
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                } catch (e) {
                    console.error("Storage error:", e);
                }
            } else {
                inMemoryStore = updated;
            }
            console.log(`[ExtensionRepoManager] Appended new source to repo: ${newEntry.name} (${targetUrl})`);
            return true;
        }

        return false;
    },

    /**
     * Removes a user-added source from the custom repo list
     */
    removeCustomSource(id) {
        const custom = this.getCustomSources();
        const updated = custom.filter(s => s.id !== id);
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error("Storage error:", e);
            }
        } else {
            inMemoryStore = updated;
        }
    },

    normalizeUrl(urlStr) {
        return (urlStr || '').trim().toLowerCase().replace(/\/+$/, '');
    },

    extractDomain(urlStr) {
        try {
            const parsed = new URL(urlStr);
            const host = parsed.hostname.replace('www.', '');
            return host.charAt(0).toUpperCase() + host.slice(1);
        } catch {
            return 'Custom Source';
        }
    }
};
