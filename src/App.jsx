import { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import AnimeCard from './components/anime/AnimeCard';
import AnimeDetailModal from './components/anime/AnimeDetailModal';
import VideoPlayer from './components/player/VideoPlayer';
import ExtensionsView from './components/extensions/ExtensionsView';
import AddSourceModal from './components/extensions/AddSourceModal';
import DirectPlayModal from './components/player/DirectPlayModal';
import Toast from './components/common/Toast';
import { INITIAL_EXTENSIONS } from './data/constants';
import { Search, Home, Play, Info, ChevronRight, X, Maximize2, Minimize2, PanelRight, Settings2, MoreVertical, Trash2, Filter, Compass, Shuffle, Star, Heart } from 'lucide-react';
import { AnilistSource } from './extensions/AnilistSource';
import { ANIME_KAI_IDS } from './data/anime_ids';
import HorizontalScrollList from './components/common/HorizontalScrollList';
import { AnitakuScraper } from './lib/AnitakuScraper';

function App() {
    // --- State ---
    const [activeTab, setActiveTab] = useState('home');
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem('mugen_sidebar_width');
        return saved ? parseInt(saved, 10) : 256;
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('mugen_sidebar_collapsed');
        return saved ? saved === 'true' : false;
    });
    const [videoScale, setVideoScale] = useState(1); // Zoom level for player
    const [videoXOffset, setVideoXOffset] = useState(0); // Horizontal shift (e.g. to crop left sidebar)
    const [videoYOffset, setVideoYOffset] = useState(-60); // Vertical shift (Top Crop in px)

    const [isSidebarVisible, setIsSidebarVisible] = useState(true); // Toggle Episode Sidebar (Right)

    // Provider State
    const [extensions, setExtensions] = useState(() => {
        const saved = localStorage.getItem('mugen_extensions');
        let parsed = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(parsed)) parsed = [];

        // Check INITIAL_EXTENSIONS but DO NOT auto-install Anitaku (id: anitaku)
        // Only auto-install critical sources if absolutely needed, or user preference.
        // For new strategy: We wait for user.
        // However, we must ensure at least ONE metadata source (Anilist) is present.

        const existingIds = new Set(parsed.map(e => e.id));
        INITIAL_EXTENSIONS.forEach(initExt => {
            // Force add Anilist if missing
            if (initExt.id === 'anilist_source' && !existingIds.has(initExt.id)) {
                parsed.push(initExt);
            }
            // For other extensions (Anitaku), we skip auto-adding if not present.
        });

        return parsed;
    });

    // Initialize active provider - STRICTLY ANILIST
    const [activeProvider] = useState(() => new AnilistSource());

    // Content State
    const [animeList, setAnimeList] = useState([]);
    const [trendingList, setTrendingList] = useState([]);
    const [featuredIndex, setFeaturedIndex] = useState(0); // Index for rotating banner
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true); // Simplified: assume next unless empty result
    const [totalPages, setTotalPages] = useState(1);
    const [activeHistoryMenu, setActiveHistoryMenu] = useState(null); // ID of history item with open menu

    // UI State
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [playingAnime, setPlayingAnime] = useState(null);
    const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);
    const [showAddSource, setShowAddSource] = useState(false);
    const [showDirectPlay, setShowDirectPlay] = useState(false);
    const [toast, setToast] = useState(null);
    const [showSourceMenu, setShowSourceMenu] = useState(false);
    const [filters, setFilters] = useState({});
    const [editingExtension, setEditingExtension] = useState(null);
    // History State
    const [watchHistory, setWatchHistory] = useState(() => {
        const saved = localStorage.getItem('mugen_watch_history');
        return saved ? JSON.parse(saved) : [];
    });

    // Favorites State
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem('mugen_favorites');
        return saved ? JSON.parse(saved) : [];
    });

    // Settings State
    const [contentFilter, setContentFilter] = useState(() => {
        return localStorage.getItem('mugen_content_filter') || 'ALL'; // SAFE, NSFW, ALL
    });

    // Auth State
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('mugen_user');
        return saved ? JSON.parse(saved) : null;
    });

    // --- Effects ---

    // Handle AniList OAuth Callback
    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
            const params = new URLSearchParams(hash.substring(1)); // remove #
            const token = params.get('access_token');

            if (token) {
                // Fetch User Data
                fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        query: `
                            query {
                                Viewer {
                                    id
                                    name
                                    avatar {
                                        large
                                    }
                                }
                            }
                        `
                    })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.data?.Viewer) {
                            const userData = { ...data.data.Viewer, token };
                            setUser(userData);
                            localStorage.setItem('mugen_user', JSON.stringify(userData));
                            // Clean URL
                            window.history.replaceState(null, '', window.location.pathname);
                            setToast({ message: `Welcome back, ${userData.name}!`, type: 'success' });
                        }
                    })
                    .catch(err => {
                        console.error("Auth Error", err);
                        setToast({ message: "Login failed", type: 'error' });
                    });
            }
        }
    }, []);

    const handleLogin = () => {
        // REPLACE THIS WITH YOUR OWN CLIENT ID
        // For development/demo, users often use a test ID or their own.
        const CLIENT_ID = '23340'; // Using a public/common ID for testing if available, or placeholder.
        // Ideally, this should be configurable.
        // Using implicit grant for client-side only app
        window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${CLIENT_ID}&response_type=token`;
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('mugen_user');
        setToast({ message: "Logged out successfully", type: 'info' });
    };

    // Persist extensions
    useEffect(() => {
        localStorage.setItem('mugen_extensions', JSON.stringify(extensions));
    }, [extensions]);

    // Persist active provider
    useEffect(() => {
        localStorage.setItem('mugen_active_provider_id', activeProvider.id);
    }, [activeProvider]);

    // Persist sidebar width
    useEffect(() => {
        localStorage.setItem('mugen_sidebar_width', sidebarWidth.toString());
    }, [sidebarWidth]);

    // Persist sidebar collapsed state
    useEffect(() => {
        localStorage.setItem('mugen_sidebar_collapsed', isSidebarCollapsed.toString());
    }, [isSidebarCollapsed]);

    // Load Content when Provider, Search, or Filters change
    useEffect(() => {
        const loadContent = async () => {
            setIsLoading(true);
            try {
                if (searchQuery || Object.keys(filters).length > 0) {
                    // Check if provider supports filters, otherwise just search
                    // Check if provider supports filters, otherwise just search
                    const effectiveFilters = { ...filters };

                    // Apply Content Filter
                    if (contentFilter === 'SAFE') {
                        effectiveFilters.isAdult = false;
                    } else if (contentFilter === 'NSFW') {
                        effectiveFilters.isAdult = true;
                    } else {
                        // ALL: AniList default behavior usually excludes isAdult if not specified? 
                        // Actually if we want BOTH, we might need to NOT send isAdult.
                        delete effectiveFilters.isAdult;
                    }

                    effectiveFilters.page = page; // Use current page

                    const data = await activeProvider.search(searchQuery, effectiveFilters);
                    setAnimeList(data.results);
                    setHasNextPage(data.meta.hasNextPage);
                    setTotalPages(data.meta.lastPage || 1);
                    // Removed legacy state: setFeaturedAnime(null);
                } else {
                    // Default / Home View
                    // Apply Content Filter to Home (Trending & Popular)
                    const homeFilters = {};
                    if (contentFilter === 'SAFE') {
                        homeFilters.isAdult = false;
                    } else if (contentFilter === 'NSFW') {
                        homeFilters.isAdult = true;
                        // Use POPULARITY for NSFW banner as Trending often yields no adult results
                        homeFilters.sort = 'POPULARITY_DESC';
                    }
                    // ALL: leave isAdult undefined to get mixed content

                    // Banner: Always Page 1
                    const trendingData = await activeProvider.getTrending({ ...homeFilters, page: 1 });

                    // Grid: Current Page
                    homeFilters.page = page;
                    const catalogData = await activeProvider.search('', homeFilters);

                    setAnimeList(catalogData.results);
                    setHasNextPage(catalogData.meta.hasNextPage);
                    setTotalPages(catalogData.meta.lastPage || 1);

                    setTrendingList(trendingData.results);
                    setFeaturedIndex(0); // Reset banner to start when content changes
                }
            } catch (err) {
                console.error("Error loading content:", err);
                setToast({ message: `Error loading content from ${activeProvider.name}`, type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(loadContent, 500); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [activeProvider, searchQuery, filters, contentFilter, page]);

    // Banner Config: Auto-rotate every 4 seconds
    useEffect(() => {
        if (activeTab === 'home' && trendingList.length > 0 && !searchQuery) {
            const interval = setInterval(() => {
                setFeaturedIndex(prev => (prev + 1) % trendingList.length);
            }, 4000);
            return () => clearInterval(interval);
        }
    }, [activeTab, trendingList, searchQuery]);
    // --- Handlers ---
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const addToHistory = (anime) => {
        setWatchHistory(prev => {
            const newHistory = [anime, ...prev.filter(i => i.id !== anime.id)].slice(0, 50);
            localStorage.setItem('mugen_watch_history', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const removeFromHistory = (animeId) => {
        setWatchHistory(prev => {
            const newHistory = prev.filter(i => i.id !== animeId);
            localStorage.setItem('mugen_watch_history', JSON.stringify(newHistory));
            return newHistory;
        });
        setActiveHistoryMenu(null); // Close menu
        setToast({ message: "Removed from history", type: 'success' });
    };

    const toggleFavorite = (anime) => {
        setFavorites(prev => {
            const exists = prev.find(item => item.id === anime.id);
            let newFavorites;
            if (exists) {
                newFavorites = prev.filter(item => item.id !== anime.id);
                showToast("Removed from Favorites", "info");
            } else {
                newFavorites = [anime, ...prev];
                showToast("Added to Favorites", "success");
            }
            localStorage.setItem('mugen_favorites', JSON.stringify(newFavorites));
            return newFavorites;
        });
    };

    // Helper to save extensions to localStorage
    const saveExtensions = (updatedExtensions) => {
        localStorage.setItem('mugen_extensions', JSON.stringify(updatedExtensions));
        setExtensions(updatedExtensions);
    };

    // Toggle Adult Content Filter
    const cycleContentFilter = (val) => {
        setContentFilter(val);
        localStorage.setItem('mugen_content_filter', val);
        showToast(`Content Filter: ${val}`, 'success');

        // Reset page on content filter change
        setPage(1);
    };

    // Helper to sanitize text (Simplified or removed if no longer strictly needed for obscenity, 
    // but useful for generic HTML stripping which is handled in Source. Kept simple or removed.)
    // User requested specifically to "Hide Adult Content", implying filtering items, not just text.
    // I will remove the text sanitizer to clean up, or keep it as identity function if used elsewhere.
    // The previous implementation was used in render. I'll replace usages with direct access or identity.
    const sanitize = (text) => text; // Identity function to avoid breaking existing calls

    const handlePlay = async (anime, episodeNumber = null) => {
        try {
            setSelectedAnime(null);
            setIsPlayerMinimized(false); // Start normal size
            setIsSidebarVisible(true); // Force Sidebar Open by default
            addToHistory(anime); // Add to history

            // 1. Check if it's a direct custom item (already has URL)
            if (anime.url && anime.type === 'custom') {
                setPlayingAnime({
                    ...anime,
                    title: sanitize(anime.title),
                    name: sanitize(anime.name),
                    synopsis: sanitize(anime.synopsis)
                });
                return;
            }

            // 2. Check for enabled "Custom Source" extensions (Portals)
            // If user has added a custom source (e.g. hianime.to), we use it to "play" (search/embed)
            const customSource = extensions.find(e => e.enabled && e.type === 'custom' && e.url);

            let streamUrl = null;
            let episodesList = [];

            if (customSource) {
                const baseUrl = customSource.url.replace(/\/$/, '');

                if (customSource.name === 'AnimeKai') {
                    // Direct URL Construction (User Request)
                    // Format: /watch/[slugified-title]-[suffix]#ep=[num]
                    const title = anime.title.english || anime.title.romaji || anime.title;
                    let slug = title.toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
                        .trim()
                        .replace(/\s+/g, '-');        // Spaces to hyphens

                    // Check for manual mapping extension
                    // We need to dynamic import or just assume it's imported at top (I will add import)
                    const suffix = ANIME_KAI_IDS[anime.id];
                    if (suffix) {
                        slug += `-${suffix}`;
                    }

                    streamUrl = `${baseUrl}/watch/${slug}`;
                    if (episodeNumber) {
                        streamUrl += `#ep=${episodeNumber}`;
                    }
                } else if (
                    customSource.name === 'Anitaku' ||
                    customSource.name === 'HiAnime' ||
                    customSource.name === 'HiAnimez' ||
                    customSource.url.includes('anitaku') ||
                    customSource.url.includes('hianime')
                ) {
                    // Anitaku / HiAnime Hybrid Integration
                    let slug = anime.sourceId; // Reuse slug if already found
                    let foundEpisodes = null;

                    if (!slug) {
                        // 1. Search Anitaku for the Slug if not already known
                        showToast('Searching Anitaku...', 'info');
                        try {
                            const title = anime.title.english || anime.title.romaji || anime.title;
                            // Clean title for better search (remove " - Episode X" suffix if present)
                            const cleanTitle = title.split(' - Episode')[0];
                            const results = await AnitakuScraper.search(cleanTitle);

                            if (results && results.length > 0) {
                                const match = results[0];
                                slug = match.id;
                                console.log("Anitaku Match Slug:", slug);
                            } else {
                                throw new Error("Anime not found on Anitaku");
                            }
                        } catch (err) {
                            console.error("Anitaku Search Error:", err);
                            showToast(`Could not find "${anime.title.english || anime.title}" on Anitaku.`, 'error');
                            return;
                        }
                    }

                    if (slug) {
                        // Fetch Episode List for Sidebar if needed
                        if (!anime.episodesList || anime.episodesList.length === 0) {
                            try {
                                foundEpisodes = await AnitakuScraper.getEpisodes(slug);
                                episodesList = foundEpisodes;
                            } catch (e) {
                                // ensure we keep existing list if fetch fails but we have one
                                if (anime.episodesList) episodesList = anime.episodesList;
                                console.warn("Failed to fetch episodes list:", e);
                            }
                        } else {
                            episodesList = anime.episodesList;
                        }

                        // Construct HiAnime URL Format: https://hianimez.live/watch/slug/ep-num
                        const targetNum = episodeNumber || 1;
                        streamUrl = `https://hianimez.live/watch/${slug}/ep-${targetNum}`;

                        showToast(`Redirecting to Episode ${targetNum}...`, 'success');
                    }
                } else {
                    // Generic Search Logic for other sources
                    let queryText = anime.title.english || anime.title.romaji || anime.title;
                    if (episodeNumber) {
                        queryText += ` Episode ${episodeNumber}`;
                    }
                    const searchQuery = encodeURIComponent(queryText);
                    streamUrl = `${baseUrl}/search?q=${searchQuery}&keyword=${searchQuery}`;
                }
            } else {
                // 3. Fallback to Active Provider (AniList Trailer)
                streamUrl = await activeProvider.getStream(anime);
            }

            setVideoScale(1); // Reset zoom on new play

            // Clean title to prevent accumulating suffixes (e.g. "Title - Episode 1 - Episode 2")
            const baseTitle = (anime.title.english || anime.title.romaji || anime.title || '').split(' - Episode')[0];

            setPlayingAnime({
                ...anime,
                streamUrl,
                episodesList: episodesList || [], // Store fetched episodes
                sourceId: anime.sourceId || (customSource && customSource.name === 'AnimeKai' ? null : (typeof slug !== 'undefined' ? slug : null)), // persist slug if found
                title: sanitize(episodeNumber ? `${baseTitle} - Episode ${episodeNumber}` : baseTitle),
                name: sanitize(anime.name),
                synopsis: sanitize(anime.synopsis)
            });

            // Force Sidebar Open (User Request: Default Open)
            setIsSidebarVisible(true);

            // AUTO-ZOOM: If accessing Anitaku (iframe), zoom in to crop sidebars automatically
            const isAnitakuSource = (episodesList && episodesList.length > 0) ||
                (streamUrl && (streamUrl.includes('hianime') || streamUrl.includes('anitaku')));

            if (isAnitakuSource) {
                setVideoScale(1.0); // Hardcoded: 100% Crop
                setVideoXOffset(0); // Hardcoded: 0 Pos
                setVideoYOffset(-100); // Hardcoded: -100 Top
            } else {
                setVideoScale(1);
                setVideoXOffset(0);
                setVideoYOffset(0); // Reset for others
            }

        } catch (error) {
            console.error("Play Error", error);
            showToast(`Failed to play: ${error.message}`, 'error');
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'home') {
            setSearchQuery('');
            setFilters({});
            setPage(1); // Reset page on tab change
        }
        if (playingAnime) {
            setIsPlayerMinimized(true);
        }
    };

    const handleAddSource = (source) => {
        const updatedExtensions = [...extensions, source];
        saveExtensions(updatedExtensions);
        showToast(`Added source: ${source.name}`, 'success');
    };

    const handleRemoveSource = (id) => {
        let updated = extensions.filter(ext => ext.id !== id);

        // Safety: Ensure valid state for 'source' types
        const remainingSources = updated.filter(e => e.type === 'source');
        if (remainingSources.length === 1) {
            const onlySourceId = remainingSources[0].id;
            updated = updated.map(e => e.id === onlySourceId ? { ...e, enabled: true } : e);
        }

        saveExtensions(updated);


        showToast('Source removed', 'success');
    };

    const handleUpdateSource = (updatedSource) => {
        const updated = extensions.map(ext => ext.id === updatedSource.id ? updatedSource : ext);
        saveExtensions(updated);
        setEditingExtension(null);
        showToast('Source updated', 'success');
    };

    const handleDirectPlay = (url) => {
        setSelectedAnime(null);
        setIsPlayerMinimized(false);
        setPlayingAnime({
            url: url,
            type: 'custom',
            title: 'Direct Stream',
            name: 'Direct Stream',
            synopsis: 'Directly streaming from: ' + url
        });
        setVideoScale(1); // Reset zoom on new play
    };

    const handleResetExtensions = () => {
        if (confirm('Are you sure you want to restore default extensions? Custom sources will be kept.')) {
            // Keep custom sources, but restore defaults if missing
            const customSources = extensions.filter(e => e.type === 'custom');

            const defaultAnilist = new AnilistSource();
            defaultAnilist.enabled = true; // Ensure it's enabled by default

            const defaultInstances = [defaultAnilist];
            const merged = [...defaultInstances, ...customSources];
            // Remove duplicates by ID
            const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());

            saveExtensions(unique);
            // setActiveProvider(defaultAnilist); // Removed: activeProvider is static
            showToast('Default extensions restored', 'success');
        }
    };

    const handleToggleExtension = (id) => {
        const target = extensions.find(e => e.id === id);
        if (!target) return;

        // Prevent disabling the last enabled source
        if (target.enabled && target.type === 'source') {
            const enabledSources = extensions.filter(e => e.type === 'source' && e.enabled);
            if (enabledSources.length <= 1) {
                showToast('Cannot disable the only source provider', 'error');
                return;
            }
        }

        setExtensions(extensions.map(ext => {
            if (ext.id === id) {
                return { ...ext, enabled: !ext.enabled };
            }
            return ext;
        }));
    };

    // Sort extensions alphabetically
    const sortedExtensions = [...extensions].sort((a, b) => a.name.localeCompare(b.name));

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        setPage(1); // Reset to page 1 on search
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            if (value === '' || value === 'Any') { // 'Any' for select dropdowns
                delete newFilters[key];
            } else {
                newFilters[key] = key === 'year' ? parseInt(value) : value;
            }
            return newFilters;
        });
        setPage(1); // Reset to page 1 on filter change
        setActiveTab('browse'); // Auto-switch to Browse if filtering from home
    };

    // --- Render ---

    // Render Content based on Tab
    const renderContent = () => {
        // Player logic moved to persistent overlay

        switch (activeTab) {
            case 'extensions':
                return (
                    <ExtensionsView
                        extensions={extensions}
                        onToggle={handleToggleExtension}
                        onAddSource={() => {
                            setEditingExtension(null); // Ensure add mode
                            setShowAddSource(true);
                        }}
                        onInstallExtension={handleAddSource}
                        onEditExtension={(ext) => {
                            setEditingExtension(ext);
                            setShowAddSource(true);
                        }}
                        onRemove={handleRemoveSource}
                        onReset={handleResetExtensions}
                    />
                );

            case 'browse':
                return (
                    <div className="p-4 sm:p-8 space-y-8 animate-fade-in">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">
                                    {searchQuery || Object.keys(filters).length > 0 ? 'Search Results' : 'Browse Anime'}
                                </h2>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-500 hidden sm:block">Source: {activeProvider.name}</span>
                                    <button
                                        onClick={() => setShowSourceMenu(!showSourceMenu)}
                                        className={`p-3 rounded-xl transition-colors ${showSourceMenu ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                                    >
                                        <Filter className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Advanced Filter Bar */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-fade-in-up">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder={`Search inside ${activeProvider.name}...`}
                                        value={searchQuery}
                                        onChange={handleSearch}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all border border-gray-700 hover:border-gray-600"
                                    />
                                </div>
                            </div>

                            {/* Advanced Filters Section */}
                            {showSourceMenu && (
                                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">

                                    {/* Content Rating */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Content</label>
                                        <select
                                            value={contentFilter}
                                            onChange={(e) => cycleContentFilter(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                        >
                                            <option value="ALL">All</option>
                                            <option value="SAFE">Safe</option>
                                            <option value="NSFW">NSFW</option>
                                        </select>
                                    </div>

                                    {/* Sort */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Sort</label>
                                        <select
                                            value={filters.sort || 'POPULARITY_DESC'}
                                            onChange={(e) => handleFilterChange('sort', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                        >
                                            <option value="POPULARITY_DESC">Most Popular</option>
                                            <option value="TRENDING_DESC">Trending</option>
                                            <option value="SCORE_DESC">Highest Rated</option>
                                            <option value="START_DATE_DESC">Newest</option>
                                        </select>
                                    </div>
                                    {/* Genres */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Genres</label>
                                        <select
                                            value={filters.genre || ''}
                                            onChange={(e) => handleFilterChange('genre', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                        >
                                            <option value="">Any</option>
                                            {['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mecha', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'].map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Year */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Year</label>
                                        <select
                                            value={filters.year || ''}
                                            onChange={(e) => handleFilterChange('year', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                        >
                                            <option value="">Any</option>
                                            {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Season */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Season</label>
                                        <select
                                            value={filters.season || ''}
                                            onChange={(e) => handleFilterChange('season', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                        >
                                            <option value="">Any</option>
                                            <option value="WINTER">Winter</option>
                                            <option value="SPRING">Spring</option>
                                            <option value="SUMMER">Summer</option>
                                            <option value="FALL">Fall</option>
                                        </select>
                                    </div>

                                    {/* Format */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Format</label>
                                        <select
                                            value={filters.format || ''}
                                            onChange={(e) => handleFilterChange('format', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                        >
                                            <option value="">Any</option>
                                            <option value="TV">TV Show</option>
                                            <option value="MOVIE">Movie</option>
                                            <option value="TV_SHORT">TV Short</option>
                                            <option value="OVA">OVA</option>
                                            <option value="ONA">ONA</option>
                                            <option value="SPECIAL">Special</option>
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                                        <select
                                            value={filters.status || ''}
                                            onChange={(e) => handleFilterChange('status', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                        >
                                            <option value="">Any</option>
                                            <option value="RELEASING">Airing</option>
                                            <option value="FINISHED">Finished</option>
                                            <option value="NOT_YET_RELEASED">Upcoming</option>
                                            <option value="CANCELLED">Cancelled</option>
                                            <option value="HIATUS">Hiatus</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                            {animeList.map(anime => (
                                <AnimeCard
                                    key={anime.id}
                                    anime={{ ...anime, title: sanitize(anime.title || anime.name) }}
                                    onClick={setSelectedAnime}
                                />
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {animeList.length > 0 && (
                            <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className={`px-4 py-2 rounded-lg border font-medium transition-colors ${page === 1
                                        ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'border-gray-700 text-gray-300 hover:text-white hover:border-gray-500'
                                        }`}
                                >
                                    Previous
                                </button>
                                <span className="text-gray-400 font-medium">Page {page} of {totalPages || '?'}</span>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={!hasNextPage}
                                    className={`px-4 py-2 rounded-lg border font-medium transition-colors ${!hasNextPage
                                        ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'border-gray-700 text-gray-300 hover:text-white hover:border-gray-500'
                                        }`}
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        {animeList.length === 0 && (
                            <div className="text-center py-20 text-gray-500">
                                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>No content found matching your search on {activeProvider.name}.</p>
                            </div>
                        )}
                    </div>
                );

            case 'favorites':
                return (
                    <div className="p-4 sm:p-8 animate-fade-in">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <Heart className="w-6 h-6 text-red-600 fill-current" />
                            Favorites
                        </h2>

                        {favorites.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                    <Heart className="w-8 h-8 text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No Favorites Yet</h3>
                                <p className="text-gray-400 max-w-sm">
                                    Click the "Add to List" button on any anime details to save it here.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                                {favorites.map(anime => (
                                    <AnimeCard
                                        key={anime.id}
                                        anime={{ ...anime, title: sanitize(anime.title || anime.name) }}
                                        onClick={setSelectedAnime}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'settings':
                return (
                    <div className="p-4 sm:p-8 animate-fade-in">
                        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
                        <div className="space-y-6 max-w-2xl">
                            {/* Hide Adult Content */}
                            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                                <h3 className="text-lg font-medium text-white mb-4">Content</h3>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-gray-200">Content Rating</span>
                                        <span className="text-xs text-gray-500">Filter content safety</span>
                                    </div>
                                    <select
                                        value={contentFilter}
                                        onChange={(e) => cycleContentFilter(e.target.value)}
                                        className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-1 text-sm"
                                    >
                                        <option value="ALL">All (Safe + NSFW)</option>
                                        <option value="SAFE">Safe (No NSFW)</option>
                                        <option value="NSFW">NSFW Only</option>
                                    </select>
                                </div>
                            </div>

                            {/* Appearance */}
                            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                                <h3 className="text-lg font-medium text-white mb-4">Appearance</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Theme</span>
                                    <select className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-1">
                                        <option>Dark (Default)</option>
                                        <option>Light</option>
                                    </select>
                                </div>
                            </div>

                            {/* About */}
                            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                                <h3 className="text-lg font-medium text-white mb-4">About</h3>
                                <p className="text-gray-400 text-sm">Mugen Play v0.1.0</p>
                                <p className="text-gray-500 text-xs mt-1">Powered by {activeProvider.name}</p>
                            </div>
                        </div>
                    </div>
                );

            case 'home':
            default:
                return (
                    <div className="p-4 sm:p-8 space-y-8 animate-fade-in">
                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex h-64 items-center justify-center">
                                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}

                        {!isLoading && (
                            <>
                                {/* Hero Section */}
                                {trendingList.length > 0 && !searchQuery && (() => {
                                    const featured = trendingList[featuredIndex];
                                    if (!featured) return null;
                                    return (
                                        <div className="relative h-[400px] sm:h-[500px] rounded-3xl overflow-hidden group mb-8">
                                            <img
                                                key={featured.id} // Key change triggers animation if CSS configured
                                                src={featured.bannerUrl}
                                                alt={featured.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 animate-fade-in"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent">
                                                <div className="absolute bottom-0 left-0 p-8 sm:p-12 w-full sm:w-2/3 space-y-4 animate-slide-up">
                                                    <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                                                        Trending #{featuredIndex + 1}
                                                    </span>
                                                    <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight">
                                                        {sanitize(featured.title)}
                                                    </h1>
                                                    <p className="text-gray-200 line-clamp-2 text-lg">
                                                        {sanitize(featured.synopsis)}
                                                    </p>
                                                    <div className="flex gap-4 pt-4">
                                                        <button
                                                            onClick={() => handlePlay(featured)}
                                                            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 transition-transform hover:scale-105"
                                                        >
                                                            <Play className="w-5 h-5 fill-current" />
                                                            Watch Now
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedAnime(featured)}
                                                            className="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-xl transition-colors border border-white/10"
                                                        >
                                                            More Info
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Carousel Indicators */}
                                                <div className="absolute bottom-8 right-8 flex gap-2">
                                                    {trendingList.slice(0, 5).map((_, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === featuredIndex ? 'w-8 bg-red-600' : 'w-2 bg-white/30'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Scrollable Lists */}
                                <HorizontalScrollList
                                    title="Continue Watching"
                                    icon={Play}
                                    items={watchHistory}
                                    onItemClick={(anime) => setSelectedAnime(anime)}
                                    renderItem={(anime) => (
                                        <div className="min-w-[200px] w-[200px] flex-shrink-0 cursor-pointer group relative">
                                            <div
                                                className="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative"
                                                onClick={() => setSelectedAnime(anime)}
                                            >
                                                <img
                                                    src={anime.coverUrl || anime.image}
                                                    alt={anime.title}
                                                    className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Play className="w-10 h-10 text-white fill-white" />
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                                                    <div className="h-full bg-red-600 w-1/2"></div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <h3 className="text-sm font-medium text-white truncate">{anime.title.romaji || anime.title}</h3>
                                                    <p className="text-xs text-gray-500">{anime.episodes ? `${anime.episodes} Episodes` : 'TV Series'}</p>
                                                </div>
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveHistoryMenu(activeHistoryMenu === anime.id ? null : anime.id);
                                                        }}
                                                        className="p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {activeHistoryMenu === anime.id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10 cursor-default"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveHistoryMenu(null);
                                                                }}
                                                            />
                                                            <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeFromHistory(anime.id);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                />

                                <HorizontalScrollList
                                    title="Trending"
                                    items={trendingList}
                                    onItemClick={(anime) => setSelectedAnime(anime)}
                                    renderItem={(anime) => (
                                        <div className="min-w-[160px] w-[160px] flex-shrink-0 cursor-pointer group relative">
                                            <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative">
                                                <img
                                                    src={anime.coverUrl || anime.image}
                                                    alt={anime.title}
                                                    className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Play className="w-8 h-8 text-white fill-white" />
                                                </div>
                                            </div>
                                            <h3 className="text-sm font-medium text-white truncate">{anime.title.romaji || anime.title}</h3>
                                        </div>
                                    )}
                                />

                                {/* Popular Grid */}
                                <div>
                                    <div className="flex flex-col gap-4 mb-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                                Popular Anime
                                            </h2>

                                            <div className="flex gap-2">
                                                <select
                                                    value={contentFilter}
                                                    onChange={(e) => cycleContentFilter(e.target.value)}
                                                    className="bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-600 hidden sm:block"
                                                >
                                                    <option value="ALL">All</option>
                                                    <option value="SAFE">Safe</option>
                                                    <option value="NSFW">NSFW</option>
                                                </select>
                                                {/* Random Anime Button */}
                                                {/* Random Anime Button */}
                                                <button
                                                    onClick={() => {
                                                        const pool = animeList.length > 0 ? animeList : (trendingList.length > 0 ? trendingList : []);
                                                        if (pool.length > 0) {
                                                            const random = pool[Math.floor(Math.random() * pool.length)];
                                                            handlePlay(random);
                                                        } else {
                                                            showToast("No anime available to randomize", "error");
                                                        }
                                                    }}
                                                    className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl transition-colors"
                                                    title="Watch Random Anime"
                                                >
                                                    <Shuffle className="w-5 h-5" />
                                                </button>

                                                <button
                                                    onClick={() => setShowSourceMenu(!showSourceMenu)}
                                                    className={`p-3 rounded-xl transition-colors ${showSourceMenu ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                                                >
                                                    <Filter className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Advanced Filter Bar */}
                                        {showSourceMenu && (
                                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">

                                                {/* Genres */}
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Genres</label>
                                                    <select
                                                        value={filters.genre || ''}
                                                        onChange={(e) => handleFilterChange('genre', e.target.value)}
                                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                                    >
                                                        <option value="">Any</option>
                                                        {['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mecha', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'].map(g => (
                                                            <option key={g} value={g}>{g}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Year */}
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Year</label>
                                                    <select
                                                        value={filters.year || ''}
                                                        onChange={(e) => handleFilterChange('year', e.target.value)}
                                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                                    >
                                                        <option value="">Any</option>
                                                        {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                                            <option key={y} value={y}>{y}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Season */}
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Season</label>
                                                    <select
                                                        value={filters.season || ''}
                                                        onChange={(e) => handleFilterChange('season', e.target.value)}
                                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                                    >
                                                        <option value="">Any</option>
                                                        <option value="WINTER">Winter</option>
                                                        <option value="SPRING">Spring</option>
                                                        <option value="SUMMER">Summer</option>
                                                        <option value="FALL">Fall</option>
                                                    </select>
                                                </div>

                                                {/* Format */}
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Format</label>
                                                    <select
                                                        value={filters.format || ''}
                                                        onChange={(e) => handleFilterChange('format', e.target.value)}
                                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                                    >
                                                        <option value="">Any</option>
                                                        <option value="TV">TV Show</option>
                                                        <option value="MOVIE">Movie</option>
                                                        <option value="TV_SHORT">TV Short</option>
                                                        <option value="OVA">OVA</option>
                                                        <option value="ONA">ONA</option>
                                                        <option value="SPECIAL">Special</option>
                                                    </select>
                                                </div>

                                                {/* Status */}
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                                                    <select
                                                        value={filters.status || ''}
                                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                                    >
                                                        <option value="">Any</option>
                                                        <option value="RELEASING">Airing</option>
                                                        <option value="FINISHED">Finished</option>
                                                        <option value="NOT_YET_RELEASED">Upcoming</option>
                                                        <option value="CANCELLED">Cancelled</option>
                                                        <option value="HIATUS">Hiatus</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                                        {animeList.map(anime => (
                                            <AnimeCard
                                                key={anime.id}
                                                anime={{ ...anime, title: sanitize(anime.title || anime.name) }}
                                                onClick={setSelectedAnime}
                                            />
                                        ))}
                                    </div>

                                    {/* Pagination Controls */}
                                    {animeList.length > 0 && (
                                        <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className={`px-4 py-2 rounded-lg border font-medium transition-colors ${page === 1
                                                    ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                                                    : 'border-gray-700 text-gray-300 hover:text-white hover:border-gray-500'
                                                    }`}
                                            >
                                                Previous
                                            </button>
                                            <span className="text-gray-400 font-medium">Page {page} of {totalPages || '?'}</span>
                                            <button
                                                onClick={() => setPage(p => p + 1)}
                                                disabled={!hasNextPage}
                                                className={`px-4 py-2 rounded-lg border font-medium transition-colors ${!hasNextPage
                                                    ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                                                    : 'border-gray-700 text-gray-300 hover:text-white hover:border-gray-500'
                                                    }`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}

                                    {animeList.length === 0 && (
                                        <div className="text-center py-20 text-gray-500">
                                            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p>No content found matching your search on {activeProvider.name}.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Link to Browse if content is missing or just as a footer */}
                                <div className="text-center py-8">
                                    <button
                                        onClick={() => setActiveTab('browse')}
                                        className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mx-auto"
                                    >
                                        <Compass className="w-5 h-5" />
                                        <span>Explore Full Catalog</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-red-500/30">
            <Sidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
                onOpenDirectPlay={() => setShowDirectPlay(true)}

                width={sidebarWidth}
                setWidth={setSidebarWidth}
                collapsed={isSidebarCollapsed}
                setCollapsed={setIsSidebarCollapsed}
            />

            <main
                className="min-h-screen pb-20 lg:pb-0 relative"
                style={{ marginLeft: window.innerWidth >= 1024 ? (isSidebarCollapsed ? 80 : sidebarWidth) : 0 }}
            >
                {renderContent()}

                {/* Unified Persistent Player Overlay */}
                {playingAnime && (
                    <div className={`fixed z-50 bg-[#0a0a0a] text-white flex flex-col font-sans transition-all duration-300 shadow-2xl overflow-hidden ${isPlayerMinimized ? 'bottom-4 right-4 w-80 h-48 rounded-lg border border-gray-700' : 'inset-0'}`}>
                        {/* Top Navigation Bar (Full Screen Only) */}
                        {!isPlayerMinimized && (
                            <div className="h-14 flex items-center justify-between px-4 bg-black/60 backdrop-blur-md border-b border-white/5 z-20">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setIsPlayerMinimized(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                                        <Minimize2 size={20} />
                                    </button>
                                    <h2 className="font-semibold text-sm sm:text-base truncate max-w-md cursor-default">{playingAnime.title}</h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setPlayingAnime(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white hover:text-red-500" title="Close Player">
                                        <X size={20} />
                                    </button>
                                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                                    <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className={`p-2 rounded-full transition-colors ${isSidebarVisible ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-gray-400'}`} title="Toggle Sidebar">
                                        <PanelRight size={20} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 flex overflow-hidden">
                            {/* Player Column */}
                            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative transition-all duration-300">
                                <div className={`w-full bg-black relative shadow-2xl z-100 ${isPlayerMinimized ? 'h-full' : 'max-w-[100vh] mx-auto ring-1 ring-white/10'}`}>
                                    <VideoPlayer
                                        src={playingAnime.url || playingAnime.streamUrl || playingAnime.source}
                                        poster={playingAnime.bannerUrl || playingAnime.coverUrl}
                                        title={playingAnime.title}
                                        isMinimized={isPlayerMinimized}
                                        scale={videoScale}
                                        xOffset={videoXOffset}
                                        yOffset={videoYOffset}
                                        onToggleMinimize={() => setIsPlayerMinimized(true)}
                                        onClose={() => setPlayingAnime(null)}
                                    />
                                    {/* Mini Overlay Controls */}
                                    {isPlayerMinimized && (
                                        <div className="absolute top-0 left-0 right-0 p-2 flex justify-end gap-2 bg-gradient-to-b from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                                            <button onClick={() => setIsPlayerMinimized(false)} className="p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm"><Maximize2 size={16} /></button>
                                            <button onClick={() => setPlayingAnime(null)} className="p-1.5 bg-red-600/80 hover:bg-red-700 rounded-full text-white backdrop-blur-sm"><X size={16} /></button>
                                        </div>
                                    )}
                                </div>

                                {/* Details (Full Screen Only) */}
                                {!isPlayerMinimized && (
                                    <div className="p-6 sm:p-8 max-w-5xl space-y-6 mt-6">
                                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                                            <img src={playingAnime.coverUrl} alt="Cover" className="w-24 sm:w-32 rounded-lg shadow-lg hidden sm:block" />
                                            <div className="flex-1 space-y-3">
                                                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{playingAnime.title}</h1>
                                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                                                    <span className="flex items-center gap-1 text-yellow-500 font-medium"><Star size={14} fill="currentColor" /> {playingAnime.rating || 'N/A'}</span>
                                                    <span>•</span><span>{playingAnime.year}</span><span>•</span><span>{playingAnime.episodes} Episodes</span>
                                                    <div className="flex gap-2 ml-2">{playingAnime.genres?.slice(0, 3).map(g => <span key={g} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs">{g}</span>)}</div>
                                                </div>
                                                <p className="text-gray-300 text-sm leading-relaxed max-w-4xl">{playingAnime.synopsis}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar (Full Screen Only) */}
                            {!isPlayerMinimized && playingAnime.format !== 'MOVIE' && (
                                <div className={`${isSidebarVisible ? 'w-80 lg:w-96 translate-x-0' : 'w-0 translate-x-full hidden'} bg-[#111] border-l border-white/5 flex flex-col transition-all duration-300 ease-in-out z-20`}>
                                    <div className="p-4 border-b border-white/5 bg-[#111] z-10 sticky top-0 flex justify-between items-center whitespace-nowrap overflow-hidden">
                                        <h3 className="font-bold text-gray-200">Episodes</h3>
                                        <span className="text-xs text-gray-500">{playingAnime.episodesList?.length || playingAnime.episodes || '?'} Total</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                        {((playingAnime.episodesList?.length > 0 && playingAnime.episodesList) || Array.from({ length: playingAnime.episodes || 12 })).map((ep, idx) => {
                                            const epNum = ep?.number || idx + 1;
                                            const isCurrent = (playingAnime.url || '').includes(`ep-${epNum}`) || (playingAnime.url || '').includes(`episode-${epNum}`);
                                            return (
                                                <button key={epNum} onClick={() => handlePlay(playingAnime, epNum)} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all group ${isCurrent ? 'bg-red-600 text-white' : 'hover:bg-white/5 text-gray-400'}`}>
                                                    <div className="relative shrink-0 w-24 h-16 bg-black/40 rounded overflow-hidden border border-white/5">
                                                        <img src={playingAnime.bannerUrl} className={`w-full h-full object-cover transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} alt="" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Play size={16} fill="currentColor" className={isCurrent ? 'text-white' : 'text-white/50'} /></div>
                                                    </div>
                                                    <div className="text-left flex-1 min-w-0">
                                                        <div className="font-medium truncate text-sm">Episode {epNum}</div>
                                                        <div className="text-xs opacity-60 truncate">{ep?.title || (playingAnime.title ? playingAnime.title.split(' - Episode')[0] : '')}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Modals & Overlays */}
            <AnimeDetailModal
                anime={selectedAnime}
                onClose={() => setSelectedAnime(null)}
                onPlay={handlePlay}
                isFavorite={selectedAnime && favorites.some(f => f.id === selectedAnime.id)}
                onToggleFavorite={toggleFavorite}
            />

            <AddSourceModal
                isOpen={showAddSource}
                onClose={() => {
                    setShowAddSource(false);
                    setEditingExtension(null);
                }}
                onAdd={handleAddSource}
                onEdit={handleUpdateSource}
                initialData={editingExtension}
            />

            <DirectPlayModal
                isOpen={showDirectPlay}
                onClose={() => setShowDirectPlay(false)}
                onPlay={handleDirectPlay}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

export default App;
