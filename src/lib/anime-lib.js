/**
 * GogoAnime Scraper Logic
 * Ported from Go to Javascript (fetch + Web Crypto API)
 */

const BASE_URL = "https://hianimez.live/watch";
const AJAX_URL = "https://ajax.gogocdn.net/ajax/load-list-episode";

// Keys for GogoCDN (AES-256-CBC) - Keeping CDN name in keys is fine as it refers to the tech
const keys = {
    key: "37911490979715163134003223491201",
    secondKey: "54674138327930866480207815084989",
    iv: "3134003223491201"
};

/**
 * HianimeLive Lib (formerly Anitaku)
 * Handles searching, episode fetching, and server extraction
 */
export const AnimeLibHiLive = {
    /**
     * Search for anime
     * Custom implementation: Directly navigates to HiAnime (anitaku mirror) search results
     */
    async search(query) {
        try {
            // HiAnime Direct Access (User Request)
            // Slugify the query (e.g. "Bleach" -> "bleach", "One Piece" -> "one-piece")
            const slug = query.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-');

            const directUrl = `${BASE_URL}/${slug}`;
            console.log(`[AnimeLibHiLive] Generating Direct URL (No Fetch): ${directUrl}`);

            // SKIP FETCH (CORS workaround)
            // We return the slugified result directly.
            return [{
                id: slug,
                title: query,
                url: directUrl,
                image: '',
                released: '',
                description: 'Generated via Direct URL'
            }];

        } catch (error) {
            console.error("[AnimeLibHiLive] Direct Search Error:", error);
            return [];
        }
    },

    /**
     * Fetch all episodes for a given anime slug
     */
    async getEpisodes(id) {
        try {
            let url = id;
            if (!id.includes("http")) {
                // Fix: Hianimez uses /watch/slug directly, not /category/slug
                // BASE_URL is .../watch, so just append ID
                url = `${BASE_URL}/${id}`;
            }

            console.log(`[AnimeLibHiLive] Fetching page: ${url}`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch page: ${response.status}`);
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Strategy 1: Parse DOM (Partial list usually)
            const directFromDom = this._parseEpisodeList(doc);

            // Strategy 2: AJAX (Full list)
            // User Feedback: "Why not hard code?" -> Make it robust.
            // Always try AJAX if we can find the movie ID, because DOM often hides episodes.
            const movieId = doc.getElementById('movie_id')?.value || '';

            if (movieId) {
                try {
                    const alias = doc.getElementById('alias')?.value || '';
                    const epStart = '0';
                    const epEnd = '100000'; // Hardcode huge number to get all

                    const params = new URLSearchParams({
                        ep_start: epStart,
                        ep_end: epEnd,
                        id: movieId,
                        alias: alias,
                        default_ep: 0
                    });

                    const ajaxUrl = `${AJAX_URL}?${params.toString()}`;
                    console.log(`[AnimeLibHiLive] Fetching AJAX list: ${ajaxUrl}`);

                    const ajaxResponse = await fetch(ajaxUrl);
                    if (ajaxResponse.ok) {
                        const ajaxHtml = await ajaxResponse.text();
                        const ajaxDoc = parser.parseFromString(ajaxHtml, 'text/html');
                        const ajaxEpisodes = this._parseEpisodeList(ajaxDoc);

                        if (ajaxEpisodes.length > directFromDom.length) {
                            console.log(`[AnimeLibHiLive] AJAX returned more episodes (${ajaxEpisodes.length}) than DOM (${directFromDom.length}). Using AJAX.`);
                            return ajaxEpisodes;
                        }
                    }
                } catch (e) {
                    console.warn("[AnimeLibHiLive] AJAX fetch failed, falling back to DOM.", e);
                }
            }

            // Fallback to DOM if AJAX failed or didn't yield more results
            if (directFromDom.length > 0) {
                return directFromDom;
            }



        } catch (error) {
            console.error("[AnimeLibHiLive] Error getting episodes:", error);
            throw error;
        }
    },

    _parseEpisodeList(doc) {
        // Fix: Hianimez nests episodes in <ul class="ep-range"> inside #episode_related or similar
        // Removing '>' allows matching descendants. Adding .ep-range li specifically.
        const listItems = doc.querySelectorAll('#episode_related li, .ep-range li');
        const episodes = [];

        listItems.forEach(li => {
            const a = li.querySelector('a');
            if (!a) return;

            const href = a.getAttribute('href').trim(); // /watch/one-piece/ep-1

            // Fix: Parse Hianimez structure
            // 1. Check data-num attribute
            // 2. Check <b> tag content
            // 3. Fallback to name parsing
            let number = parseFloat(a.getAttribute('data-num'));
            if (isNaN(number)) {
                const bTag = a.querySelector('b');
                if (bTag) {
                    number = parseFloat(bTag.textContent);
                }
            }

            // Parse Title
            let title = '';
            const dTitle = a.querySelector('.d-title');
            if (dTitle) {
                title = dTitle.textContent.trim();
            } else {
                const divName = li.querySelector('div.name');
                if (divName) title = divName.textContent.trim();
            }

            // Name fallback
            if (!title) title = `Episode ${number}`;

            // Fallback number parsing from title/name if still missing
            if (isNaN(number)) {
                const numMatch = title.match(/(\d+(\.\d+)?)/);
                if (numMatch) number = parseFloat(numMatch[1]);
                if (isNaN(number)) number = 0;
            }

            episodes.push({
                id: href.replace(/^\//, ''),
                number: number,
                url: `https://hianimez.live${href}`, // Force root domain + href (which has /watch)
                title: title
            });
        });

        // Ensure unique and sorted
        const unique = Array.from(new Map(episodes.map(item => [item.number, item])).values());
        unique.sort((a, b) => a.number - b.number);
        return unique;
    },

    /**
     * Extract video sources from an episode embed URL (GogoCDN)
     * @param {string} embedUrl - e.g. https://ns568356.stream/embedplus?id=...
     */
    async extractVideo(embedUrl) {
        try {
            const urlObj = new URL(embedUrl);
            const id = urlObj.searchParams.get('id'); // Encrypted ID

            console.log(`[AnimeLibHiLive] Extracting from: ${embedUrl}`);
            const response = await fetch(embedUrl);
            const html = await response.text();

            // Find script data
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const scriptValue = doc.querySelector("script[data-name='episode']")?.getAttribute('data-value');

            if (!id || !scriptValue) throw new Error("Missing ID or Script Value");

            // Decrypt token, Encrypt ID => Params
            const decryptedToken = await CryptoUtils.decrypt(scriptValue, keys.key, keys.iv);
            const encryptedId = await CryptoUtils.encrypt(id, keys.key, keys.iv);

            // Fetch Encrypted AJAX
            const ajaxUrl = `${urlObj.protocol}//${urlObj.host}/encrypt-ajax.php?id=${encryptedId}&alias=${decryptedToken}`;

            const encryptedRes = await fetch(ajaxUrl, {
                headers: { "X-Requested-With": "XMLHttpRequest" }
            });
            const encryptedJson = await encryptedRes.json();

            // Decrypt Response Data
            const decryptedDataStr = await CryptoUtils.decrypt(encryptedJson.data, keys.secondKey, keys.iv);
            const data = JSON.parse(decryptedDataStr);

            // Extract Sources
            const sources = [];
            if (data.source) {
                data.source.forEach(s => sources.push({ url: s.file, label: s.label, type: 'hls' }));
            }
            if (data.source_bk) {
                data.source_bk.forEach(s => sources.push({ url: s.file, label: 'Backup', type: 'hls' }));
            }

            return sources;

        } catch (error) {
            console.error("[AnimeLibHiLive] Error extracting video:", error);
            throw error;
        }
    }
};

