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
];

export const VIDEO_SOURCES = {
    YOUTUBE: 'youtube', // Kept for legacy compatibility if needed
    EXTERNAL: 'external'
};
