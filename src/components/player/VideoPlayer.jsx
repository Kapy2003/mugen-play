import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Settings, Check, AlertTriangle, Link, Edit3, Copy, CheckCheck, X, ExternalLink, Sliders, RotateCcw, ZoomIn, ZoomOut, ChevronUp, ChevronDown, Crop } from 'lucide-react';
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
    yOffset = -72,
    isMinimized = false,
    devMode = false,
    onUpdateStreamUrl
}) => {
    const [activeSrc, setActiveSrc] = useState(src);
    const [loadError, setLoadError] = useState(false);
    const [key, setKey] = useState(0);
    const [playerType, setPlayerType] = useState('iframe');

    // Editable Link State
    const [isEditingLink, setIsEditingLink] = useState(false);
    const [customUrlInput, setCustomUrlInput] = useState(src || '');
    const [isCopied, setIsCopied] = useState(false);

    // Viewport & Crop State (Default Offset: -72px, Zoom: 100%)
    const [localYOffset, setLocalYOffset] = useState(yOffset !== undefined ? yOffset : -72);
    const [localScale, setLocalScale] = useState(scale !== undefined ? scale : 1);
    const [localXOffset, setLocalXOffset] = useState(xOffset || 0);
    const [showViewportControls, setShowViewportControls] = useState(false);

    // Quality State (for HLS)
    const [qualities, setQualities] = useState([]);
    const [currentQuality, setCurrentQuality] = useState(-1);
    const [showQualityMenu, setShowQualityMenu] = useState(false);

    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    // Sync activeSrc ONLY when incoming src changes to a new URL (prevents iframe reloads on resize/minimize)
    useEffect(() => {
        if (!src) return;
        if (src !== activeSrc) {
            setActiveSrc(src);
            setCustomUrlInput(src);
            setLoadError(false);
            setKey(k => k + 1);
            setQualities([]);
            setCurrentQuality(-1);

            if (src.endsWith('.m3u8')) {
                setPlayerType('hls');
            } else if (src.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
                setPlayerType('native');
            } else {
                setPlayerType('iframe');
            }
        }
    }, [src, activeSrc]);

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

    const handleOpenExternal = () => {
        if (!activeSrc) return;
        window.open(activeSrc, '_blank', 'noopener,noreferrer');
    };

    const changeQuality = (qualityId) => {
        setCurrentQuality(qualityId);
        if (hlsRef.current) {
            hlsRef.current.currentLevel = qualityId;
        }
        setShowQualityMenu(false);
    };

    const renderPlayer = () => {
        if (loadError) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 text-gray-400 p-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-white font-semibold text-base mb-1">Stream Server Loading or Offline</p>
                        <p className="text-xs text-gray-400 max-w-md">
                            The current stream could not be loaded directly. You can edit the stream link below or open the source directly.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <button
                            onClick={() => {
                                setLoadError(false);
                                setKey(k => k + 1);
                            }}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 border border-gray-700 cursor-pointer"
                        >
                            <RefreshCw size={14} /> Retry Stream
                        </button>
                        <button
                            onClick={() => setIsEditingLink(true)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
                        >
                            <Edit3 size={14} /> Edit Stream Link
                        </button>
                        {activeSrc && (
                            <button
                                onClick={handleOpenExternal}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 border border-white/10 cursor-pointer"
                            >
                                <ExternalLink size={14} /> Open in New Tab
                            </button>
                        )}
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

        // Default: Embedded Stream Player (Desktop Max: -72px, Mobile Max: -62px, Mini: -50px)
        const effectiveYOffset = localYOffset !== undefined ? localYOffset : (isMinimized ? -50 : -72);
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

                    {/* Developer Actions: Copy, Open, Viewport Adjust, Edit Link */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleCopyUrl}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-white/5"
                            title="Copy current stream link"
                        >
                            {isCopied ? <CheckCheck size={13} className="text-green-400" /> : <Copy size={13} />}
                            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>

                        {activeSrc && (
                            <button
                                onClick={handleOpenExternal}
                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-white/5"
                                title="Open stream in a new tab"
                            >
                                <ExternalLink size={13} />
                                <span className="hidden sm:inline">Open</span>
                            </button>
                        )}

                        {/* Adjust Viewport / Crop Header Button */}
                        <button
                            onClick={() => setShowViewportControls(!showViewportControls)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                showViewportControls || localYOffset !== -72
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
