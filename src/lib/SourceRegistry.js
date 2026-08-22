import { AnilistMetadataAdapter } from './adapters/AnilistMetadataAdapter.js';
import {
    HianimeAdapter,
    AnitakuAdapter,
    AniwatchAdapter,
    AnimepaheAdapter,
    AnimekaiAdapter,
    AllanimeAdapter,
    AnikotoAdapter,
    HanimeAdapter,
    CustomRepoAdapter
} from './adapters/StreamAdapters.js';

export class SourceRegistry {
    constructor() {
        this.metadataAdapter = new AnilistMetadataAdapter();
        this.adapterCache = new Map();
    }

    /**
     * Get or instantiate the proper adapter for a given extension
     * @param {Object} ext - Extension metadata object
     * @returns {BaseSourceAdapter}
     */
    getAdapter(ext) {
        if (!ext) return null;
        if (ext.id === 'anilist_source' || ext.type === 'metadata' && ext.name === 'AniList') {
            return this.metadataAdapter;
        }

        const extId = (ext.id || '').toLowerCase();
        const host = (ext.baseUrl || ext.url || '').toLowerCase();

        if (this.adapterCache.has(ext.id)) {
            return this.adapterCache.get(ext.id);
        }

        let adapter = null;

        if (extId.includes('hianime') || host.includes('hianime')) {
            adapter = new HianimeAdapter(ext);
        } else if (extId.includes('anitaku') || host.includes('anitaku') || host.includes('gogo')) {
            adapter = new AnitakuAdapter(ext);
        } else if (extId.includes('aniwatch') || host.includes('aniwatch')) {
            adapter = new AniwatchAdapter(ext);
        } else if (extId.includes('animepahe') || host.includes('animepahe')) {
            adapter = new AnimepaheAdapter(ext);
        } else if (extId.includes('animekai') || host.includes('animekai')) {
            adapter = new AnimekaiAdapter(ext);
        } else if (extId.includes('allanime') || host.includes('allanime')) {
            adapter = new AllanimeAdapter(ext);
        } else if (extId.includes('anikoto') || host.includes('anikoto')) {
            adapter = new AnikotoAdapter(ext);
        } else if (extId.includes('hanime') || host.includes('hanime') || ext.type === 'nsfw') {
            adapter = new HanimeAdapter(ext);
        } else {
            adapter = new CustomRepoAdapter(ext);
        }

        if (adapter) {
            this.adapterCache.set(ext.id, adapter);
        }

        return adapter;
    }

    /**
     * Get all active streaming adapters from the user's installed extensions
     * @param {Array} installedExtensions
     * @returns {Array<BaseSourceAdapter>}
     */
    getStreamAdapters(installedExtensions = []) {
        if (!Array.isArray(installedExtensions) || installedExtensions.length === 0) {
            return [];
        }

        return installedExtensions
            .filter(ext => ext.enabled !== false && ext.id !== 'anilist_source')
            .map(ext => this.getAdapter(ext))
            .filter(Boolean);
    }
}

export const GlobalSourceRegistry = new SourceRegistry();
