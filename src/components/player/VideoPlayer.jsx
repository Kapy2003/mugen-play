import { useState, useEffect, useRef } from 'react';
import { ExternalLink, RefreshCw, Settings, Check } from 'lucide-react';
import Hls from 'hls.js';

const VideoPlayer = ({ src, title, onEnded, scale = 1, xOffset = 0, yOffset = -60 }) => {
    const [loadError, setLoadError] = useState(false);
    const [key, setKey] = useState(0); // To force reload iframe/video
    const [playerType, setPlayerType] = useState('iframe'); // 'iframe', 'native', 'hls'

    // Quality State
    const [qualities, setQualities] = useState([]);
    const [currentQuality, setCurrentQuality] = useState(-1); // -1 = Auto
    const [showQualityMenu, setShowQualityMenu] = useState(false);

    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    // Determine player type based on src
    useEffect(() => {
        if (!src) return;
        setLoadError(false);
        setQualities([]); // Reset qualities on new source
        setCurrentQuality(-1);

        if (src.endsWith('.m3u8')) {
            setPlayerType('hls');
        } else if (src.match(/\.(mp4|webm|ogg)$/i)) {
            setPlayerType('native');
        } else {
            setPlayerType('iframe');
        }
    }, [src]);

    // HLS Setup
    useEffect(() => {
        if (playerType !== 'hls' || !videoRef.current) return;

        if (Hls.isSupported()) {
            if (hlsRef.current) hlsRef.current.destroy();

            const hls = new Hls();
            hlsRef.current = hls;

            hls.loadSource(src);
            hls.attachMedia(videoRef.current);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                // Get available levels (qualities)
                const levels = data.levels.map((level, index) => ({
                    id: index,
                    height: level.height,
                    bitrate: level.bitrate,
                    label: level.height ? `${level.height}p` : `Level ${index}`
                }));

                setQualities(levels);
                videoRef.current.play().catch(() => { });
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error("HLS Fatal Error", data);
                    // Try to recover or fallback
                    setLoadError(true);
                }
            });
            // End listener
            videoRef.current.onended = onEnded;

        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari Native HLS
            videoRef.current.src = src;
            videoRef.current.addEventListener('loadedmetadata', () => {
                videoRef.current.play();
            });
            videoRef.current.onended = onEnded;
        }

        return () => {
            if (hlsRef.current) hlsRef.current.destroy();
        };
    }, [src, playerType, key]);

    // Quality Change Handler
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
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-400 p-8 text-center">
                    <p className="mb-4">Unable to load video stream.</p>
                    <button
                        onClick={() => setKey(k => k + 1)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={16} /> Retry
                    </button>
                    {playerType === 'iframe' && (
                        <a
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 text-xs text-blue-400 hover:underline flex items-center gap-1"
                        >
                            Open Source <ExternalLink size={12} />
                        </a>
                    )}
                </div>
            );
        }

        if (playerType === 'native' || playerType === 'hls') {
            return (
                <div className="relative group w-full h-full">
                    <video
                        key={key}
                        ref={videoRef}
                        className="w-full h-full"
                        controls
                        playsInline
                        src={playerType === 'native' ? src : undefined}
                        onEnded={onEnded}
                        onError={() => setLoadError(true)}
                    />

                    {/* Quality Selector (HLS only) */}
                    {playerType === 'hls' && qualities.length > 0 && (
                        <div className="absolute bottom-16 right-4 z-20">
                            <button
                                onClick={() => setShowQualityMenu(!showQualityMenu)}
                                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-colors"
                                title="Quality"
                            >
                                <Settings size={20} />
                            </button>

                            {showQualityMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg overflow-hidden min-w-[120px] shadow-xl border border-white/10">
                                    <button
                                        onClick={() => changeQuality(-1)}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center justify-between ${currentQuality === -1 ? 'text-red-400' : 'text-white'}`}
                                    >
                                        Auto {currentQuality === -1 && <Check size={14} />}
                                    </button>
                                    {qualities.map(q => (
                                        <button
                                            key={q.id}
                                            onClick={() => changeQuality(q.id)}
                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center justify-between ${currentQuality === q.id ? 'text-red-400' : 'text-white'}`}
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

        // Default: Iframe
        return (
            <iframe
                key={key}
                className="absolute inset-0 w-full h-full transition-transform duration-300 origin-center"
                style={{
                    marginTop: `${yOffset}px`,
                    height: `calc(100% + ${Math.abs(yOffset)}px)`,
                    transform: `scale(${scale}) translateX(${xOffset}%)`
                }}
                scrolling="no"
                src={src}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="no-referrer"
                onError={() => setLoadError(true)}
            />
        );
    };

    return (
        <div className="space-y-4">
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-gray-800 group">
                {renderPlayer()}
            </div>

            {/* External Warning (Only show if not full screen or if desired) */}
            {playerType === 'iframe' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3">
                    <div className="text-yellow-500">
                        <ExternalLink className="w-5 h-5" />
                    </div>
                    <div className="text-sm">
                        <p className="text-yellow-200 font-bold mb-1">External Source Warning</p>
                        <p className="text-yellow-500/80">
                            You are viewing content from an external provider using an embedded view.
                            If the video doesn&apos;t load, please try reloading or checking the source.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;
