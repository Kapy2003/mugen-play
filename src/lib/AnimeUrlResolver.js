import { AnimePaheApi } from './AnimePaheApi.js';

/**
 * AnimeUrlResolver
 * Simple, direct stream URL and episode playlist generator for Mugen Play.
 */
export const AnimeUrlResolver = {
    /**
     * Resolves the direct stream URL and episode playlist for the target anime and provider.
     * @param {Object} anime - Anime data object
     * @param {number} episodeNum - Target episode number (defaults to 1)
     * @param {Object} targetExt - Selected extension object
     * @param {Array} installedExtensions - List of installed extensions
     * @returns {{ streamUrl: string, episodesList: Array, resolvedSlug: string }}
     */
    resolveStream(anime, episodeNum = 1, targetExt = null, installedExtensions = []) { // eslint-disable-line no-unused-vars
        const ep = Math.max(1, parseInt(episodeNum, 10) || 1);

        // 1. Direct Play or Explicit Media URL (when no target extension is explicitly requested)
        if (!targetExt && anime?.url && typeof anime.url === 'string') {
            const paheParsed = AnimePaheApi.parsePlayUrl(anime.url);
            if (paheParsed) {
                return {
                    streamUrl: anime.url,
                    episodesList: Array.from({ length: 24 }, (_, idx) => ({
                        id: `pahe-ep-${idx + 1}`,
                        number: idx + 1,
                        title: `Episode ${idx + 1}`,
                        url: idx === 0 ? anime.url : `https://animepahe.pw/play/${paheParsed.animeSession}`
                    })),
                    resolvedSlug: paheParsed.animeSession
                };
            }

            // Direct Anikoto watch URL
            const anikotoMatch = anime.url.match(/anikoto\.(cz|tv|org)\/watch\/([^/?#]+)/i);
            if (anikotoMatch) {
                const slug = anikotoMatch[2];
                return {
                    streamUrl: `https://anikoto.cz/watch/${slug}?ep=${ep}`,
                    episodesList: Array.from({ length: 24 }, (_, idx) => ({
                        id: `anikoto-ep-${idx + 1}`,
                        number: idx + 1,
                        title: `Episode ${idx + 1}`,
                        url: `https://anikoto.cz/watch/${slug}?ep=${idx + 1}`
                    })),
                    resolvedSlug: slug
                };
            }

            // Direct HiAnime watch URL e.g. https://hianime.ad/watch/initial-d-first-stage/ep-1
            const hianimeMatch = anime.url.match(/hianime\.(ad|to|nz|mm|sx)\/watch\/([^/?#]+)(?:\/ep-(\d+))?/i);
            if (hianimeMatch) {
                const slug = hianimeMatch[2];
                const targetEp = episodeNum ? ep : (hianimeMatch[3] ? parseInt(hianimeMatch[3], 10) : ep);
                return {
                    streamUrl: `https://hianime.ad/watch/${slug}/ep-${targetEp}`,
                    episodesList: Array.from({ length: 26 }, (_, idx) => ({
                        id: `hianime-ep-${idx + 1}`,
                        number: idx + 1,
                        title: `Episode ${idx + 1}`,
                        url: `https://hianime.ad/watch/${slug}/ep-${idx + 1}`
                    })),
                    resolvedSlug: slug
                };
            }

            // Direct HAnime URL e.g. https://hanime.tv/videos/hentai/aki-sora-in-a-dream-1 or https://hanime.tv/videos/hentai/itadaki-seieki
            const hanimeMatch = anime.url.match(/hanime\.tv\/(?:playlists\/[^/]+\/video\/|videos\/hentai\/|video\/)([^/?#]+)/i);
            if (hanimeMatch) {
                const rawSlug = hanimeMatch[1];
                const epMatch = rawSlug.match(/-(\d+)$/);
                const targetEp = epMatch ? parseInt(epMatch[1], 10) : ep;
                const baseSlug = rawSlug.replace(/-(\d+)$/, '');
                const streamUrl = `https://playtaku.net/streaming.php?id=${baseSlug}-episode-${targetEp}`;

                return {
                    streamUrl,
                    episodesList: Array.from({ length: 4 }, (_, idx) => ({
                        id: `${baseSlug}-ep-${idx + 1}`,
                        number: idx + 1,
                        title: `Episode ${idx + 1}`,
                        url: `https://playtaku.net/streaming.php?id=${baseSlug}-episode-${idx + 1}`
                    })),
                    resolvedSlug: baseSlug
                };
            }

            // Direct .m3u8 or .mp4 link
            if (anime.url.match(/\.(m3u8|mp4|webm)(\?.*)?$/i)) {
                return {
                    streamUrl: anime.url,
                    episodesList: [{ id: 'ep-1', number: 1, title: 'Episode 1', url: anime.url }],
                    resolvedSlug: 'direct'
                };
            }
        }

        // 2. Extract Titles & Intelligent Slugs
        const rawEnglish = anime?.title?.english || '';
        const rawRomaji = anime?.title?.romaji || '';
        const rawString = typeof anime?.title === 'string' ? anime.title : (anime?.name || '');
        const preferredTitle = (rawEnglish || rawRomaji || rawString).split(' - Episode')[0].trim();

        const cleanEnglish = this.sanitizeTitle(rawEnglish);
        const cleanRomaji = this.sanitizeTitle(rawRomaji);
        const cleanPreferred = this.sanitizeTitle(preferredTitle);

        const englishSlug = this.toSlug(cleanEnglish);
        const romajiSlug = this.toSlug(cleanRomaji);
        const preferredSlug = this.toSlug(cleanPreferred) || 'anime';
        const gogoSlug = this.resolveGogoSlug(cleanEnglish, cleanRomaji, cleanPreferred);
        const hianimeSlug = this.resolveHiAnimeSlug(cleanEnglish, cleanRomaji, cleanPreferred);
        const primarySlug = englishSlug || preferredSlug || romajiSlug;
        const aniId = anime?.id && !isNaN(anime.id) ? anime.id : primarySlug;

        // 3. Resolve Direct Stream URL for Selected Source
        let streamUrl = '';

        if (targetExt && targetExt.enabled !== false) {
            const host = (targetExt.baseUrl || targetExt.url || '').toLowerCase();
            const extId = (targetExt.id || '').toLowerCase();

            if (extId.includes('hianime') || host.includes('hianime')) {
                streamUrl = `https://hianime.ad/watch/${hianimeSlug}/ep-${ep}`;
            } else if (extId.includes('anikoto') || host.includes('anikoto')) {
                streamUrl = `https://anikoto.cz/watch/${primarySlug}?ep=${ep}`;
            } else if (extId.includes('animepahe') || host.includes('animepahe')) {
                streamUrl = `https://animepahe.pw/play/${primarySlug}/${ep}`;
            } else if (extId.includes('anitaku') || host.includes('anitaku') || host.includes('gogo')) {
                streamUrl = `https://anitaku.so/streaming.php?id=${gogoSlug}-episode-${ep}`;
            } else if (extId.includes('aniwatch') || host.includes('aniwatch')) {
                streamUrl = `https://aniwatchtv.to/watch/${primarySlug}?ep=${ep}`;
            } else if (extId.includes('animekai') || host.includes('animekai')) {
                streamUrl = `https://animekai.be/watch/${primarySlug}?ep=${ep}`;
            } else if (extId.includes('allanime') || host.includes('allanime')) {
                streamUrl = `https://allanime.to/watch/${primarySlug}/${ep}`;
            } else if (extId.includes('hanime') || host.includes('hanime')) {
                streamUrl = `https://playtaku.net/streaming.php?id=${primarySlug}-episode-${ep}`;
            } else if (targetExt.endpoints?.stream) {
                streamUrl = targetExt.endpoints.stream
                    .replace('{id}', aniId)
                    .replace('{slug}', primarySlug)
                    .replace('{episode}', ep.toString())
                    .replace('{query}', encodeURIComponent(cleanPreferred));
            } else {
                streamUrl = `${targetExt.baseUrl || 'https://anitaku.so'}/watch/${primarySlug}?ep=${ep}`;
            }
        } else {
            // No video streaming extension is installed / selected
            streamUrl = '';
        }

        // 4. Generate Simple Episode Playlist
        let totalEpisodes = parseInt(anime?.episodes || anime?.totalEpisodes, 10);
        const titleText = (typeof anime?.title === 'string' ? anime.title : (anime?.title?.english || anime?.title?.romaji || anime?.name || '')).toLowerCase();
        
        if (titleText.includes('one piece')) {
            totalEpisodes = Math.max(totalEpisodes || 0, 1150);
        } else if (titleText.includes('detective conan') || titleText.includes('case closed')) {
            totalEpisodes = Math.max(totalEpisodes || 0, 1150);
        } else if (titleText.includes('pokemon') || titleText.includes('pocket monster')) {
            totalEpisodes = Math.max(totalEpisodes || 0, 1200);
        } else if (titleText.includes('naruto')) {
            totalEpisodes = Math.max(totalEpisodes || 0, 500);
        } else if (titleText.includes('fairy tail')) {
            totalEpisodes = Math.max(totalEpisodes || 0, 328);
        } else if (titleText.includes('dragon ball z')) {
            totalEpisodes = Math.max(totalEpisodes || 0, 291);
        } else if (titleText.includes('dragon ball super')) {
            totalEpisodes = Math.max(totalEpisodes || 0, 131);
        } else if (anime?.nextAiringEpisode?.episode) {
            totalEpisodes = Math.max(anime.nextAiringEpisode.episode - 1, totalEpisodes || 24);
        } else if (!totalEpisodes) {
            totalEpisodes = 24;
        }
        let episodesList = anime?.episodesList;
        if (!Array.isArray(episodesList) || episodesList.length === 0) {
            episodesList = Array.from({ length: totalEpisodes }, (_, idx) => {
                const epNumber = idx + 1;
                return {
                    id: `${primarySlug}-ep-${epNumber}`,
                    number: epNumber,
                    title: `Episode ${epNumber}`,
                    url: streamUrl.replace(`episode-${ep}`, `episode-${epNumber}`).replace(`?ep=${ep}`, `?ep=${epNumber}`).replace(`/${ep}`, `/${epNumber}`)
                };
            });
        }

        return {
            streamUrl,
            episodesList,
            resolvedSlug: primarySlug
        };
    },

    /**
     * Algorithmic, data-driven slug resolver for HiAnime (English-first)
     */
    resolveHiAnimeSlug(english, romaji, preferred) {
        const titles = [english, preferred, romaji].filter(Boolean);
        for (const raw of titles) {
            const processed = raw
                .replace(/\s*\(TV\)\s*/gi, '-tv')
                .replace(/\s*\(Movie\)\s*/gi, '-movie')
                .replace(/\s*\(Season (\d+)\)\s*/gi, ' season $1')
                .replace(/\s*\(Dub\)\s*/gi, '')
                .replace(/\s*\(Sub\)\s*/gi, '')
                .replace(/\s*\(Uncensored\)\s*/gi, '');

            const slug = this.toSlug(processed);
            if (slug) return slug;
        }
        return 'anime';
    },

    /**
     * Algorithmic, data-driven slug resolver for GogoAnime (Romaji/English)
     */
    resolveGogoSlug(english, romaji, preferred) {
        const titles = [romaji, english, preferred].filter(Boolean);
        for (const raw of titles) {
            const processed = raw
                .replace(/\s*\(TV\)\s*/gi, '')
                .replace(/\s*\(Movie\)\s*/gi, '-movie')
                .replace(/\s*\(Season (\d+)\)\s*/gi, ' season $1')
                .replace(/\s*\(Dub\)\s*/gi, '')
                .replace(/\s*\(Sub\)\s*/gi, '')
                .replace(/\s*\(Uncensored\)\s*/gi, '');

            const slug = this.toSlug(processed);
            if (slug) return slug;
        }
        return this.toSlug(preferred || english || romaji);
    },

    sanitizeTitle(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/\s*\(TV\)\s*/gi, '-tv')
            .replace(/\s*\(Movie\)\s*/gi, '-movie')
            .replace(/\s*\(Season \d+\)\s*/gi, '')
            .replace(/\s*\(Dub\)\s*/gi, '')
            .replace(/\s*\(Sub\)\s*/gi, '')
            .replace(/\s*\(Uncensored\)\s*/gi, '')
            .replace(/['":;!?~@#$%^*+=_`|<>{}[\]()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    toSlug(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/['"’]/g, '')
            .replace(/[^a-z0-9\s-]/g, ' ')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
};
