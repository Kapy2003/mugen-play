import { BaseSourceAdapter } from './BaseSourceAdapter.js';
import { AnilistSource } from '../../extensions/AnilistSource.js';
import { CanonicalAnime, CanonicalEpisode } from '../../models/CanonicalAnime.js';

export class AnilistMetadataAdapter extends BaseSourceAdapter {
    constructor() {
        super({
            id: 'anilist_source',
            name: 'AniList',
            baseUrl: 'https://graphql.anilist.co',
            type: 'metadata',
            isCore: true,
            icon: 'sparkles',
            description: 'Official AniList GraphQL Engine supplying rich HD metadata, banners, ratings, and catalog search.'
        });
        this.rawSource = new AnilistSource();
    }

    async search(query, page = 1, filters = {}) {
        if (!query && Object.keys(filters).length === 0) {
            const popular = await this.rawSource.getPopularAnime(page);
            return popular.map(item => new CanonicalAnime({ ...item, sourceId: this.id }));
        }

        const results = await this.rawSource.search(query, page, filters);
        return results.map(item => new CanonicalAnime({ ...item, sourceId: this.id }));
    }

    async getDetails(id) {
        const details = await this.rawSource.getAnimeDetails(id);
        return details ? new CanonicalAnime({ ...details, sourceId: this.id }) : null;
    }

    async getTrending(page = 1) {
        const trending = await this.rawSource.getTrendingAnime(page);
        return trending.map(item => new CanonicalAnime({ ...item, sourceId: this.id }));
    }

    async getEpisodes(animeId, totalEpisodes = 12) {
        const total = Math.max(1, parseInt(totalEpisodes, 10) || 12);
        return Array.from({ length: total }, (_, i) => new CanonicalEpisode({
            id: `ep-${i + 1}`,
            number: i + 1,
            title: `Episode ${i + 1}`,
            sourceId: this.id
        }));
    }

    async healthCheck() {
        return true;
    }
}
