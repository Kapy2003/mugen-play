import { ArrowLeft, X, PanelRight, Star, Play } from 'lucide-react';
import VideoPlayer from '../player/VideoPlayer';
import SourceSelector from '../common/SourceSelector';
import { formatAnimeTitle } from '../../lib/formatters';

const DesktopPlayerView = ({
    playingAnime,
    onMinimize,
    onClose,
    extensions = [],
    playbackSource = '',
    onSelectSource,
    videoScale = 1,
    videoXOffset = 0,
    videoYOffset = -72,
    devMode = false,
    onUpdateStreamUrl,
    reportProgress,
    saveProgress,
    onOpenExtensionStore,
    onRetry,
    isSidebarVisible = true,
    setIsSidebarVisible,
    currentEpisodePage = 1,
    setCurrentEpisodePage,
    onPlayEpisode
}) => {
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
            <div className="h-16 flex items-center justify-between px-6 bg-[#050505] playback-topbar border-b border-white/5 z-20 gap-4 animate-fade-in shrink-0 relative select-none">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                        onClick={onMinimize}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white shrink-0 cursor-pointer"
                        title="Back / Minimize Player"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="font-bold text-base truncate text-gray-200">{formatAnimeTitle(playingAnime.title)}</h2>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <SourceSelector
                        options={sourceOptions}
                        currentId={currentSourceId}
                        onSelect={onSelectSource}
                        className="z-50"
                    />

                    <div className="h-6 w-px bg-white/10 mx-1"></div>

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white hover:text-red-500 cursor-pointer"
                        title="Close Player"
                    >
                        <X size={20} />
                    </button>
                    <button
                        onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                        className={`flex p-2 rounded-full transition-colors cursor-pointer ${isSidebarVisible ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-gray-400'}`}
                        title="Toggle Episodes"
                    >
                        <PanelRight size={20} />
                    </button>
                </div>
            </div>

            {/* Main Area: Player Column + Episode Sidebar */}
            <div className="flex-1 flex overflow-hidden">
                {/* Player Column */}
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    <div className="w-full max-w-5xl mx-auto ring-1 ring-white/10 rounded-3xl p-5 mt-6 mb-4 bg-black relative">
                        <VideoPlayer
                            src={playingAnime.url || playingAnime.streamUrl || playingAnime.source}
                            poster={playingAnime.bannerUrl || playingAnime.coverUrl}
                            title={playingAnime.title}
                            isMinimized={false}
                            scale={videoScale}
                            xOffset={videoXOffset}
                            yOffset={videoYOffset}
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

                    {/* Details */}
                    <div className="p-8 max-w-5xl mx-auto w-full space-y-6 animate-fade-in">
                        <div className="flex gap-6 items-start">
                            <img
                                src={playingAnime.coverUrl}
                                alt="Cover"
                                className="w-36 rounded-2xl shadow-2xl block border border-white/10 shrink-0"
                            />
                            <div className="flex-1 space-y-3">
                                <h1 className="text-3xl font-black leading-tight tracking-tight text-white mb-2">
                                    {formatAnimeTitle(playingAnime.title)}
                                </h1>
                                <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
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
                                <p className="text-gray-300 text-sm leading-relaxed max-w-4xl">{playingAnime.synopsis}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Episode Sidebar */}
                {playingAnime.format !== 'MOVIE' && (
                    <div className={`${isSidebarVisible ? 'w-80 lg:w-96 translate-x-0' : 'w-0 translate-x-full hidden'} flex bg-[#111] playback-episode-sidebar border-l border-white/5 flex-col transition-all duration-300 ease-in-out z-20 overflow-hidden no-scrollbar`}>
                        <div className="p-4 border-b border-white/5 bg-[#111] playback-sidebar-header z-10 flex justify-between items-center whitespace-nowrap overflow-hidden">
                            <h3 className="font-bold text-gray-200">Episodes</h3>
                            <span className="text-xs text-gray-500">{episodesList.length} Total</span>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
                            {/* Pagination Controls in Sidebar */}
                            <div className="flex justify-between items-center px-2 pb-2">
                                <button
                                    onClick={() => setCurrentEpisodePage(p => Math.max(1, p - 1))}
                                    disabled={pageNum === 1}
                                    className="pagination-btn text-xs font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer disabled:opacity-30 active:scale-95 shadow-sm"
                                >
                                    Prev
                                </button>

                                <div className="pagination-box flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border shadow-sm font-bold">
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
                                        onKeyDown={(e) => e.stopPropagation()}
                                    />
                                    <span className="pagination-divider font-black select-none">/</span>
                                    <span className="pagination-total font-black select-none">{totalPages}</span>
                                </div>
                                <button
                                    onClick={() => setCurrentEpisodePage(p => Math.min(totalPages, (Number(p) || 1) + 1))}
                                    disabled={pageNum === totalPages}
                                    className="pagination-btn text-xs font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer disabled:opacity-30 active:scale-95 shadow-sm"
                                >
                                    Next
                                </button>
                            </div>

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
                                        className={`playback-episode-item w-full flex items-center gap-3 p-2.5 rounded-xl transition-all group relative overflow-hidden cursor-pointer ${
                                            isCurrent
                                                ? 'bg-red-600 text-white shadow-lg shadow-red-900/30 font-semibold'
                                                : (isReleased ? 'hover:bg-white/10 text-gray-300' : 'opacity-40 cursor-not-allowed text-gray-600')
                                        }`}
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
    );
};

export default DesktopPlayerView;
