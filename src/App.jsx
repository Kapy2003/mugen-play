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
import { Search, Play, ArrowLeft, X, Maximize2, PanelRight, Filter, Compass, Shuffle, Star, Heart, Code, Sliders, Link, Copy, Sun, Moon, Key, Lock, ChevronRight, Film, Flame, Trophy, RotateCcw, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { AnilistSource } from './extensions/AnilistSource';
import HeroCarousel from './components/home/HeroCarousel';
import HorizontalScrollList from './components/common/HorizontalScrollList';
import SourceSelector from './components/common/SourceSelector';
import { ExtensionRepoManager } from './lib/ExtensionRepoManager';
import { ExtensionHealthChecker } from './lib/ExtensionHealthChecker';
import { AnimeUrlResolver } from './lib/AnimeUrlResolver';
import { EpisodeMetadataService } from './lib/services/EpisodeMetadataService';

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
    const [popularList, setPopularList] = useState([]);
    const [topRatedList, setTopRatedList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isShelvesLoading, setIsShelvesLoading] = useState(false);
    const heroCarouselItems = useMemo(() => (trendingList || []).slice(0, 10), [trendingList]);
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
    
    // Data Reset & Storage State
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState(false);

    // Draggable Miniplayer Position & 120fps Hardware-Accelerated Physics
    const miniPlayerRef = useRef(null);
    const miniPosRef = useRef({ x: 0, y: 0 });
    const miniDragOriginRef = useRef({ hasMoved: false });
    const headerTouchStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const miniEl = miniPlayerRef.current;
        if (!miniEl || !isPlayerMinimized) return;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initX = 0;
        let initY = 0;

        const onPointerDown = (e) => {
            // If touching close or expand button, let click pass through
            if (e.target.closest('.minimized-btn') || e.target.closest('button')) {
                return;
            }
            isDragging = true;
            miniDragOriginRef.current.hasMoved = false;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            startX = clientX;
            startY = clientY;
            initX = miniPosRef.current.x;
            initY = miniPosRef.current.y;

            miniEl.style.transition = 'none';
            miniEl.style.willChange = 'transform';
        };

        const onPointerMove = (e) => {
            if (!isDragging) return;
            // 100% prevent background page scrolling
            if (e.cancelable) {
                e.preventDefault();
                e.stopPropagation();
            }

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const dx = clientX - startX;
            const dy = clientY - startY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                miniDragOriginRef.current.hasMoved = true;
            }

            const newX = initX + dx;
            const newY = initY + dy;
            miniPosRef.current = { x: newX, y: newY };

            // Direct hardware transform at native 120fps
            miniEl.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
        };

        const onPointerUp = (e) => {
            if (!isDragging) return;
            isDragging = false;

            const clientX = e.changedTouches ? e.changedTouches[0].clientX : (e.clientX || startX);
            const dx = clientX - startX;

            // Dismiss if swiped off-screen horizontally (> 160px)
            if (Math.abs(dx) > 160) {
                setPlayingAnime(null);
                miniPosRef.current = { x: 0, y: 0 };
                return;
            }

            // Magnetic 4-Corner / Edge Snapping with safe margins
            if (typeof window !== 'undefined') {
                const screenW = window.innerWidth;
                const screenH = window.innerHeight;
                const miniW = screenW < 640 ? screenW - 24 : 384;
                const miniH = screenW < 640 ? 192 : 224;

                const maxLeftX = -(screenW - miniW - 24);
                const currentX = miniPosRef.current.x;
                const targetSnapX = currentX < maxLeftX / 2 ? maxLeftX : 0;

                const minY = -(screenH - miniH - 120);
                const currentY = miniPosRef.current.y;
                const clampedY = Math.min(0, Math.max(minY, currentY));
                let targetSnapY = clampedY;
                if (currentY < minY * 0.7) {
                    targetSnapY = minY;
                } else if (currentY > minY * 0.3) {
                    targetSnapY = 0;
                }

                miniEl.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
                miniEl.style.transform = `translate3d(${targetSnapX}px, ${targetSnapY}px, 0)`;
                miniPosRef.current = { x: targetSnapX, y: targetSnapY };

                setTimeout(() => {
                    miniDragOriginRef.current.hasMoved = false;
                }, 100);
            }
        };

        miniEl.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp, { passive: false });
        window.addEventListener('touchcancel', onPointerUp, { passive: false });

        miniEl.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        return () => {
            miniEl.removeEventListener('touchstart', onPointerDown);
            window.removeEventListener('touchmove', onPointerMove);
            window.removeEventListener('touchend', onPointerUp);
            window.removeEventListener('touchcancel', onPointerUp);

            miniEl.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
        };
    }, [isPlayerMinimized]);

    // Fullscreen Topbar Pull-to-Minimize Handlers
    const handleHeaderTouchStart = (e) => {
        if (e.touches?.[0]) {
            headerTouchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
    };

    const handleHeaderTouchEnd = (e) => {
        if (!e.changedTouches?.[0]) return;
        const diffY = e.changedTouches[0].clientY - headerTouchStartRef.current.y;
        const diffX = e.changedTouches[0].clientX - headerTouchStartRef.current.x;
        if (diffY > 50 && diffY > Math.abs(diffX)) {
            setIsPlayerMinimized(true);
        }
    };

    // Browser History / Mobile Back Button Navigation Interceptor
    // Uses in-page hash navigation (#watch, #detail) so mobile browsers never trigger document reloads
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
            // 1. If video is playing maximized, minimize it
            if (playingAnime && !isPlayerMinimized) {
                playerHistoryPushedRef.current = false;
                setIsPlayerMinimized(true);
                return;
            }
            // 2. If detail modal is open, close it
            if (selectedAnime) {
                detailHistoryPushedRef.current = false;
                setSelectedAnime(null);
                return;
            }
            // 3. If dev code modal is open, close it
            if (showDevCodeModal) {
                setShowDevCodeModal(false);
                return;
            }
            // 4. If delete confirm modal is open, close it
            if (showDeleteConfirmModal) {
                setShowDeleteConfirmModal(false);
                return;
            }
            // 5. If add source modal is open, close it
            if (showAddSource) {
                setShowAddSource(false);
                return;
            }
            // 6. If direct play modal is open, close it
            if (showDirectPlay) {
                setShowDirectPlay(false);
                return;
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [playingAnime, isPlayerMinimized, selectedAnime, showDevCodeModal, showDeleteConfirmModal, showAddSource, showDirectPlay]);

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
            // Clear all localStorage keys
            localStorage.clear();
            sessionStorage.clear();
            if ('caches' in window) {
                const keys = await window.caches.keys();
                await Promise.all(keys.map(key => window.caches.delete(key)));
            }

            // Reset state
            setWatchHistory([]);
            setFavorites([]);
            setExtensions(INITIAL_EXTENSIONS);
            setTheme('dark');
            setDevMode(false);
            setIsDevUnlocked(false);
            setVideoYOffset(0);
            setMiniVideoYOffset(-50);
            setVideoScale(1);
            setMiniVideoScale(1);
            setContentFilter('ALL');
            setShowDeleteConfirmModal(false);

            showToast("All data, cache, and preferences have been wiped clean!", "success");
        } catch (err) {
            console.error("Failed to delete all data:", err);
            showToast("Data reset completed", "info");
            setShowDeleteConfirmModal(false);
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

    // --- Handlers ---
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    // --- History & Progress Logic ---
    const addToHistory = (anime, episode = null, progress = 0, duration = 0) => {
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

            // Filter out invalid items just in case
            const validHistory = prev.filter(i => i && i.id && i.id !== anime.id);

            const newHistory = [newItem, ...validHistory].slice(0, 50);
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

        // Persist to localStorage throttled (every 15 seconds)
        const now = Date.now();
        if (now - lastSaveTime.current > 15000) {
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

    const handlePlay = async (anime, episodeNumber = null, overrideSource = null) => {
        try {
            // Find target video streaming extension (exclude metadata providers like AniList and ensure enabled !== false)
            const targetExt = (overrideSource && extensions.find(e => e.id === overrideSource && e.type !== 'metadata' && e.enabled !== false))
                || extensions.find(e => e.id === playbackSource && e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false)
                || extensions.find(e => e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false)
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

            // Asynchronously enrich episode titles, thumbnails, and descriptions
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

        const isDisabling = target.enabled !== false;
        const updated = extensions.map(ext => {
            if (ext.id === id) {
                return { ...ext, enabled: !ext.enabled };
            }
            return ext;
        });

        saveExtensions(updated);
        showToast(`${target.name} ${isDisabling ? 'disabled' : 'enabled'}`, 'success');

        // If disabling the current streaming extension, immediately update player
        if (isDisabling && playingAnime) {
            const activeEnabledExt = updated.find(e => e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false);
            if (!activeEnabledExt) {
                // No active streaming extension -> clear stream URL to trigger mascot
                setPlayingAnime(prev => prev ? {
                    ...prev,
                    url: '',
                    streamUrl: '',
                    source: ''
                } : null);
            } else if (playbackSource === id) {
                // Switch to next available enabled extension
                setPlaybackSource(activeEnabledExt.id);
                localStorage.setItem('mugen_playback_source', activeEnabledExt.id);
                handlePlay(playingAnime, playingAnime.currentEpisode || 1, activeEnabledExt.id);
            }
        }
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

    const handleResetFilters = () => {
        setFilters({});
        setSearchQuery('');
        setPage(1);
        showToast("Filters and search cleared", "info");
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

            case 'browse': {
                const activeFilterCount = Object.keys(filters).length + (contentFilter !== 'ALL' ? 1 : 0);
                const GENRES = [
                    'All', 'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
                    'Romance', 'Sci-Fi', 'Supernatural', 'Mystery', 'Thriller',
                    'Slice of Life', 'Sports', 'Mecha', 'Horror', 'Ecchi'
                ];

                return (
                    <div className="p-3 sm:p-8 flex flex-col gap-4 sm:gap-6 animate-fade-in max-w-full overflow-hidden">
                        <div className="flex flex-col gap-5">
                            {/* Header Row */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                                        <Compass className="w-6 h-6 text-red-500" />
                                        <span>{searchQuery ? `Search: "${searchQuery}"` : (filters.genre ? `${filters.genre} Anime` : 'Browse Catalog')}</span>
                                    </h2>
                                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                                        Explore, filter, and stream from thousands of titles via AniList
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold hidden sm:inline-flex items-center gap-1.5">
                                        AniList Engine
                                    </span>
                                    <button
                                        onClick={() => setShowSourceMenu(!showSourceMenu)}
                                        className={`px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-md ${showSourceMenu || activeFilterCount > 0 ? 'bg-red-600 text-white shadow-red-900/30' : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'}`}
                                        title="Toggle Filter Options"
                                    >
                                        <Filter className="w-4 h-4" />
                                        <span>Filters</span>
                                        {activeFilterCount > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-white text-red-600 text-[10px] font-black">
                                                {activeFilterCount}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Instant Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search anime by English or Romaji title (e.g. Solo Leveling, Bleach, Attack on Titan)..."
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    className="w-full pl-10 pr-10 py-3 bg-gray-900 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all border border-gray-800 hover:border-gray-700 text-sm shadow-inner"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setPage(1);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                                        title="Clear search"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Quick Genre Filter Pills */}
                            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 select-none touch-pan-x overscroll-x-contain">
                                {GENRES.map(g => {
                                    const isSelected = (g === 'All' && !filters.genre) || (filters.genre === g);
                                    return (
                                        <button
                                            key={g}
                                            onClick={() => {
                                                handleFilterChange('genre', g === 'All' ? '' : g);
                                            }}
                                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                                isSelected
                                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30 ring-1 ring-red-400'
                                                    : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800 hover:border-gray-700'
                                            }`}
                                        >
                                            {g}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Advanced Filters Drawer */}
                            {showSourceMenu && (
                                <div className="bg-gray-900/95 border border-gray-800 rounded-2xl p-4 sm:p-5 flex flex-wrap gap-4 animate-fade-in shadow-xl items-end">
                                    {/* Sort */}
                                    <div className="space-y-1.5 flex-1 min-w-[140px]">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort Order</label>
                                        <select
                                            value={filters.sort || 'POPULARITY_DESC'}
                                            onChange={(e) => handleFilterChange('sort', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                                        >
                                            <option value="POPULARITY_DESC">🔥 Most Popular</option>
                                            <option value="TRENDING_DESC">📈 Trending</option>
                                            <option value="SCORE_DESC">⭐ Highest Rated</option>
                                            <option value="FAVOURITES_DESC">❤️ Most Favorites</option>
                                            <option value="START_DATE_DESC">🆕 Newest</option>
                                            <option value="START_DATE">⏳ Oldest</option>
                                            <option value="TITLE_ENGLISH">🔤 Title (A-Z)</option>
                                        </select>
                                    </div>

                                    {/* Format */}
                                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Format</label>
                                        <select
                                            value={filters.format || ''}
                                            onChange={(e) => handleFilterChange('format', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                                        >
                                            <option value="">Any Format</option>
                                            <option value="TV">TV Show</option>
                                            <option value="MOVIE">Movie</option>
                                            <option value="TV_SHORT">TV Short</option>
                                            <option value="OVA">OVA</option>
                                            <option value="ONA">ONA</option>
                                            <option value="SPECIAL">Special</option>
                                        </select>
                                    </div>

                                    {/* Season */}
                                    <div className="space-y-1.5 flex-1 min-w-[110px]">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Season</label>
                                        <select
                                            value={filters.season || ''}
                                            onChange={(e) => handleFilterChange('season', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                                        >
                                            <option value="">Any Season</option>
                                            <option value="WINTER">Winter</option>
                                            <option value="SPRING">Spring</option>
                                            <option value="SUMMER">Summer</option>
                                            <option value="FALL">Fall</option>
                                        </select>
                                    </div>

                                    {/* Year */}
                                    <div className="space-y-1.5 flex-1 min-w-[100px]">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Year</label>
                                        <select
                                            value={filters.year || ''}
                                            onChange={(e) => handleFilterChange('year', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                                        >
                                            <option value="">Any Year</option>
                                            {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                                        <select
                                            value={filters.status || ''}
                                            onChange={(e) => handleFilterChange('status', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                                        >
                                            <option value="">Any Status</option>
                                            <option value="RELEASING">Airing</option>
                                            <option value="FINISHED">Finished</option>
                                            <option value="NOT_YET_RELEASED">Upcoming</option>
                                            <option value="CANCELLED">Cancelled</option>
                                            <option value="HIATUS">Hiatus</option>
                                        </select>
                                    </div>

                                    {/* Content Rating */}
                                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Content</label>
                                        <select
                                            value={contentFilter}
                                            onChange={(e) => cycleContentFilter(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                                        >
                                            <option value="ALL">All (Safe + NSFW)</option>
                                            <option value="SAFE">Safe Only</option>
                                            {hasNsfwExtension && <option value="NSFW">NSFW Only</option>}
                                        </select>
                                    </div>

                                    {/* Reset Filters Button */}
                                    {(Object.keys(filters).length > 0 || searchQuery) && (
                                        <div className="flex-1 min-w-[130px]">
                                            <button
                                                onClick={handleResetFilters}
                                                className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 border border-gray-700 cursor-pointer"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                <span>Reset Filters</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex h-64 items-center justify-center">
                                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}

                        {/* 49-Card Paginated Grid */}
                        {!isLoading && animeList.length > 0 && (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-6 w-full">
                                    {animeList.map(anime => {
                                        const historyItem = watchHistory.find(h => h.id === anime.id);
                                        return (
                                            <AnimeCard
                                                key={anime.id}
                                                anime={{
                                                    ...anime,
                                                    title: formatAnimeTitle(anime.title || anime.name),
                                                    lastEpisode: historyItem ? historyItem.lastEpisode : null
                                                }}
                                                onClick={setSelectedAnime}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Pagination Controls */}
                                <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className={`px-4 py-2 rounded-xl border font-medium text-sm transition-colors cursor-pointer ${page === 1
                                            ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                                            : 'border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 bg-gray-900'
                                            }`}
                                    >
                                        Previous
                                    </button>
                                    <span className="text-gray-400 font-medium text-sm">Page {page} of {totalPages || '?'}</span>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={!hasNextPage}
                                        className={`px-4 py-2 rounded-xl border font-medium text-sm transition-colors cursor-pointer ${!hasNextPage
                                            ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                                            : 'border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 bg-gray-900'
                                            }`}
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Empty State */}
                        {!isLoading && animeList.length === 0 && (
                            <div className="text-center py-20 bg-gray-900/50 border border-gray-800 rounded-3xl p-8 max-w-lg mx-auto">
                                <Search className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                <h3 className="text-lg font-bold text-white mb-1">No Anime Found</h3>
                                <p className="text-sm text-gray-400 mb-6">
                                    We couldn&apos;t find any titles matching your query or filter criteria.
                                </p>
                                <button
                                    onClick={handleResetFilters}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-900/30 cursor-pointer"
                                >
                                    Clear Filters &amp; Search
                                </button>
                            </div>
                        )}
                    </div>
                );
            }

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
                                    className="dev-locked-card bg-gradient-to-r from-amber-950/20 via-gray-900 to-gray-900 p-5 rounded-xl border border-amber-500/20 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all group shadow-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 group-hover:text-amber-300 transition-colors">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
                                                Developer Options
                                            </h3>
                                            <p className="text-xs text-gray-400">Advanced stream diagnostics & viewport tools</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors" />
                                </div>
                            ) : (
                                <div className="settings-card dev-unlocked-card bg-gradient-to-br from-amber-950/30 via-gray-900 to-gray-900 p-6 rounded-xl border border-amber-500/30 space-y-6 animate-fade-in shadow-xl">
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
                                            Viewport Calibration (Desktop: 0px / -72px | Mobile: -62px | Mini: -50px)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="settings-subcard p-3 bg-black/40 border border-gray-800 rounded-xl space-y-2">
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
                                                            setVideoYOffset(0);
                                                            localStorage.setItem('mugen_video_y_offset', '0');
                                                            showToast("Max Player Offset set to 0px (Standard Live View)", "success");
                                                        }}
                                                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${videoYOffset === 0 ? 'bg-amber-500 text-black font-bold border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'}`}
                                                    >
                                                        Default: 0px
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setVideoYOffset(-72);
                                                            localStorage.setItem('mugen_video_y_offset', '-72');
                                                            showToast("Max Player Offset set to -72px (Desktop Crop)", "success");
                                                        }}
                                                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${videoYOffset === -72 ? 'bg-amber-500 text-black font-bold border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'}`}
                                                    >
                                                        Desktop: -72px
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setVideoYOffset(-62);
                                                            localStorage.setItem('mugen_video_y_offset', '-62');
                                                            showToast("Max Player Offset set to -62px (Mobile Crop)", "success");
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
                                                </div>
                                            </div>

                                            <div className="settings-subcard p-3 bg-black/40 border border-gray-800 rounded-xl space-y-2">
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
                                        <div className="settings-subcard p-3 bg-black/50 border border-gray-800 rounded-xl space-y-3">
                                            <div className="settings-codebox text-xs text-gray-400 font-mono break-all bg-black/40 p-2.5 rounded-lg border border-white/5">
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
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Storage & Data Management */}
                            <div className="settings-data-card bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4 animate-fade-in">
                                <div>
                                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                        <Trash2 className="w-5 h-5 text-red-500" />
                                        Storage & Cache Management
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Manage cached data, watch history, and app storage</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    {/* Clear Cache */}
                                    <div className="settings-subcard p-4 bg-black/40 border border-gray-800 rounded-xl space-y-2 flex flex-col justify-between">
                                        <div>
                                            <span className="text-sm font-semibold text-gray-200 block">Clear Temporary Cache</span>
                                            <span className="text-xs text-gray-400 block mt-0.5">Removes cached images and temporary session data. Keeps your favorites and history intact.</span>
                                        </div>
                                        <button
                                            onClick={handleClearCacheOnly}
                                            disabled={isClearingCache}
                                            className="settings-cache-btn mt-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition-all border border-gray-700 cursor-pointer flex items-center justify-center gap-1.5 active-press"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${isClearingCache ? 'animate-spin' : ''}`} />
                                            {isClearingCache ? 'Clearing Cache...' : 'Clear Temporary Cache'}
                                        </button>
                                    </div>

                                    {/* Delete Everything */}
                                    <div className="settings-subcard p-4 bg-red-950/20 border border-red-500/20 rounded-xl space-y-2 flex flex-col justify-between">
                                        <div>
                                            <span className="text-sm font-semibold text-red-400 block">Delete Everything & Reset</span>
                                            <span className="text-xs text-gray-400 block mt-0.5">Permanently erases watch history, favorites, custom extension settings, and resets app to initial state.</span>
                                        </div>
                                        <button
                                            onClick={() => setShowDeleteConfirmModal(true)}
                                            className="settings-danger-btn mt-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active-press"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete All Data & Reset
                                        </button>
                                    </div>
                                </div>
                            </div>

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
                    <div className="p-3 sm:p-8 flex flex-col gap-4 sm:gap-6 animate-fade-in max-w-full overflow-hidden">
                        {/* Top Bar with Brand, Surprise Me, Direct Play, & Sun/Moon Theme Toggle */}
                        <div className="flex items-center justify-between gap-3 pb-1">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white">
                                    MUGEN<span className="text-red-600">PLAY</span>
                                </h1>
                                <span className="px-2 py-0.5 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block">
                                    v0.1.0
                                </span>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-2.5">
                                {/* Random Surprise Me Button */}
                                <button
                                    onClick={() => {
                                        const pool = [...trendingList, ...popularList, ...topRatedList];
                                        if (pool.length > 0) {
                                            const random = pool[Math.floor(Math.random() * pool.length)];
                                            handlePlay(random);
                                        } else {
                                            showToast("Loading anime catalog...", "info");
                                        }
                                    }}
                                    className="px-3 sm:px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 border border-gray-700/80 cursor-pointer shadow-sm active:scale-95"
                                    title="Surprise Me (Watch Random Anime)"
                                >
                                    <Shuffle className="w-3.5 h-3.5 text-red-500" />
                                    <span className="hidden sm:inline">Surprise Me</span>
                                </button>

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
                        {isShelvesLoading && trendingList.length === 0 && (
                            <div className="flex h-64 items-center justify-center">
                                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}

                        {/* Main Content Shelves */}
                        {(!isShelvesLoading || trendingList.length > 0) && (
                            <>
                                {/* Hero Section */}
                                <HeroCarousel
                                    items={heroCarouselItems}
                                    onPlay={handlePlay}
                                    onInfo={setSelectedAnime}
                                />

                                {/* Continue Watching Shelf */}
                                {watchHistory.length > 0 && (
                                    <HorizontalScrollList
                                        title="Continue Watching"
                                        items={watchHistory.filter(i => i && i.id)}
                                        onItemClick={(anime) => handlePlay(anime)}
                                        renderItem={(anime) => (
                                            <div className="min-w-[160px] w-[160px] sm:min-w-[210px] sm:w-[210px] flex-shrink-0 cursor-pointer group relative">
                                                <div className="aspect-video rounded-xl overflow-hidden mb-2 relative bg-gray-900 border border-gray-800">
                                                    <img
                                                        src={anime.bannerUrl || anime.coverUrl}
                                                        alt={formatAnimeTitle(anime.title)}
                                                        className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300 opacity-85 group-hover:opacity-100"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:bg-red-600 transition-colors shadow-lg">
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

                                                    {/* High-Contrast Episode Badge */}
                                                    <div className="episode-badge-red absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-600 border border-red-400 text-[10px] sm:text-xs font-black text-white shadow-lg">
                                                        Ep {anime.lastEpisode || 1}
                                                    </div>

                                                    {/* Remove Cross Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFromHistory(anime.id);
                                                        }}
                                                        className="continue-watching-cross absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-black/80 hover:bg-red-600 text-gray-200 hover:text-white flex items-center justify-center backdrop-blur-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer shadow-md active:scale-90 border border-white/10"
                                                        title="Remove from Continue Watching"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                                <h3 className="text-xs sm:text-sm font-bold text-white truncate">{formatAnimeTitle(anime.title)}</h3>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="card-year-badge px-1.5 py-0.5 rounded text-[10px] font-black">
                                                        Episode {anime.lastEpisode || 1}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    />
                                )}

                                {/* Thematic Shelf 1: Trending This Season */}
                                <HorizontalScrollList
                                    title="Trending This Season"
                                    icon={Flame}
                                    items={trendingList}
                                    onItemClick={(anime) => setSelectedAnime(anime)}
                                    renderItem={(anime) => (
                                        <div className="min-w-[135px] w-[135px] sm:min-w-[170px] sm:w-[170px] flex-shrink-0">
                                            <AnimeCard anime={anime} onClick={setSelectedAnime} />
                                        </div>
                                    )}
                                />

                                {/* Thematic Shelf 2: All-Time Fan Favorites */}
                                <HorizontalScrollList
                                    title="All-Time Fan Favorites"
                                    icon={Star}
                                    items={popularList}
                                    onItemClick={(anime) => setSelectedAnime(anime)}
                                    renderItem={(anime) => (
                                        <div className="min-w-[135px] w-[135px] sm:min-w-[170px] sm:w-[170px] flex-shrink-0">
                                            <AnimeCard anime={anime} onClick={setSelectedAnime} />
                                        </div>
                                    )}
                                />

                                {/* Thematic Shelf 3: Top Rated Classics */}
                                <HorizontalScrollList
                                    title="Top Rated Classics"
                                    icon={Trophy}
                                    items={topRatedList}
                                    onItemClick={(anime) => setSelectedAnime(anime)}
                                    renderItem={(anime) => (
                                        <div className="min-w-[135px] w-[135px] sm:min-w-[170px] sm:w-[170px] flex-shrink-0">
                                            <AnimeCard anime={anime} onClick={setSelectedAnime} />
                                        </div>
                                    )}
                                />

                                {/* Thematic Shelf 4: My Favorites / Bookmarks */}
                                {favorites.length > 0 && (
                                    <HorizontalScrollList
                                        title="Saved to Favorites"
                                        icon={Heart}
                                        items={favorites}
                                        onItemClick={(anime) => setSelectedAnime(anime)}
                                        renderItem={(anime) => (
                                            <div className="min-w-[135px] w-[135px] sm:min-w-[170px] sm:w-[170px] flex-shrink-0">
                                                <AnimeCard anime={anime} onClick={setSelectedAnime} />
                                            </div>
                                        )}
                                    />
                                )}

                                {/* Discovery Banner CTA */}
                                <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-950/40 via-gray-900 to-gray-900 border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
                                    <div className="flex items-center gap-4 text-center sm:text-left">
                                        <div className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                                            <Compass className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-base sm:text-lg font-bold text-white">
                                                Looking for something specific?
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
                                                Explore our full catalog of thousands of anime with live search, genre filters, format selectors, and seasonal archives.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('browse')}
                                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                                    >
                                        <span>Explore Full Catalog</span>
                                        <ChevronRight className="w-4 h-4" />
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
                width={sidebarWidth}
                setWidth={setSidebarWidth}
                collapsed={isSidebarCollapsed}
                setCollapsed={setIsSidebarCollapsed}
            />

            <main
                className="flex-1 min-w-0 min-h-screen relative transition-[margin] duration-150 pb-24 lg:pb-8"
                style={{ marginLeft: isDesktop ? (isSidebarCollapsed ? 80 : (sidebarWidth || 256)) : 0 }}
            >
                {renderContent()}
            </main>

                {/* Unified Persistent Player Overlay */}
                {playingAnime && (
                    <div
                        ref={miniPlayerRef}
                        onClick={() => {
                            if (isPlayerMinimized && !miniDragOriginRef.current.hasMoved) {
                                setIsPlayerMinimized(false);
                            }
                        }}
                        className={`fixed z-50 bg-[#0a0a0a] playback-modal text-white flex flex-col font-sans shadow-2xl overflow-hidden ${
                            isPlayerMinimized
                                ? 'bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 h-48 sm:h-56 rounded-2xl border border-white/15 ring-1 ring-black/50 shadow-2xl cursor-grab active:cursor-grabbing select-none touch-none transform-gpu will-change-transform'
                                : 'inset-0 rounded-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]'
                        }`}
                    >
                        {/* Draggable Indicator Handle for Miniplayer */}
                        {isPlayerMinimized && (
                            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-[130] pointer-events-none">
                                <div className="w-10 h-1 rounded-full bg-white/40 shadow-sm" />
                            </div>
                        )}

                        {/* Top Navigation Bar (Full Screen Only) */}
                        {!isPlayerMinimized && (
                            <div
                                onTouchStart={handleHeaderTouchStart}
                                onTouchEnd={handleHeaderTouchEnd}
                                className="h-16 flex items-center justify-between px-4 sm:px-6 bg-[#050505] playback-topbar border-b border-white/5 z-20 gap-3 sm:gap-4 animate-fade-in shrink-0 relative select-none"
                            >
                                {/* Pull-down to minimize indicator bar on mobile topbar */}
                                <div className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/30 rounded-full pointer-events-none" />

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
                            <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar sm:custom-scrollbar relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                <div className={`w-full bg-black relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isPlayerMinimized ? 'h-full rounded-2xl overflow-hidden shadow-2xl z-[100]' : 'w-full max-w-5xl mx-auto sm:ring-1 sm:ring-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-5 mt-2 sm:mt-6 mb-2 sm:mb-4'}`}>
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
                                        onOpenExtensionStore={() => {
                                            setActiveTab('extensions');
                                            setPlayingAnime(null);
                                        }}
                                        onRetry={async () => {
                                            if (playingAnime) {
                                                await handlePlay(playingAnime, playingAnime.currentEpisode || 1);
                                            }
                                        }}
                                    />
                                    {/* Mini Overlay Controls */}
                                    {isPlayerMinimized && (
                                        <div className="minimized-player-overlay absolute top-0 left-0 right-0 p-2.5 flex justify-end gap-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent z-[120] pointer-events-auto opacity-100 sm:opacity-90 sm:hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsPlayerMinimized(false);
                                                }}
                                                className="minimized-btn p-2 bg-black/80 hover:bg-black text-white rounded-full backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/20 cursor-pointer"
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
                                                <h1 className="text-xl sm:text-3xl font-black leading-tight tracking-tight text-white mb-2">{playingAnime.title}</h1>
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold">
                                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/60 font-black shadow-sm">
                                                        <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
                                                        {playingAnime.rating ? (playingAnime.rating > 10 ? (playingAnime.rating / 10).toFixed(1) : Number(playingAnime.rating).toFixed(1)) : '8.5'}
                                                    </span>
                                                    <span className="playback-pill px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold">
                                                        {playingAnime.year || 2024}
                                                    </span>
                                                    <span className="playback-pill px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold">
                                                        {playingAnime.episodes || 12} Episodes
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5 ml-1">
                                                        {playingAnime.genres?.slice(0, 3).map(g => (
                                                            <span key={g} className="px-2.5 py-0.5 bg-red-600/15 border border-red-500/30 text-red-400 rounded-full text-xs font-bold">
                                                                {g}
                                                            </span>
                                                        ))}
                                                    </div>
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
                                                className="pagination-btn text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 active:scale-95 shadow-sm"
                                            >
                                                Prev
                                            </button>
                                            <div className="pagination-box flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border shadow-sm font-bold">
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
                                                    className="w-8 bg-transparent text-center outline-none font-bold no-spinner"
                                                />
                                                <span className="pagination-divider font-black select-none">/</span>
                                                <span className="pagination-total font-black select-none">{Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1}</span>
                                            </div>
                                            <button
                                                onClick={() => setCurrentEpisodePage(p => Math.min((Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1), (Number(p) || 1) + 1))}
                                                disabled={(Number(currentEpisodePage) || 1) === (Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1)}
                                                className="pagination-btn text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 active:scale-95 shadow-sm"
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
                                                    const isReleased = (playingAnime.episodesList && epNum <= playingAnime.episodesList.length) || !playingAnime.nextAiringEpisode || epNum < playingAnime.nextAiringEpisode.episode;
                                                    const epThumbnail = ep?.thumbnail || playingAnime.bannerUrl || playingAnime.coverUrl;
                                                    const hasCustomTitle = ep?.title && !ep.title.toLowerCase().startsWith('episode ') && !ep.title.toLowerCase().includes('untitled');
                                                    const epSubtitle = hasCustomTitle
                                                        ? ep.title
                                                        : (!isReleased && playingAnime.nextAiringEpisode && epNum === playingAnime.nextAiringEpisode.episode
                                                            ? `Airing in ${Math.round(playingAnime.nextAiringEpisode.timeUntilAiring / 86400)} days`
                                                            : (isCurrent ? 'Now Playing' : 'Ready to Stream'));

                                                    return (
                                                        <button
                                                            key={epNum}
                                                            onClick={() => isReleased && handlePlay(playingAnime, epNum)}
                                                            disabled={!isReleased}
                                                            className={`mobile-episode-item w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border group cursor-pointer ${isCurrent ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/30 font-semibold' : (isReleased ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5' : 'bg-white/5 opacity-40 cursor-not-allowed text-gray-600 border-transparent')}`}
                                                        >
                                                            <div className="relative shrink-0 w-24 h-15 bg-black/40 rounded-lg overflow-hidden border border-white/10">
                                                                <img
                                                                    src={epThumbnail}
                                                                    loading="lazy"
                                                                    decoding="async"
                                                                    className={`w-full h-full object-cover transition-transform group-hover:scale-105 duration-300 ${isCurrent ? 'opacity-100' : (isReleased ? 'opacity-70 group-hover:opacity-100' : 'opacity-30 grayscale')}`}
                                                                    alt={`Episode ${epNum}`}
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                                    {isReleased ? (
                                                                        <Play size={14} fill="currentColor" className={isCurrent ? 'text-white' : 'text-white/70'} />
                                                                    ) : (
                                                                        <span className="text-[9px] font-bold text-white/70 uppercase">Not Aired</span>
                                                                    )}
                                                                </div>
                                                                <div className="episode-badge-red absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-red-600 border border-red-400 text-[10px] font-black text-white shadow-md leading-tight">
                                                                    Ep {epNum}
                                                                </div>
                                                            </div>
                                                            <div className="text-left flex-1 min-w-0">
                                                                <div className="font-semibold truncate text-xs text-white">Episode {epNum}</div>
                                                                <div className="text-[11px] text-gray-400 truncate mt-0.5 font-medium">
                                                                    {epSubtitle}
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
                                <div className={`${isSidebarVisible ? 'w-80 lg:w-96 translate-x-0' : 'w-0 translate-x-full hidden'} hidden lg:flex bg-[#111] playback-episode-sidebar border-l border-white/5 flex-col transition-all duration-300 ease-in-out z-20 overflow-hidden no-scrollbar`}>
                                    <div className="p-4 border-b border-white/5 bg-[#111] playback-sidebar-header z-10 flex justify-between items-center whitespace-nowrap overflow-hidden">
                                        <h3 className="font-bold text-gray-200">Episodes</h3>
                                        <span className="text-xs text-gray-500">{playingAnime.episodesList?.length || playingAnime.episodes || '?'} Total</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">

                                        {/* Pagination Controls in Sidebar */}
                                        <div className="flex justify-between items-center px-2 pb-2">
                                            <button
                                                onClick={() => setCurrentEpisodePage(p => Math.max(1, p - 1))}
                                                disabled={currentEpisodePage === 1}
                                                className="pagination-btn text-xs font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer disabled:opacity-30 active:scale-95 shadow-sm"
                                            >
                                                Prev
                                            </button>

                                            {/* High-Contrast Modernized Pagination Input */}
                                            <div className="pagination-box flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border shadow-sm font-bold">
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
                                                    className="w-8 bg-transparent text-center outline-none font-bold no-spinner"
                                                    onKeyDown={(e) => e.stopPropagation()} // Prevent key bubbling
                                                />
                                                <span className="pagination-divider font-black select-none">/</span>
                                                <span className="pagination-total font-black select-none">{Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1}</span>
                                            </div>
                                            <button
                                                onClick={() => setCurrentEpisodePage(p => Math.min((Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1), (Number(p) || 1) + 1))}
                                                disabled={(Number(currentEpisodePage) || 1) === (Math.ceil((playingAnime.episodesList?.length || playingAnime.episodes || 0) / 12) || 1)}
                                                className="pagination-btn text-xs font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer disabled:opacity-30 active:scale-95 shadow-sm"
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
                                                const isReleased = (playingAnime.episodesList && epNum <= playingAnime.episodesList.length) || !playingAnime.nextAiringEpisode || epNum < playingAnime.nextAiringEpisode.episode;
                                                const epThumbnail = ep?.thumbnail || playingAnime.bannerUrl || playingAnime.coverUrl;
                                                const hasCustomTitle = ep?.title && !ep.title.toLowerCase().startsWith('episode ') && !ep.title.toLowerCase().includes('untitled');
                                                const epSubtitle = hasCustomTitle
                                                    ? ep.title
                                                    : (!isReleased && playingAnime.nextAiringEpisode && epNum === playingAnime.nextAiringEpisode.episode
                                                        ? `Airing in ${Math.round(playingAnime.nextAiringEpisode.timeUntilAiring / 86400)} days`
                                                        : (isCurrent ? 'Now Playing' : 'Ready to Stream'));

                                                return (
                                                    <button
                                                        key={epNum}
                                                        onClick={() => isReleased && handlePlay(playingAnime, epNum)}
                                                        disabled={!isReleased}
                                                        className={`playback-episode-item w-full flex items-center gap-3 p-2.5 rounded-xl transition-all group relative overflow-hidden cursor-pointer ${isCurrent ? 'bg-red-600 text-white shadow-lg shadow-red-900/30 font-semibold' : (isReleased ? 'hover:bg-white/10 text-gray-300' : 'opacity-40 cursor-not-allowed text-gray-600')}`}
                                                    >
                                                        <div className="relative shrink-0 w-24 h-15 bg-black/50 rounded-lg overflow-hidden border border-white/10">
                                                            <img 
                                                                src={epThumbnail} 
                                                                loading="lazy"
                                                                decoding="async"
                                                                className={`w-full h-full object-cover transition-transform group-hover:scale-105 duration-300 ${isCurrent ? 'opacity-100' : (isReleased ? 'opacity-70 group-hover:opacity-100' : 'opacity-30 grayscale')}`} 
                                                                alt={`Episode ${epNum}`} 
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                                {isReleased ? (
                                                                    <Play size={15} fill="currentColor" className={isCurrent ? 'text-white' : 'text-white/60 group-hover:text-white'} />
                                                                ) : (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="text-[10px] font-bold text-white/70 uppercase">Not Aired</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="episode-badge-red absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-red-600 border border-red-400 text-[10px] font-black text-white shadow-md leading-tight">
                                                                Ep {epNum}
                                                            </div>
                                                        </div>
                                                        <div className="text-left flex-1 min-w-0">
                                                            <div className="font-semibold truncate text-xs text-white">Episode {epNum}</div>
                                                            <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                                                {epSubtitle}
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

            {/* Delete Everything Confirmation Modal */}
            {showDeleteConfirmModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-gray-900 border border-red-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
                        <div className="p-6 bg-gradient-to-r from-red-950/80 via-gray-900 to-gray-900 border-b border-red-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Reset All App Data?</h3>
                                    <p className="text-xs text-red-300/80">This action cannot be undone</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDeleteConfirmModal(false)}
                                className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-300 leading-relaxed">
                                This will permanently erase:
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside bg-black/40 p-3.5 rounded-xl border border-white/5 font-medium">
                                <li>All Watch History & Episode progress</li>
                                <li>Saved Favorites & Bookmarks</li>
                                <li>Custom Extensions & Source configurations</li>
                                <li>Player Calibration offsets & Zoom levels</li>
                                <li>Temporary App & Image Cache</li>
                            </ul>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowDeleteConfirmModal(false)}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer active-press"
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
