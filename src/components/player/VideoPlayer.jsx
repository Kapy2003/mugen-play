import { useState, useEffect, useRef } from 'react';
import { ExternalLink, RefreshCw, Settings, Check } from 'lucide-react';
import Hls from 'hls.js';

const VideoPlayer = ({ src, title, onEnded }) => {
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
                    console.error("HLS Error", data);
                    setLoadError(true);
                }
            });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = src;
            videoRef.current.play().catch(() => { });
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [src, playerType, key]);

    const reload = () => {
        setLoadError(false);
        setKey(prev => prev + 1);
    };

    const changeQuality = (levelIndex) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = levelIndex;
            setCurrentQuality(levelIndex);
            setShowQualityMenu(false);
        }
    };

    const renderPlayer = () => {
        if (loadError) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white gap-4 p-6 text-center">
                    <p className="text-lg font-medium text-red-500">
                        {playerType === 'iframe'
                            ? 'Connection refused or blocked by provider.'
                            : 'Video failed to load.'}
                    </p>
                    <p className="text-sm text-gray-400">
                        {playerType === 'iframe'
                            ? 'Some sites do not allow embedding.'
                            : 'Stream might be offline or format unsupported.'}
                    </p>
                </div>
            );
        }

        if (playerType === 'hls' || playerType === 'native') {
            return (
                <div className="relative w-full h-full group">
                    <video
                        key={key}
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full bg-black"
                        controls
                        playsInline
                        onContextMenu={(e) => e.preventDefault()}
                        onError={() => setLoadError(true)}
                        onEnded={onEnded}
                        src={playerType === 'native' ? src : undefined}
                    />

                    {/* Custom HLS Controls Overlay - Only show if we have qualities */}
                    {playerType === 'hls' && qualities.length > 0 && (
                        <div className="absolute top-4 right-4 z-50">
                            <div className="relative">
                                <button
                                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                                    className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm transition-colors border border-white/10"
                                    title="Quality"
                                >
                                    <Settings className="w-5 h-5" />
                                </button>

                                {showQualityMenu && (
                                    <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-xl min-w-[120px] py-1">
                                        <button
                                            onClick={() => changeQuality(-1)}
                                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex items-center justify-between"
                                        >
                                            <span>Auto</span>
                                            {currentQuality === -1 && <Check className="w-3 h-3 text-red-500" />}
                                        </button>
                                        {qualities.map(q => (
                                            <button
                                                key={q.id}
                                                onClick={() => changeQuality(q.id)}
                                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex items-center justify-between"
                                            >
                                                <span>{q.label}</span>
                                                {currentQuality === q.id && <Check className="w-3 h-3 text-red-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Default: Iframe
        return (
            <iframe
                key={key}
                className="absolute inset-0 w-full h-full"
                src={src}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={() => setLoadError(true)}
            />
        );
    };

    return (
        <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-gray-800 group">
                {renderPlayer()}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${loadError ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
                    <span className="text-sm text-gray-400">
                        Source: <span className="text-white font-medium">{new URL(src).hostname}</span>
                        <span className="ml-2 text-xs bg-gray-800 px-2 py-0.5 rounded uppercase">{playerType}</span>
                        {playerType === 'hls' && currentQuality !== -1 && (
                            <span className="ml-2 text-xs bg-red-900/50 text-red-200 px-2 py-0.5 rounded border border-red-500/20">
                                {qualities.find(q => q.id === currentQuality)?.label}
                            </span>
                        )}
                    </span>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={reload}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reload
                    </button>
                    <a
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Open External
                    </a>
                </div>
            </div>

            {playerType === 'iframe' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3">
                    <div className="text-yellow-500">
                        <ExternalLink className="w-5 h-5" />
                    </div>
                    <div className="text-sm">
                        <p className="text-yellow-200 font-bold mb-1">External Source Warning</p>
                        <p className="text-yellow-500/80">
                            You are viewing content from an external provider using an embedded view.
                            If the video doesn&apos;t load, please use the <strong>Open External</strong> button above.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;
