/* global fetch */
import { UniversalExtension } from '../lib/UniversalExtension.js';
import { AnimeUrlResolver } from '../lib/AnimeUrlResolver.js';

export class AnilistSource extends UniversalExtension {
    constructor() {
        super({
            id: 'anilist_source',
            name: 'AniList Discovery Engine',
            baseUrl: 'https://graphql.anilist.co',
            version: '1.2.0',
            description: 'Direct AniList GraphQL client providing high-res discovery, thematic shelves, rich search, and stream mapping.',
            type: 'meta-source'
        });
        this.apiEndpoint = 'https://graphql.anilist.co';
    }

    async runQuery(query, variables = {}) {
        const response = await fetch(this.apiEndpoint, {
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

        if (!response.ok) {
            throw new Error(`AniList API responded with status ${response.status}`);
        }

        const json = await response.json();
        if (json.errors) {
            throw new Error(json.errors.map(e => e.message).join(', '));
        }

        return json.data;
    }

    mapAnime(media, matched = null) {
        const titleStr = media.title?.english || media.title?.romaji || media.title?.native || (typeof media.title === 'string' ? media.title : 'Anime');
        const knownCount = AnimeUrlResolver.getKnownEpisodeCount(titleStr);
        const totalCount = media.episodes || knownCount || (media.status === 'RELEASING' ? 24 : 12);

        const episodesList = [];
        const cleanBaseSlug = AnimeUrlResolver.generateSlug(titleStr);

        for (let i = 1; i <= totalCount; i++) {
            const streamingEp = media.streamingEpisodes?.find(e => 
                e.title?.includes(`Episode ${i} `) || 
                e.title?.startsWith(`Episode ${i}`) || 
                e.title?.startsWith(`${i} `)
            );

            let cleanTitle = `Episode ${i}`;
            if (streamingEp?.title) {
                cleanTitle = streamingEp.title
                    .replace(new RegExp(`^Episode\\s*${i}\\s*-\\s*`, 'i'), '')
                    .replace(new RegExp(`^${i}\\s*-\\s*`, 'i'), '')
                    .trim() || `Episode ${i}`;
            }

            episodesList.push({
                number: i,
                title: cleanTitle,
                thumbnail: streamingEp?.thumbnail || media.bannerImage || media.coverImage?.large || media.coverImage?.extraLarge,
                slug: `${cleanBaseSlug}-episode-${i}`,
                url: matched?.baseUrl ? `${matched.baseUrl}/${cleanBaseSlug}-episode-${i}` : `/watch/${cleanBaseSlug}-episode-${i}`,
                site: streamingEp?.site || matched?.site || 'MugenStream'
            });
        }

        return {
            id: media.id.toString(),
            title: media.title?.english || media.title?.romaji || titleStr,
            romaji: media.title?.romaji || titleStr,
            native: media.title?.native || '',
            description: media.description?.replace(/<[^>]*>?/gm, '') || 'No description available.',
            synopsis: media.description?.replace(/<[^>]*>?/gm, '') || 'No description available.',
            coverUrl: media.coverImage?.large || media.coverImage?.extraLarge,
            bannerUrl: media.bannerImage || media.coverImage?.extraLarge,
            rating: media.averageScore ? media.averageScore / 10 : (media.rating || 0),
            episodes: totalCount,
            episodesList: episodesList,
            genres: media.genres || [],
            year: media.seasonYear || media.startDate?.year || null,
            format: media.format,
            status: media.status,
            nextAiringEpisode: media.nextAiringEpisode,
            type: 'custom',
            trailer: media.trailer
        };
    }

    formatMedia(media, matched = null) {
        return this.mapAnime(media, matched);
    }

    async getTrending(filters = {}) {
        const variables = {
            page: filters.page || 1,
            perPage: 49,
            sort: 'TRENDING_DESC',
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
                startDate {
                    year
                }
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
                startDate {
                    year
                }
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
                startDate {
                    year
                }
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
            page: filters.page || 1,
            perPage: filters.perPage || 49,
            search: query || undefined,
            sort: filters.sort || 'POPULARITY_DESC',
            ...filters
        };

        // Remove internal refresh token
        delete variables._t;

        // Support full historical range from 1940 via startDate_like
        if (variables.year) {
            variables.startDateLike = `${variables.year}%`;
            delete variables.year;
        }

        // Support multiple genre selection (genre_in)
        if (variables.genres && Array.isArray(variables.genres) && variables.genres.length > 0) {
            variables.genreIn = variables.genres;
            delete variables.genres;
            delete variables.genre;
        } else if (variables.genre) {
            variables.genreIn = [variables.genre];
            delete variables.genre;
        }

        // When sorting by oldest (START_DATE), filter out date-null/cancelled drafts
        if ((variables.sort === 'START_DATE' || (Array.isArray(variables.sort) && variables.sort.includes('START_DATE'))) && !variables.startDateLike) {
            variables.startDateGreater = 19400000;
        }

        const gqlQuery = `
    query ($page: Int, $perPage: Int, $search: String, $genreIn: [String], $startDateLike: String, $startDateGreater: FuzzyDateInt, $season: MediaSeason, $format: MediaFormat, $status: MediaStatus, $sort: [MediaSort]${variables.isAdult !== undefined ? ', $isAdult: Boolean' : ''}) {
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
                genre_in: $genreIn,
                startDate_like: $startDateLike,
                startDate_greater: $startDateGreater,
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
                startDate {
                    year
                }
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
                startDate {
                    year
                }
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
                const totalCount = data.Media.episodes || 12;
                const episodesList = [];
                const cleanBaseSlug = AnimeUrlResolver.generateSlug(baseAnime.title);

                for (let i = 1; i <= totalCount; i++) {
                    const streamingEp = data.Media.streamingEpisodes?.find(e => e.title?.includes(`Episode ${i}`) || e.title?.startsWith(`${i} `));

                    episodesList.push({
                        number: i,
                        title: streamingEp?.title || `Episode ${i}`,
                        thumbnail: streamingEp?.thumbnail || baseAnime.bannerUrl || baseAnime.coverUrl,
                        slug: `${cleanBaseSlug}-episode-${i}`,
                        url: `/watch/${cleanBaseSlug}-episode-${i}`,
                        site: streamingEp?.site || 'AniList Stream'
                    });
                }
                baseAnime.episodesList = episodesList;
                return baseAnime;
            }
            return null;
        } catch (error) {
            console.error("AniList Details Error", error);
            return null;
        }
    }
}
