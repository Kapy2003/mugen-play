/**
 * AnimePaheApi
 * Direct interface for AnimePahe JSON API and session resolver with multi-mirror resilience.
 */

const PROXIES = [
    (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

const PAHE_DOMAINS = ['https://animepahe.pw', 'https://animepahe.si', 'https://animepahe.ru'];

export const AnimePaheApi = {
    /**
     * Search AnimePahe for an anime title
     * @param {string} title
     * @returns {Promise<{ id: number, title: string, session: string, episodes: number, poster: string } | null>}
     */
    async searchAnime(title) {
        if (!title) return null;
        const cleanTitle = title.replace(/\(TV\)/gi, '').trim();

        for (const domain of PAHE_DOMAINS) {
            const targetUrl = `${domain}/api?m=search&q=${encodeURIComponent(cleanTitle)}`;
            for (const proxyFn of PROXIES) {
                try {
                    const proxied = proxyFn(targetUrl);
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), 3500);

                    const res = await fetch(proxied, { signal: controller.signal });
                    clearTimeout(timer);

                    if (res.ok) {
                        const json = await res.json();
                        if (json && Array.isArray(json.data) && json.data.length > 0) {
                            return json.data[0];
                        }
                    }
                } catch {
                    // Try next proxy / domain
                }
            }
        }
        return null;
    },

    /**
     * Fetch episodes page for an AnimePahe anime session
     * @param {string} animeSession
     * @param {number} page
     * @returns {Promise<{ total: number, data: Array<{ episode: number, session: string }> } | null>}
     */
    async getEpisodes(animeSession, page = 1) {
        if (!animeSession) return null;

        for (const domain of PAHE_DOMAINS) {
            const targetUrl = `${domain}/api?m=release&id=${animeSession}&sort=episode_asc&page=${page}`;
            for (const proxyFn of PROXIES) {
                try {
                    const proxied = proxyFn(targetUrl);
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), 3500);

                    const res = await fetch(proxied, { signal: controller.signal });
                    clearTimeout(timer);

                    if (res.ok) {
                        const json = await res.json();
                        if (json && Array.isArray(json.data)) {
                            return json;
                        }
                    }
                } catch {
                    // Try next proxy / domain
                }
            }
        }
        return null;
    },

    /**
     * Parse an AnimePahe play URL into its constituent anime & episode sessions
     * Example: https://animepahe.pw/play/a54db0d0-29de-8e95-b1dd-ee541eb0e725/3dd8fc12d5c690f754f1fd5a67befb17c6788d1eb250fb8cad301f624a79cf12
     */
    parsePlayUrl(url) {
        if (!url || typeof url !== 'string') return null;
        const match = url.match(/animepahe\.[a-z0-9]+\/play\/([a-f0-9-]+)\/([a-f0-9]+)/i);
        if (match) {
            return {
                animeSession: match[1],
                episodeSession: match[2]
            };
        }
        return null;
    }
};
