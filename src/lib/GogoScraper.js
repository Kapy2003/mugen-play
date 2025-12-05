/**
 * GogoAnime Scraper Logic
 * Ported from Go to Javascript (fetch + Web Crypto API)
 */

const BASE_URL = "https://hianimez.live/watch";
const AJAX_URL = "https://ajax.gogocdn.net/ajax/load-list-episode";

// Keys for GogoCDN (AES-256-CBC)
// Converted from Go strings to Uint8Array
const ENCODER = new TextEncoder();
const KEYS = {
    key: ENCODER.encode("37911490979715163134003223491201"),
    secondKey: ENCODER.encode("54674138327930866480207815084989"),
    iv: ENCODER.encode("3134003223491201")
};

export const GogoScraper = {
    /**
     * Search for anime
     * @param {string} query 
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
            console.log(`[GogoScraper] Generating Direct URL (No Fetch): ${directUrl}`);

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
            console.error("[GogoScraper] Direct Search Error:", error);
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
                url = `${BASE_URL}/category/${id}`;
            }

            console.log(`[GogoScraper] Fetching page: ${url}`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch page: ${response.status}`);
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Strategy 1: Check if episodes are already in the DOM (Common in Anitaku)
            const directFromDom = this._parseEpisodeList(doc);
            if (directFromDom.length > 0) {
                console.log(`[GogoScraper] Found ${directFromDom.length} episodes directly in DOM.`);
                return directFromDom;
            }

            // Strategy 2: AJAX Fallback
            const epList = doc.querySelectorAll('#episode_page > li > a');
            let epStart = '';
            let epEnd = '';

            if (epList.length > 0) {
                const first = epList[0];
                const last = epList[epList.length - 1];

                // Try 'ep_start' attribute or 'data-value' parsing
                epStart = first.getAttribute('ep_start');
                epEnd = last.getAttribute('ep_end');

                if (!epStart && first.getAttribute('data-value')) {
                    const parts = first.getAttribute('data-value').split('-');
                    epStart = parts[0];
                }
                if (!epEnd && last.getAttribute('data-value')) {
                    const parts = last.getAttribute('data-value').split('-');
                    epEnd = parts[1] || parts[0];
                }
            }

            const movieId = doc.getElementById('movie_id')?.value || '';
            const alias = doc.getElementById('alias')?.value || '';

            const params = new URLSearchParams({
                ep_start: epStart || '0',
                ep_end: epEnd || '10000', // Default fallbacks
                id: movieId,
                alias: alias,
                default_ep: 0
            });

            const ajaxUrl = `${AJAX_URL}?${params.toString()}`;
            const ajaxResponse = await fetch(ajaxUrl);
            const ajaxHtml = await ajaxResponse.text();

            const ajaxDoc = parser.parseFromString(ajaxHtml, 'text/html');
            const episodes = this._parseEpisodeList(ajaxDoc);

            return episodes;

        } catch (error) {
            console.error("[GogoScraper] Error getting episodes:", error);
            throw error;
        }
    },

    _parseEpisodeList(doc) {
        const listItems = doc.querySelectorAll('#episode_related > li');
        const episodes = [];

        listItems.forEach(li => {
            const a = li.querySelector('a');
            if (!a) return;

            const href = a.getAttribute('href').trim(); // /bleach-episode-1
            const nameText = li.querySelector('div.name')?.textContent.trim() || '';

            let number = 0;
            const numMatch = nameText.match(/(\d+(\.\d+)?)/);
            if (numMatch) {
                number = parseFloat(numMatch[1]);
            }

            episodes.push({
                id: href.replace(/^\//, ''),
                number: number,
                url: `${BASE_URL}${href}`,
                title: nameText
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

            console.log(`[GogoScraper] Extracting from: ${embedUrl}`);
            const response = await fetch(embedUrl);
            const html = await response.text();

            // Find script data
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const scriptValue = doc.querySelector("script[data-name='episode']")?.getAttribute('data-value');

            if (!id || !scriptValue) throw new Error("Missing ID or Script Value");

            // Decrypt token, Encrypt ID => Params
            const decryptedToken = await CryptoUtils.decrypt(scriptValue, KEYS.key, KEYS.iv);
            const encryptedId = await CryptoUtils.encrypt(id, KEYS.key, KEYS.iv);

            // Fetch Encrypted AJAX
            const ajaxUrl = `${urlObj.protocol}//${urlObj.host}/encrypt-ajax.php?id=${encryptedId}&alias=${decryptedToken}`;

            const encryptedRes = await fetch(ajaxUrl, {
                headers: { "X-Requested-With": "XMLHttpRequest" }
            });
            const encryptedJson = await encryptedRes.json();

            // Decrypt Response Data
            const decryptedDataStr = await CryptoUtils.decrypt(encryptedJson.data, KEYS.secondKey, KEYS.iv);
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
            console.error("[GogoScraper] Error extracting video:", error);
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
