import { Extension } from '../lib/ExtensionSDK';

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
    }

    async runQuery(query, variables = {}) {
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
        return data.data;
    }

    mapAnime(media) {
        return {
            id: media.id.toString(),
            title: media.title.english || media.title.romaji,
            romaji: media.title.romaji,
            description: media.description?.replace(/<[^>]*>?/gm, '') || 'No description available.', // Strip HTML
            synopsis: media.description?.replace(/<[^>]*>?/gm, '') || 'No description available.',
            coverUrl: media.coverImage.large,
            bannerUrl: media.bannerImage || media.coverImage.extraLarge,
            rating: media.averageScore ? media.averageScore / 10 : 0,
            episodes: media.episodes,
            genres: media.genres,
            year: media.seasonYear,
            type: 'custom',
            // source: media.siteUrl, // REMOVED: Do not use AniList site as video source (it blocks embeds)
            trailer: media.trailer // Store trailer info
        };
    }

    async getTrending(filters = {}) {
        const variables = {
            page: 1,
            perPage: 10,
            sort: 'TRENDING_DESC',
            ...filters
        };

        console.log("getTrending variables:", JSON.stringify(variables));

        // Remove internal

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

    async search(query, filters = {}) {
        // If no query and no filters, return trending
        if (!query && Object.keys(filters).length === 0) return this.getTrending();

        // Construct variables
        const variables = {
            page: 1, // Default
            search: query || undefined,
            sort: filters.sort || 'POPULARITY_DESC',
            ...filters
        };

        console.log("search variables:", JSON.stringify(variables));

        // Remove internal refresh token
        delete variables._t;

        // Dynamic Query Construction based on filters
        // AniList API types:
        // genre: String
        // year: Int (seasonYear)
        // season: MediaSeason (WINTER, SPRING, SUMMER, FALL)
        // format: MediaFormat (TV, TV_SHORT, MOVIE, SPECIAL, OVA, ONA, MUSIC)
        // status: MediaStatus (FINISHED, RELEASING, NOT_YET_RELEASED, CANCELLED, HIATUS)

        const gqlQuery = `
    query ($page: Int, $search: String, $genre: String, $year: Int, $season: MediaSeason, $format: MediaFormat, $status: MediaStatus ${variables.isAdult !== undefined ? ', $isAdult: Boolean' : ''}) {
        Page(page: $page, perPage: 20) {
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
                sort: POPULARITY_DESC, 
                type: ANIME
            ) {
                id
                title {
                    romaji
                    english
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
        } catch (error) {
            // console.error("AniList Search Error", error); // Suppress log for cleaner console, or handle better
            return { results: [], meta: { hasNextPage: false, lastPage: 1 } };
        }
    }

    async getStream(anime) {
        // Prioritize the Extension/Portal URL (Source)
        // The user prefers "the extension" (the site itself) over a YouTube trailer default.
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
