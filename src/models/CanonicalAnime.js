/**
 * Canonical Anime & Episode Models for Mugen Play
 * Normalizes data across any source into a unified schema.
 */

export class CanonicalAnime {
    constructor(data = {}) {
        this.id = data.id || data.slug || String(Date.now());
        
        // Normalized Title Dictionary
        const rawTitle = data.title;
        const english = typeof rawTitle === 'object' ? (rawTitle.english || '') : (typeof rawTitle === 'string' ? rawTitle : (data.name || ''));
        const romaji = typeof rawTitle === 'object' ? (rawTitle.romaji || '') : '';
        const native = typeof rawTitle === 'object' ? (rawTitle.native || '') : '';
        const canonical = (english || romaji || native || data.name || 'Untitled Anime').trim();

        this.title = {
            canonical,
            english: english.trim(),
            romaji: romaji.trim(),
            native: native.trim(),
            synonyms: Array.isArray(data.synonyms) ? data.synonyms : []
        };

        // Media Images
        this.coverUrl = data.coverUrl || data.image || data.coverImage?.large || data.coverImage?.medium || '';
        this.bannerUrl = data.bannerUrl || data.bannerImage || this.coverUrl;

        // Content Details
        this.synopsis = (data.synopsis || data.description || '').replace(/<[^>]*>?/gm, '').trim();
        this.episodes = parseInt(data.episodes || data.totalEpisodes, 10) || 12;
        this.rating = parseFloat(data.rating || data.averageScore || 0);
        this.year = parseInt(data.year || data.seasonYear || data.startDate?.year, 10) || null;
        this.season = data.season || '';
        this.format = data.format || (this.episodes === 1 ? 'MOVIE' : 'TV');
        this.status = data.status || 'FINISHED';
        this.genres = Array.isArray(data.genres) ? data.genres : [];
        this.isAdult = !!data.isAdult || (this.genres.some(g => ['Hentai', 'Ecchi', 'Erotica'].includes(g)));

        // Multi-Source Mappings
        this.sources = Array.isArray(data.sources) ? data.sources : [];
        if (data.sourceId && !this.sources.some(s => s.sourceId === data.sourceId)) {
            this.sources.push({
                sourceId: data.sourceId,
                sourceAnimeId: String(data.id),
                url: data.url
            });
        }
    }

    /**
     * Merge additional source mapping into this canonical anime
     */
    addSourceMapping(sourceId, sourceAnimeId, url = null) {
        if (!this.sources.some(s => s.sourceId === sourceId)) {
            this.sources.push({ sourceId, sourceAnimeId: String(sourceAnimeId), url });
        }
    }
}

export class CanonicalEpisode {
    constructor(data = {}) {
        this.id = data.id || `ep-${data.number || 1}`;
        this.number = parseInt(data.number || data.episodeNumber, 10) || 1;
        this.title = data.title || `Episode ${this.number}`;
        this.description = data.description || '';
        this.thumbnail = data.thumbnail || data.image || '';
        this.duration = data.duration || 0;
        this.airDate = data.airDate || '';
        this.sourceId = data.sourceId || 'stream';
        this.streamUrl = data.streamUrl || data.url || '';
        this.servers = Array.isArray(data.servers) ? data.servers : [];
    }
}
