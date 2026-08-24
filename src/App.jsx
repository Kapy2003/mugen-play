/**
 * Mugen Play
 * Created and Maintained by Kapy2003 (https://github.com/Kapy2003/)
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import AnimeDetailModal from './components/anime/AnimeDetailModal';
import ExtensionsView from './components/extensions/ExtensionsView';
import AddSourceModal from './components/extensions/AddSourceModal';
import DirectPlayModal from './components/player/DirectPlayModal';
import Toast from './components/common/Toast';
import SplashScreen from './components/common/SplashScreen';
import LegalDisclaimerModal from './components/common/LegalDisclaimerModal';
import UserGuideModal from './components/common/UserGuideModal';
import { INITIAL_EXTENSIONS } from './data/constants';
import { Key, X, AlertTriangle, Trash2 } from 'lucide-react';
import { AnilistSource } from './extensions/AnilistSource';
import { ExtensionRepoManager } from './lib/ExtensionRepoManager';
import { ExtensionHealthChecker } from './lib/ExtensionHealthChecker';
import { AnimeUrlResolver } from './lib/AnimeUrlResolver';
import { EpisodeMetadataService } from './lib/services/EpisodeMetadataService';

// View Components
import HomeView from './components/views/HomeView';
import BrowseView from './components/views/BrowseView';
import FavoritesView from './components/views/FavoritesView';
import SettingsView from './components/views/SettingsView';

// Platform-Specific Playback Components
import UnifiedPlaybackView from './components/player/UnifiedPlaybackView';

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
    });
    const [videoXOffset, setVideoXOffset] = useState(() => {
        const saved = localStorage.getItem('mugen_video_x_offset');
        return saved ? parseFloat(saved) : 0;
    });
    const [videoYOffset, setVideoYOffset] = useState(() => {
        const saved = localStorage.getItem('mugen_video_y_offset');
        return saved ? parseFloat(saved) : -72;
    });
    const [miniVideoYOffset, setMiniVideoYOffset] = useState(() => {
        const saved = localStorage.getItem('mugen_mini_video_y_offset');
        return saved ? parseFloat(saved) : -50;
    });
    const [miniVideoScale, setMiniVideoScale] = useState(() => {
        const saved = localStorage.getItem('mugen_mini_video_scale');
        return saved ? parseFloat(saved) : 1;
    });

    // Theme State (Dark / Light)
    const [theme, setTheme] = useState(() => localStorage.getItem('mugen_theme') || 'dark');

    // Developer & Secret Code Debugger State
    const [isDevUnlocked, setIsDevUnlocked] = useState(() => localStorage.getItem('mugen_dev_unlocked') === 'true');
    const [devMode, setDevMode] = useState(() => localStorage.getItem('mugen_dev_mode') === 'true');
    const [showDevCodeModal, setShowDevCodeModal] = useState(false);
    const [secretCodeInput, setSecretCodeInput] = useState('');
    const [versionClickCount, setVersionClickCount] = useState(0);

    const [isSidebarVisible, setIsSidebarVisible] = useState(true);

    const [extensions, setExtensions] = useState(() => {
        const saved = localStorage.getItem('mugen_extensions');
        let parsed = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(parsed) || parsed.length === 0) {
            parsed = INITIAL_EXTENSIONS.map(ext => ({ ...ext }));
        }

        const mangaTerms = ['manga', 'reading', 'read', 'comic', 'novel', 'scan', 'manhua', 'manhwa', 'webtoon', 'hentaistube', 'hentaizm', 'jav', 'xnxx', 'xvideos', 'missav', 'jable', 'newgrounds', 'drive.google', 'voircartoon'];
        parsed = parsed.filter(ext => {
            const name = (ext.name || '').toLowerCase();
            const url = (ext.url || ext.baseUrl || '').toLowerCase();
            return !mangaTerms.some(term => name.includes(term) || url.includes(term));
        });

        const hasAnilist = parsed.some(e => e.id === 'anilist_source');
        if (!hasAnilist && INITIAL_EXTENSIONS.length > 0) {
            parsed.unshift(INITIAL_EXTENSIONS[0]);
        }

        return parsed;
    });

    // Settings State
    const [contentFilter, setContentFilter] = useState(() => {
        return localStorage.getItem('mugen_content_filter') || 'ALL';
    });

    const [playbackSource, setPlaybackSource] = useState(() => {
        return localStorage.getItem('mugen_playback_source') || '';
    });

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
    const [popularList, setPopularList] = useState([]);
    const [topRatedList, setTopRatedList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isShelvesLoading, setIsShelvesLoading] = useState(false);
    const heroCarouselItems = useMemo(() => (trendingList || []).slice(0, 10), [trendingList]);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true);
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
    const [showUserGuide, setShowUserGuide] = useState(() => localStorage.getItem('mugen_has_seen_guide') !== 'true');
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

    const [currentEpisodePage, setCurrentEpisodePage] = useState(1);
    const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

    // Data Reset & Storage State
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState(false);

    // Right-Click Context Menu Restriction (Disabled until Developer Mode is Active)
    useEffect(() => {
        const handleContextMenu = (e) => {
            if (!devMode && !isDevUnlocked) {
                e.preventDefault();
            }
        };
        window.addEventListener('contextmenu', handleContextMenu);
        return () => window.removeEventListener('contextmenu', handleContextMenu);
    }, [devMode, isDevUnlocked]);

    // Navigation & History Handlers (#watch, #detail)
    const playerHistoryPushedRef = useRef(false);
    const detailHistoryPushedRef = useRef(false);

    useEffect(() => {
        if (playingAnime && !isPlayerMinimized) {
            if (!playerHistoryPushedRef.current) {
                playerHistoryPushedRef.current = true;
                try {
                    window.history.pushState({ mugenView: 'player-maximized' }, '', '#watch');
                } catch (err) {
                    console.warn('History push failed:', err);
                }
            }
        } else {
            playerHistoryPushedRef.current = false;
        }
    }, [playingAnime ? playingAnime.id || playingAnime.slug || true : null, isPlayerMinimized]);

    useEffect(() => {
        if (selectedAnime) {
            if (!detailHistoryPushedRef.current) {
                detailHistoryPushedRef.current = true;
                try {
                    window.history.pushState({ mugenView: 'anime-detail' }, '', '#detail');
                } catch (err) {
                    console.warn('History push failed:', err);
                }
            }
        } else {
            detailHistoryPushedRef.current = false;
        }
    }, [selectedAnime ? selectedAnime.id || selectedAnime.slug || true : null]);

    useEffect(() => {
        const handlePopState = () => {
            if (playingAnime && !isPlayerMinimized) {
                playerHistoryPushedRef.current = false;
                setIsPlayerMinimized(true);
                return;
            }
            if (selectedAnime) {
                detailHistoryPushedRef.current = false;
                setSelectedAnime(null);
                return;
            }
            if (showUserGuide) {
                setShowUserGuide(false);
                return;
            }
            if (showDevCodeModal) {
                setShowDevCodeModal(false);
                return;
            }
            if (showDeleteConfirmModal) {
                setShowDeleteConfirmModal(false);
                return;
            }
            if (showAddSource) {
                setShowAddSource(false);
                return;
            }
            if (showDirectPlay) {
                setShowDirectPlay(false);
                return;
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [playingAnime, isPlayerMinimized, selectedAnime, showUserGuide, showDevCodeModal, showDeleteConfirmModal, showAddSource, showDirectPlay]);

    // Data and Cache Handlers
    const handleClearCacheOnly = async () => {
        setIsClearingCache(true);
        try {
            if ('caches' in window) {
                const keys = await window.caches.keys();
                await Promise.all(keys.map(key => window.caches.delete(key)));
            }
            sessionStorage.clear();
            showToast("Temporary cache cleared successfully!", "success");
        } catch (err) {
            console.error("Failed to clear cache:", err);
            showToast("Cache cleared", "info");
        } finally {
            setTimeout(() => setIsClearingCache(false), 500);
        }
    };

    const handleDeleteEverything = async () => {
        try {
            localStorage.clear();
            sessionStorage.clear();
            if ('caches' in window) {
                const keys = await window.caches.keys();
                await Promise.all(keys.map(key => window.caches.delete(key)));
            }
            window.location.reload();
        } catch (err) {
            console.error("Failed to delete all data:", err);
            window.location.reload();
        }
    };

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        if (typeof document !== 'undefined' && document.startViewTransition) {
            document.startViewTransition(() => {
                setTheme(next);
            });
        } else {
            setTheme(next);
        }
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
            showToast("🎉 Developer Mode Unlocked!", "success");
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

    // Link health check on app mount
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

    // Deep Link Resolution (?anime=12345 or ?id=12345)
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const animeParam = params.get('anime') || params.get('id') || params.get('watch');
            if (animeParam) {
                const numId = parseInt(animeParam, 10);
                if (!isNaN(numId)) {
                    activeProvider.getAnimeDetails(numId).then(details => {
                        if (details) {
                            setSelectedAnime(details);
                        }
                    }).catch(err => {
                        console.warn('Failed to load shared anime:', err);
                    });
                }
            }
        } catch {}
    }, [activeProvider]);

    // Load Discovery Shelves for Home (Trending, Popular, Top Rated)
    useEffect(() => {
        let isMounted = true;
        const loadHomeShelves = async () => {
            setIsShelvesLoading(true);
            try {
                const homeFilters = {};
                if (contentFilter === 'SAFE') {
                    homeFilters.isAdult = false;
                } else if (contentFilter === 'NSFW') {
                    homeFilters.isAdult = true;
                }

                const [trendingData, popularData, topRatedData] = await Promise.all([
                    activeProvider.getTrending({ ...homeFilters, perPage: 25 }),
                    activeProvider.getPopular({ ...homeFilters, perPage: 25 }),
                    activeProvider.getTopRated({ ...homeFilters, perPage: 25 })
                ]);

                if (isMounted) {
                    setTrendingList(trendingData.results || []);
                    setPopularList(popularData.results || []);
                    setTopRatedList(topRatedData.results || []);
                }
            } catch (err) {
                console.error("Error loading home shelves from AniList:", err);
            } finally {
                if (isMounted) {
                    setIsShelvesLoading(false);
                }
            }
        };

        loadHomeShelves();
        return () => {
            isMounted = false;
        };
    }, [activeProvider, contentFilter]);

    // Load Paginated Content for Browse (Search & Filter Engine)
    useEffect(() => {
        let isMounted = true;
        const loadBrowseContent = async () => {
            setIsLoading(true);
            try {
                const effectiveFilters = { ...filters, page, perPage: 49 };
                if (contentFilter === 'SAFE') {
                    effectiveFilters.isAdult = false;
                } else if (contentFilter === 'NSFW') {
                    effectiveFilters.isAdult = true;
                }

                const data = await activeProvider.search(searchQuery, effectiveFilters);
                if (isMounted) {
                    setAnimeList(data.results || []);
                    setHasNextPage(data.meta?.hasNextPage || false);
                    setTotalPages(data.meta?.lastPage || 1);
                }
            } catch (err) {
                console.error("Error loading browse content from AniList:", err);
                if (isMounted) {
                    setToast({ message: 'Error loading content from AniList', type: 'error' });
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        const timeoutId = setTimeout(loadBrowseContent, 350);
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [activeProvider, searchQuery, filters, contentFilter, page]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    // Watch History & Progress Logic
    const addToHistory = useCallback((anime, episode = null, progress = 0, duration = 0) => {
        if (!anime || !anime.id) return;

        setWatchHistory(prev => {
            const existing = prev.find(i => i.id === anime.id);
            const newItem = {
                ...anime,
                lastEpisode: episode || (existing ? existing.lastEpisode : 1),
                progress: progress,
                duration: duration,
                lastWatchedAt: Date.now()
            };

            const validHistory = prev.filter(i => i && i.id && i.id !== anime.id);
            const newHistory = [newItem, ...validHistory].slice(0, 50);
            localStorage.setItem('mugen_watch_history', JSON.stringify(newHistory));
            return newHistory;
        });
    }, []);

    const playbackRef = useRef({ id: null, episode: null, progress: 0, duration: 0 });
    const lastSaveTime = useRef(0);

    const saveProgress = useCallback(() => {
        const current = playbackRef.current;
        if (!current.id) return;

        if (selectedAnime && selectedAnime.id === current.id) {
            addToHistory(selectedAnime, current.episode, current.progress, current.duration);
        }
    }, [selectedAnime, addToHistory]);

    const reportProgress = useCallback((currentTime, duration) => {
        if (!playingAnime) return;

        playbackRef.current = {
            id: selectedAnime?.id || playingAnime?.id,
            episode: selectedAnime?.episodes?.find(e => e.url === playingAnime.url)?.number || playingAnime.episodeNumber,
            progress: currentTime,
            duration: duration
        };

        const now = Date.now();
        if (now - lastSaveTime.current > 15000) {
            saveProgress();
            lastSaveTime.current = now;
        }
    }, [playingAnime, selectedAnime, saveProgress]);

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

    const handleRemoveFavorite = (animeOrId) => {
        const targetId = typeof animeOrId === 'object' && animeOrId !== null
            ? (animeOrId.id !== undefined ? animeOrId.id : (animeOrId._id || animeOrId.slug))
            : animeOrId;

        setFavorites(prev => {
            const newFavorites = prev.filter(item => {
                const itemId = item.id !== undefined ? item.id : (item._id || item.slug);
                return String(itemId) !== String(targetId) && itemId !== targetId;
            });
            localStorage.setItem('mugen_favorites', JSON.stringify(newFavorites));
            return newFavorites;
        });
        showToast("Removed from Favorites", "info");
    };

    const handleRemoveMultipleFavorites = (animeOrIds) => {
        if (!animeOrIds || animeOrIds.length === 0) return;
        const targetIds = animeOrIds.map(item =>
            typeof item === 'object' && item !== null
                ? String(item.id !== undefined ? item.id : (item._id || item.slug))
                : String(item)
        );
        const idsSet = new Set(targetIds);

        setFavorites(prev => {
            const newFavorites = prev.filter(item => {
                const itemId = item.id !== undefined ? String(item.id) : String(item._id || item.slug);
                return !idsSet.has(itemId);
            });
            localStorage.setItem('mugen_favorites', JSON.stringify(newFavorites));
            return newFavorites;
        });
        showToast(`Removed ${animeOrIds.length} anime from Favorites`, "info");
    };

    const saveExtensions = (updatedExtensions) => {
        localStorage.setItem('mugen_extensions', JSON.stringify(updatedExtensions));
        setExtensions(updatedExtensions);
    };

    const cycleContentFilter = (val) => {
        setContentFilter(val);
        localStorage.setItem('mugen_content_filter', val);
        showToast(`Content Filter: ${val}`, 'success');
        setPage(1);
    };

    const handlePlay = async (anime, episodeNumber = null, overrideSource = null) => {
        try {
            const targetExt = (overrideSource && extensions.find(e => e.id === overrideSource && e.type !== 'metadata' && e.enabled !== false))
                || extensions.find(e => e.id === playbackSource && e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false)
                || extensions.find(e => e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false)
                || null;

            const effectiveSource = targetExt ? targetExt.id : (overrideSource || playbackSource || '');
            if (effectiveSource) {
                setPlaybackSource(effectiveSource);
                localStorage.setItem('mugen_playback_source', effectiveSource);
            }

            setSelectedAnime(null);
            setIsPlayerMinimized(false);
            setIsSidebarVisible(true);

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

            addToHistory(anime, targetEpisodeNumber, initialTime, 0);

            if (targetEpisodeNumber) {
                const newPage = Math.ceil(targetEpisodeNumber / 12);
                setCurrentEpisodePage(newPage);
            } else {
                setCurrentEpisodePage(1);
            }

            const baseTitle = (anime.title?.english || anime.title?.romaji || (typeof anime.title === 'string' ? anime.title : '') || anime.name || '').split(' - Episode')[0].trim();
            const targetNum = targetEpisodeNumber || 1;

            const { streamUrl, episodesList, resolvedSlug } = AnimeUrlResolver.resolveStream(anime, targetNum, targetExt, extensions);

            if (targetExt) {
                showToast(`Loaded ${targetExt.name}: Ep ${targetNum}`, 'success');
            } else {
                showToast(`Playing Ep ${targetNum}`, 'success');
            }

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

            EpisodeMetadataService.enrichAnimeEpisodes({ ...anime, episodesList }).then(enriched => {
                if (enriched && enriched.length > 0) {
                    setPlayingAnime(prev => {
                        if (!prev) return null;
                        const prevTitle = prev.title ? prev.title.split(' - Episode')[0].trim() : '';
                        if (prev.id === anime.id || prevTitle === baseTitle) {
                            return { ...prev, episodesList: enriched };
                        }
                        return prev;
                    });
                }
            }).catch(() => {});

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
        if (tab === activeTab) return;

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
        setVideoScale(1);
    };

    const handleResetExtensions = () => {
        if (confirm('Are you sure you want to restore default extensions? Custom sources will be kept.')) {
            const customSources = extensions.filter(e => e.type === 'custom');
            const initialSources = INITIAL_EXTENSIONS.map(ext => ({ ...ext }));
            const merged = [...initialSources, ...customSources];
            const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());

            saveExtensions(unique);
            showToast('Default extensions restored', 'success');
        }
    };

    const handleToggleExtension = (id) => {
        const target = extensions.find(e => e.id === id);
        if (!target) return;

        const isDisabling = target.enabled !== false;
        const updated = extensions.map(ext => {
            if (ext.id === id) {
                return { ...ext, enabled: !ext.enabled };
            }
            return ext;
        });

        saveExtensions(updated);
        showToast(`${target.name} ${isDisabling ? 'disabled' : 'enabled'}`, 'success');

        if (isDisabling && playingAnime) {
            const activeEnabledExt = updated.find(e => e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false);
            if (!activeEnabledExt) {
                setPlayingAnime(prev => prev ? {
                    ...prev,
                    url: '',
                    streamUrl: '',
                    source: ''
                } : null);
            } else if (playbackSource === id) {
                setPlaybackSource(activeEnabledExt.id);
                localStorage.setItem('mugen_playback_source', activeEnabledExt.id);
                handlePlay(playingAnime, playingAnime.currentEpisode || 1, activeEnabledExt.id);
            }
        }
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        setPage(1);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            if (value === '' || value === 'Any') {
                delete newFilters[key];
            } else {
                newFilters[key] = key === 'year' ? parseInt(value) : value;
            }
            return newFilters;
        });
        setPage(1);
        setActiveTab('browse');
    };

    const handleResetFilters = () => {
        setFilters({});
        setSearchQuery('');
        setPage(1);
        showToast("Filters and search cleared", "info");
    };

    // Render Active Tab Content
    const renderContent = () => {
        switch (activeTab) {
            case 'extensions':
                return (
                    <ExtensionsView
                        extensions={extensions}
                        onToggle={handleToggleExtension}
                        onAddSource={() => {
                            setEditingExtension(null);
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
                    <BrowseView
                        animeList={animeList}
                        isLoading={isLoading}
                        searchQuery={searchQuery}
                        onSearch={handleSearch}
                        onClearSearch={() => {
                            setSearchQuery('');
                            setPage(1);
                        }}
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onResetFilters={handleResetFilters}
                        page={page}
                        setPage={setPage}
                        totalPages={totalPages}
                        hasNextPage={hasNextPage}
                        contentFilter={contentFilter}
                        onCycleContentFilter={cycleContentFilter}
                        hasNsfwExtension={hasNsfwExtension}
                        showSourceMenu={showSourceMenu}
                        setShowSourceMenu={setShowSourceMenu}
                        onSelectAnime={setSelectedAnime}
                        watchHistory={watchHistory}
                    />
                );

            case 'favorites':
                return (
                    <FavoritesView
                        favorites={favorites}
                        onSelectAnime={setSelectedAnime}
                        onRemoveFavorite={handleRemoveFavorite}
                        onRemoveMultipleFavorites={handleRemoveMultipleFavorites}
                    />
                );

            case 'settings':
                return (
                    <SettingsView
                        contentFilter={contentFilter}
                        cycleContentFilter={cycleContentFilter}
                        hasNsfwExtension={hasNsfwExtension}
                        theme={theme}
                        setTheme={setTheme}
                        showToast={showToast}
                        isDevUnlocked={isDevUnlocked}
                        devMode={devMode}
                        setDevMode={setDevMode}
                        setShowDevCodeModal={setShowDevCodeModal}
                        handleLockDevMode={handleLockDevMode}
                        videoYOffset={videoYOffset}
                        setVideoYOffset={setVideoYOffset}
                        miniVideoYOffset={miniVideoYOffset}
                        setMiniVideoYOffset={setMiniVideoYOffset}
                        videoScale={videoScale}
                        setVideoScale={setVideoScale}
                        miniVideoScale={miniVideoScale}
                        setMiniVideoScale={setMiniVideoScale}
                        playingAnime={playingAnime}
                        isClearingCache={isClearingCache}
                        handleClearCacheOnly={handleClearCacheOnly}
                        setShowDeleteConfirmModal={setShowDeleteConfirmModal}
                        handleVersionClick={handleVersionClick}
                        onOpenUserGuide={() => setShowUserGuide(true)}
                    />
                );

            case 'home':
            default:
                return (
                    <HomeView
                        trendingList={trendingList}
                        popularList={popularList}
                        topRatedList={topRatedList}
                        heroCarouselItems={heroCarouselItems}
                        isShelvesLoading={isShelvesLoading}
                        watchHistory={watchHistory}
                        favorites={favorites}
                        hasDismissedExtensionNotice={hasDismissedExtensionNotice}
                        onDismissExtensionNotice={() => {
                            setHasDismissedExtensionNotice(true);
                            localStorage.setItem('mugen_has_seen_extension_prompt', 'true');
                        }}
                        theme={theme}
                        toggleTheme={toggleTheme}
                        onPlay={handlePlay}
                        onInfo={setSelectedAnime}
                        onRandomPlay={() => {
                            const pool = [...trendingList, ...popularList, ...topRatedList];
                            if (pool.length > 0) {
                                const random = pool[Math.floor(Math.random() * pool.length)];
                                handlePlay(random);
                            } else {
                                showToast("Loading anime catalog...", "info");
                            }
                        }}
                        onDirectPlay={() => setShowDirectPlay(true)}
                        onNavigateTab={handleTabChange}
                        onRemoveFromHistory={removeFromHistory}
                        onOpenUserGuide={() => setShowUserGuide(true)}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-red-500/30">
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

            {/* Sidebar Navigation */}
            <Sidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
                width={sidebarWidth}
                setWidth={setSidebarWidth}
                collapsed={isSidebarCollapsed}
                setCollapsed={setIsSidebarCollapsed}
            />

            {/* Main Content Area */}
            <main
                className="flex-1 min-w-0 min-h-screen relative transition-[margin] duration-150 pb-24 lg:pb-8"
                style={{ marginLeft: isDesktop ? (isSidebarCollapsed ? 80 : (sidebarWidth || 256)) : 0 }}
            >
                {renderContent()}
            </main>

            {/* Unified Continuous Playback View (Persistent VideoPlayer DOM Node across Minimized & Maximized) */}
            {playingAnime && (
                <UnifiedPlaybackView
                    playingAnime={playingAnime}
                    isMinimized={isPlayerMinimized}
                    isDesktop={isDesktop}
                    onMinimize={() => setIsPlayerMinimized(true)}
                    onExpand={() => setIsPlayerMinimized(false)}
                    onClose={() => setPlayingAnime(null)}
                    extensions={extensions}
                    playbackSource={playbackSource}
                    onSelectSource={(newSourceId) => {
                        setPlaybackSource(newSourceId);
                        handlePlay(playingAnime, playingAnime?.currentEpisode || 1, newSourceId);
                    }}
                    videoScale={videoScale}
                    videoXOffset={videoXOffset}
                    videoYOffset={videoYOffset}
                    miniVideoScale={miniVideoScale}
                    miniVideoYOffset={miniVideoYOffset}
                    devMode={devMode}
                    onUpdateStreamUrl={(newUrl) => setPlayingAnime(prev => prev ? { ...prev, url: newUrl, streamUrl: newUrl } : null)}
                    reportProgress={reportProgress}
                    saveProgress={saveProgress}
                    onOpenExtensionStore={() => {
                        setActiveTab('extensions');
                        setPlayingAnime(null);
                    }}
                    onRetry={async () => {
                        if (playingAnime) {
                            await handlePlay(playingAnime, playingAnime.currentEpisode || 1);
                        }
                    }}
                    isSidebarVisible={isSidebarVisible}
                    setIsSidebarVisible={setIsSidebarVisible}
                    currentEpisodePage={currentEpisodePage}
                    setCurrentEpisodePage={setCurrentEpisodePage}
                    onPlayEpisode={handlePlay}
                />
            )}

            {/* Modals & Overlays */}
            <AnimeDetailModal
                isOpen={Boolean(selectedAnime)}
                anime={selectedAnime}
                onClose={() => setSelectedAnime(null)}
                onPlay={handlePlay}
                isFavorite={selectedAnime && favorites.some(f => f.id === selectedAnime.id)}
                onToggleFavorite={toggleFavorite}
                showToast={showToast}
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

            {/* User Guide & Instructions Modal (Only display after splash completes) */}
            {!showSplash && (
                <UserGuideModal
                    isOpen={showUserGuide}
                    onClose={() => setShowUserGuide(false)}
                />
            )}

            {/* Developer Secret Code Unlock Modal */}
            {showDevCodeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="dev-code-modal-card bg-gray-900 border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
                        <div className="dev-code-modal-header p-6 bg-gradient-to-r from-amber-950/40 to-gray-900 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h3 className="dev-code-modal-title text-base font-bold text-white">Developer Access</h3>
                                    <p className="dev-code-modal-subtitle text-xs text-gray-400">Enter secret code to unlock debug tools</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowDevCodeModal(false);
                                    setSecretCodeInput('');
                                }}
                                className="dev-code-modal-close p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUnlockDevMode} className="p-6 space-y-4">
                            <div>
                                <label className="dev-code-modal-label text-xs font-semibold text-gray-300 block mb-1.5">
                                    Secret Passcode
                                </label>
                                <input
                                    type="password"
                                    value={secretCodeInput}
                                    onChange={(e) => setSecretCodeInput(e.target.value)}
                                    placeholder="Enter passcode"
                                    className="dev-code-modal-input w-full bg-black/60 border border-gray-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-mono"
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
                                    className="dev-code-modal-btn-cancel px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer active-press"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer active-press"
                                >
                                    Unlock Mode
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Everything Confirmation Modal */}
            {showDeleteConfirmModal && (
                <div className="delete-modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade-in">
                    <div className="delete-modal-card bg-gray-900 border border-red-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
                        <div className="delete-modal-header p-6 bg-gradient-to-r from-red-950/80 via-gray-900 to-gray-900 border-b border-red-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="delete-modal-title text-base font-bold text-white">Reset All App Data?</h3>
                                    <p className="delete-modal-subtitle text-xs text-red-300/80">This action cannot be undone</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDeleteConfirmModal(false)}
                                className="delete-modal-close p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="delete-modal-body p-6 space-y-4">
                            <p className="delete-modal-desc text-sm text-gray-300 leading-relaxed">
                                This will permanently erase:
                            </p>
                            <ul className="delete-modal-list text-xs text-gray-400 space-y-1.5 list-disc list-inside bg-black/40 p-3.5 rounded-xl border border-white/5 font-medium">
                                <li>All Watch History &amp; Episode progress</li>
                                <li>Saved Favorites &amp; Bookmarks</li>
                                <li>Custom Extensions &amp; Source configurations</li>
                                <li>Player Calibration offsets &amp; Zoom levels</li>
                                <li>Temporary App &amp; Image Cache</li>
                            </ul>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowDeleteConfirmModal(false)}
                                    className="delete-modal-btn-cancel px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer active-press"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteEverything}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/30 cursor-pointer active-press flex items-center gap-1.5"
                                >
                                    <Trash2 size={14} />
                                    Yes, Delete Everything
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!showSplash && (
                <LegalDisclaimerModal
                    isOpen={showTermsModal}
                    onAccept={handleAcceptTerms}
                    onCancel={() => setShowTermsModal(false)}
                />
            )}

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
