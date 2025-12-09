import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/layout/Sidebar';
import AnimeCard from './components/anime/AnimeCard';
import AnimeDetailModal from './components/anime/AnimeDetailModal';
import VideoPlayer from './components/player/VideoPlayer';
import ExtensionsView from './components/extensions/ExtensionsView';
import AddSourceModal from './components/extensions/AddSourceModal';
import DirectPlayModal from './components/player/DirectPlayModal';
import Toast from './components/common/Toast';
import { ANIME_CATALOG, INITIAL_EXTENSIONS, VIDEO_SOURCES, ANIME_SLUG_OVERRIDES } from './data/constants';
import { Search, Home, Play, Info, ChevronLeft, ChevronRight, X, Maximize2, Minimize2, PanelRight, Settings2, MoreVertical, Trash2, Filter, Compass, Shuffle, Star, Heart } from 'lucide-react';
import { AnilistSource } from './extensions/AnilistSource';
import HeroCarousel from './components/home/HeroCarousel';
import HorizontalScrollList from './components/common/HorizontalScrollList';
import { AnimeLibHiLive } from './lib/anime-lib';
import LocalSource from './lib/LocalSource';
import SourceSelector from './components/common/SourceSelector';

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

    // Cache for Home Data (Page 1) to prevent refresh
    const homeCache = useRef({ results: [], trending: [], timestamp: 0 });

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

    const [playbackSource, setPlaybackSource] = useState('local'); // 'local' | 'web'
    const [currentEpisodePage, setCurrentEpisodePage] = useState(1); // Pagination

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

                    // Check Cache for Page 1 ("Home")
                    const isDefaultHome = Object.keys(filters).length === 0 && !searchQuery && page === 1 && contentFilter !== 'NSFW'; // NSFW might need separate cache, but for now assuming main home

                    if (isDefaultHome && homeCache.current.results.length > 0 && (Date.now() - homeCache.current.timestamp < 300000)) { // 5 min cache
                        // Use Cache
                        setAnimeList(homeCache.current.results);
                        setTrendingList(homeCache.current.trending);
                        setHasNextPage(true);
                        setTotalPages(100); // Dummy or stored?
                        setIsLoading(false);
                        return;
                    }

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

                    // Update Cache if this was the default home view
                    if (isDefaultHome) {
                        homeCache.current = {
                            results: catalogData.results,
                            trending: trendingData.results,
                            timestamp: Date.now()
                        };
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

    // --- History & Progress Logic ---
    const addToHistory = (anime, episode = null, progress = 0, duration = 0) => {
        console.log("addToHistory called for:", anime?.title, "Ep:", episode); // DEBUG log
        if (!anime || !anime.id) {
            console.error("Invalid anime object passed to addToHistory", anime);
            return;
        }

        setWatchHistory(prev => {
            const existing = prev.find(i => i.id === anime.id);
            const newItem = {
                ...anime,
                lastEpisode: episode || (existing ? existing.lastEpisode : 1),
                progress: progress,
                duration: duration,
                lastWatchedAt: Date.now()
            };

            // Filter out invalid items just in case
            const validHistory = prev.filter(i => i && i.id && i.id !== anime.id);

            const newHistory = [newItem, ...validHistory].slice(0, 50);
            console.log("Saving new history:", newHistory); // DEBUG log
            localStorage.setItem('mugen_watch_history', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const handleProgress = (currentTime, duration) => {
        // Throttle updates? For now, we update state every few seconds or on significant change?
        // Actually, updating state on every frame is bad.
        // We should debounce this or only save on unmount/pause?
        // Simple approach: Use a ref for current session progress and save to DB/Local periodically.
        // For simplicity in this React state model without Refs complexity:
        // We'll trust the user interaction updates mostly, but for "resume", we need periodic save.
        // We will just update a Ref, and save to LocalStorage every 5 seconds or on Pause/End.
    };

    // Ref to track current playback for efficient updates
    const playbackRef = useRef({ id: null, episode: null, progress: 0, duration: 0 });

    const reportProgress = (currentTime, duration) => {
        if (!playingAnime) return;

        // Update Ref
        playbackRef.current = {
            id: selectedAnime?.id || playingAnime?.id, // Fallback
            episode: selectedAnime?.episodes?.find(e => e.url === playingAnime.url)?.number || playingAnime.episodeNumber,
            progress: currentTime,
            duration: duration
        };

        // Persist to localStorage throttled (e.g. every 5 seconds)
        const now = Date.now();
        if (now - lastSaveTime.current > 5000) {
            saveProgress();
            lastSaveTime.current = now;
        }
    };

    const lastSaveTime = useRef(0);
    const saveProgress = () => {
        const current = playbackRef.current;
        if (!current.id) return;

        // Find current anime object to save fully
        // This is a bit tricky because 'playingAnime' might just be the stream dict.
        // We rely on 'selectedAnime' being the context.
        if (selectedAnime && selectedAnime.id === current.id) {
            addToHistory(selectedAnime, current.episode, current.progress, current.duration);
        }
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

    const handlePlay = async (anime, episodeNumber = null, overrideSource = null) => {
        try {
            // Determines effective source: override > state > default
            const effectiveSource = overrideSource || playbackSource;
            // If we are switching sources via override, update the state
            if (overrideSource) {
                setPlaybackSource(overrideSource);
            }

            // --- 1. Basic UI Setup ---
            setSelectedAnime(null);
            setIsPlayerMinimized(false);
            setIsSidebarVisible(true);
            // --- 2. Resolve Episode ---
            // If no episode provided (e.g. clicking "Watch Now" or History), try to find last watched
            let targetEpisodeNumber = episodeNumber;
            let initialTime = 0;

            if (!targetEpisodeNumber) {
                // Check History
                const historyItem = watchHistory.find(i => i.id === anime.id);
                if (historyItem) {
                    targetEpisodeNumber = historyItem.lastEpisode;
                    // Resume time only if it's correct episode
                    // Actually, if we are auto-resuming, we probably want the time too.
                    initialTime = historyItem.progress || 0;
                } else {
                    targetEpisodeNumber = 1;
                }
            } else {
                // Explicit episode click.
                // If we clicked the SAME episode as history, maybe we resume?
                // Usually users want to restart if they click it explicitly, OR we ask.
                // For seamlessness: If it's the saved episode, resume.
                const historyItem = watchHistory.find(i => i.id === anime.id);
                if (historyItem && historyItem.lastEpisode === targetEpisodeNumber) {
                    initialTime = historyItem.progress || 0;
                    // If progress is near end (> 95%), restart
                    if (historyItem.duration && initialTime > historyItem.duration * 0.95) {
                        initialTime = 0;
                    }
                }
            }

            // Record initial history entry immediately
            addToHistory(anime, targetEpisodeNumber, initialTime, 0);

            // Calculate Pagination Page immediately if episode is provided
            if (targetEpisodeNumber) {
                const newPage = Math.ceil(targetEpisodeNumber / 12);
                setCurrentEpisodePage(newPage);
            } else {
                setCurrentEpisodePage(1); // Default to page 1
            }

            // --- PREPARE DATA OBJECT ---
            // We need to persist IDs for both sources so we don't lose them when switching
            // structure: { ...anime, localId: '...', webId: '...' }
            let updatedAnime = { ...anime };

            // Clean Title for Searching
            const baseTitle = (anime.title.english || anime.title.romaji || anime.title || '').split(' - Episode')[0].trim();
            const cleanTitle = baseTitle;

            let streamUrl = null;
            let episodesList = [];
            let resolvedId = null; // The ID for the current source

            // --- SOURCE HANDLING ---

            // 0. Check for "Custom Source" extensions (Legacy/User configured)
            // If user has a custom extension enabled, we should respect it or at least check it if playbackSource is "web" or "custom"
            // For simplicity, if we are in 'web' mode, we check if there are extensions that handle this.
            // OR if the user manually selected an extension via SourceSelector (which we need to populate)

            // To support "without extensions install", we keep the default Hianime Scraper logic in the 'else' block.

            if (effectiveSource === 'local') {
                // --- LOCAL SOURCE LOGIC ---

                // 1. Try to find ID: existing localId > anime.id (if typical slug) > Search
                // Note: user's anime.id might be from AniList (int) or scraped (string). 
                // LocalSource expects a string slug.
                let targetId = updatedAnime.localId || updatedAnime.id;

                // If ID is numeric (AniList), we CANNOT use it for LocalSource lookup directly usually,
                // unless we have a specific map. We'll try search if it looks numeric or if getEpisodes fails.
                const isNumeric = /^\d+$/.test(targetId);

                if (isNumeric) {
                    // Try searching by title
                    const searchResults = LocalSource.search(cleanTitle);
                    if (searchResults.length > 0) {
                        targetId = searchResults[0].id;
                        updatedAnime.localId = targetId; // Persist found ID
                    }
                }

                // Attempt to fetch episodes
                episodesList = LocalSource.getEpisodes(targetId);

                // If no episodes found with ID, try fuzzy search by Title as fallback
                // REVISED: Always try search if direct lookup failed, regardless of ID format.
                if (!episodesList || episodesList.length === 0) {
                    console.log(`[LocalSource] Direct lookup failed for ${targetId}, searching for title: ${cleanTitle}`);
                    const searchResults = LocalSource.search(cleanTitle);
                    if (searchResults.length > 0) {
                        targetId = searchResults[0].id;
                        updatedAnime.localId = targetId;
                        episodesList = LocalSource.getEpisodes(targetId);
                        console.log(`[LocalSource] Found via search: ${targetId}`);
                    }
                }

                if (episodesList && episodesList.length > 0) {
                    resolvedId = targetId;

                    // Determine current episode to play
                    const ep = episodesList.find(e => e.number === targetEpisodeNumber);

                    if (ep) {
                        streamUrl = ep.url;
                        showToast(`Playing Local: Ep ${targetEpisodeNumber}`, 'success');
                    } else {
                        showToast(`Episode ${targetEpisodeNumber} not found locally`, 'error');
                    }
                } else {
                    showToast(`Anime not found in Local Source`, 'error');
                }

            } else {
                // --- WEB SOURCE LOGIC (AnimeLibHiLive / internal) ---

                // GATING: Require an enabled extension to proceed.
                // Prevents "out of the box" usage without user configuration.
                const hasEnabledExtension = extensions.some(e => e.type === 'custom' && e.enabled);

                if (!hasEnabledExtension) {
                    showToast('Playback requires an enabled Extension. Please add one.', 'error');
                    return;
                }

                // User explicitly requested to use the new lib file.

                // 1. Resolve Web ID
                // Prefer persisted webId > anime.sourceId > Search
                let targetSlug = updatedAnime.webId || updatedAnime.sourceId;

                if (!targetSlug) {
                    // Search Logic
                    showToast('Searching Web Source...', 'info');
                    // Check Overrides
                    if (ANIME_SLUG_OVERRIDES[cleanTitle] || ANIME_SLUG_OVERRIDES[anime.title.romaji]) {
                        targetSlug = ANIME_SLUG_OVERRIDES[cleanTitle] || ANIME_SLUG_OVERRIDES[anime.title.romaji];
                    } else {
                        // Scraper Search
                        const results = await AnimeLibHiLive.search(cleanTitle);
                        if (results && results.length > 0) {
                            targetSlug = results[0].id;
                            updatedAnime.webId = targetSlug; // Persist
                        }
                    }
                }

                if (targetSlug) {
                    updatedAnime.webId = targetSlug; // Ensure persisted
                    resolvedId = targetSlug;

                    try {
                        // Fetch Episodes using the new library
                        const fetchedEps = await AnimeLibHiLive.getEpisodes(targetSlug);
                        episodesList = fetchedEps;
                    } catch (err) {
                        console.warn("Web fetch error", err);
                        // Fallback to existing list if available?
                        episodesList = anime.episodesList || [];
                    }

                    const targetNum = episodeNumber || 1;
                    // Use the scraper's BASE_URL logic or construct standard link
                    // The lib file defines BASE_URL = "https://hianimez.live/watch"
                    streamUrl = `https://hianimez.live/watch/${targetSlug}/ep-${targetNum}`;
                    showToast(`Playing Web: Ep ${targetNum}`, 'success');
                } else {
                    showToast('Anime not found on Web Source', 'error');
                }
            }

            // --- FINAL STATE UPDATE ---
            setVideoScale(1);

            // Should we auto-zoom for Hianime web?
            if (effectiveSource === 'web' || (streamUrl && streamUrl.includes('hianime'))) {
                setVideoScale(1.0);
                setVideoXOffset(0);
                setVideoYOffset(-100);
            } else {
                setVideoYOffset(0);
            }

            setPlayingAnime({
                ...updatedAnime, // Contains localId and webId now
                streamUrl,
                currentEpisode: episodeNumber, // Track current episode for UI highlighing
                episodesList: episodesList || [], // The list specifically for the CURRENT source
                title: episodeNumber ? `${baseTitle} - Episode ${episodeNumber}` : baseTitle,
                // We keep sourceId for legacy compatibility if needed, but rely on localId/webId
                sourceId: resolvedId
            });

        } catch (error) {
            console.error("Play Error", error);
            showToast(`Failed to play: ${error.message}`, 'error');
        }
    };

    const handleTabChange = (tab) => {
        if (tab === activeTab) return; // Prevent redundant refresh

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
                                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-wrap gap-4 animate-fade-in items-end">

                                    {/* Content Rating */}
                                    <div className="space-y-1 flex-1 min-w-[140px]">
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
                                    <div className="space-y-1 flex-1 min-w-[140px]">
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
                                    <div className="space-y-1 flex-1 min-w-[140px]">
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
                                    <div className="space-y-1 flex-1 min-w-[100px]">
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
                                    <div className="space-y-1 flex-1 min-w-[100px]">
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
                                    <div className="space-y-1 flex-1 min-w-[100px]">
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
                                    <div className="space-y-1 flex-1 min-w-[120px]">
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

                        {/* Grid - Auto-fit ensures items stretch to fill the row if there are few */}
                        <div className="grid gap-4 sm:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
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
                                    Click the &quot;Add to List&quot; button on any anime details to save it here.
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
                                <HeroCarousel
                                    items={(trendingList || []).slice(0, 10)}
                                    onPlay={handlePlay}
                                    onInfo={setSelectedAnime}
                                />

                                {/* Scrollable Lists */}
                                {/* DEBUG: History Count
                                <div className="text-red-500 font-bold p-4 border border-red-500 bg-black/50">
                                    Debug: History Length = {watchHistory.length}
                                </div> */}
                                {watchHistory.length > 0 && (
                                    <HorizontalScrollList
                                        title="Continue Watching"
                                        items={watchHistory.filter(i => i && i.id)}
                                        onItemClick={(anime) => handlePlay(anime)}
                                        renderItem={(anime) => (
                                            <div className="min-w-[200px] w-[200px] flex-shrink-0 cursor-pointer group relative">
                                                <div className="aspect-video rounded-xl overflow-hidden mb-2 relative bg-gray-900 border border-white/10">
                                                    <img
                                                        src={anime.bannerUrl || anime.coverUrl}
                                                        alt={anime.title}
                                                        className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-red-600 transition-colors">
                                                            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    {anime.duration > 0 && (
                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                                            <div
                                                                className="h-full bg-red-600"
                                                                style={{ width: `${Math.min(100, (anime.progress / anime.duration) * 100)}%` }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Episode Badge Overlay */}
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-xs font-bold text-white">
                                                        Ep {anime.lastEpisode || 1}
                                                    </div>
                                                </div>
                                                <h3 className="text-sm font-medium text-white truncate">{anime.title.english || anime.title.romaji || anime.title}</h3>
                                                <p className="text-xs text-gray-400">Episode {anime.lastEpisode}</p>
                                            </div>
                                        )}
                                    />
                                )}

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
                                        {/* Advanced Filter Bar */}
                                        {showSourceMenu && (
                                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-wrap gap-4 animate-fade-in items-end">

                                                {/* Content */}
                                                <div className="space-y-1 flex-1 min-w-[140px]">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Content</label>
                                                    <select
                                                        value={contentFilter}
                                                        onChange={(e) => cycleContentFilter(e.target.value)}
                                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                                    >
                                                        <option value="ALL">All (Safe + NSFW)</option>
                                                        <option value="SAFE">Safe (No NSFW)</option>
                                                        <option value="NSFW">NSFW Only</option>
                                                    </select>
                                                </div>

                                                {/* Sort (Was removed in previous view, adding logic if needed or assuming defaults) - Re-adding Sort based on screenshot request */}
                                                <div className="space-y-1 flex-1 min-w-[140px]">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Sort</label>
                                                    <select
                                                        value={filters.sort || 'POPULARITY_DESC'}
                                                        onChange={(e) => handleFilterChange('sort', e.target.value)}
                                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                                    >
                                                        <option value="POPULARITY_DESC">Most Popular</option>
                                                        <option value="TRENDING_DESC">Trending</option>
                                                        <option value="SCORE_DESC">Highest Rated</option>
                                                        <option value="FAVOURITES_DESC">Most Favorites</option>
                                                        <option value="START_DATE_DESC">Newest</option>
                                                        <option value="START_DATE">Oldest</option>
                                                        <option value="TITLE_ENGLISH">Title (A-Z)</option>
                                                    </select>
                                                </div>

                                                {/* Genres */}
                                                <div className="space-y-1 flex-1 min-w-[140px]">
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
                                                <div className="space-y-1 flex-1 min-w-[100px]">
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
                                                <div className="space-y-1 flex-1 min-w-[100px]">
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
                                                <div className="space-y-1 flex-1 min-w-[100px]">
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
                                                <div className="space-y-1 flex-1 min-w-[120px]">
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
                                    <div className="grid gap-4 sm:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                                        {animeList.map(anime => {
                                            const historyItem = watchHistory.find(h => h.id === anime.id);
                                            return (
                                                <AnimeCard
                                                    key={anime.id}
                                                    anime={{
                                                        ...anime,
                                                        title: sanitize(anime.title || anime.name),
                                                        lastEpisode: historyItem ? historyItem.lastEpisode : null
                                                    }}
                                                    onClick={setSelectedAnime}
                                                />
                                            );
                                        })}
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
                            <div className="h-16 flex items-center justify-between px-6 bg-[#050505] border-b border-white/5 z-20 gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <button onClick={() => setIsPlayerMinimized(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white shrink-0">
                                        <Minimize2 size={20} />
                                    </button>

                                    {/* Title (Mobile only or condensed) */}
                                    <h2 className="font-semibold text-sm sm:text-base truncate text-gray-300">{playingAnime.title}</h2>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                    {/* URL / Stream Display Pill - Moved to Right */}
                                    <div className="hidden md:flex items-center px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-full max-w-md w-64 hover:border-white/20 transition-colors group">
                                        <div className="w-2 h-2 rounded-full bg-green-500 mr-3 animate-pulse"></div>
                                        <input
                                            type="text"
                                            readOnly
                                            value={playingAnime.streamUrl || '...'}
                                            className="w-full bg-transparent border-none focus:ring-0 text-xs font-mono text-gray-400 placeholder-gray-700 group-hover:text-gray-300 transition-colors"
                                            onClick={(e) => e.target.select()}
                                        />
                                    </div>

                                    <SourceSelector
                                        options={[{ id: 'local', name: 'Local File' }, { id: 'web', name: 'Hianime (Web)' }]}
                                        currentId={playbackSource}
                                        onSelect={(newSource) => handlePlay(playingAnime, null, newSource)}
                                        className="z-50"
                                    />

                                    <div className="h-6 w-px bg-white/10 mx-2"></div>

                                    <button onClick={() => setPlayingAnime(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white hover:text-red-500" title="Close Player">
                                        <X size={20} />
                                    </button>
                                    <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className={`p-2 rounded-full transition-colors ${isSidebarVisible ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-gray-400'}`} title="Toggle Sidebar">
                                        <PanelRight size={20} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 flex overflow-hidden">
                            {/* Player Column */}
                            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative transition-all duration-300">
                                <div className={`w-full bg-black relative shadow-2xl z-[100] ${isPlayerMinimized ? 'h-full' : 'max-w-[100vh] mx-auto ring-1 ring-white/10'}`}>
                                    <VideoPlayer
                                        src={playingAnime.url || playingAnime.streamUrl || playingAnime.source}
                                        poster={playingAnime.bannerUrl || playingAnime.coverUrl}
                                        title={playingAnime.title}
                                        isMinimized={isPlayerMinimized}
                                        scale={videoScale}
                                        xOffset={videoXOffset}
                                        yOffset={videoYOffset}
                                        initialTime={playingAnime.initialTime}
                                        onProgress={reportProgress}
                                        onEnded={() => {
                                            saveProgress();
                                        }}
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
                                <div className={`${isSidebarVisible ? 'w-80 lg:w-96 translate-x-0' : 'w-0 translate-x-full hidden'} bg-[#111] border-l border-white/5 flex flex-col transition-all duration-300 ease-in-out z-20 overflow-hidden no-scrollbar`}>
                                    <div className="p-4 border-b border-white/5 bg-[#111] z-10 flex justify-between items-center whitespace-nowrap overflow-hidden">
                                        <h3 className="font-bold text-gray-200">Episodes</h3>
                                        <span className="text-xs text-gray-500">{playingAnime.episodesList?.length || playingAnime.episodes || '?'} Total</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">

                                        {/* Pagination Controls in Sidebar */}
                                        <div className="flex justify-between items-center px-2 pb-2">
                                            <button
                                                onClick={() => setCurrentEpisodePage(p => Math.max(1, p - 1))}
                                                disabled={currentEpisodePage === 1}
                                                className="text-xs text-gray-400 hover:text-white disabled:opacity-30 px-2 py-1"
                                            >
                                                Prev
                                            </button>

                                            {/* Modernized Minimal Input */}
                                            <div className="flex items-center gap-1 text-xs bg-white/5 px-2 py-1 rounded-md border border-white/5 hover:border-white/20 transition-colors group focus-within:border-white/40">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1}
                                                    value={currentEpisodePage}
                                                    onChange={(e) => {
                                                        const valStr = e.target.value;
                                                        if (valStr === '') {
                                                            setCurrentEpisodePage('');
                                                            return;
                                                        }
                                                        const val = parseInt(valStr);
                                                        const maxPages = Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1;
                                                        if (!isNaN(val) && val >= 1 && val <= maxPages) {
                                                            setCurrentEpisodePage(val);
                                                        }
                                                    }}
                                                    className="w-10 bg-transparent text-center outline-none text-gray-200 font-medium no-spinner focus:text-white"
                                                    onKeyDown={(e) => e.stopPropagation()} // Prevent key bubbling
                                                />
                                                <span className="text-white/30 select-none">/</span>
                                                <span className="text-white/30 select-none">{Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1}</span>
                                            </div>
                                            <button
                                                onClick={() => setCurrentEpisodePage(p => Math.min((Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1), (Number(p) || 1) + 1))}
                                                disabled={(Number(currentEpisodePage) || 1) === (Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1)}
                                                className="text-xs text-gray-400 hover:text-white disabled:opacity-30 px-2 py-1"
                                            >
                                                Next
                                            </button>
                                        </div>


                                        {((playingAnime.episodesList?.length > 0 && playingAnime.episodesList) || Array.from({ length: playingAnime.episodes || 12 }))
                                            .slice(((Number(currentEpisodePage) || 1) - 1) * 12, (Number(currentEpisodePage) || 1) * 12)
                                            .map((ep, idx) => {
                                                const epNum = ep?.number || (((Number(currentEpisodePage) || 1) - 1) * 12) + idx + 1;
                                                // Robust check using strict episode number if available, fallback to URL matching
                                                const isCurrent = (playingAnime.currentEpisode === epNum) ||
                                                    (playingAnime.url || '').includes(`ep-${epNum}`) ||
                                                    (playingAnime.url || '').includes(`episode-${epNum}`) ||
                                                    (playingAnime.streamUrl && playingAnime.streamUrl.includes(`ep-${epNum}`));

                                                // Check if episode is released
                                                const isReleased = !playingAnime.nextAiringEpisode || epNum < playingAnime.nextAiringEpisode.episode;

                                                return (
                                                    <button
                                                        key={epNum}
                                                        onClick={() => isReleased && handlePlay(playingAnime, epNum)}
                                                        disabled={!isReleased}
                                                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all group relative overflow-hidden ${isCurrent ? 'bg-red-600 text-white' : (isReleased ? 'hover:bg-white/5 text-gray-400' : 'opacity-40 cursor-not-allowed text-gray-600')}`}
                                                    >
                                                        <div className="relative shrink-0 w-24 h-16 bg-black/40 rounded overflow-hidden border border-white/5">
                                                            <img src={playingAnime.bannerUrl} className={`w-full h-full object-cover transition-opacity ${isCurrent ? 'opacity-100' : (isReleased ? 'opacity-60 group-hover:opacity-100' : 'opacity-30 grayscale')}`} alt="" />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                                {isReleased ? (
                                                                    <Play size={16} fill="currentColor" className={isCurrent ? 'text-white' : 'text-white/50'} />
                                                                ) : (
                                                                    <div className="flex flex-col items-center">
                                                                        {/* Using Clock icon if available, otherwise just text/lock */}
                                                                        <span className="text-xs font-bold text-white/70 uppercase">Not Aired</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-left flex-1 min-w-0">
                                                            <div className="font-medium truncate text-sm">Episode {epNum}</div>
                                                            <div className="text-xs opacity-60 truncate">
                                                                {!isReleased && playingAnime.nextAiringEpisode && epNum === playingAnime.nextAiringEpisode.episode
                                                                    ? `Airing in ${Math.round(playingAnime.nextAiringEpisode.timeUntilAiring / 86400)} days`
                                                                    : (ep?.title || (playingAnime.title ? playingAnime.title.split(' - Episode')[0] : ''))}
                                                            </div>
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
            < AnimeDetailModal
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

            {
                toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )
            }
        </div >
    );
}

export default App;