// Web Crypto API Helpers
const CryptoUtils = {
    async importKey(keyBytes) {
        return await crypto.subtle.importKey(
            "raw", keyBytes, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]
        );
    },

    async decrypt(base64Str, keyBytes, iv) {
        // Decode Base64
        const binaryString = atob(base64Str);
        const dataBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) dataBytes[i] = binaryString.charCodeAt(i);

        const key = await this.importKey(keyBytes);
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-CBC", iv: iv },
            key,
            dataBytes
        );

        // Remove Padding (PKCS7 implicit in some libs, but WebCrypto decrypt usually handles it? 
        // Actually WebCrypto expects padding. If custom padding, might need manual strip.)
        // Go code uses Pkcs7Trimming. WebCrypto AES-CBC normally unpads automatically if padded correctly.
        return new TextDecoder().decode(decrypted);
    },

    async encrypt(text, keyBytes, iv) {
        const dataBytes = new TextEncoder().encode(text);
        const key = await this.importKey(keyBytes);

        // Manual PKCS7 Padding Needed (WebCrypto encrypt doesn't enable it by default?)
        // Wait, WebCrypto AES-CBC usually DOES pad.
        // Let's try standard encrypt.
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-CBC", iv: iv },
            key,
            dataBytes
        );

        // Convert to Base64
        return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    }
};