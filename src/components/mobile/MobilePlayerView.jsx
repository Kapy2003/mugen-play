import { useRef } from 'react';
import { ArrowLeft, X, Star, Play } from 'lucide-react';
import VideoPlayer from '../player/VideoPlayer';
import SourceSelector from '../common/SourceSelector';
import { formatAnimeTitle } from '../../lib/formatters';

const MobilePlayerView = ({
    playingAnime,
    onMinimize,
    onClose,
    extensions = [],
    playbackSource = '',
    onSelectSource,
    videoScale = 1,
    videoXOffset = 0,
    videoYOffset = -62,
    devMode = false,
    onUpdateStreamUrl,
    reportProgress,
    saveProgress,
    onOpenExtensionStore,
    onRetry,
    currentEpisodePage = 1,
    setCurrentEpisodePage,
    onPlayEpisode
}) => {
    const headerTouchStartRef = useRef({ x: 0, y: 0 });

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
            onMinimize();
        }
    };

    if (!playingAnime) return null;

    const sourceOptions = (() => {
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
    })();

    const currentSourceId = playbackSource || (extensions.find(e => e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false)?.id || '');

    const episodesList = (playingAnime.episodesList?.length > 0 && playingAnime.episodesList) || Array.from({ length: playingAnime.episodes || 12 });
    const totalPages = Math.ceil(episodesList.length / 12) || 1;
    const pageNum = Number(currentEpisodePage) || 1;
    const paginatedEpisodes = episodesList.slice((pageNum - 1) * 12, pageNum * 12);

    return (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] playback-modal text-white flex flex-col font-sans shadow-2xl overflow-hidden animate-fade-in">
            {/* Top Navigation Bar */}
            <div
                onTouchStart={handleHeaderTouchStart}
                onTouchEnd={handleHeaderTouchEnd}
                className="h-16 flex items-center justify-between px-4 bg-[#050505] playback-topbar border-b border-white/5 z-20 gap-3 animate-fade-in shrink-0 relative select-none"
            >
                {/* Pull-down to minimize indicator bar */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/30 rounded-full pointer-events-none" />

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                        onClick={onMinimize}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white shrink-0 cursor-pointer"
                        title="Back / Minimize Player"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="font-bold text-sm truncate text-gray-200">{formatAnimeTitle(playingAnime.title)}</h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <SourceSelector
                        options={sourceOptions}
                        currentId={currentSourceId}
                        onSelect={onSelectSource}
                        className="z-50"
                    />
                    <div className="h-6 w-px bg-white/10 mx-0.5"></div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white hover:text-red-500 cursor-pointer"
                        title="Close Player"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Main Scrollable Content */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar relative">
                    {/* Video Canvas Container */}
                    <div className="w-full bg-black relative p-3 mt-2 mb-2 rounded-2xl">
                        <VideoPlayer
                            src={playingAnime.url || playingAnime.streamUrl || playingAnime.source}
                            poster={playingAnime.bannerUrl || playingAnime.coverUrl}
                            title={playingAnime.title}
                            isMinimized={false}
                            scale={videoScale}
                            xOffset={videoXOffset}
                            yOffset={videoYOffset === -72 ? -62 : videoYOffset}
                            devMode={devMode}
                            initialTime={playingAnime.initialTime}
                            onUpdateStreamUrl={onUpdateStreamUrl}
                            onProgress={reportProgress}
                            onEnded={saveProgress}
                            onToggleMinimize={onMinimize}
                            onClose={onClose}
                            onOpenExtensionStore={onOpenExtensionStore}
                            onRetry={onRetry}
                        />
                    </div>

                    {/* Details Section */}
                    <div className="p-4 space-y-4 max-w-5xl mx-auto w-full animate-fade-in">
                        <div className="space-y-2">
                            <h1 className="text-xl font-black leading-tight tracking-tight text-white mb-2">{formatAnimeTitle(playingAnime.title)}</h1>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/60 font-black shadow-sm">
                                    <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
                                    {playingAnime.rating ? (playingAnime.rating > 10 ? (playingAnime.rating / 10).toFixed(1) : Number(playingAnime.rating).toFixed(1)) : '8.5'}
                                </span>
                                {playingAnime.year && (
                                    <span className="playback-pill px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold">
                                        {playingAnime.year}
                                    </span>
                                )}
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
                            <p className="text-gray-300 text-xs leading-relaxed max-w-4xl">{playingAnime.synopsis}</p>
                        </div>
                    </div>

                    {/* Stacked Mobile Episode List */}
                    {playingAnime.format !== 'MOVIE' && (
                        <div className="p-4 max-w-5xl mx-auto w-full space-y-4 border-t border-white/5 animate-fade-in pb-12">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-white text-base">Episodes</h3>
                                <span className="text-xs text-gray-400">{episodesList.length} Total</span>
                            </div>

                            {/* Mobile Episode Pagination */}
                            <div className="flex justify-between items-center px-1 pb-1">
                                <button
                                    onClick={() => setCurrentEpisodePage(p => Math.max(1, p - 1))}
                                    disabled={pageNum === 1}
                                    className="pagination-btn text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 active:scale-95 shadow-sm"
                                >
                                    Prev
                                </button>
                                <div className="pagination-box flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border shadow-sm font-bold">
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={currentEpisodePage}
                                        onChange={(e) => {
                                            const valStr = e.target.value;
                                            if (valStr === '') {
                                                setCurrentEpisodePage('');
                                                return;
                                            }
                                            const val = parseInt(valStr);
                                            if (!isNaN(val) && val >= 1 && val <= totalPages) {
                                                setCurrentEpisodePage(val);
                                            }
                                        }}
                                        className="w-8 bg-transparent text-center outline-none font-bold no-spinner"
                                    />
                                    <span className="pagination-divider font-black select-none">/</span>
                                    <span className="pagination-total font-black select-none">{totalPages}</span>
                                </div>
                                <button
                                    onClick={() => setCurrentEpisodePage(p => Math.min(totalPages, (Number(p) || 1) + 1))}
                                    disabled={pageNum === totalPages}
                                    className="pagination-btn text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 active:scale-95 shadow-sm"
                                >
                                    Next
                                </button>
                            </div>

                            {/* Mobile Episode Items */}
                            <div className="space-y-2">
                                {paginatedEpisodes.map((ep, idx) => {
                                    const epNum = ep?.number || ((pageNum - 1) * 12) + idx + 1;
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
                                            onClick={() => isReleased && onPlayEpisode(playingAnime, epNum)}
                                            disabled={!isReleased}
                                            className={`mobile-episode-item w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border group cursor-pointer ${
                                                isCurrent
                                                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/30 font-semibold'
                                                    : (isReleased ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5' : 'bg-white/5 opacity-40 cursor-not-allowed text-gray-600 border-transparent')
                                            }`}
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
            </div>
        </div>
    );
};

export default MobilePlayerView;
