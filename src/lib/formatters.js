/**
 * Common formatting helpers for Mugen Play
 */

export const formatAnimeTitle = (title, fallback = 'Untitled Anime') => {
    if (!title) return fallback;
    if (typeof title === 'string') return title;
    return title.english || title.romaji || title.canonical || title.userPreferred || fallback;
};
