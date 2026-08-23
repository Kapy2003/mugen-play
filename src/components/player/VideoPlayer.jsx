import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Settings, Check, AlertTriangle, Link, Edit3, Copy, CheckCheck, X, Sliders, RotateCcw, ZoomIn, ZoomOut, ChevronUp, ChevronDown, Crop, ShoppingBag } from 'lucide-react';
import Hls from 'hls.js';

const VideoPlayer = ({
    src,
    poster,
    title,
    onEnded,
    onProgress,
    initialTime = 0,
    scale = 1,
    xOffset = 0,
    yOffset = 0,
    isMinimized = false,
    devMode = false,
    onUpdateStreamUrl,
    onOpenExtensionStore,
    onRetry
}) => {
    const [activeSrc, setActiveSrc] = useState(src);
    const [loadError, setLoadError] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [key, setKey] = useState(0);
    const [playerType, setPlayerType] = useState('iframe');

    // Editable Link State
    const [isEditingLink, setIsEditingLink] = useState(false);
    const [customUrlInput, setCustomUrlInput] = useState(src || '');
    const [isCopied, setIsCopied] = useState(false);

    // Viewport & Crop State (Default Offset: 0px, Zoom: 100%)
    const [localYOffset, setLocalYOffset] = useState(yOffset !== undefined ? yOffset : 0);
    const [localScale, setLocalScale] = useState(scale !== undefined ? scale : 1);
    const [localXOffset, setLocalXOffset] = useState(xOffset || 0);
    const [showViewportControls, setShowViewportControls] = useState(false);

    // Quality State (for HLS)
    const [qualities, setQualities] = useState([]);
    const [currentQuality, setCurrentQuality] = useState(-1);
    const [showQualityMenu, setShowQualityMenu] = useState(false);

    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    // Sync activeSrc when incoming src changes
    useEffect(() => {
        setActiveSrc(src);
        setCustomUrlInput(src || '');
        setQualities([]);
        setCurrentQuality(-1);

        const isInvalid = !src || src === 'null' || src === '' || src.includes('undefined');
        setLoadError(isInvalid);
        if (!isInvalid) {
            setKey(k => k + 1);
        }

        if (src && src.endsWith('.m3u8')) {
            setPlayerType('hls');
        } else if (src && src.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
            setPlayerType('native');
        } else {
            setPlayerType('iframe');
        }
    }, [src]);

    const handleRetry = async () => {
        if (isRetrying) return;
        setIsRetrying(true);
        setLoadError(false);
        try {
            if (onRetry) {
                await onRetry();
            }
        } finally {
            setKey(k => k + 1);
            setTimeout(() => {
                setIsRetrying(false);
            }, 600);
        }
    };

    // Automated 404 & Broken Stream Detection
    useEffect(() => {
        if (!activeSrc || activeSrc === 'null' || activeSrc === '' || activeSrc.includes('undefined')) {
            setLoadError(true);
            return;
        }

        if (
            activeSrc.includes('404') ||
            activeSrc.toLowerCase().includes('not-found') ||
            activeSrc.toLowerCase().includes('notfound') ||
            activeSrc.toLowerCase().includes('oops')
        ) {
            setLoadError(true);
            return;
        }

        let isCancelled = false;

        const checkStreamReachability = async () => {
            if (!activeSrc.startsWith('http')) return;

            const PROXIES = [
                (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
                (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
                (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
            ];

            for (const proxyFn of PROXIES) {
                if (isCancelled) break;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                    const proxiedUrl = proxyFn(activeSrc);

                    const res = await fetch(proxiedUrl, {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (res && (res.status === 404 || res.status === 410 || res.status === 502 || res.status === 503)) {
                        if (!isCancelled) setLoadError(true);
                        break;
                    }

                    if (res && res.ok) {
                        const text = await res.text();
                        const lower = text.toLowerCase();
                        const has404Indicator =
                            lower.includes('oops! 404') ||
                            lower.includes('404 not found') ||
                            lower.includes('404 - not found') ||
                            lower.includes('page not found') ||
                            lower.includes('video not found') ||
                            lower.includes('episode not found') ||
                            lower.includes('cannot find') ||
                            (lower.includes('404') && (lower.includes('error') || lower.includes('oops') || lower.includes('not found')));

                        if (has404Indicator) {
                            if (!isCancelled) setLoadError(true);
                            break;
                        }
                        // Successfully verified live stream without 404
                        break;
                    }
                } catch {
                    // Try next proxy
                }
            }
        };

        checkStreamReachability();

        return () => {
            isCancelled = true;
        };
    }, [activeSrc, key]);

    // Live sync viewport offsets and zoom without triggering player remount
    useEffect(() => {
        if (yOffset !== undefined) setLocalYOffset(yOffset);
        if (scale !== undefined) setLocalScale(scale);
        if (xOffset !== undefined) setLocalXOffset(xOffset);
    }, [yOffset, scale, xOffset]);

    // Handle HLS Native Playback
    useEffect(() => {
        if (playerType !== 'hls' || !videoRef.current || !activeSrc) return;

        if (Hls.isSupported()) {
            if (hlsRef.current) hlsRef.current.destroy();

            const hls = new Hls();
            hlsRef.current = hls;

            hls.loadSource(activeSrc);
            hls.attachMedia(videoRef.current);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                const levels = data.levels.map((level, index) => ({
                    id: index,
                    height: level.height,
                    bitrate: level.bitrate,
                    label: level.height ? `${level.height}p` : `Level ${index}`
                }));

                setQualities(levels);

                if (initialTime > 0) {
                    videoRef.current.currentTime = initialTime;
                }

                videoRef.current.play().catch(() => { });
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error("HLS Fatal Error", data);
                    setLoadError(true);
                }
            });

            videoRef.current.onended = onEnded;

        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = activeSrc;
            videoRef.current.addEventListener('loadedmetadata', () => {
                if (initialTime > 0) {
                    videoRef.current.currentTime = initialTime;
                }
                videoRef.current.play();
            });
            videoRef.current.onended = onEnded;
        }

        return () => {
            if (hlsRef.current) hlsRef.current.destroy();
        };
    }, [activeSrc, playerType, key, initialTime, onEnded]);

    const handleApplyCustomUrl = (e) => {
        if (e) e.preventDefault();
        if (!customUrlInput || !customUrlInput.trim()) return;

        let trimmed = customUrlInput.trim();

        // Auto-resolve HAnime URLs to playable embed stream
        const hanimeMatch = trimmed.match(/hanime\.tv\/(?:playlists\/[^/]+\/video\/|videos\/hentai\/|video\/)([^/?#]+)/i);
        if (hanimeMatch) {
            const rawSlug = hanimeMatch[1];
            const epMatch = rawSlug.match(/-(\d+)$/);
            const targetEp = epMatch ? epMatch[1] : '1';
            const baseSlug = rawSlug.replace(/-(\d+)$/, '');
            trimmed = `https://playtaku.net/streaming.php?id=${baseSlug}-episode-${targetEp}`;
        }

        // Auto-resolve Anikoto URLs
        const anikotoMatch = trimmed.match(/anikoto\.(cz|tv|org)\/watch\/([^/?#]+)/i);
        if (anikotoMatch) {
            const slug = anikotoMatch[2];
            trimmed = `https://anikoto.cz/watch/${slug}?ep=1`;
        }

        setActiveSrc(trimmed);
        setLoadError(false);
        setKey(k => k + 1);

        if (trimmed.endsWith('.m3u8')) {
            setPlayerType('hls');
        } else if (trimmed.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
            setPlayerType('native');
        } else {
            setPlayerType('iframe');
        }

        if (onUpdateStreamUrl) {
            onUpdateStreamUrl(trimmed);
        }
        setIsEditingLink(false);
    };

    const handleCopyUrl = () => {
        if (!activeSrc) return;
        navigator.clipboard.writeText(activeSrc).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(() => { });
    };


    const changeQuality = (qualityId) => {
        setCurrentQuality(qualityId);
        if (hlsRef.current) {
            hlsRef.current.currentLevel = qualityId;
        }
        setShowQualityMenu(false);
    };

    const renderPlayer = () => {
        const is404 = Boolean(
            loadError ||
            (activeSrc && (
                activeSrc.includes('404') ||
                activeSrc.toLowerCase().includes('not-found') ||
                activeSrc.toLowerCase().includes('notfound') ||
                activeSrc.toLowerCase().includes('oops')
            ))
        );

        const isUnplayable = is404 ||
            !activeSrc ||
            activeSrc === 'null' ||
            activeSrc === '' ||
            activeSrc.includes('undefined') ||
            activeSrc.includes('error-page');

        if (isUnplayable) {
            if (isMinimized) {
                return (
                    <div className="mascot-screen-container w-full h-full flex flex-col items-center justify-center p-2 text-center select-none overflow-hidden relative">
                        {/* Compact Mascot Animation */}
                        <div className="relative w-32 h-24 flex items-center justify-center scale-90">
                            <div className="absolute inset-0 bg-red-600/20 blur-xl rounded-full animate-pulse" />
                            
                            {/* Orbiting Cartoon Dizzy Stars */}
                            <div className="absolute -top-2 w-full flex justify-center pointer-events-none z-20">
                                <div className="animate-anime-orbit flex items-center justify-center text-amber-300 font-black text-[10px]">
                                    <span>★</span>
                                    <span className="text-red-400 font-bold ml-2">?</span>
                                    <span className="text-yellow-400 text-[8px] ml-2">✦</span>
                                </div>
                            </div>

                            {/* TV Mascot Body */}
                            <svg viewBox="0 0 160 120" className="w-full h-full drop-shadow-xl overflow-visible animate-anime-panic" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g className="animate-anime-antenna origin-bottom">
                                    <path d="M54 22 L32 4 M106 22 L128 4" stroke="#e50914" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                                    <circle cx="32" cy="4" r="3.5" fill="#ff4d4d" />
                                    <circle cx="128" cy="4" r="3.5" fill="#ff4d4d" />
                                </g>
                                <rect x="16" y="18" width="128" height="90" rx="16" fill="#181820" stroke="#333342" strokeWidth="2.5" />
                                <g transform="rotate(25 125 25)">
                                    <rect x="110" y="20" width="22" height="9" rx="3" fill="#eab308" stroke="#ca8a04" strokeWidth="1" opacity="0.85" />
                                    <circle cx="121" cy="24.5" r="1.2" fill="#ca8a04" />
                                </g>
                                <rect x="26" y="26" width="90" height="74" rx="10" fill="#09090d" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 3" />
                                <line x1="28" y1="40" x2="114" y2="40" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" />
                                <line x1="28" y1="56" x2="114" y2="56" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" />
                                <line x1="28" y1="72" x2="114" y2="72" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" />
                                <line x1="28" y1="88" x2="114" y2="88" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" />
                                <g transform="translate(48, 56)">
                                    <circle cx="0" cy="0" r="10" fill="#221015" />
                                    <path className="animate-anime-spiral origin-center" d="M0 0 C-2 -4, -6 -2, -6 0 C-6 5, 0 8, 5 5 C9 2, 8 -6, 2 -8 C-4 -9, -9 -2, -9 3" stroke="#ff4d4d" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                                </g>
                                <g transform="translate(94, 56)">
                                    <circle cx="0" cy="0" r="10" fill="#221015" />
                                    <path className="animate-anime-spiral origin-center" d="M0 0 C-2 -4, -6 -2, -6 0 C-6 5, 0 8, 5 5 C9 2, 8 -6, 2 -8 C-4 -9, -9 -2, -9 3" stroke="#ff4d4d" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                                </g>
                                <path d="M62 76 Q66 71 71 76 Q76 81 71 76" stroke="#ff4d4d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                                <ellipse cx="38" cy="68" rx="4" ry="2" fill="#ef4444" opacity="0.4" />
                                <ellipse cx="104" cy="68" rx="4" ry="2" fill="#ef4444" opacity="0.4" />
                                <g className="animate-anime-sweat" transform="translate(108, 38)">
                                    <path d="M0 0 C-4 4, -4 10, 0 14 C4 10, 4 4, 0 0 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />
                                </g>
                                <circle cx="130" cy="42" r="5" fill="#252530" stroke="#4b4b5a" strokeWidth="1.5" />
                                <circle cx="130" cy="62" r="5" fill="#252530" stroke="#4b4b5a" strokeWidth="1.5" />
                                <line x1="126" y1="80" x2="134" y2="80" stroke="#e50914" strokeWidth="2" strokeLinecap="round" />
                                <line x1="126" y1="86" x2="134" y2="86" stroke="#e50914" strokeWidth="2" strokeLinecap="round" />
                                <path d="M48 108 L38 116 M112 108 L122 116" stroke="#333340" strokeWidth="3.5" strokeLinecap="round" />
                            </svg>
                        </div>
                        <p className="mascot-title text-[11px] font-black text-white mt-1">
                            {!activeSrc ? 'Nani?! No Extension' : is404 ? '404: Isekai\'d!' : 'Stream Error'}
                        </p>
                    </div>
                );
            }

            return (
                <div className="mascot-screen-container w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#121216] to-[#0a0a0d] text-gray-400 p-6 sm:p-8 text-center space-y-4 animate-fade-in select-none">
                    {/* Funny Anime Dizzy Mascot Animation */}
                    <div className="relative w-40 h-32 sm:w-48 sm:h-40 mx-auto flex items-center justify-center">
                        <div className="absolute inset-0 bg-red-600/20 blur-2xl rounded-full animate-pulse" />
                        
                        {/* Orbiting Cartoon Dizzy Stars / Question Marks */}
                        <div className="absolute -top-3 w-full flex justify-center pointer-events-none z-20">
                            <div className="animate-anime-orbit flex items-center justify-center text-amber-300 font-black text-xs">
                                <span>★</span>
                                <span className="text-red-400 font-bold ml-3">?</span>
                                <span className="text-yellow-400 text-[10px] ml-3">✦</span>
                            </div>
                        </div>

                        {/* TV Mascot Body (Panics and Shakes) */}
                        <svg viewBox="0 0 160 120" className="w-full h-full drop-shadow-2xl overflow-visible animate-anime-panic" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Twitching TV Antennas */}
                            <g className="animate-anime-antenna origin-bottom">
                                <path d="M54 22 L32 4 M106 22 L128 4" stroke="#e50914" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                                <circle cx="32" cy="4" r="3.5" fill="#ff4d4d" />
                                <circle cx="128" cy="4" r="3.5" fill="#ff4d4d" />
                            </g>
                            
                            {/* TV Body Frame */}
                            <rect x="16" y="18" width="128" height="90" rx="16" fill="#181820" stroke="#333342" strokeWidth="2.5" />
                            
                            {/* Cute Band-Aid on Top-Right Corner */}
                            <g transform="rotate(25 125 25)">
                                <rect x="110" y="20" width="22" height="9" rx="3" fill="#eab308" stroke="#ca8a04" strokeWidth="1" opacity="0.85" />
                                <circle cx="121" cy="24.5" r="1.2" fill="#ca8a04" />
                            </g>

                            {/* CRT Screen Frame */}
                            <rect x="26" y="26" width="90" height="74" rx="10" fill="#09090d" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 3" />
                            
                            {/* Subtle Glitch Scanlines */}
                            <line x1="28" y1="40" x2="114" y2="40" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" />
                            <line x1="28" y1="56" x2="114" y2="56" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" />
                            <line x1="28" y1="72" x2="114" y2="72" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" />
                            <line x1="28" y1="88" x2="114" y2="88" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" />
                            
                            {/* Funny Spinning Spiral Dizzy Eyes */}
                            {/* Left Dizzy Spiral Eye */}
                            <g transform="translate(48, 56)">
                                <circle cx="0" cy="0" r="10" fill="#221015" />
                                <path
                                    className="animate-anime-spiral origin-center"
                                    d="M0 0 C-2 -4, -6 -2, -6 0 C-6 5, 0 8, 5 5 C9 2, 8 -6, 2 -8 C-4 -9, -9 -2, -9 3"
                                    stroke="#ff4d4d"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    fill="none"
                                />
                            </g>

                            {/* Right Dizzy Spiral Eye */}
                            <g transform="translate(94, 56)">
                                <circle cx="0" cy="0" r="10" fill="#221015" />
                                <path
                                    className="animate-anime-spiral origin-center"
                                    d="M0 0 C-2 -4, -6 -2, -6 0 C-6 5, 0 8, 5 5 C9 2, 8 -6, 2 -8 C-4 -9, -9 -2, -9 3"
                                    stroke="#ff4d4d"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    fill="none"
                                />
                            </g>

                            {/* Trembling Wavy Comic Mouth ( >﹏< ) */}
                            <path d="M62 76 Q66 71 71 76 Q76 81 81 76" stroke="#ff4d4d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                            
                            {/* Blushing Comic Cheeks */}
                            <ellipse cx="38" cy="68" rx="4" ry="2" fill="#ef4444" opacity="0.4" />
                            <ellipse cx="104" cy="68" rx="4" ry="2" fill="#ef4444" opacity="0.4" />

                            {/* Dripping Giant Anime Sweatdrop */}
                            <g className="animate-anime-sweat" transform="translate(108, 38)">
                                <path d="M0 0 C-4 4, -4 10, 0 14 C4 10, 4 4, 0 0 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />
                            </g>

                            {/* TV Controls Dial */}
                            <circle cx="130" cy="42" r="5" fill="#252530" stroke="#4b4b5a" strokeWidth="1.5" />
                            <circle cx="130" cy="62" r="5" fill="#252530" stroke="#4b4b5a" strokeWidth="1.5" />
                            <line x1="126" y1="80" x2="134" y2="80" stroke="#e50914" strokeWidth="2" strokeLinecap="round" />
                            <line x1="126" y1="86" x2="134" y2="86" stroke="#e50914" strokeWidth="2" strokeLinecap="round" />
                            
                            {/* TV Stand Base */}
                            <path d="M48 108 L38 116 M112 108 L122 116" stroke="#333340" strokeWidth="3.5" strokeLinecap="round" />
                        </svg>
                    </div>

                    <div className="space-y-2 max-w-lg px-4">
                        <div className="mascot-badge inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600/25 text-red-300 border border-red-500/50 text-xs font-black tracking-wider uppercase shadow-md backdrop-blur-sm">
                            <AlertTriangle className="w-4 h-4 animate-bounce text-red-400" />
                            {!activeSrc
                                ? '(⊙_⊙;) NANI?! NO STREAM EXTENSION?!'
                                : is404
                                    ? '(x_x) 404: STREAM GOT ISEKAI\'D!'
                                    : '(>﹏<) YAMERO! SIGNAL COLLAPSED!'}
                        </div>
                        <h3 className="mascot-title text-white font-black text-lg sm:text-2xl tracking-tight drop-shadow-md">
                            {!activeSrc
                                ? 'Nani The Heck?! Where\'s Your Stream Extension?!'
                                : is404
                                    ? 'Nani?! This Episode Got Isekai\'d To Another World!'
                                    : 'Nani?! The Streaming Hamsters Tripped Over The Cable!'}
                        </h3>
                        <p className="mascot-subtitle text-sm sm:text-base text-gray-100 font-medium leading-relaxed drop-shadow-sm">
                            {!activeSrc
                                ? 'Our little TV mascot looked everywhere but couldn\'t find a streaming power-up! Head over to the Extension Store to unlock anime playback in 1 click.'
                                : is404
                                    ? 'The server summoned a wild 404 trap! The episode might be taking a ramen break or got lost in the anime multiverse. Cast a wake-up spell or switch servers!'
                                    : 'Our high-speed anime hamsters are panicking and untangling the wires. Cast a wake-up spell or switch servers to jump back into the action!'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                        {onOpenExtensionStore && (
                            <button
                                onClick={onOpenExtensionStore}
                                className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-xl shadow-red-600/40 active:scale-95 cursor-pointer"
                            >
                                <ShoppingBag size={16} /> {!activeSrc ? 'Grab Extension from Store' : 'Switch Extension / Server'}
                            </button>
                        )}
                        <button
                            onClick={handleRetry}
                            disabled={isRetrying}
                            className={`mascot-retry-btn px-5 py-3 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 border border-gray-700 active:scale-95 shadow-md hover:border-red-500/50 ${
                                isRetrying ? 'bg-gray-800/60 opacity-80 cursor-wait' : 'bg-gray-800 hover:bg-gray-700 cursor-pointer'
                            }`}
                        >
                            <RefreshCw size={15} className={isRetrying ? 'animate-spin text-amber-400' : 'hover:rotate-180 transition-transform duration-500'} />
                            {isRetrying
                                ? 'Checking Stream...'
                                : !activeSrc
                                    ? 'Retry Check'
                                    : '⚡ Cast Wake-Up Spell (Retry)'}
                        </button>
                    </div>
                </div>
            );
        }

        if (playerType === 'native' || playerType === 'hls') {
            return (
                <div className="relative group w-full h-full">
                    <video
                        key={key}
                        ref={videoRef}
                        className="w-full h-full object-contain bg-black"
                        poster={poster}
                        controls
                        playsInline
                        src={playerType === 'native' ? activeSrc : undefined}
                        onEnded={onEnded}
                        onTimeUpdate={(e) => onProgress && onProgress(e.target.currentTime, e.target.duration)}
                        onError={() => setLoadError(true)}
                    />

                    {/* Quality Selector (HLS only) */}
                    {playerType === 'hls' && qualities.length > 0 && (
                        <div className="absolute bottom-16 right-4 z-20">
                            <button
                                onClick={() => setShowQualityMenu(!showQualityMenu)}
                                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-colors cursor-pointer"
                                title="Quality"
                            >
                                <Settings size={20} />
                            </button>

                            {showQualityMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg overflow-hidden min-w-[120px] shadow-xl border border-white/10">
                                    <button
                                        onClick={() => changeQuality(-1)}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center justify-between cursor-pointer ${currentQuality === -1 ? 'text-red-400' : 'text-white'}`}
                                    >
                                        Auto {currentQuality === -1 && <Check size={14} />}
                                    </button>
                                    {qualities.map(q => (
                                        <button
                                            key={q.id}
                                            onClick={() => changeQuality(q.id)}
                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center justify-between cursor-pointer ${currentQuality === q.id ? 'text-red-400' : 'text-white'}`}
                                        >
                                            {q.label} {currentQuality === q.id && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        // Default: Embedded Stream Player (Desktop Max: 0px, Mobile Max: -62px, Mini: -50px)
        const effectiveYOffset = localYOffset !== undefined ? localYOffset : (isMinimized ? -50 : 0);
        const effectiveScale = localScale !== undefined ? localScale : 1;

        return (
            <iframe
                key={key}
                className="absolute inset-0 w-full border-0 transition-transform duration-300 pointer-events-auto"
                style={{
                    top: `${effectiveYOffset}px`,
                    left: `${localXOffset}%`,
                    height: effectiveYOffset < 0 ? `calc(100% + ${Math.abs(effectiveYOffset)}px)` : '100%',
                    transform: effectiveScale !== 1 ? `scale(${effectiveScale})` : undefined,
                    transformOrigin: 'top center',
                    touchAction: 'manipulation'
                }}
                scrolling="no"
                src={activeSrc}
                title={title || 'Anime Stream Player'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                referrerPolicy="origin"
                loading="eager"
                onError={() => setLoadError(true)}
                onLoad={(e) => {
                    try {
                        const doc = e.target.contentDocument || e.target.contentWindow?.document;
                        if (doc) {
                            const text = (doc.body?.innerText || doc.title || '').toLowerCase();
                            if (text.includes('404') || text.includes('oops') || text.includes('not found')) {
                                setLoadError(true);
                            }
                        }
                    } catch {
                        // Cross-origin boundary is normal, ignore safely
                    }
                }}
            />
        );
    };

    return (
        <div className="w-full flex flex-col gap-2">
            {/* Developer Mode Toolbar (Only visible when Developer Mode is active) */}
            {devMode && (
                <div className="flex items-center justify-between px-3 py-2 bg-black/70 border border-white/10 rounded-xl text-xs gap-3 animate-fade-in">
                    {/* Active Link Preview */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 text-[11px]">
                            <Link size={13} className="text-red-500" /> Link:
                        </span>
                        <span className="text-gray-300 font-mono text-xs truncate max-w-md" title={activeSrc}>
                            {activeSrc || 'No stream loaded'}
                        </span>
                    </div>

                    {/* Developer Actions: Copy, Open, Viewport Adjust, Edit Link, Report Broken */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleCopyUrl}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-white/5"
                            title="Copy current stream link"
                        >
                            {isCopied ? <CheckCheck size={13} className="text-green-400" /> : <Copy size={13} />}
                            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>

                        {/* Report Broken / Force 404 Mascot Diagnostic */}
                        <button
                            onClick={() => setLoadError(true)}
                            className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-red-500/30"
                            title="Trigger 404 / broken stream diagnosis"
                        >
                            <AlertTriangle size={13} />
                            <span className="hidden sm:inline">Stream Broken?</span>
                        </button>

                        {/* Adjust Viewport / Crop Header Button */}
                        <button
                            onClick={() => setShowViewportControls(!showViewportControls)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                showViewportControls || localYOffset !== 0
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
                            }`}
                            title="Adjust video position & crop website header"
                        >
                            <Sliders size={13} />
                            <span className="hidden sm:inline">Adjust View</span>
                        </button>

                        <button
                            onClick={() => setIsEditingLink(!isEditingLink)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isEditingLink
                                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                    : 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30'
                            }`}
                            title="Configure and edit stream URL"
                        >
                            <Edit3 size={13} />
                            <span>{isEditingLink ? 'Close' : 'Edit Link'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Developer Mode: Viewport & Header Crop Adjustment Bar */}
            {devMode && showViewportControls && (
                <div className="p-3 bg-gray-900 border border-amber-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-fade-in">
                    <div className="flex items-center gap-2">
                        <Crop size={14} className="text-amber-400" />
                        <span className="font-bold text-white">Crop & Fit Viewport:</span>
                        <span className="text-gray-400 font-mono">
                            Offset: {localYOffset}px | Zoom: {Math.round(localScale * 100)}%
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Target Desktop Max: -72px / 100% */}
                        <button
                            onClick={() => {
                                setLocalYOffset(-72);
                                setLocalScale(1);
                            }}
                            className={`px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer text-xs ${
                                localYOffset === -72 && localScale === 1
                                    ? 'bg-amber-500 text-black font-bold'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            title="Desktop Max: -72px / 100%"
                        >
                            <Crop size={11} /> -72px (Desktop)
                        </button>

                        {/* Target Mobile Max: -62px / 100% */}
                        <button
                            onClick={() => {
                                setLocalYOffset(-62);
                                setLocalScale(1);
                            }}
                            className={`px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer text-xs ${
                                localYOffset === -62 && localScale === 1
                                    ? 'bg-amber-500 text-black font-bold'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            title="Mobile Max: -62px / 100%"
                        >
                            <Crop size={11} /> -62px (Mobile)
                        </button>

                        {/* Target Desktop Mini: -50px / 100% */}
                        <button
                            onClick={() => {
                                setLocalYOffset(-50);
                                setLocalScale(1);
                            }}
                            className={`px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer text-xs ${
                                localYOffset === -50 && localScale === 1
                                    ? 'bg-amber-500 text-black font-bold'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            title="Desktop Mini: -50px / 100%"
                        >
                            <Crop size={11} /> -50px (Desktop Mini)
                        </button>

                        {/* Target Mobile Mini: -62px / 92% */}
                        <button
                            onClick={() => {
                                setLocalYOffset(-62);
                                setLocalScale(0.92);
                            }}
                            className={`px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer text-xs ${
                                localYOffset === -62 && localScale === 0.92
                                    ? 'bg-amber-500 text-black font-bold'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            title="Mobile Mini: -62px / 92%"
                        >
                            <Crop size={11} /> -62px / 92% (Mobile Mini)
                        </button>

                        {/* Shift Up */}
                        <button
                            onClick={() => setLocalYOffset(prev => prev - 10)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                            title="Shift Up (Crop More Top Header)"
                        >
                            <ChevronUp size={14} />
                        </button>

                        {/* Shift Down */}
                        <button
                            onClick={() => setLocalYOffset(prev => prev + 10)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                            title="Shift Down"
                        >
                            <ChevronDown size={14} />
                        </button>

                        {/* Zoom In */}
                        <button
                            onClick={() => setLocalScale(prev => Math.min(1.5, Number((prev + 0.04).toFixed(2))))}
                            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                            title="Zoom In"
                        >
                            <ZoomIn size={14} />
                        </button>

                        {/* Zoom Out */}
                        <button
                            onClick={() => setLocalScale(prev => Math.max(0.8, Number((prev - 0.04).toFixed(2))))}
                            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                            title="Zoom Out"
                        >
                            <ZoomOut size={14} />
                        </button>

                        {/* Reset Viewport to 0px / 100% */}
                        <button
                            onClick={() => {
                                setLocalYOffset(0);
                                setLocalScale(1);
                                setLocalXOffset(0);
                            }}
                            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer"
                            title="Reset to 0px / 100%"
                        >
                            <RotateCcw size={12} /> Reset
                        </button>
                    </div>
                </div>
            )}

            {/* Developer Mode: Editable Stream Link Form */}
            {devMode && isEditingLink && (
                <form
                    onSubmit={handleApplyCustomUrl}
                    className="p-3 bg-gradient-to-r from-gray-900 via-gray-900 to-red-950/40 border border-red-500/30 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-lg animate-fade-in"
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0 bg-black/60 border border-white/10 rounded-lg px-3 py-1.5">
                        <Link size={14} className="text-red-500 shrink-0" />
                        <input
                            type="text"
                            value={customUrlInput}
                            onChange={(e) => setCustomUrlInput(e.target.value)}
                            placeholder="Paste stream URL (e.g. https://hianime.ad/watch/... or .m3u8)"
                            className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none font-mono truncate"
                            autoFocus
                        />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="submit"
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-red-600/30 cursor-pointer"
                        >
                            Apply Link
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setCustomUrlInput(activeSrc);
                                setIsEditingLink(false);
                            }}
                            className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Cancel"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </form>
            )}

            {/* Immersive Video Canvas Container */}
            <div
                className={`relative w-full aspect-video bg-black rounded-none sm:rounded-2xl overflow-hidden shadow-2xl border-0 sm:border border-gray-800/80 group ${isMinimized ? 'h-full rounded-2xl' : ''}`}
                onContextMenu={(e) => e.preventDefault()}
            >
                {renderPlayer()}
            </div>
        </div>
    );
};

export default VideoPlayer;
