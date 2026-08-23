import { Extension } from '../lib/ExtensionSDK.js';
import { ConsumetService } from '../lib/services/ConsumetService.js';

export class AnilistSource extends Extension {
    constructor() {
        super({
            id: 'anilist_source',
            name: 'AniList',
            version: '1.0.0',
            icon: 'globe',
            type: 'source'
        });
        this.apiUrl = 'https://graphql.anilist.co';
        this.queryCache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
    }

    async runQuery(query, variables = {}) {
        const cacheKey = JSON.stringify({ q: query.trim(), v: variables });
        const cached = this.queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(JSON.stringify(data));
        }

        // Keep cache bounded to 150 entries
        if (this.queryCache.size > 150) {
            const oldestKey = this.queryCache.keys().next().value;
            this.queryCache.delete(oldestKey);
        }
        this.queryCache.set(cacheKey, { data: data.data, timestamp: Date.now() });

        return data.data;
    }

    mapAnime(media) {
        const rawEp = media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : null);
        let resolvedEpisodes = rawEp;
        const titleStr = `${media.title?.english || ''} ${media.title?.romaji || ''}`.toLowerCase();
        if (!resolvedEpisodes || resolvedEpisodes <= 12) {
            if (titleStr.includes('one piece')) {
                resolvedEpisodes = 1125;
            } else if (titleStr.includes('detective conan') || titleStr.includes('case closed')) {
                resolvedEpisodes = 1150;
            } else if (titleStr.includes('bleach') && !titleStr.includes('thousand-year') && !titleStr.includes('tybw')) {
                resolvedEpisodes = 366;
            } else if (titleStr.includes('naruto shippuden')) {
                resolvedEpisodes = 500;
            } else if (titleStr.includes('naruto') && !titleStr.includes('shippuden') && !titleStr.includes('boruto')) {
                resolvedEpisodes = 220;
            } else if (titleStr.includes('black clover')) {
                resolvedEpisodes = 170;
            } else if (titleStr.includes('fairy tail')) {
                resolvedEpisodes = 328;
            } else if (titleStr.includes('dragon ball z')) {
                resolvedEpisodes = 291;
            } else if (titleStr.includes('dragon ball super')) {
                resolvedEpisodes = 131;
            } else if (titleStr.includes('pokemon') || titleStr.includes('pocket monster')) {
                resolvedEpisodes = 1200;
            } else if (media.status === 'RELEASING') {
                resolvedEpisodes = media.nextAiringEpisode ? Math.max(media.nextAiringEpisode.episode - 1, 24) : 24;
            }
        }

        const streamEpisodes = media.streamingEpisodes || [];
        const totalCount = resolvedEpisodes || (streamEpisodes.length > 0 ? streamEpisodes.length : 12);
        const fallbackThumb = media.bannerImage || media.coverImage?.extraLarge || media.coverImage?.large;

        // Build rich episode metadata list (names & thumbnails)
        const episodesList = [];
        for (let i = 1; i <= totalCount; i++) {
            const matched = streamEpisodes.find(ep => {
                const epMatch = ep.title?.match(/Episode\s+(\d+)/i);
                return epMatch && parseInt(epMatch[1], 10) === i;
            }) || (streamEpisodes[i - 1] ? streamEpisodes[i - 1] : null);

            let cleanTitle = `Episode ${i}`;
            let thumbnail = matched?.thumbnail || fallbackThumb;

            if (matched?.title) {
                const stripped = matched.title.replace(/^(?:Episode|Ep)\s*\d+\s*[-:—–]\s*/i, '').trim();
                cleanTitle = stripped || `Episode ${i}`;
            }

            episodesList.push({
                number: i,
                title: cleanTitle,
                fullTitle: `Episode ${i}: ${cleanTitle}`,
                thumbnail: thumbnail,
                url: matched?.url || null,
                site: matched?.site || 'MugenStream'
            });
        }

        return {
            id: media.id.toString(),
            title: media.title.english || media.title.romaji,
            romaji: media.title.romaji,
            native: media.title.native,
            description: media.description?.replace(/<[^>]*>?/gm, '') || 'No description available.', // Strip HTML
            synopsis: media.description?.replace(/<[^>]*>?/gm, '') || 'No description available.',
            coverUrl: media.coverImage?.large || media.coverImage?.extraLarge,
            bannerUrl: media.bannerImage || media.coverImage?.extraLarge,
            rating: media.averageScore ? media.averageScore / 10 : 0,
            episodes: totalCount,
            episodesList: episodesList,
            genres: media.genres,
            year: media.seasonYear,
            format: media.format, // Add Format
            status: media.status, // Add Status
            nextAiringEpisode: media.nextAiringEpisode, // Add Next Airing Info
            type: 'custom',
            trailer: media.trailer // Store trailer info
        };
    }

    async getTrending(filters = {}) {
        const variables = {
            page: filters.page || 1,
            perPage: 49, // 49 items perfectly tiles 7x7 grid
            sort: 'TRENDING_DESC',
            ...filters
        };

        // Remove internal
        delete variables._t;

        const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort]${variables.isAdult !== undefined ? ', $isAdult: Boolean' : ''}) {
        Page(page: $page, perPage: $perPage) {
            pageInfo {
                total
                perPage
                currentPage
                lastPage
                hasNextPage
            }
            media(sort: $sort, type: ANIME ${variables.isAdult !== undefined ? ', isAdult: $isAdult' : ''}) {
                id
                title {
                    romaji
                    english
                    native
                }
                coverImage {
                    large
                    extraLarge
                }
                bannerImage
                description
                averageScore
                episodes
                genres
                seasonYear
                format
                status
                nextAiringEpisode {
                    episode
                    timeUntilAiring
                }
                streamingEpisodes {
                    title
                    thumbnail
                    url
                    site
                }
                siteUrl
                trailer {
                    id
                    site
                }
            }
        }
    }
    `;

        try {
            const data = await this.runQuery(query, variables);
            return {
                results: data.Page.media.map(m => this.mapAnime(m)),
                meta: data.Page.pageInfo
            };
        } catch (error) {
            console.error("AniList Trending Error", error);
            return { results: [], meta: { hasNextPage: false, lastPage: 1 } };
        }
    }

    async getPopular(filters = {}) {
        const variables = {
            page: filters.page || 1,
            perPage: filters.perPage || 25,
            sort: 'POPULARITY_DESC',
            ...filters
        };

        delete variables._t;

        const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort]${variables.isAdult !== undefined ? ', $isAdult: Boolean' : ''}) {
        Page(page: $page, perPage: $perPage) {
            pageInfo {
                total
                perPage
                currentPage
                lastPage
                hasNextPage
            }
            media(sort: $sort, type: ANIME ${variables.isAdult !== undefined ? ', isAdult: $isAdult' : ''}) {
                id
                title {
                    romaji
                    english
                    native
                }
                coverImage {
                    large
                    extraLarge
                }
                bannerImage
                description
                averageScore
                episodes
                genres
                seasonYear
                format
                status
                nextAiringEpisode {
                    episode
                    timeUntilAiring
                }
                streamingEpisodes {
                    title
                    thumbnail
                    url
                    site
                }
                siteUrl
                trailer {
                    id
                    site
                }
            }
        }
    }
    `;

        try {
            const data = await this.runQuery(query, variables);
            return {
                results: data.Page.media.map(m => this.mapAnime(m)),
                meta: data.Page.pageInfo
            };
        } catch (error) {
            console.error("AniList Popular Error", error);
            return { results: [], meta: { hasNextPage: false, lastPage: 1 } };
        }
    }

    async getTopRated(filters = {}) {
        const variables = {
            page: filters.page || 1,
            perPage: filters.perPage || 25,
            sort: 'SCORE_DESC',
            ...filters
        };

        delete variables._t;

        const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort]${variables.isAdult !== undefined ? ', $isAdult: Boolean' : ''}) {
        Page(page: $page, perPage: $perPage) {
            pageInfo {
                total
                perPage
                currentPage
                lastPage
                hasNextPage
            }
            media(sort: $sort, type: ANIME ${variables.isAdult !== undefined ? ', isAdult: $isAdult' : ''}) {
                id
                title {
                    romaji
                    english
                    native
                }
                coverImage {
                    large
                    extraLarge
                }
                bannerImage
                description
                averageScore
                episodes
                genres
                seasonYear
                format
                status
                nextAiringEpisode {
                    episode
                    timeUntilAiring
                }
                streamingEpisodes {
                    title
                    thumbnail
                    url
                    site
                }
                siteUrl
                trailer {
                    id
                    site
                }
            }
        }
    }
    `;

        try {
            const data = await this.runQuery(query, variables);
            return {
                results: data.Page.media.map(m => this.mapAnime(m)),
                meta: data.Page.pageInfo
            };
        } catch (error) {
            console.error("AniList Top Rated Error", error);
            return { results: [], meta: { hasNextPage: false, lastPage: 1 } };
        }
    }

    async search(query, filters = {}) {
        // If no query and no filters, return trending
        if (!query && Object.keys(filters).length === 0) return this.getTrending();

        // Construct variables
        const variables = {
            page: filters.page || 1, // Default
            perPage: filters.perPage || 49,
            search: query || undefined,
            sort: filters.sort || 'POPULARITY_DESC',
            ...filters
        };

        // Remove internal refresh token
        delete variables._t;

        const gqlQuery = `
    query ($page: Int, $perPage: Int, $search: String, $genre: String, $year: Int, $season: MediaSeason, $format: MediaFormat, $status: MediaStatus, $sort: [MediaSort]${variables.isAdult !== undefined ? ', $isAdult: Boolean' : ''}) {
        Page(page: $page, perPage: $perPage) {
            pageInfo {
                total
                perPage
                currentPage
                lastPage
                hasNextPage
            }
            media(
                search: $search, 
                genre: $genre,
                seasonYear: $year,
                season: $season,
                format: $format,
                status: $status,
                ${variables.isAdult !== undefined ? 'isAdult: $isAdult,' : ''}
                sort: $sort, 
                type: ANIME
            ) {
                id
                title {
                    romaji
                    english
                    native
                }
                coverImage {
                    large
                    extraLarge
                }
                bannerImage
                description
                averageScore
                episodes
                genres
                seasonYear
                format
                status
                nextAiringEpisode {
                    episode
                    timeUntilAiring
                }
                streamingEpisodes {
                    title
                    thumbnail
                    url
                    site
                }
                siteUrl
                trailer {
                    id
                    site
                }
            }
        }
    }
    `;

        try {
            const data = await this.runQuery(gqlQuery, variables);
            return {
                results: data.Page.media.map(m => this.mapAnime(m)),
                meta: data.Page.pageInfo
            };
        } catch {
            return { results: [], meta: { hasNextPage: false, lastPage: 1 } };
        }
    }

    async getAnimeDetails(id) {
        const query = `
        query ($id: Int) {
            Media(id: $id, type: ANIME) {
                id
                title {
                    romaji
                    english
                    native
                }
                coverImage {
                    large
                    extraLarge
                }
                bannerImage
                description
                averageScore
                episodes
                genres
                seasonYear
                season
                format
                status
                nextAiringEpisode {
                    episode
                    timeUntilAiring
                }
                streamingEpisodes {
                    title
                    thumbnail
                    url
                    site
                }
                siteUrl
                trailer {
                    id
                    site
                }
            }
        }
        `;
        try {
            const data = await this.runQuery(query, { id: parseInt(id, 10) });
            if (data?.Media) {
                const baseAnime = this.mapAnime(data.Media);
                // Attempt rich TMDB metadata enrichment via Consumet
                try {
                    const consumetData = await ConsumetService.fetchAnimeInfo(id);
                    if (consumetData && Array.isArray(consumetData.episodes) && consumetData.episodes.length > 0) {
                        const enrichedEpisodes = ConsumetService.mapEpisodes(consumetData.episodes, baseAnime);
                        if (enrichedEpisodes.length > 0) {
                            baseAnime.episodesList = enrichedEpisodes;
                            baseAnime.episodes = Math.max(baseAnime.episodes || 0, enrichedEpisodes.length);
                        }
                    }
                } catch (metaErr) {
                    console.warn('Consumet enrichment note:', metaErr?.message || metaErr);
                }
                return baseAnime;
            }
            return null;
        } catch (error) {
            console.error("AniList Details Error", error);
            return null;
        }
    }

    async getStream(anime) {
        // Prioritize the Extension/Portal URL (Source)
        if (anime.source) {
            return anime.source;
        }

        // Fallback: Use YouTube trailer if no source available
        if (anime.trailer && anime.trailer.site === 'youtube') {
            return `https://www.youtube.com/embed/${anime.trailer.id}`;
        }

        // Final Fallback
        return `https://anilist.co/anime/${anime.id}`;
    }
}
