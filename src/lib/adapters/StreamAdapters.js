import { BaseSourceAdapter } from './BaseSourceAdapter.js';
import { AnimePaheApi } from '../AnimePaheApi.js';

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * HiAnime Stream Adapter
 */
export class HianimeAdapter extends BaseSourceAdapter {
    constructor(meta = {}) {
        super({
            id: 'hianime_source',
            name: 'HiAnime',
            baseUrl: meta.baseUrl || 'https://hianime.ad',
            type: 'stream',
            color: '#FF5C5C',
            description: 'High-quality fast anime streaming engine with multi-quality HD streams and subtitle support.',
            ...meta
        });
    }

    async resolveStream(anime, episodeNumber = 1) {
        const ep = Math.max(1, parseInt(episodeNumber, 10) || 1);
        const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.canonical || anime?.title || anime?.name || '';
        const slug = slugify(title);
        const streamUrl = `https://hianime.ad/watch/${slug}/ep-${ep}`;
        return {
            streamUrl,
            server: { id: this.id, name: this.name, url: streamUrl }
        };
    }
}

/**
 * Anitaku Stream Adapter
 */
export class AnitakuAdapter extends BaseSourceAdapter {
    constructor(meta = {}) {
        super({
            id: 'anitaku_source',
            name: 'Anitaku',
            baseUrl: meta.baseUrl || 'https://anitaku.so',
            type: 'stream',
            description: 'Fast, high-availability anime stream server with franchise slug intelligence.',
            ...meta
        });
    }

    resolveSlug(title) {
        const clean = (title || '').toLowerCase();
        if (clean.includes('thousand-year blood war') || clean.includes('sennen kessen-hen')) {
            if (clean.includes('conflict') || clean.includes('calamity') || clean.includes('soukoku') || clean.includes('part 3') || clean.includes('part-3')) {
                return 'bleach-sennen-kessen-hen-soukoku-tan';
            }
            if (clean.includes('separation') || clean.includes('ketsubetsu') || clean.includes('part 2') || clean.includes('part-2')) {
                return 'bleach-sennen-kessen-hen-ketsubetsu-tan';
            }
            return 'bleach-sennen-kessen-hen';
        }
        return slugify(title);
    }

    async resolveStream(anime, episodeNumber = 1) {
        const ep = Math.max(1, parseInt(episodeNumber, 10) || 1);
        const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.canonical || anime?.title || anime?.name || '';
        const slug = this.resolveSlug(title);
        const streamUrl = `https://anitaku.so/streaming.php?id=${slug}-episode-${ep}`;
        return {
            streamUrl,
            server: { id: this.id, name: this.name, url: streamUrl }
        };
    }
}

/**
 * AniWatch Stream Adapter
 */
export class AniwatchAdapter extends BaseSourceAdapter {
    constructor(meta = {}) {
        super({
            id: 'aniwatch_source',
            name: 'AniWatch',
            baseUrl: meta.baseUrl || 'https://aniwatchtv.to',
            type: 'stream',
            description: 'Multi-server HD anime streaming engine with subtitle options.',
            ...meta
        });
    }

    async resolveStream(anime, episodeNumber = 1) {
        const ep = Math.max(1, parseInt(episodeNumber, 10) || 1);
        const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.canonical || anime?.title || anime?.name || '';
        const slug = slugify(title);
        const streamUrl = `https://aniwatchtv.to/watch/${slug}?ep=${ep}`;
        return {
            streamUrl,
            server: { id: this.id, name: this.name, url: streamUrl }
        };
    }
}

/**
 * AnimePahe Stream Adapter
 */
export class AnimepaheAdapter extends BaseSourceAdapter {
    constructor(meta = {}) {
        super({
            id: 'animepahe_source',
            name: 'AnimePahe',
            baseUrl: meta.baseUrl || 'https://animepahe.pw',
            type: 'stream',
            description: 'AnimePahe high-speed stream provider with direct session player.',
            ...meta
        });
    }

    async resolveStream(anime, episodeNumber = 1) {
        const ep = Math.max(1, parseInt(episodeNumber, 10) || 1);
        const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.canonical || anime?.title || anime?.name || '';
        const slug = slugify(title);
        
        if (anime?.url && typeof anime.url === 'string') {
            const parsed = AnimePaheApi.parsePlayUrl(anime.url);
            if (parsed) {
                return {
                    streamUrl: anime.url,
                    server: { id: this.id, name: this.name, url: anime.url }
                };
            }
        }

        const streamUrl = `https://animepahe.pw/play/${slug}/${ep}`;
        return {
            streamUrl,
            server: { id: this.id, name: this.name, url: streamUrl }
        };
    }
}

