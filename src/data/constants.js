export const ANIME_CATALOG = [
    {
        id: '1',
        title: 'Demon Slayer: Kimetsu no Yaiba',
        genres: ['Action', 'Fantasy', 'Historical'],
        rating: 4.9,
        episodes: 26,
        synopsis: 'A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko, who is turning into a demon slowly. Tanjiro sets out to become a demon slayer to avenge his family and cure his sister.',
        coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=450&fit=crop',
        bannerUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&h=400&fit=crop',
        year: 2019,
        source: 'https://aniwatchtv.to',
        trending: true
    },
    {
        id: '2',
        title: 'Jujutsu Kaisen',
        genres: ['Action', 'Supernatural', 'School'],
        rating: 4.8,
        episodes: 24,
        synopsis: 'A boy swallows a cursed talisman - the finger of a demon - and becomes cursed himself. He enters a shaman\'s school to be able to locate the other body parts of the demon and thus exorcise himself.',
        coverUrl: 'https://images.unsplash.com/photo-1620554601316-3e3a4788c222?w=300&h=450&fit=crop',
        bannerUrl: 'https://images.unsplash.com/photo-1620554601316-3e3a4788c222?w=1200&h=400&fit=crop',
        year: 2020,
        source: 'https://hianime.to',
        trending: true
    },
    {
        id: '3',
        title: 'One Piece',
        genres: ['Adventure', 'Action', 'Comedy'],
        rating: 4.9,
        episodes: 1000,
        synopsis: 'Follows the adventures of Monkey D. Luffy and his pirate crew in order to find the greatest treasure ever left by the legendary Pirate, Gold Roger. The famous mystery treasure named "One Piece".',
        coverUrl: 'https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=300&h=450&fit=crop',
        bannerUrl: 'https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=1200&h=400&fit=crop',
        year: 1999,
        source: 'https://kaido.to',
        trending: true
    },
    {
        id: '4',
        title: 'Attack on Titan',
        genres: ['Action', 'Drama', 'Fantasy'],
        rating: 4.9,
        episodes: 75,
        synopsis: 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.',
        coverUrl: 'https://images.unsplash.com/photo-1542259659-573e6da80b9c?w=300&h=450&fit=crop',
        bannerUrl: 'https://images.unsplash.com/photo-1542259659-573e6da80b9c?w=1200&h=400&fit=crop',
        year: 2013,
        source: 'https://aniwatchtv.to',
        trending: false
    },
    {
        id: '5',
        title: 'Naruto Shippuden',
        genres: ['Action', 'Adventure', 'Fantasy'],
        rating: 4.7,
        episodes: 500,
        synopsis: 'Naruto Uzumaki, is a loud, hyperactive, adolescent ninja who constantly searches for approval and recognition, as well as to become Hokage, who is acknowledged as the leader and strongest of all ninja in the village.',
        coverUrl: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=300&h=450&fit=crop',
        bannerUrl: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=1200&h=400&fit=crop',
        year: 2007,
        source: 'https://hianime.to',
        trending: false
    }
];

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

// Manually mapped overrides for known tricky titles
// Key: AniList Title (English or Romaji)
// Value: The correct slug on the target site (HiAnime)
export const ANIME_SLUG_OVERRIDES = {
    'Hunter x Hunter (2011)': 'hunter-x-hunter-2011',
    // Validated Overrides
    'Hunter x Hunter (TV)': 'hunter-x-hunter-2', // User suggested (redirects to ep 1)

    'JUJUTSU KAISEN Season 2': 'jujutsu-kaisen-2nd-season',
    'Jujutsu Kaisen Season 2': 'jujutsu-kaisen-2nd-season',
    'JUJUTSU KAISEN 2nd Season': 'jujutsu-kaisen-2nd-season',

    // Corrected JJK Season 1 (user had invalid slug)
    'Jujutsu Kaisen': 'jujutsu-kaisen-tv',
    'JUJUTSU KAISEN': 'jujutsu-kaisen-tv',

    'One Piece': 'one-piece',
    'ONE PIECE': 'one-piece',

    'Jujutsu Kaisen 0': 'jujutsu-kaisen-0-movie',
    'Jujutsu Kaisen 0 Movie': 'jujutsu-kaisen-0-movie',
    'JUJUTSU KAISEN 0': 'jujutsu-kaisen-0-movie'

};
