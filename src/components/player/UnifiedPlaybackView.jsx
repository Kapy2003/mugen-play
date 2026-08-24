import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    ArrowLeft,
    X,
    Star,
    Calendar,
    Tv,
    Play,
    PanelRight,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Maximize2,
    Minimize2
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import SourceSelector from '../common/SourceSelector';
import { formatAnimeTitle } from '../../lib/formatters';
import { IframeStreamExtractor } from '../../lib/IframeStreamExtractor';
import { AnimeUrlResolver } from '../../lib/AnimeUrlResolver';

const UnifiedPlaybackView = ({
    playingAnime,
    isMinimized = false,
    isDesktop = true,
    onMinimize,
    onExpand,
    onClose,
    extensions = [],
    playbackSource = '',
    onSelectSource,
    videoScale = 1,
    videoXOffset = 0,
    videoYOffset = -72,
    miniVideoScale = 1,
    miniVideoYOffset = -50,
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
    // Draggable Miniplayer Position & Snapping State
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const dragOriginRef = useRef({ x: 0, y: 0, hasMoved: false });
    const miniPlayerContainerRef = useRef(null);

    // Mobile pull-down to minimize gesture ref
    const mobileHeaderTouchRef = useRef({ x: 0, y: 0 });

    // Stream Source Options
    const sourceOptions = (() => {
        const streamOpts = extensions
            .filter(e => e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false)
            .map(e => ({
                id: e.id,
                name: e.name || e.id
            }))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

        if (streamOpts.length === 0) {
            streamOpts.push({ id: 'none', name: 'No Stream Sources' });
        }
        return streamOpts;
    })();

    const currentSourceId = playbackSource || (extensions.find(e => e.type !== 'metadata' && e.id !== 'anilist_source' && e.enabled !== false)?.id || '');

    // Episodes Pagination Setup
    const episodesList = (playingAnime?.episodesList?.length > 0 && playingAnime.episodesList) || Array.from({ length: playingAnime?.episodes || 12 });
    const totalPages = Math.ceil(episodesList.length / 12) || 1;
    const pageNum = Number(currentEpisodePage) || 1;
    const paginatedEpisodes = episodesList.slice((pageNum - 1) * 12, pageNum * 12);

    // Airing status calculation
    const isEpisodeReleased = (epNumber) => {
        if (playingAnime?.status === 'NOT_YET_RELEASED') return false;
        if (playingAnime?.status === 'FINISHED') return true;
        if (!playingAnime?.nextAiringEpisode) return true;
        return epNumber < playingAnime.nextAiringEpisode.episode;
    };

    // Miniplayer Drag Handlers with Smooth Tracking & Magnetic Snapping
    const handlePointerDown = (e) => {
        if (!isMinimized) return;
        if (e.target.closest('button')) return;

        isDraggingRef.current = true;
        setIsDragging(true);
        dragOriginRef.current = {
            x: dragPosition.x,
            y: dragPosition.y,
            hasMoved: false
        };
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY
        };
        if (e.currentTarget.setPointerCapture) {
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
                // ignore
            }
        }
    };

    const handlePointerMove = (e) => {
        if (!isDraggingRef.current || !isMinimized) return;
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            dragOriginRef.current.hasMoved = true;
        }

        const newX = dragOriginRef.current.x + deltaX;
        const newY = dragOriginRef.current.y + deltaY;

        // Viewport Boundary Clamping
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 768;
        const miniW = miniPlayerContainerRef.current?.offsetWidth || (screenW < 640 ? screenW - 24 : 384);
        const miniH = miniPlayerContainerRef.current?.offsetHeight || (screenW < 640 ? 192 : 224);

        const minX = -(screenW - miniW - (screenW < 640 ? 24 : 48));
        const maxX = 24;
        const minY = -(screenH - miniH - 40);
        const maxY = 24;

        const clampedX = Math.max(minX, Math.min(maxX, newX));
        const clampedY = Math.max(minY, Math.min(maxY, newY));

        setDragPosition({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = useCallback((e) => {
        if (!isDraggingRef.current || !isMinimized) return;
        isDraggingRef.current = false;
        setIsDragging(false);
        if (e?.currentTarget?.releasePointerCapture) {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
                // ignore
            }
        }

        // Magnetic snap horizontally to closest edge
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const miniW = miniPlayerContainerRef.current?.offsetWidth || (screenW < 640 ? screenW - 24 : 384);
        const currentCenter = (screenW - 24 - miniW / 2) + dragPosition.x;

        if (currentCenter < screenW / 2) {
            // Snap left
            const leftSnapX = -(screenW - miniW - (screenW < 640 ? 24 : 48));
            setDragPosition(prev => ({ ...prev, x: leftSnapX }));
        } else {
            // Snap right
            setDragPosition(prev => ({ ...prev, x: 0 }));
        }
    }, [isMinimized, dragPosition.x]);

    // Mobile pull-down dismiss
    const handleMobileHeaderTouchStart = (e) => {
        if (e.touches?.[0]) {
            mobileHeaderTouchRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
    };

    const handleMobileHeaderTouchEnd = (e) => {
        if (!e.changedTouches?.[0]) return;
        const diffY = e.changedTouches[0].clientY - mobileHeaderTouchRef.current.y;
        const diffX = e.changedTouches[0].clientX - mobileHeaderTouchRef.current.x;
        if (diffY > 50 && diffY > Math.abs(diffX)) {
            onMinimize();
        }
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (onClose) {
                    onClose();
                } else if (onMinimize) {
                    onMinimize();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onMinimize]);

    // Next Episode Background Pre-Extraction
    useEffect(() => {
        if (!playingAnime) return;
        const currentEp = Number(playingAnime.episode) || 1;
        const nextEp = currentEp + 1;
        const totalEps = playingAnime.episodes || 12;
        if (nextEp <= totalEps && isEpisodeReleased(nextEp)) {
            const nextStream = AnimeUrlResolver.resolveStream(
                playingAnime,
                nextEp,
                extensions.find(e => e.id === currentSourceId)
            );
            if (nextStream?.streamUrl) {
                IframeStreamExtractor.prefetch(nextStream.streamUrl);
            }
        }
    }, [playingAnime, currentSourceId, extensions]);

    if (!playingAnime) return null;

    const displayTitle = formatAnimeTitle(playingAnime.title);
    const coverSrc = playingAnime.coverUrl || playingAnime.image;
    const bannerSrc = playingAnime.bannerUrl || coverSrc;
    const genresList = Array.isArray(playingAnime.genres) ? playingAnime.genres : [];

    const isHiAnimeSource = Boolean(
        (playingAnime?.url && playingAnime.url.includes('hianime')) ||
        (playbackSource && playbackSource.includes('hianime'))
    );

    const effectiveScale = isMinimized
        ? (!isDesktop && miniVideoScale === 1 ? (isHiAnimeSource ? 0.92 : 1) : miniVideoScale)
        : videoScale;

    const effectiveYOffset = isHiAnimeSource
        ? (isMinimized
            ? (!isDesktop && miniVideoYOffset === -50 ? -62 : miniVideoYOffset)
            : (isDesktop ? videoYOffset : (videoYOffset === -72 ? -62 : videoYOffset)))
        : 0;

    return (
        <div
            ref={miniPlayerContainerRef}
            onPointerDown={isMinimized ? handlePointerDown : undefined}
            onPointerMove={isMinimized ? handlePointerMove : undefined}
            onPointerUp={isMinimized ? handlePointerUp : undefined}
            onPointerCancel={isMinimized ? handlePointerUp : undefined}
            onClick={isMinimized ? () => {
                if (!dragOriginRef.current.hasMoved) {
                    onExpand();
                }
            } : undefined}
            style={isMinimized ? {
                transform: `translate3d(${dragPosition.x}px, ${dragPosition.y}px, 0)`,
                touchAction: 'none'
            } : undefined}
            className={`font-sans ${
                isDragging ? 'transition-none' : 'transition-transform duration-300 ease-out'
            } ${
                isMinimized
                    ? 'fixed z-50 bg-[#0a0a0a] playback-modal text-white flex flex-col shadow-2xl overflow-hidden bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 h-48 sm:h-56 rounded-2xl border border-white/15 ring-1 ring-black/50 cursor-grab active:cursor-grabbing select-none transform-gpu will-change-transform'
                    : 'fixed inset-0 z-50 bg-[#0a0a0a] playback-modal text-white flex flex-col shadow-2xl overflow-hidden'
            }`}
        >
            {/* Minimized Drag Handle Bar */}
            <div className={`absolute top-2 left-1/2 -translate-x-1/2 z-[130] pointer-events-none ${isMinimized ? 'block' : 'hidden'}`}>
                <div className="w-10 h-1 rounded-full bg-white/50 shadow-sm" />
            </div>

            {/* Desktop Maximized Top Bar */}
            <div className={`h-16 items-center justify-between px-6 bg-[#050505] playback-topbar border-b border-white/5 z-20 gap-4 shrink-0 relative select-none ${!isMinimized && isDesktop ? 'flex' : 'hidden'}`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onMinimize}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white cursor-pointer"
                        title="Minimize Player (Esc)"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="font-bold text-base truncate text-gray-200 max-w-md">
                        {displayTitle}
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <SourceSelector
                        options={sourceOptions}
                        currentId={currentSourceId}
                        onSelect={onSelectSource}
                        className="z-50"
                    />
                    <div className="h-6 w-px bg-white/10 mx-1"></div>
                    <button
                        onClick={onMinimize}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white cursor-pointer"
                        title="Minimize Player"
                    >
                        <Minimize2 size={20} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-red-500 cursor-pointer"
                        title="Close Player (Cross)"
                    >
                        <X size={20} />
                    </button>
                    <button
                        onClick={() => setIsSidebarVisible && setIsSidebarVisible(!isSidebarVisible)}
                        className={`flex p-2 rounded-full transition-colors cursor-pointer ${isSidebarVisible ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-gray-400'}`}
                        title="Toggle Episodes"
                    >
                        <PanelRight size={20} />
                    </button>
                </div>
            </div>

            {/* Mobile Maximized Top Bar */}
            <div
                onTouchStart={handleMobileHeaderTouchStart}
                onTouchEnd={handleMobileHeaderTouchEnd}
                className={`h-16 items-center justify-between px-4 bg-[#050505] playback-topbar border-b border-white/5 z-20 gap-3 shrink-0 relative select-none ${!isMinimized && !isDesktop ? 'flex' : 'hidden'}`}
            >
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/30 rounded-full pointer-events-none" />

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                        onClick={onMinimize}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white shrink-0 cursor-pointer"
                        title="Back / Minimize Player"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="font-bold text-sm truncate text-gray-200">{displayTitle}</h2>
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

            {/* Main Stage & Persistent Video Canvas */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Scrollable Player Column (Maximized Desktop / Mobile) or Direct Mini Canvas (Minimized) */}
                <div className={`flex-1 flex flex-col ${isMinimized ? 'overflow-hidden h-full' : 'overflow-y-auto no-scrollbar relative'}`}>
                    {/* The Single Persistent Video Canvas Container */}
                    <div className={`video-canvas-host w-full bg-black relative ${
                        isMinimized
                            ? 'h-full rounded-2xl overflow-hidden shadow-2xl z-[100]'
                            : (isDesktop
                                ? 'max-w-5xl mx-auto ring-1 ring-white/10 rounded-3xl p-5 mt-6 mb-4'
                                : 'p-3 mt-2 mb-2 rounded-2xl')
                    }`}>
                        <VideoPlayer
                            src={playingAnime.url || playingAnime.streamUrl || playingAnime.source}
                            poster={bannerSrc || coverSrc}
                            title={playingAnime.title}
                            isMinimized={isMinimized}
                            scale={effectiveScale}
                            xOffset={videoXOffset}
                            yOffset={effectiveYOffset}
                            devMode={devMode}
                            initialTime={playingAnime.initialTime}
                            onUpdateStreamUrl={onUpdateStreamUrl}
                            onProgress={reportProgress}
                            onEnded={saveProgress}
                            onToggleMinimize={isMinimized ? onExpand : onMinimize}
                            onClose={onClose}
                            onOpenExtensionStore={onOpenExtensionStore}
                            onRetry={onRetry}
                        />

                        {/* Minimized Overlay Controls: Maximize Button & Close (Cross) Button */}
                        <div className={`minimized-player-overlay absolute top-0 left-0 right-0 p-2.5 justify-end gap-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent z-[120] pointer-events-auto transition-opacity ${isMinimized ? 'flex opacity-100 sm:opacity-90 sm:hover:opacity-100' : 'hidden'}`}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onExpand();
                                }}
                                className="minimized-btn p-2 bg-black/80 hover:bg-black text-white rounded-full backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/20 cursor-pointer"
                                title="Maximize Player"
                            >
                                <Maximize2 size={16} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-red-500/30 cursor-pointer"
                                title="Close Player"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Maximized Desktop Details Section */}
                    <div className={`p-8 max-w-5xl mx-auto w-full space-y-6 ${!isMinimized && isDesktop ? 'block' : 'hidden'}`}>
                        <div className="flex gap-6 items-start">
                            {coverSrc && (
                                <img
                                    src={coverSrc}
                                    alt="Cover"
                                    className="w-36 rounded-2xl shadow-2xl block border border-white/10 shrink-0"
                                />
                            )}
                            <div className="flex-1 space-y-3">
                                <h1 className="text-3xl font-black leading-tight tracking-tight text-white mb-2">
                                    {displayTitle}
                                </h1>
                                <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/60 font-black shadow-sm">
                                        <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
                                        {playingAnime.rating ? (Number(playingAnime.rating) > 10 ? (Number(playingAnime.rating) / 10).toFixed(1) : Number(playingAnime.rating).toFixed(1)) : '8.5'}
                                    </span>
                                    {playingAnime.year && (
                                        <span className="playback-pill px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold">
                                            {playingAnime.year}
                                        </span>
                                    )}
                                    <span className="playback-pill px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold">
                                        {playingAnime.episodes || episodesList.length || '?'} Eps
                                    </span>
                                    <span className="playback-pill px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold uppercase tracking-wide">
                                        {playingAnime.format || 'TV'}
                                    </span>
                                </div>
                                {genresList.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {genresList.map(genre => (
                                            <span key={genre} className="text-xs px-2.5 py-1 rounded-lg bg-red-600/10 text-red-400 border border-red-600/20 font-medium">
                                                {genre}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        {playingAnime.synopsis && (
                            <div className="playback-synopsis-box bg-white/5 border border-white/10 p-6 rounded-2xl">
                                <h3 className="font-bold text-white mb-2 text-sm uppercase tracking-wider text-red-500">Synopsis</h3>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    {playingAnime.synopsis.replace(/<[^>]*>?/gm, '')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Maximized Mobile Details & Episodes Section */}
                    <div className={`p-4 space-y-4 max-w-5xl mx-auto w-full ${!isMinimized && !isDesktop ? 'block' : 'hidden'}`}>
                        <div className="space-y-2">
                            <h1 className="text-xl font-black leading-tight tracking-tight text-white mb-2">{displayTitle}</h1>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/60 font-black shadow-sm">
                                    <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                                    {playingAnime.rating ? (Number(playingAnime.rating) > 10 ? (Number(playingAnime.rating) / 10).toFixed(1) : Number(playingAnime.rating).toFixed(1)) : '8.5'}
                                </span>
                                {playingAnime.year && (
                                    <span className="playback-pill px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold">
                                        {playingAnime.year}
                                    </span>
                                )}
                                <span className="playback-pill px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold">
                                    {playingAnime.episodes || episodesList.length || '?'} Eps
                                </span>
                                <span className="playback-pill px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold uppercase tracking-wide">
                                    {playingAnime.format || 'TV'}
                                </span>
                            </div>
                        </div>

                        {/* Mobile Paginated Episodes */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                    Episodes
                                    <span className="text-xs text-gray-400 font-normal">({episodesList.length} Total)</span>
                                </h3>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            disabled={pageNum === 1}
                                            onClick={() => setCurrentEpisodePage && setCurrentEpisodePage(p => Math.max(1, p - 1))}
                                            className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-xs font-mono px-2 text-gray-300">
                                            {pageNum}/{totalPages}
                                        </span>
                                        <button
                                            disabled={pageNum === totalPages}
                                            onClick={() => setCurrentEpisodePage && setCurrentEpisodePage(p => Math.min(totalPages, p + 1))}
                                            className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                                {paginatedEpisodes.map((ep, idx) => {
                                    const epNum = (pageNum - 1) * 12 + idx + 1;
                                    const isCurrent = epNum === (playingAnime.currentEpisode || 1);
                                    const released = isEpisodeReleased(epNum);
                                    const epTitle = ep?.title || `Episode ${epNum}`;
                                    const epThumb = ep?.thumbnail || bannerSrc || coverSrc;
                                    const isNextAiring = !released && playingAnime.nextAiringEpisode && epNum === playingAnime.nextAiringEpisode.episode;
                                    const epStatusText = isCurrent
                                        ? 'Now Playing'
                                        : (released
                                            ? 'Ready to stream'
                                            : (isNextAiring ? `Air in ${Math.round(playingAnime.nextAiringEpisode.timeUntilAiring / 86400)}d` : 'Not Aired'));

                                    return (
                                        <button
                                            key={epNum}
                                            disabled={!released}
                                            onClick={() => released && onPlayEpisode && onPlayEpisode(playingAnime, epNum)}
                                            className={`playback-ep-item flex items-center gap-3 p-2 rounded-xl text-left border transition-all ${
                                                isCurrent
                                                    ? 'bg-red-600/20 border-red-500/50 text-white font-bold cursor-pointer'
                                                    : (released
                                                        ? 'bg-white/5 hover:bg-white/10 border-transparent text-gray-300 cursor-pointer'
                                                        : 'bg-white/5 border-transparent opacity-40 text-gray-500 cursor-not-allowed pointer-events-none')
                                            }`}
                                        >
                                            <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/5">
                                                {epThumb && (
                                                    <img
                                                        src={epThumb}
                                                        alt={epTitle}
                                                        className={`w-full h-full object-cover ${released ? '' : 'grayscale opacity-50'}`}
                                                        loading="lazy"
                                                    />
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                                        isCurrent ? 'bg-red-600 text-white' : (released ? 'bg-black/60 text-gray-200' : 'bg-gray-800/80 text-gray-500')
                                                    }`}>
                                                        <Play size={10} className="fill-current ml-0.5" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold truncate">Ep {epNum}: {epTitle}</div>
                                                <div className="text-[10px] text-gray-400 truncate mt-0.5">{epStatusText}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Maximized Desktop Episode Sidebar */}
                <div className={`w-80 border-l border-white/5 bg-[#050505] flex-col shrink-0 select-none ${!isMinimized && isDesktop && isSidebarVisible ? 'flex' : 'hidden'}`}>
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-white flex items-center gap-2">
                            Episodes
                            <span className="text-xs text-gray-400 font-normal">({episodesList.length})</span>
                        </h3>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={pageNum === 1}
                                    onClick={() => setCurrentEpisodePage && setCurrentEpisodePage(p => Math.max(1, p - 1))}
                                    className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs font-mono px-2 text-gray-300">{pageNum}/{totalPages}</span>
                                <button
                                    disabled={pageNum === totalPages}
                                    onClick={() => setCurrentEpisodePage && setCurrentEpisodePage(p => Math.min(totalPages, p + 1))}
                                    className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
                        {paginatedEpisodes.map((ep, idx) => {
                            const epNum = (pageNum - 1) * 12 + idx + 1;
                            const isCurrent = epNum === (playingAnime.currentEpisode || 1);
                            const released = isEpisodeReleased(epNum);
                            const epTitle = ep?.title || `Episode ${epNum}`;
                            const epThumb = ep?.thumbnail || bannerSrc || coverSrc;
                            const isNextAiring = !released && playingAnime.nextAiringEpisode && epNum === playingAnime.nextAiringEpisode.episode;
                            const epStatusText = isCurrent
                                ? 'Now Playing'
                                : (released
                                    ? 'Ready to stream'
                                    : (isNextAiring ? `Air in ${Math.round(playingAnime.nextAiringEpisode.timeUntilAiring / 86400)}d` : 'Not Aired'));

                            return (
                                <button
                                    key={epNum}
                                    disabled={!released}
                                    onClick={() => released && onPlayEpisode && onPlayEpisode(playingAnime, epNum)}
                                    className={`playback-ep-item w-full flex items-center gap-3 p-2.5 rounded-2xl text-left border transition-all ${
                                        isCurrent
                                            ? 'bg-red-600/20 border-red-500/50 text-white font-bold cursor-pointer'
                                            : (released
                                                ? 'bg-white/5 hover:bg-white/10 border-transparent text-gray-300 cursor-pointer'
                                                : 'bg-white/5 border-transparent opacity-40 text-gray-500 cursor-not-allowed pointer-events-none')
                                    }`}
                                >
                                    <div className="relative w-24 aspect-video rounded-xl overflow-hidden bg-black/40 shrink-0 border border-white/5">
                                        {epThumb && (
                                            <img
                                                src={epThumb}
                                                alt={epTitle}
                                                className={`w-full h-full object-cover ${released ? '' : 'grayscale opacity-50'}`}
                                                loading="lazy"
                                            />
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                isCurrent ? 'bg-red-600 text-white' : (released ? 'bg-black/60 text-gray-200' : 'bg-gray-800/80 text-gray-500')
                                            }`}>
                                                <Play size={12} className="fill-current ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold truncate">Ep {epNum}: {epTitle}</div>
                                        <div className="text-[11px] text-gray-400 truncate mt-0.5">{epStatusText}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

UnifiedPlaybackView.displayName = 'UnifiedPlaybackView';

export default UnifiedPlaybackView;