/**
 * AnimeKai Stream Adapter
 */
export class AnimekaiAdapter extends BaseSourceAdapter {
    constructor(meta = {}) {
        super({
            id: 'animekai_source',
            name: 'AnimeKai',
            baseUrl: meta.baseUrl || 'https://animekai.be',
            type: 'stream',
            description: 'AnimeKai high-speed anime streaming player.',
            ...meta
        });
    }

    async resolveStream(anime, episodeNumber = 1) {
        const ep = Math.max(1, parseInt(episodeNumber, 10) || 1);
        const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.canonical || anime?.title || anime?.name || '';
        const slug = slugify(title);
        const streamUrl = `https://animekai.be/watch/${slug}?ep=${ep}`;
        return {
            streamUrl,
            server: { id: this.id, name: this.name, url: streamUrl }
        };
    }
}

/**
 * AllAnime Stream Adapter
 */
export class AllanimeAdapter extends BaseSourceAdapter {
    constructor(meta = {}) {
        super({
            id: 'allanime_source',
            name: 'AllAnime',
            baseUrl: meta.baseUrl || 'https://allanime.to',
            type: 'stream',
            description: 'AllAnime anime stream source.',
            ...meta
        });
    }

    async resolveStream(anime, episodeNumber = 1) {
        const ep = Math.max(1, parseInt(episodeNumber, 10) || 1);
        const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.canonical || anime?.title || anime?.name || '';
        const slug = slugify(title);
        const streamUrl = `https://allanime.to/watch/${slug}/${ep}`;
        return {
            streamUrl,
            server: { id: this.id, name: this.name, url: streamUrl }
        };
    }
}

/**
 * Anikoto Stream Adapter
 */
export class AnikotoAdapter extends BaseSourceAdapter {
    constructor(meta = {}) {
        super({
            id: 'anikoto_source',
            name: 'Anikoto',
            baseUrl: meta.baseUrl || 'https://anikoto.cz',
            type: 'stream',
            description: 'Fast anime streaming provider with multi-quality HD streams and subtitle support.',
            ...meta
        });
    }

    async resolveStream(anime, episodeNumber = 1) {
        const ep = Math.max(1, parseInt(episodeNumber, 10) || 1);
        const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.canonical || anime?.title || anime?.name || '';
        const slug = slugify(title);

        if (anime?.url && typeof anime.url === 'string' && anime.url.includes('anikoto.')) {
            return {
                streamUrl: anime.url,
                server: { id: this.id, name: this.name, url: anime.url }
            };
        }

        const streamUrl = `https://anikoto.cz/watch/${slug}?ep=${ep}`;
        return {
            streamUrl,
            server: { id: this.id, name: this.name, url: streamUrl }
        };
    }
}

/**
 * HAnime Stream Adapter
 */
export class HanimeAdapter extends BaseSourceAdapter {
    constructor(meta = {}) {
        super({
            id: 'hanime_source',
            name: 'HAnime',
            baseUrl: meta.baseUrl || 'https://hanime.tv',
            type: 'nsfw',
            description: 'Dedicated 18+ adult anime player with high-speed streaming.',
            ...meta
        });
    }

    async resolveStream(anime, _episodeNumber = 1) { // eslint-disable-line no-unused-vars
        const slug = slugify(anime?.title?.english || anime?.title?.canonical || anime?.title || anime?.name || '');
        const streamUrl = `https://playtaku.net/streaming.php?id=${slug}-episode-1`;
        return {
            streamUrl,
            server: { id: this.id, name: this.name, url: streamUrl }
        };
    }
}

/**
 * Custom / Remote JSON Repo Extension Adapter
 */
export class CustomRepoAdapter extends BaseSourceAdapter {
    constructor(meta = {}) {
        super({
            id: meta.id || 'custom_source',
            name: meta.name || 'Custom Extension',
            baseUrl: meta.baseUrl || meta.url || '',
            type: meta.type || 'stream',
            description: meta.description || 'Custom user-installed repository source.',
            ...meta
        });
    }

    async resolveStream(anime, episodeNumber = 1) {
        const ep = Math.max(1, parseInt(episodeNumber, 10) || 1);
        const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.canonical || anime?.title || anime?.name || '';
        const slug = slugify(title);
        const streamUrl = this.baseUrl ? `${this.baseUrl}/watch/${slug}?ep=${ep}` : `https://anitaku.so/streaming.php?id=${slug}-episode-${ep}`;
        return {
            streamUrl,
            server: { id: this.id, name: this.name, url: streamUrl }
        };
    }
}
