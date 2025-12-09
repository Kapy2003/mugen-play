export const INITIAL_EXTENSIONS = [
    {
        id: 'anilist_source',
        name: 'AniList',
        version: '1.0.0',
        icon: 'globe',
        type: 'source',
        enabled: true
    },
    {
        id: 'anitaku-custom-source',
        name: 'Anitaku',
        version: '1.0.0',
        type: 'custom',
        url: 'https://anitaku.to',
        enabled: true
    }
];


export const VIDEO_SOURCES = {
    YOUTUBE: 'youtube', // Kept for legacy compatibility if needed
    EXTERNAL: 'external'
};

// Mock Catalog Data to restore functionality
export const ANIME_CATALOG = [];

export const CUSTOM_SOURCE_DATA = [];

// Manually mapped overrides for known tricky titles
// Key: AniList Title (English or Romaji)
// Value: The correct slug on the target site (HiAnime)
export const ANIME_SLUG_OVERRIDES = {
    // Validated Overrides

};
