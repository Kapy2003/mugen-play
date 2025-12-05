import { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import AnimeCard from './components/anime/AnimeCard';
import AnimeDetailModal from './components/anime/AnimeDetailModal';
import VideoPlayer from './components/player/VideoPlayer';
import ExtensionsView from './components/extensions/ExtensionsView';
import AddSourceModal from './components/extensions/AddSourceModal';
import Toast from './components/common/Toast';
import { INITIAL_EXTENSIONS } from './data/constants';
import { Search, Filter, Play, Maximize2, Minimize2, X, Compass, Shuffle } from 'lucide-react';
import { AnilistSource } from './extensions/AnilistSource';
import HorizontalScrollList from './components/common/HorizontalScrollList';

function App() {
    // --- State ---
    const [activeTab, setActiveTab] = useState('home');
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Provider State
    const [extensions, setExtensions] = useState(() => {
        const saved = localStorage.getItem('mugen_extensions');
        let parsed = saved ? JSON.parse(saved) : []; // Default to empty array if parse fails

        // Ensure parsed is an array
        if (!Array.isArray(parsed)) parsed = [];

        // Merge missing initial extensions (e.g. built-in sources)
        // We want to force-add built-ins if they are missing by ID
        const existingIds = new Set(parsed.map(e => e.id));
        INITIAL_EXTENSIONS.forEach(initExt => {
            if (!existingIds.has(initExt.id)) {
                parsed.push(initExt);
            }
        });

        // Filter out deprecated sources (e.g. Mugen Local if removed)
        parsed = parsed.filter(e => e.id !== 'local_source' && e.id !== 'local' && e.id !== 'animekai' && e.id !== 'hianime');

        // Safety: If only 1 'source' (DB) extension exists, force it to be enabled.
        // This ensures we always have a metadata provider.
        const sources = parsed.filter(e => e.type === 'source');
        if (sources.length === 1) {
            const onlySource = sources[0];
            // Find it in the main array and enable it
            parsed = parsed.map(e => e.id === onlySource.id ? { ...e, enabled: true } : e);
        }

        return parsed;
    });

    // Initialize active provider - STRICTLY ANILIST
    const [activeProvider] = useState(() => new AnilistSource());

    // Content State
    const [animeList, setAnimeList] = useState([]);
    const [trendingList, setTrendingList] = useState([]); // New state for Trending section
    const [featuredAnime, setFeaturedAnime] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // UI State
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [playingAnime, setPlayingAnime] = useState(null);
    const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);
    const [showAddSource, setShowAddSource] = useState(false);
    const [toast, setToast] = useState(null);
    const [showSourceMenu, setShowSourceMenu] = useState(false);
    const [filters, setFilters] = useState({});
    // History State
    const [watchHistory, setWatchHistory] = useState(() => {
        const saved = localStorage.getItem('mugen_watch_history');
        return saved ? JSON.parse(saved) : [];
    });

    // Settings State
    const [hideAdultContent, setHideAdultContent] = useState(() => {
        return localStorage.getItem('mugen_hide_adult_content') === 'true';
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

    // Load Content when Provider, Search, or Filters change
    useEffect(() => {
        const loadContent = async () => {
            setIsLoading(true);
            try {
                if (searchQuery || Object.keys(filters).length > 0) {
                    // Check if provider supports filters, otherwise just search
                    const effectiveFilters = { ...filters };
                    if (hideAdultContent) {
                        effectiveFilters.isAdult = false;
                    }

                    const results = await activeProvider.search(searchQuery, effectiveFilters);
                    setAnimeList(results);
                    setFeaturedAnime(null);
                } else {
                    // Default / Home View
                    const trending = await activeProvider.getTrending();
                    const catalog = await activeProvider.search('');

                    setAnimeList(catalog);
                    setTrendingList(trending); // Save trending list for display

                    // Pick a random trending or catalog item as featured
                    if (trending.length > 0) {
                        setFeaturedAnime(trending[0]);
                    } else if (catalog.length > 0) {
                        setFeaturedAnime(catalog[Math.floor(Math.random() * catalog.length)]);
                    }
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
    }, [activeProvider, searchQuery, filters, hideAdultContent]); // Removed extensions dependency to prevent loop
    // --- Handlers ---
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const addToHistory = (anime) => {
        setWatchHistory(prev => {
            // Remove existing entry for this anime if present (to bump to top)
            const filtered = prev.filter(item => item.id !== anime.id);
            // Add to front, cap at 10
            const newHistory = [anime, ...filtered].slice(0, 10);
            localStorage.setItem('mugen_watch_history', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    // Helper to save extensions to localStorage
    const saveExtensions = (updatedExtensions) => {
        localStorage.setItem('mugen_extensions', JSON.stringify(updatedExtensions));
        setExtensions(updatedExtensions);
    };

    // Toggle Adult Content Filter
    const toggleAdultFilter = () => {
        const newValue = !hideAdultContent;
        setHideAdultContent(newValue);
        localStorage.setItem('mugen_hide_adult_content', newValue.toString());
        showToast(`Adult Content ${newValue ? 'Hidden' : 'Visible'}`, 'success');
    };

    // Helper to sanitize text (Simplified or removed if no longer strictly needed for obscenity, 
    // but useful for generic HTML stripping which is handled in Source. Kept simple or removed.)
    // User requested specifically to "Hide Adult Content", implying filtering items, not just text.
    // I will remove the text sanitizer to clean up, or keep it as identity function if used elsewhere.
    // The previous implementation was used in render. I'll replace usages with direct access or identity.
    const sanitize = (text) => text; // Identity function to avoid breaking existing calls

    const handlePlay = async (anime) => {
        try {
            setSelectedAnime(null);
            setIsPlayerMinimized(false); // Start normal size (but "short"/constrained width)
            addToHistory(anime); // Add to history

            // If it's a portal/external extension (from our previous step), handle it:
            if (anime.url && anime.type === 'custom') {
                setPlayingAnime({
                    ...anime,
                    title: sanitize(anime.title),
                    name: sanitize(anime.name),
                    synopsis: sanitize(anime.synopsis)
                });
                return;
            }

            // Standard Anime Source logic
            const streamUrl = await activeProvider.getStream(anime);
            setPlayingAnime({
                ...anime,
                streamUrl,
                title: sanitize(anime.title),
                name: sanitize(anime.name),
                synopsis: sanitize(anime.synopsis)
            });
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
            setActiveProvider(defaultAnilist); // Reset to Anilist
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





    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters };
        if (value === '') {
            delete newFilters[key];
        } else {
            newFilters[key] = value;
            if (key === 'year') newFilters[key] = parseInt(value); // Parse year
        }
        setFilters(newFilters);
        setActiveTab('browse'); // Auto-switch to Browse
    };

    // --- Render ---

    // Render Content based on Tab
    const renderContent = () => {
        if (playingAnime && !isPlayerMinimized) {
            const targetUrl = playingAnime.url || playingAnime.streamUrl || playingAnime.source;
            return (
                <div className="p-4 sm:p-8 animate-fade-in">
                    <button
                        onClick={() => setPlayingAnime(null)}
                        className="mb-4 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                    >
                        &larr; Back to Browse
                    </button>
                    <h2 className="text-2xl font-bold text-white mb-4">{playingAnime.title || playingAnime.name}</h2>
                    {/* Constrain width to "shorten" the player until full screen */}
                    <div className="max-w-3xl mx-auto">
                        <div className="w-full h-full relative group">
                            <VideoPlayer
                                src={targetUrl}
                                title={playingAnime.title || playingAnime.name}
                            />
                        </div>
                        <div className="mt-6 p-6 bg-gray-900 rounded-xl border border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-2">
                                {playingAnime.url ? 'Portal Mode' : 'Now Playing'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                <span>Provider: {activeProvider.name}</span>
                            </div>
                            <p className="text-gray-400">
                                {playingAnime.synopsis || "Enjoy the functionality of Mugen Play with your choice of content provider."}
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        switch (activeTab) {
            case 'extensions':
                return (
                    <ExtensionsView
                        extensions={extensions}
                        onToggle={handleToggleExtension}
                        onAddSource={() => setShowAddSource(true)}
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
                    <div className="p-4 sm:p-8 animate-fade-in flex flex-col items-center justify-center h-full text-center py-20">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <Play className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Favorites</h2>
                        <p className="text-gray-400 max-w-sm">
                            Save your favorite anime here to access them quickly. Feature coming soon.
                        </p>
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
                                        <span className="text-gray-200">Hide Adult Content</span>
                                        <span className="text-xs text-gray-500">Filter out 18+ content from search results</span>
                                    </div>
                                    <button
                                        onClick={toggleAdultFilter}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${hideAdultContent ? 'bg-red-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${hideAdultContent ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
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
                                {featuredAnime && !searchQuery && (
                                    <div className="relative h-[400px] sm:h-[500px] rounded-3xl overflow-hidden group mb-8">
                                        <img
                                            src={featuredAnime.bannerUrl}
                                            alt={featuredAnime.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent">
                                            <div className="absolute bottom-0 left-0 p-8 sm:p-12 w-full sm:w-2/3 space-y-4">
                                                <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                                                    Trending on {activeProvider.name}
                                                </span>
                                                <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight">
                                                    {sanitize(featuredAnime.title)}
                                                </h1>
                                                <p className="text-gray-200 line-clamp-2 text-lg">
                                                    {sanitize(featuredAnime.synopsis)}
                                                </p>
                                                <div className="flex gap-4 pt-4">
                                                    <button
                                                        onClick={() => handlePlay(featuredAnime)}
                                                        className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 transition-transform hover:scale-105"
                                                    >
                                                        <Play className="w-5 h-5 fill-current" />
                                                        Watch Now
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedAnime(featuredAnime)}
                                                        className="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-xl transition-colors border border-white/10"
                                                    >
                                                        More Info
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Scrollable Lists */}
                                <HorizontalScrollList
                                    title="Continue Watching"
                                    icon={Play}
                                    items={watchHistory}
                                    onItemClick={(anime) => setSelectedAnime(anime)}
                                    renderItem={(anime) => (
                                        <div className="min-w-[200px] w-[200px] flex-shrink-0 cursor-pointer group relative">
                                            <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative">
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
                                            <h3 className="text-sm font-medium text-white truncate">{anime.title.romaji || anime.title}</h3>
                                            <p className="text-xs text-gray-500">{anime.episodes ? `${anime.episodes} Episodes` : 'TV Series'}</p>
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
                                                {/* Random Anime Button */}
                                                <button
                                                    onClick={() => {
                                                        const pool = animeList.length > 0 ? animeList : (featuredAnime ? [featuredAnime] : []);
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
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                                        {animeList.map(anime => (
                                            <AnimeCard
                                                key={anime.id}
                                                anime={{ ...anime, title: sanitize(anime.title || anime.name) }}
                                                onClick={setSelectedAnime}
                                            />
                                        ))}
                                    </div>

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
            />

            <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0 relative">
                {renderContent()}

                {/* Persistent Player Overlay */}
                {playingAnime && (
                    <div
                        className={`
                            fixed z-50 transition-all duration-300 shadow-2xl overflow-hidden bg-black
                            ${isPlayerMinimized
                                ? 'bottom-20 right-4 w-80 h-48 rounded-lg border border-gray-700'
                                : 'inset-0 lg:ml-64'
                            }
                        `}
                    >
                        {/* Player Header / Controls (Only visible in full screen mode usually, or we add custom controls) */}
                        <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start pointer-events-none">
                            {/* Back Button (Full Screen) */}
                            {!isPlayerMinimized && (
                                <button
                                    onClick={() => setIsPlayerMinimized(true)}
                                    className="pointer-events-auto bg-black/50 hover:bg-black/70 p-2 rounded-full text-white backdrop-blur-sm transition-colors"
                                    title="Minimize"
                                >
                                    <Minimize2 className="w-5 h-5" />
                                </button>
                            )}

                            {/* Close / Expand Controls */}
                            <div className="flex gap-2 ml-auto pointer-events-auto">
                                {isPlayerMinimized && (
                                    <button
                                        onClick={() => setIsPlayerMinimized(false)}
                                        className="bg-black/50 hover:bg-black/70 p-1.5 rounded-full text-white backdrop-blur-sm transition-colors"
                                        title="Expand"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setPlayingAnime(null)}
                                    className="bg-red-600/80 hover:bg-red-700 p-1.5 rounded-full text-white backdrop-blur-sm transition-colors"
                                    title="Close Player"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Player Content */}
                        <div className="w-full h-full relative group">
                            <VideoPlayer
                                src={playingAnime.url || playingAnime.streamUrl || playingAnime.source}
                                title={playingAnime.title || playingAnime.name}
                            />

                            {/* Additional Info (Full Screen Only) */}
                            {!isPlayerMinimized && (
                                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="max-w-4xl">
                                        <h2 className="text-2xl font-bold text-white mb-2">{playingAnime.title}</h2>
                                        <p className="text-gray-300 line-clamp-2">{playingAnime.synopsis}</p>
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
            />

            <AddSourceModal
                isOpen={showAddSource}
                onClose={() => setShowAddSource(false)}
                onAdd={handleAddSource}
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
