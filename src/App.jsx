/**
 * Mugen Play
 * Created and Maintained by Kapy2003 (https://github.com/Kapy2003/)
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './components/layout/Sidebar';
import AnimeCard from './components/anime/AnimeCard';
import AnimeDetailModal from './components/anime/AnimeDetailModal';
import VideoPlayer from './components/player/VideoPlayer';
import ExtensionsView from './components/extensions/ExtensionsView';
import AddSourceModal from './components/extensions/AddSourceModal';
import DirectPlayModal from './components/player/DirectPlayModal';
import Toast from './components/common/Toast';
import SplashScreen from './components/common/SplashScreen';
import LegalDisclaimerModal from './components/common/LegalDisclaimerModal';
import { INITIAL_EXTENSIONS } from './data/constants';
import { Search, Play, ArrowLeft, X, Maximize2, PanelRight, Filter, Compass, Shuffle, Star, Heart, Code, Sliders, Link, Copy, ExternalLink, Sun, Moon, Key, Lock, ChevronRight, Film } from 'lucide-react';
import { AnilistSource } from './extensions/AnilistSource';
import HeroCarousel from './components/home/HeroCarousel';
import HorizontalScrollList from './components/common/HorizontalScrollList';
import SourceSelector from './components/common/SourceSelector';
import { ExtensionRepoManager } from './lib/ExtensionRepoManager';
import { ExtensionHealthChecker } from './lib/ExtensionHealthChecker';
import { AnimeUrlResolver } from './lib/AnimeUrlResolver';

const formatAnimeTitle = (title, fallback = 'Untitled Anime') => {
    if (!title) return fallback;
    if (typeof title === 'string') return title;
    return title.english || title.romaji || title.canonical || title.userPreferred || fallback;
};

function App() {
    // --- State ---
    const [activeTab, setActiveTab] = useState('home');
    const [showSplash, setShowSplash] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem('mugen_sidebar_width');
        return saved ? parseInt(saved, 10) : 256;
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('mugen_sidebar_collapsed');
        return saved ? saved === 'true' : false;
    });
    const [videoScale, setVideoScale] = useState(() => {
        const saved = localStorage.getItem('mugen_video_scale');
        return saved ? parseFloat(saved) : 1;
    }); // Zoom level for player (Default: 100%)
    const [videoXOffset, setVideoXOffset] = useState(() => {
        const saved = localStorage.getItem('mugen_video_x_offset');
        return saved ? parseFloat(saved) : 0;
    }); // Horizontal shift (0%)
    const [videoYOffset, setVideoYOffset] = useState(() => {
        const saved = localStorage.getItem('mugen_video_y_offset');
        return saved ? parseFloat(saved) : -72;
    }); // Vertical shift (Default: -72px optimal desktop, -62px mobile)
    const [miniVideoYOffset, setMiniVideoYOffset] = useState(() => {
        const saved = localStorage.getItem('mugen_mini_video_y_offset');
        return saved ? parseFloat(saved) : -50;
    }); // Mini Player Vertical shift (Default: -50px)
    const [miniVideoScale, setMiniVideoScale] = useState(() => {
        const saved = localStorage.getItem('mugen_mini_video_scale');
        return saved ? parseFloat(saved) : 1;
    }); // Mini Player Zoom (Default: 100%)

    // Theme State (Dark / Light)
    const [theme, setTheme] = useState(() => localStorage.getItem('mugen_theme') || 'dark');

    // Developer & Secret Code Debugger State
    const [isDevUnlocked, setIsDevUnlocked] = useState(() => localStorage.getItem('mugen_dev_unlocked') === 'true');
    const [devMode, setDevMode] = useState(() => localStorage.getItem('mugen_dev_mode') === 'true');
    const [showDevCodeModal, setShowDevCodeModal] = useState(false);
    const [secretCodeInput, setSecretCodeInput] = useState('');
    const [versionClickCount, setVersionClickCount] = useState(0);

    const [isSidebarVisible, setIsSidebarVisible] = useState(true); // Toggle Episode Sidebar (Right)

    const [extensions, setExtensions] = useState(() => {
        const saved = localStorage.getItem('mugen_extensions');
        let parsed = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(parsed) || parsed.length === 0) {
            parsed = INITIAL_EXTENSIONS.map(ext => ({ ...ext }));
        }

        // Purge any legacy manga/reading sources
        const mangaTerms = ['manga', 'reading', 'read', 'comic', 'novel', 'scan', 'manhua', 'manhwa', 'webtoon', 'hentaistube', 'hentaizm', 'jav', 'xnxx', 'xvideos', 'missav', 'jable', 'newgrounds', 'drive.google', 'voircartoon'];
        parsed = parsed.filter(ext => {
            const name = (ext.name || '').toLowerCase();
            const url = (ext.url || ext.baseUrl || '').toLowerCase();
            return !mangaTerms.some(term => name.includes(term) || url.includes(term));
        });

        // Ensure AniList is always present as the core metadata engine
        const hasAnilist = parsed.some(e => e.id === 'anilist_source');
        if (!hasAnilist && INITIAL_EXTENSIONS.length > 0) {
            parsed.unshift(INITIAL_EXTENSIONS[0]);
        }

        return parsed;
    });

    // Settings State
    const [contentFilter, setContentFilter] = useState(() => {
        return localStorage.getItem('mugen_content_filter') || 'ALL'; // SAFE, NSFW, ALL
    });

    const [playbackSource, setPlaybackSource] = useState(() => {
        return localStorage.getItem('mugen_playback_source') || '';
    });

    // Check if user has installed and enabled any NSFW-capable streaming extension
    const hasNsfwExtension = useMemo(() => {
        return extensions.some(ext =>
            ext.enabled !== false && (
                ext.nsfw === true ||
                ext.isAdult === true ||
                ext.type === 'nsfw' ||
                (ext.id && (ext.id.includes('hanime') || ext.id.includes('hentai') || ext.id.includes('ero'))) ||
                (ext.name && (ext.name.toLowerCase().includes('hanime') || ext.name.toLowerCase().includes('hentai') || ext.name.toLowerCase().includes('18+'))) ||
                (ext.baseUrl && (ext.baseUrl.toLowerCase().includes('hanime') || ext.baseUrl.toLowerCase().includes('hentai')))
            )
        );
    }, [extensions]);

    // Content State
    const [animeList, setAnimeList] = useState([]);
    const [trendingList, setTrendingList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true); // Simplified: assume next unless empty result
    const [totalPages, setTotalPages] = useState(1);

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
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(() => localStorage.getItem('mugen_accepted_terms') === 'true');
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [hasDismissedExtensionNotice, setHasDismissedExtensionNotice] = useState(() => localStorage.getItem('mugen_has_seen_extension_prompt') === 'true');
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

    const [currentEpisodePage, setCurrentEpisodePage] = useState(1); // Pagination
    const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
    const playerTouchStartRef = useRef({ x: 0, y: 0 });

    const handlePlayerTouchStart = (e) => {
        if (e.touches?.[0]) {
            playerTouchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
    };

    const handlePlayerTouchEnd = (e) => {
        if (!e.changedTouches?.[0]) return;
        const diffX = e.changedTouches[0].clientX - playerTouchStartRef.current.x;
        const diffY = e.changedTouches[0].clientY - playerTouchStartRef.current.y;

        if (isPlayerMinimized) {
            // Swiped horizontally on miniplayer -> Dismiss
            if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY)) {
                setPlayingAnime(null);
            }
        } else {
            // Swiped down from header/top area -> Minimize
            if (diffY > 80 && diffY > Math.abs(diffX)) {
                setIsPlayerMinimized(true);
            }
        }
    };

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Effects ---

    // Persist extensions
    useEffect(() => {
        localStorage.setItem('mugen_extensions', JSON.stringify(extensions));
    }, [extensions]);


    // Persist sidebar width
    useEffect(() => {
        localStorage.setItem('mugen_sidebar_width', sidebarWidth.toString());
    }, [sidebarWidth]);

    // Persist and apply theme
    useEffect(() => {
        localStorage.setItem('mugen_theme', theme);
        if (theme === 'light') {
            document.documentElement.classList.add('light-theme');
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.remove('light-theme');
            document.documentElement.classList.add('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        showToast(`Switched to ${next === 'light' ? 'Light' : 'Dark'} Mode`, 'info');
    };

    const handleUnlockDevMode = (e) => {
        if (e) e.preventDefault();
        const validCodes = ['mugen', 'mugenplay', 'dev', '1337', '42069', 'debug', 'mugen-play'];
        const clean = (secretCodeInput || '').trim().toLowerCase();
        if (validCodes.includes(clean)) {
            setIsDevUnlocked(true);
            setDevMode(true);
            localStorage.setItem('mugen_dev_unlocked', 'true');
            localStorage.setItem('mugen_dev_mode', 'true');
            setShowDevCodeModal(false);
            setSecretCodeInput('');
            showToast("🎉 Developer & Debugger Mode Unlocked!", "success");
        } else {
            showToast("Invalid Secret Code", "error");
        }
    };

    const handleVersionClick = () => {
        const newCount = versionClickCount + 1;
        setVersionClickCount(newCount);
        if (newCount >= 5) {
            setIsDevUnlocked(true);
            setDevMode(true);
            localStorage.setItem('mugen_dev_unlocked', 'true');
            localStorage.setItem('mugen_dev_mode', 'true');
            setVersionClickCount(0);
            showToast("🎉 Developer Mode Unlocked via Secret Tap!", "success");
        } else if (newCount >= 2) {
            showToast(`${5 - newCount} more clicks to unlock Developer Mode`, "info");
        }
    };

    const handleLockDevMode = () => {
        setIsDevUnlocked(false);
        setDevMode(false);
        localStorage.removeItem('mugen_dev_unlocked');
        localStorage.setItem('mugen_dev_mode', 'false');
        showToast("Developer Mode locked", "info");
    };

    // Automatic link health check on app mount / refresh
    useEffect(() => {
        const runHealthAudit = async () => {
            const customExts = extensions.filter(e => e.id !== 'anilist_source');
            if (customExts.length > 0) {
                const audited = await ExtensionHealthChecker.auditAll(extensions);
                const deadCount = audited.filter(e => e.status === 'dead').length;
                setExtensions(audited);
                localStorage.setItem('mugen_extensions', JSON.stringify(audited));
                if (deadCount > 0) {
                    showToast(`${deadCount} extension source${deadCount > 1 ? 's are' : ' is'} unreachable`, 'error');
                }
            }
        };

        const timer = setTimeout(runHealthAudit, 2000);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initialize active provider - AniList Core Metadata Engine
    const [activeProvider] = useState(() => new AnilistSource());

    // Load Content from Live AniList Engine when Search, Filters, or Content Rating change
    useEffect(() => {
        const loadContent = async () => {
            setIsLoading(true);
            try {
                if (searchQuery || Object.keys(filters).length > 0) {
                    const effectiveFilters = { ...filters, page };
                    if (contentFilter === 'SAFE') {
                        effectiveFilters.isAdult = false;
                    } else if (contentFilter === 'NSFW') {
                        effectiveFilters.isAdult = true;
                    }

                    const data = await activeProvider.search(searchQuery, effectiveFilters);
                    setAnimeList(data.results || []);
                    setHasNextPage(data.meta?.hasNextPage || false);
                    setTotalPages(data.meta?.lastPage || 1);
                } else {
                    const homeFilters = {};
                    if (contentFilter === 'SAFE') {
                        homeFilters.isAdult = false;
                    } else if (contentFilter === 'NSFW') {
                        homeFilters.isAdult = true;
                        homeFilters.sort = 'POPULARITY_DESC';
                    }

                    const trendingData = await activeProvider.getTrending({ ...homeFilters, page: 1 });
                    const catalogData = await activeProvider.search('', { ...homeFilters, page });

                    setAnimeList(catalogData.results || []);
                    setTrendingList(trendingData.results || []);
                    setHasNextPage(catalogData.meta?.hasNextPage || false);
                    setTotalPages(catalogData.meta?.lastPage || 1);
                }
            } catch (err) {
                console.error("Error loading content from AniList:", err);
                setToast({ message: 'Error loading content from AniList', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(loadContent, 250);
        return () => clearTimeout(timeoutId);
    }, [activeProvider, searchQuery, filters, contentFilter, page]);

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
        showToast("Removed from Continue Watching", "info");
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
            // Find target video streaming extension (exclude metadata providers like AniList)
            const targetExt = (overrideSource && extensions.find(e => e.id === overrideSource && e.type !== 'metadata'))
                || extensions.find(e => e.id === playbackSource && e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false)
                || extensions.find(e => e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false)
                || extensions.find(e => e.type !== 'metadata' && e.id !== 'anilist_source')
                || null;

            const effectiveSource = targetExt ? targetExt.id : (overrideSource || playbackSource || '');
            if (effectiveSource) {
                setPlaybackSource(effectiveSource);
                localStorage.setItem('mugen_playback_source', effectiveSource);
            }

            // --- 1. Basic UI Setup ---
            setSelectedAnime(null);
            setIsPlayerMinimized(false);
            setIsSidebarVisible(true);

            // --- 2. Resolve Episode ---
            let targetEpisodeNumber = episodeNumber;
            let initialTime = 0;

            if (!targetEpisodeNumber) {
                const historyItem = watchHistory.find(i => i.id === anime.id);
                if (historyItem) {
                    targetEpisodeNumber = historyItem.lastEpisode;
                    initialTime = historyItem.progress || 0;
                } else {
                    targetEpisodeNumber = 1;
                }
            } else {
                const historyItem = watchHistory.find(i => i.id === anime.id);
                if (historyItem && historyItem.lastEpisode === targetEpisodeNumber) {
                    initialTime = historyItem.progress || 0;
                    if (historyItem.duration && initialTime > historyItem.duration * 0.95) {
                        initialTime = 0;
                    }
                }
            }

            // Record initial history entry immediately
            addToHistory(anime, targetEpisodeNumber, initialTime, 0);

            if (targetEpisodeNumber) {
                const newPage = Math.ceil(targetEpisodeNumber / 12);
                setCurrentEpisodePage(newPage);
            } else {
                setCurrentEpisodePage(1);
            }

            // Prepare Anime Object & Search Title
            const baseTitle = (anime.title?.english || anime.title?.romaji || (typeof anime.title === 'string' ? anime.title : '') || anime.name || '').split(' - Episode')[0].trim();
            const targetNum = targetEpisodeNumber || 1;

            // Resolve accurate stream URL and episode playlist
            const { streamUrl, episodesList, resolvedSlug } = AnimeUrlResolver.resolveStream(anime, targetNum, targetExt, extensions);

            if (targetExt) {
                showToast(`Loaded ${targetExt.name}: Ep ${targetNum}`, 'success');
            } else {
                showToast(`Playing Ep ${targetNum}`, 'success');
            }

            // Viewport parameters (Default: Offset -72px, Zoom 100%)
            const savedYOffset = localStorage.getItem('mugen_video_y_offset');
            setVideoYOffset(savedYOffset !== null ? parseFloat(savedYOffset) : -72);
            const savedScale = localStorage.getItem('mugen_video_scale');
            setVideoScale(savedScale !== null ? parseFloat(savedScale) : 1);
            setVideoXOffset(0);

            setPlayingAnime({
                ...anime,
                url: streamUrl,
                streamUrl: streamUrl,
                currentEpisode: targetNum,
                episodesList: episodesList || [],
                title: `${baseTitle} - Episode ${targetNum}`,
                sourceName: targetExt ? targetExt.name : 'Stream',
                sourceId: resolvedSlug
            });

        } catch (error) {
            console.error("Play Error", error);
            showToast(`Failed to play: ${error.message}`, 'error');
        }
    };

    const handleAcceptTerms = () => {
        localStorage.setItem('mugen_accepted_terms', 'true');
        setHasAcceptedTerms(true);
        setShowTermsModal(false);
        setActiveTab('extensions');
        showToast("Terms accepted. Welcome to Mugen Play!", "success");
    };

    const handleTabChange = (tab) => {
        if (tab === activeTab) return; // Prevent redundant refresh

        // Check if navigating to extensions without terms acceptance
        if (tab === 'extensions' && !hasAcceptedTerms) {
            setShowTermsModal(true);
            return;
        }

        setActiveTab(tab);
        if (playingAnime) {
            setIsPlayerMinimized(true);
        }
    };

    const handleAddSource = (source) => {
        ExtensionRepoManager.appendIfMissing(source);
        const updatedExtensions = [...extensions, source];
        saveExtensions(updatedExtensions);
        showToast(`Added source: ${source.name}`, 'success');
    };

    const handleRemoveSource = (id) => {
        if (id === 'anilist_source') {
            showToast('AniList is the core catalog engine and cannot be removed.', 'error');
            return;
        }

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
        const resolved = AnimeUrlResolver.resolveStream({ url, title: 'Direct Stream' }, 1);
        const displayTitle = resolved.resolvedSlug && resolved.resolvedSlug !== 'direct' && resolved.resolvedSlug !== 'anime'
            ? resolved.resolvedSlug.replace(/-/g, ' ').toUpperCase()
            : 'Direct Stream';

        setPlayingAnime({
            url: resolved.streamUrl || url,
            streamUrl: resolved.streamUrl || url,
            episodesList: resolved.episodesList || [],
            type: 'custom',
            title: displayTitle,
            name: displayTitle,
            synopsis: 'Directly streaming from: ' + url
        });
        setVideoScale(1); // Reset zoom on new play
    };

    const handleResetExtensions = () => {
        if (confirm('Are you sure you want to restore default extensions? Custom sources will be kept.')) {
            // Keep custom sources, but restore defaults if missing
            const customSources = extensions.filter(e => e.type === 'custom');

            const initialSources = INITIAL_EXTENSIONS.map(ext => ({ ...ext }));
            const merged = [...initialSources, ...customSources];
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
                        onUpdateExtension={handleUpdateSource}
                    />
                );

            case 'browse':
                return (
                    <div className="p-3 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in max-w-full overflow-hidden">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">
                                    {searchQuery || Object.keys(filters).length > 0 ? 'Search Results' : 'Browse Anime'}
                                </h2>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold hidden sm:inline-flex items-center gap-1.5">Source: AniList</span>
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
                                        placeholder="Search anime to watch..."
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
                                            {hasNsfwExtension && <option value="NSFW">NSFW</option>}
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

                        {/* Grid - Responsive full-width layout */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-6 w-full">
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
                                <p>No content found matching your search on AniList.</p>
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
                                        anime={{ ...anime, title: formatAnimeTitle(anime.title || anime.name) }}
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
                                        {hasNsfwExtension && <option value="NSFW">NSFW Only</option>}
                                    </select>
                                </div>
                            </div>

                            {/* Appearance */}
                            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                                <h3 className="text-lg font-medium text-white mb-4">Appearance</h3>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-gray-200">Theme</span>
                                        <span className="text-xs text-gray-500">Select app visual theme</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setTheme('dark');
                                                showToast("Dark Theme Active", "info");
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                                theme === 'dark'
                                                    ? 'bg-gray-800 text-white border-gray-600 shadow-sm font-bold'
                                                    : 'bg-black/20 text-gray-400 border-transparent hover:text-white'
                                            }`}
                                        >
                                            <Moon className="w-3.5 h-3.5" /> Dark
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTheme('light');
                                                showToast("Light Theme Active", "info");
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                                theme === 'light'
                                                    ? 'bg-white text-black border-white shadow-sm font-bold'
                                                    : 'bg-black/20 text-gray-400 border-transparent hover:text-white'
                                            }`}
                                        >
                                            <Sun className="w-3.5 h-3.5" /> Light
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Advanced & Developer Options */}
                            {!isDevUnlocked ? (
                                <div
                                    onClick={() => setShowDevCodeModal(true)}
                                    className="bg-gray-900/70 p-5 rounded-xl border border-gray-800 flex items-center justify-between cursor-pointer hover:border-gray-700 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-gray-800 text-gray-400 border border-gray-700 group-hover:text-amber-400 transition-colors">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
                                                Developer Options
                                            </h3>
                                            <p className="text-xs text-gray-500">Advanced stream diagnostics</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-6 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                                <Code className="w-5 h-5 text-amber-500" />
                                                Advanced & Developer Options
                                                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold">UNLOCKED</span>
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-0.5">Stream link inspection, viewport cropping, and player debugging tools</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const next = !devMode;
                                                    setDevMode(next);
                                                    localStorage.setItem('mugen_dev_mode', String(next));
                                                    showToast(`Developer Mode: ${next ? 'Enabled' : 'Disabled'}`, 'info');
                                                }}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                                    devMode
                                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                                                }`}
                                            >
                                                {devMode ? 'Dev Overlay ON' : 'Dev Overlay OFF'}
                                            </button>
                                            <button
                                                onClick={handleLockDevMode}
                                                className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/30"
                                                title="Lock Developer Mode"
                                            >
                                                <Lock className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Viewport & Header Crop Calibration */}
                                    <div className="pt-4 border-t border-gray-800 space-y-4">
                                        <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                            <Sliders className="w-4 h-4 text-gray-400" />
                                            Viewport Calibration (Desktop: -72px | Mobile: -62px | Mini: -50px)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="p-3 bg-black/40 border border-gray-800 rounded-xl space-y-2">
                                                <div className="flex justify-between text-xs text-gray-400">
                                                    <span>Max Player Vertical Offset</span>
                                                    <span className="font-mono text-amber-400 font-bold">{videoYOffset}px</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="range"
                                                        min="-150"
                                                        max="50"
                                                        step="2"
                                                        value={videoYOffset}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10);
                                                            setVideoYOffset(val);
                                                            localStorage.setItem('mugen_video_y_offset', val.toString());
                                                        }}
                                                        className="w-full accent-amber-500 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    <button
                                                        onClick={() => {
                                                            setVideoYOffset(-72);
                                                            localStorage.setItem('mugen_video_y_offset', '-72');
                                                            showToast("Max Player Offset set to -72px (Desktop)", "success");
                                                        }}
                                                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${videoYOffset === -72 ? 'bg-amber-500 text-black font-bold border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'}`}
                                                    >
                                                        Desktop: -72px
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setVideoYOffset(-62);
                                                            localStorage.setItem('mugen_video_y_offset', '-62');
                                                            showToast("Max Player Offset set to -62px (Mobile)", "success");
                                                        }}
                                                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${videoYOffset === -62 ? 'bg-amber-500 text-black font-bold border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'}`}
                                                    >
                                                        Mobile: -62px
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setVideoYOffset(-50);
                                                            setMiniVideoYOffset(-50);
                                                            localStorage.setItem('mugen_video_y_offset', '-50');
                                                            localStorage.setItem('mugen_mini_video_y_offset', '-50');
                                                            showToast("Player Offset set to -50px (Desktop Mini)", "success");
                                                        }}
                                                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${videoYOffset === -50 ? 'bg-amber-500 text-black font-bold border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'}`}
                                                    >
                                                        Desktop Mini: -50px
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setVideoYOffset(-62);
                                                            setMiniVideoYOffset(-62);
                                                            setMiniVideoScale(0.92);
                                                            localStorage.setItem('mugen_video_y_offset', '-62');
                                                            localStorage.setItem('mugen_mini_video_y_offset', '-62');
                                                            localStorage.setItem('mugen_mini_video_scale', '0.92');
                                                            showToast("Mobile Mini set to -62px / 92%", "success");
                                                        }}
                                                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${videoYOffset === -62 && miniVideoScale === 0.92 ? 'bg-amber-500 text-black font-bold border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'}`}
                                                    >
                                                        Mobile Mini: -62px / 92%
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setVideoYOffset(0);
                                                            localStorage.setItem('mugen_video_y_offset', '0');
                                                        }}
                                                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded text-[11px] transition-colors cursor-pointer"
                                                    >
                                                        Reset: 0px
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-black/40 border border-gray-800 rounded-xl space-y-2">
                                                <div className="flex justify-between text-xs text-gray-400">
                                                    <span>Player Zoom Level</span>
                                                    <span className="font-mono text-amber-400 font-bold">{Math.round(videoScale * 100)}%</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="range"
                                                        min="0.8"
                                                        max="1.5"
                                                        step="0.02"
                                                        value={videoScale}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            setVideoScale(val);
                                                            localStorage.setItem('mugen_video_scale', val.toString());
                                                        }}
                                                        className="w-full accent-amber-500 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                    <button
                                                        onClick={() => {
                                                            setVideoScale(1);
                                                            setMiniVideoScale(1);
                                                            localStorage.setItem('mugen_video_scale', '1');
                                                            localStorage.setItem('mugen_mini_video_scale', '1');
                                                            showToast("Zoom set to 100%", "success");
                                                        }}
                                                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded text-[11px] font-medium transition-colors cursor-pointer"
                                                    >
                                                        100% (Default)
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setVideoScale(1.08);
                                                            localStorage.setItem('mugen_video_scale', '1.08');
                                                        }}
                                                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded text-[11px] transition-colors cursor-pointer"
                                                    >
                                                        108% (Fill)
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Active Stream Link Debugger */}
                                    <div className="pt-4 border-t border-gray-800 space-y-3">
                                        <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                            <Link className="w-4 h-4 text-gray-400" />
                                            Active Stream Link Debugger
                                        </h4>
                                        <div className="p-3 bg-black/50 border border-gray-800 rounded-xl space-y-3">
                                            <div className="text-xs text-gray-400 font-mono break-all bg-black/40 p-2.5 rounded-lg border border-white/5">
                                                <span className="text-gray-500 font-sans block mb-1">Loaded Stream URL:</span>
                                                {playingAnime?.url || playingAnime?.streamUrl || 'No anime currently playing'}
                                            </div>
                                            {playingAnime?.url && (
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const url = playingAnime.url || playingAnime.streamUrl;
                                                            if (url) {
                                                                navigator.clipboard.writeText(url);
                                                                showToast("Stream link copied to clipboard!", "success");
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                                    >
                                                        <Copy size={13} /> Copy Link
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const url = playingAnime.url || playingAnime.streamUrl;
                                                            if (url) window.open(url, '_blank');
                                                        }}
                                                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                                    >
                                                        <ExternalLink size={13} /> Open in Browser Tab
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* About */}
                            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-2">
                                <h3 className="text-lg font-medium text-white">About</h3>
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={handleVersionClick}
                                        className="text-gray-300 hover:text-white text-sm font-mono cursor-pointer transition-colors text-left select-none"
                                        title="Mugen Play Version"
                                    >
                                        <span>Mugen Play v0.1.0</span>
                                        {isDevUnlocked && (
                                            <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-sans font-bold border border-amber-500/30">
                                                DEV
                                            </span>
                                        )}
                                    </button>
                                    <span className="text-xs text-red-400 font-bold">Developed by Kapy</span>
                                </div>
                                <p className="text-gray-500 text-xs">Metadata Engine: AniList • Developed by Kapy</p>
                            </div>
                        </div>
                    </div>
                );

            case 'home':
            default:
                return (
                    <div className="p-3 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in max-w-full overflow-hidden">
                        {/* Top Bar with Brand & Sun/Moon Theme Toggle */}
                        <div className="flex items-center justify-between gap-3 pb-2">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white">
                                    MUGEN<span className="text-red-600">PLAY</span>
                                </h1>
                                <span className="px-2 py-0.5 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block">
                                    v0.1.0
                                </span>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-2.5">
                                {/* Direct Play Action */}
                                <button
                                    onClick={() => setShowDirectPlay(true)}
                                    className="px-3 sm:px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 border border-gray-700/80 cursor-pointer shadow-sm active:scale-95"
                                    title="Paste & Play Direct Link"
                                >
                                    <Play className="w-3.5 h-3.5 text-red-500 fill-current" />
                                    <span className="hidden sm:inline">Direct Play</span>
                                </button>

                                {/* Sun / Moon Theme Toggle */}
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 sm:p-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all border border-gray-700/80 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                    title={theme === 'light' ? 'Switch to Dark Mode (Moon)' : 'Switch to Light Mode (Sun)'}
                                    aria-label="Toggle Theme"
                                >
                                    {theme === 'light' ? (
                                        <Moon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-indigo-400 fill-current" />
                                    ) : (
                                        <Sun className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* First-Time Onboarding Prompt for Extensions */}
                        {!hasDismissedExtensionNotice && (
                            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-gray-900 to-gray-900 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-xl animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0">
                                        <Film className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                                            Welcome to MugenPlay!
                                            <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 text-[9px] sm:text-[10px] uppercase font-black tracking-wider">Quick Start</span>
                                        </h3>
                                        <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">
                                            To stream anime episodes, head over to the <strong className="text-white">Extensions</strong> tab and enable a stream source.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <button
                                        onClick={() => {
                                            handleTabChange('extensions');
                                        }}
                                        className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-900/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
                                    >
                                        <span>Go to Extensions</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setHasDismissedExtensionNotice(true);
                                            localStorage.setItem('mugen_has_seen_extension_prompt', 'true');
                                        }}
                                        className="p-1.5 sm:p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                                        title="Dismiss"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

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
                                {watchHistory.length > 0 && (
                                    <HorizontalScrollList
                                        title="Continue Watching"
                                        items={watchHistory.filter(i => i && i.id)}
                                        onItemClick={(anime) => handlePlay(anime)}
                                        renderItem={(anime) => (
                                            <div className="min-w-[160px] w-[160px] sm:min-w-[200px] sm:w-[200px] flex-shrink-0 cursor-pointer group relative">
                                                <div className="aspect-video rounded-xl overflow-hidden mb-2 relative bg-gray-900 border border-white/10">
                                                    <img
                                                        src={anime.bannerUrl || anime.coverUrl}
                                                        alt={anime.title}
                                                        className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-red-600 transition-colors">
                                                            <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current ml-0.5" />
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
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] sm:text-xs font-bold text-white">
                                                        Ep {anime.lastEpisode || 1}
                                                    </div>

                                                    {/* Remove from Continue Watching Cross Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFromHistory(anime.id);
                                                        }}
                                                        className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-black/80 hover:bg-red-600 text-gray-200 hover:text-white flex items-center justify-center backdrop-blur-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer shadow-md active:scale-90 border border-white/10"
                                                        title="Remove from Continue Watching"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                                <h3 className="text-xs sm:text-sm font-medium text-white truncate">{formatAnimeTitle(anime.title)}</h3>
                                                <p className="text-[11px] sm:text-xs text-gray-400">Episode {anime.lastEpisode}</p>
                                            </div>
                                        )}
                                    />
                                )}

                                <HorizontalScrollList
                                    title="Trending"
                                    items={trendingList}
                                    onItemClick={(anime) => setSelectedAnime(anime)}
                                    renderItem={(anime) => (
                                        <div className="min-w-[130px] w-[130px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0 cursor-pointer group relative">
                                            <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative bg-gray-900 border border-gray-800">
                                                <img
                                                    src={anime.coverUrl || anime.image || anime.poster || ''}
                                                    alt={formatAnimeTitle(anime.title)}
                                                    className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-white" />
                                                </div>
                                            </div>
                                            <h3 className="text-xs sm:text-sm font-medium text-white truncate">{formatAnimeTitle(anime.title)}</h3>
                                        </div>
                                    )}
                                />

                                {/* Popular Grid */}
                                <div>
                                    <div className="flex flex-col gap-4 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                                    Popular Anime
                                                </h2>
                                            </div>

                                            <div className="flex items-center gap-2.5">
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
                                                    className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                                                    title="Watch Random Anime"
                                                >
                                                    <Shuffle className="w-5 h-5" />
                                                </button>

                                                <button
                                                    onClick={() => setShowSourceMenu(!showSourceMenu)}
                                                    className={`p-3 rounded-xl transition-colors cursor-pointer ${showSourceMenu ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                                                    title="Advanced Filters"
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
                                                        {hasNsfwExtension && <option value="NSFW">NSFW Only</option>}
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

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-6 w-full">
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
                                            <p>No content found matching your search on AniList.</p>
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
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
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
                className="flex-1 min-w-0 min-h-screen relative overflow-x-hidden transition-[margin] duration-150 pb-24 lg:pb-8"
                style={{ marginLeft: isDesktop ? (isSidebarCollapsed ? 80 : (sidebarWidth || 256)) : 0 }}
            >
                {renderContent()}
            </main>

                {/* Unified Persistent Player Overlay */}
                {playingAnime && (
                    <div
                        onTouchStart={handlePlayerTouchStart}
                        onTouchEnd={handlePlayerTouchEnd}
                        className={`fixed z-50 bg-[#0a0a0a] text-white flex flex-col font-sans transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl overflow-hidden ${isPlayerMinimized ? 'bottom-20 sm:bottom-6 right-3 sm:right-6 w-[calc(100vw-24px)] sm:w-96 h-48 sm:h-56 rounded-2xl border border-white/10 ring-1 ring-black/50 shadow-2xl' : 'inset-0 rounded-none'}`}
                    >
                        {/* Top Navigation Bar (Full Screen Only) */}
                        {!isPlayerMinimized && (
                            <div className="h-16 flex items-center justify-between px-4 sm:px-6 bg-[#050505] border-b border-white/5 z-20 gap-3 sm:gap-4 animate-fade-in shrink-0">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <button
                                        onClick={() => setIsPlayerMinimized(true)}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white shrink-0 cursor-pointer"
                                        title="Back / Minimize Player"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>

                                    {/* Title */}
                                    <h2 className="font-bold text-sm sm:text-base truncate text-gray-200">{formatAnimeTitle(playingAnime.title)}</h2>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <SourceSelector
                                        options={(() => {
                                            const streamOpts = extensions
                                                .filter(e => e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false)
                                                .map(e => ({
                                                    id: e.id,
                                                    name: e.name,
                                                    url: e.baseUrl || e.url
                                                }));

                                            if (streamOpts.length === 0) {
                                                streamOpts.push({ id: 'none', name: 'No Stream Sources' });
                                            }
                                            return streamOpts;
                                        })()}
                                        currentId={playbackSource || (extensions.find(e => e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false)?.id || '')}
                                        onSelect={(newSourceId) => {
                                            setPlaybackSource(newSourceId);
                                            handlePlay(playingAnime, playingAnime?.currentEpisode || 1, newSourceId);
                                        }}
                                        className="z-50"
                                    />

                                    <div className="h-6 w-px bg-white/10 mx-1"></div>

                                    <button onClick={() => setPlayingAnime(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white hover:text-red-500 cursor-pointer" title="Close Player">
                                        <X size={20} />
                                    </button>
                                    <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className={`hidden lg:flex p-2 rounded-full transition-colors cursor-pointer ${isSidebarVisible ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-gray-400'}`} title="Toggle Episodes">
                                        <PanelRight size={20} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 flex overflow-hidden">
                            {/* Player Column */}
                            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                <div className={`w-full bg-black relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isPlayerMinimized ? 'h-full rounded-2xl overflow-hidden shadow-2xl z-[100]' : 'w-full max-w-5xl mx-auto sm:ring-1 sm:ring-white/10 rounded-none sm:rounded-3xl p-0 sm:p-5 mt-0 sm:mt-6 mb-2 sm:mb-4'}`}>
                                    <VideoPlayer
                                        src={playingAnime.url || playingAnime.streamUrl || playingAnime.source}
                                        poster={playingAnime.bannerUrl || playingAnime.coverUrl}
                                        title={playingAnime.title}
                                        isMinimized={isPlayerMinimized}
                                        scale={isPlayerMinimized ? (!isDesktop && miniVideoScale === 1 ? 0.92 : miniVideoScale) : videoScale}
                                        xOffset={videoXOffset}
                                        yOffset={isPlayerMinimized ? (!isDesktop && miniVideoYOffset === -50 ? -62 : miniVideoYOffset) : (!isDesktop && videoYOffset === -72 ? -62 : videoYOffset)}
                                        devMode={devMode}
                                        initialTime={playingAnime.initialTime}
                                        onUpdateStreamUrl={(newUrl) => setPlayingAnime(prev => prev ? { ...prev, url: newUrl, streamUrl: newUrl } : null)}
                                        onProgress={reportProgress}
                                        onEnded={() => {
                                            saveProgress();
                                        }}
                                        onToggleMinimize={() => setIsPlayerMinimized(true)}
                                        onClose={() => setPlayingAnime(null)}
                                    />
                                    {/* Mini Overlay Controls */}
                                    {isPlayerMinimized && (
                                        <div className="absolute top-0 left-0 right-0 p-2.5 flex justify-end gap-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent z-[120] pointer-events-auto opacity-100 sm:opacity-90 sm:hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsPlayerMinimized(false);
                                                }}
                                                className="p-2 bg-black/80 hover:bg-black text-white rounded-full backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/20 cursor-pointer"
                                                title="Expand Player"
                                            >
                                                <Maximize2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPlayingAnime(null);
                                                }}
                                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-red-500/30 cursor-pointer"
                                                title="Close Player"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Details (Full Screen Only) */}
                                {!isPlayerMinimized && (
                                    <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-4 sm:space-y-6 animate-fade-in">
                                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                                            <img src={playingAnime.coverUrl} alt="Cover" className="w-24 sm:w-36 rounded-2xl shadow-2xl hidden sm:block border border-white/10 shrink-0" />
                                            <div className="flex-1 space-y-2 sm:space-y-3">
                                                <h1 className="text-xl sm:text-3xl font-black leading-tight tracking-tight text-white">{playingAnime.title}</h1>
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-300 font-medium">
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"><Star size={14} className="fill-current" /> {playingAnime.rating || '85'}</span>
                                                    <span>•</span><span>{playingAnime.year || 2024}</span><span>•</span><span>{playingAnime.episodes || 12} Episodes</span>
                                                    <div className="flex flex-wrap gap-1.5 ml-1 sm:ml-2">{playingAnime.genres?.slice(0, 3).map(g => <span key={g} className="px-2.5 py-0.5 bg-red-600/10 border border-red-500/20 text-red-400 rounded-full text-xs font-semibold">{g}</span>)}</div>
                                                </div>
                                                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed max-w-4xl">{playingAnime.synopsis}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Mobile Episode List (Stacked below player & details on mobile screens) */}
                                {!isPlayerMinimized && playingAnime.format !== 'MOVIE' && (
                                    <div className="lg:hidden p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-4 border-t border-white/5 animate-fade-in pb-12">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-white text-base">Episodes</h3>
                                            <span className="text-xs text-gray-400">{playingAnime.episodesList?.length || playingAnime.episodes || '?'} Total</span>
                                        </div>

                                        {/* Mobile Episode Pagination */}
                                        <div className="flex justify-between items-center px-1 pb-1">
                                            <button
                                                onClick={() => setCurrentEpisodePage(p => Math.max(1, p - 1))}
                                                disabled={currentEpisodePage === 1}
                                                className="text-xs text-gray-400 hover:text-white disabled:opacity-30 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                                            >
                                                Prev
                                            </button>
                                            <div className="flex items-center gap-1 text-xs bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
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
                                                />
                                                <span className="text-white/30 select-none">/</span>
                                                <span className="text-white/30 select-none">{Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1}</span>
                                            </div>
                                            <button
                                                onClick={() => setCurrentEpisodePage(p => Math.min((Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1), (Number(p) || 1) + 1))}
                                                disabled={(Number(currentEpisodePage) || 1) === (Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1)}
                                                className="text-xs text-gray-400 hover:text-white disabled:opacity-30 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                                            >
                                                Next
                                            </button>
                                        </div>

                                        {/* Mobile Episode Items */}
                                        <div className="space-y-2">
                                            {((playingAnime.episodesList?.length > 0 && playingAnime.episodesList) || Array.from({ length: playingAnime.episodes || 12 }))
                                                .slice(((Number(currentEpisodePage) || 1) - 1) * 12, (Number(currentEpisodePage) || 1) * 12)
                                                .map((ep, idx) => {
                                                    const epNum = ep?.number || (((Number(currentEpisodePage) || 1) - 1) * 12) + idx + 1;
                                                    const isCurrent = (playingAnime.currentEpisode === epNum) ||
                                                        (playingAnime.url || '').includes(`ep-${epNum}`) ||
                                                        (playingAnime.url || '').includes(`episode-${epNum}`) ||
                                                        (playingAnime.streamUrl && playingAnime.streamUrl.includes(`ep-${epNum}`));
                                                    const isReleased = !playingAnime.nextAiringEpisode || epNum < playingAnime.nextAiringEpisode.episode;

                                                    return (
                                                        <button
                                                            key={epNum}
                                                            onClick={() => isReleased && handlePlay(playingAnime, epNum)}
                                                            disabled={!isReleased}
                                                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border cursor-pointer ${isCurrent ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/30' : (isReleased ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5' : 'bg-white/5 opacity-40 cursor-not-allowed text-gray-600 border-transparent')}`}
                                                        >
                                                            <div className="relative shrink-0 w-20 h-14 bg-black/40 rounded-lg overflow-hidden border border-white/5">
                                                                <img src={playingAnime.bannerUrl || playingAnime.coverUrl} className={`w-full h-full object-cover transition-opacity ${isCurrent ? 'opacity-100' : (isReleased ? 'opacity-70' : 'opacity-30 grayscale')}`} alt="" />
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                                    {isReleased ? (
                                                                        <Play size={14} fill="currentColor" className={isCurrent ? 'text-white' : 'text-white/70'} />
                                                                    ) : (
                                                                        <span className="text-[9px] font-bold text-white/70 uppercase">Not Aired</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-left flex-1 min-w-0">
                                                                <div className="font-bold truncate text-sm">Episode {epNum}</div>
                                                                <div className="text-xs opacity-60 truncate">
                                                                    {!isReleased && playingAnime.nextAiringEpisode && epNum === playingAnime.nextAiringEpisode.episode
                                                                        ? `Airing in ${Math.round(playingAnime.nextAiringEpisode.timeUntilAiring / 86400)} days`
                                                                        : (isCurrent ? 'Now Playing' : 'Ready to Stream')}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Desktop Sidebar (Only on Large Screens) */}
                            {!isPlayerMinimized && playingAnime.format !== 'MOVIE' && (
                                <div className={`${isSidebarVisible ? 'w-80 lg:w-96 translate-x-0' : 'w-0 translate-x-full hidden'} hidden lg:flex bg-[#111] border-l border-white/5 flex-col transition-all duration-300 ease-in-out z-20 overflow-hidden no-scrollbar`}>
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

            {/* Developer Secret Code Unlock Modal */}
            {showDevCodeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-gray-900 border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
                        <div className="p-6 bg-gradient-to-r from-amber-950/40 to-gray-900 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Developer Access</h3>
                                    <p className="text-xs text-gray-400">Enter secret code to unlock debug tools</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowDevCodeModal(false);
                                    setSecretCodeInput('');
                                }}
                                className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUnlockDevMode} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                                    Secret Passcode
                                </label>
                                <input
                                    type="password"
                                    value={secretCodeInput}
                                    onChange={(e) => setSecretCodeInput(e.target.value)}
                                    placeholder="Enter passcode"
                                    className="w-full bg-black/60 border border-gray-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-mono"
                                    autoFocus
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDevCodeModal(false);
                                        setSecretCodeInput('');
                                    }}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                                >
                                    Unlock Mode
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <LegalDisclaimerModal
                isOpen={showTermsModal}
                onAccept={handleAcceptTerms}
                onCancel={() => setShowTermsModal(false)}
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
