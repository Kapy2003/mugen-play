import React, { useState, useEffect, useRef } from 'react';
import { Play, Star, Calendar, Heart, Share2, X, List, LayoutGrid, Tv, Check } from 'lucide-react';
import { formatAnimeTitle } from '../../lib/formatters';

const AnimeDetailModal = React.memo(({ anime, isOpen, onClose, onPlay, isFavorite, onToggleFavorite, showToast }) => {
    const isModalOpen = isOpen !== undefined ? Boolean(isOpen) : Boolean(anime);
    const [showTrailer, setShowTrailer] = useState(false);
    const [episodeViewMode, setEpisodeViewMode] = useState('cards'); // 'cards' (thumbnails) or 'pills' (compact)
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const modalContentRef = useRef(null);
    const touchStartRef = useRef(null);

    // Reset view state when opening a new anime
    useEffect(() => {
        if (isModalOpen && anime) {
            setShowTrailer(false);
            setIsDescriptionExpanded(false);
            setCopied(false);
            if (modalContentRef.current) {
                modalContentRef.current.scrollTop = 0;
            }
        }
    }, [isModalOpen, anime?.id]);

    if (!isModalOpen || !anime) return null;

    const episodes = anime.episodesList || Array.from({ length: anime.episodes || 12 }, (_, i) => ({
        number: i + 1,
        title: `Episode ${i + 1}`,
        thumbnail: anime.bannerUrl || anime.coverUrl,
        site: 'MugenStream'
    }));

    const displayTitle = formatAnimeTitle(anime.title || anime.name);
    const coverSrc = anime.coverUrl || anime.image || anime.coverImage?.large;
    const bannerSrc = anime.bannerUrl || anime.bannerImage || coverSrc;
    const genresList = Array.isArray(anime.genres) ? anime.genres : [];

    // Format Rating accurately
    const formattedRating = anime.rating
        ? (Number(anime.rating) > 10 ? (Number(anime.rating) / 10).toFixed(1) : Number(anime.rating).toFixed(1))
        : '8.5';

    // Airing status calculation
    const isEpisodeReleased = (epNumber) => {
        if (anime.status === 'NOT_YET_RELEASED') return false;
        if (anime.status === 'FINISHED') return true;
        if (!anime.nextAiringEpisode) return true;
        return epNumber < anime.nextAiringEpisode.episode;
    };
    const hasPlayableEpisode = isEpisodeReleased(1);

    // Mobile pull-down dismiss gesture
    const handleTouchStart = (e) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            scrollTop: modalContentRef.current?.scrollTop || 0
        };
    };

    const handleTouchEnd = (e) => {
        if (!touchStartRef.current) return;
        const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
        const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;

        if (diffY > 100 && diffY > Math.abs(diffX) * 1.5 && modalContentRef.current && modalContentRef.current.scrollTop <= 5) {
            onClose();
        }
        touchStartRef.current = null;
    };

    // Helper to format time until airing
    const formatTimeUntilAiring = (seconds) => {
        if (!seconds) return '';
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        if (days > 0) return `${days}d ${hours}h`;
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    // Universal robust Share handler (Copies direct anime deep-link on all platforms + mobile native share)
    const handleShare = async () => {
        const title = displayTitle || 'Mugen Play';
        const baseUrl = window.location.origin + window.location.pathname;
        const targetId = anime.id || anime.slug || '';
        const shareUrl = targetId ? `${baseUrl}?anime=${targetId}` : window.location.href;
        let copyDone = false;

        // 1. Modern Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                copyDone = true;
            } catch {
                // fallback below
            }
        }

        // 2. Fallback via temporary textarea
        if (!copyDone) {
            try {
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                textArea.style.position = 'fixed';
                textArea.style.top = '0';
                textArea.style.left = '0';
                textArea.style.opacity = '0';
                textArea.style.pointerEvents = 'none';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                copyDone = document.execCommand('copy');
                document.body.removeChild(textArea);
            } catch {
                copyDone = true;
            }
        }

        // Trigger UI feedback
        setCopied(true);
        if (showToast) {
            showToast(`Link copied to clipboard!`, 'success');
        }
        setTimeout(() => setCopied(false), 2500);

        // 3. Trigger native mobile share dialog if on mobile device
        if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
            try {
                await navigator.share({
                    title,
                    text: `Watch ${title} on Mugen Play`,
                    url: shareUrl
                });
            } catch {
                // User cancelled or share dismissed
            }
        }
    };

    return (
        <div className="anime-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
            {/* Outer card with strict overflow-hidden preserving rounded corners on all sides */}
            <div
                className="anime-modal-container relative w-full max-w-3xl max-h-[88vh] sm:max-h-[90vh] bg-[#101014] rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10 animate-scale-in flex flex-col overflow-hidden"
            >
                {/* Mobile Pull Bar Indicator */}
                <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full z-30 pointer-events-none" />

                {/* High-Contrast Close Button */}
                <button
                    onClick={onClose}
                    className="anime-modal-close-btn absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2.5 rounded-full bg-black/70 backdrop-blur-md hover:bg-black/90 text-white hover:text-red-400 z-40 border border-white/15 cursor-pointer shadow-xl active:scale-95 transition-all flex items-center justify-center"
                    title="Close modal"
                >
                    <X className="w-5 h-5 stroke-[2.5]" />
                </button>

                {/* Inner Scroll Container */}
                <div
                    ref={modalContentRef}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="w-full h-full overflow-y-auto no-scrollbar smooth-transition touch-pan-y overscroll-contain"
                >
                    {/* Banner / Large Interactive Trailer Viewport */}
                    <div className={`${showTrailer && anime.trailer?.site === 'youtube' ? 'h-80 sm:h-[420px] md:h-[480px] min-h-[300px]' : 'h-36 sm:h-52'} relative overflow-hidden group bg-gray-950 touch-pan-y transition-all duration-500`}>
                        {bannerSrc ? (
                            <img
                                src={bannerSrc}
                                alt={displayTitle}
                                loading="eager"
                                decoding="async"
                                draggable="false"
                                className={`w-full h-full object-cover transition-opacity duration-700 pointer-events-none select-none ${showTrailer && anime.trailer?.site === 'youtube' ? 'opacity-0 absolute' : 'opacity-100'}`}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-950 pointer-events-none" />
                        )}

                        {showTrailer && anime.trailer && anime.trailer.site === 'youtube' && (
                            <div className="absolute inset-0 w-full h-full animate-fade-in z-20 bg-black">
                                <iframe
                                    src={`https://www.youtube.com/embed/${anime.trailer.id}?autoplay=1&controls=1&rel=0&modestbranding=1&enablejsapi=1`}
                                    title={`${displayTitle} Official Trailer`}
                                    className="w-full h-full object-contain pointer-events-auto opacity-100"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}
                        {!showTrailer && (
                            <>
                                <div className="absolute inset-0 bg-gradient-to-t from-[#101014] via-[#101014]/60 to-transparent pointer-events-none"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-[#101014] via-transparent to-transparent pointer-events-none"></div>
                            </>
                        )}
                    </div>

                    {/* Content Section (Full clear opacity) */}
                    <div className={`px-4 sm:px-8 pb-6 relative z-10 transition-all duration-300 opacity-100 ${showTrailer ? 'mt-6' : '-mt-12 sm:-mt-16'}`}>
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                            {/* Poster Image */}
                            <div className="shrink-0 mx-auto sm:mx-0 group perspective-1000">
                                <div className="relative w-28 sm:w-40 aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 sm:border-4 border-[#101014] group-hover:scale-105 transition-transform duration-300 will-change-transform bg-gray-800">
                                    {coverSrc ? (
                                        <img
                                            src={coverSrc}
                                            alt={displayTitle}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Cover</div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 space-y-3 pt-1 sm:pt-4">
                                <div>
                                    <h2 className="modal-title text-lg sm:text-2xl font-black text-white leading-snug mb-2 tracking-tight">
                                        {displayTitle}
                                    </h2>

                                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/60 font-black shadow-sm">
                                            <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                                            <span>{formattedRating}</span>
                                        </div>
                                        {anime.year && (
                                            <div className="modal-meta-pill flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold">
                                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                                <span>{anime.year}</span>
                                            </div>
                                        )}
                                        <span className="modal-meta-pill px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold">
                                            {anime.episodes || episodes.length || '?'} Eps
                                        </span>
                                        <span className="modal-meta-pill px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold uppercase tracking-wide">
                                            {anime.format || 'TV'}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full border uppercase tracking-wide font-black ${anime.status === 'RELEASING' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50' : 'modal-meta-pill bg-white/10 text-white border-white/20'}`}>
                                            {anime.status?.replace('_', ' ') || 'AVAILABLE'}
                                        </span>
                                    </div>
                                </div>

                                {genresList.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {genresList.map(genre => (
                                            <span key={genre} className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/10 text-red-400 border border-red-600/20 font-medium">
                                                {genre}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Synopsis */}
                                <div
                                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                    className="cursor-pointer group"
                                >
                                    <p className={`modal-synopsis text-gray-300 leading-relaxed text-xs sm:text-sm transition-all ${isDescriptionExpanded ? '' : 'line-clamp-3'}`}>
                                        {anime.synopsis ? anime.synopsis.replace(/<[^>]*>?/gm, '') : 'No description available.'}
                                    </p>
                                    <span className="text-[11px] text-red-400 group-hover:text-red-300 mt-1 inline-block font-semibold">
                                        {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <button
                                        disabled={!hasPlayableEpisode}
                                        onClick={() => hasPlayableEpisode && onPlay && onPlay(anime)}
                                        className={`modal-watch-btn flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all text-xs sm:text-sm ${
                                            hasPlayableEpisode
                                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/30 hover:scale-105 active:scale-95 cursor-pointer'
                                                : 'bg-white/5 text-gray-500 border border-white/10 opacity-50 cursor-not-allowed pointer-events-none'
                                        }`}
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        <span>{hasPlayableEpisode ? 'Watch Now' : 'Not Yet Aired'}</span>
                                    </button>
                                    <button
                                        onClick={() => onToggleFavorite && onToggleFavorite(anime)}
                                        className={`modal-fav-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold transition-all border hover:scale-105 active:scale-95 text-xs sm:text-sm cursor-pointer ${
                                            isFavorite
                                                ? 'is-favorite bg-red-600/20 border-red-500/50 text-red-400'
                                                : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                                        }`}
                                    >
                                        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-red-500' : 'text-red-500'}`} />
                                        <span>{isFavorite ? 'Saved' : 'Save'}</span>
                                    </button>
                                    {anime.trailer?.id && anime.trailer?.site === 'youtube' && (
                                        <button
                                            onClick={() => setShowTrailer(!showTrailer)}
                                            className={`modal-trailer-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold transition-all border hover:scale-105 active:scale-95 text-xs sm:text-sm cursor-pointer ${
                                                showTrailer
                                                    ? 'bg-red-600/20 border-red-500/50 text-red-400 ring-1 ring-red-500'
                                                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                                            }`}
                                            title={showTrailer ? 'Close Trailer View' : 'Watch Official Trailer'}
                                        >
                                            <Tv className="w-4 h-4" />
                                            <span>{showTrailer ? 'Hide Trailer' : 'Watch Trailer'}</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={handleShare}
                                        className={`modal-share-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold transition-all border hover:scale-105 active:scale-95 text-xs sm:text-sm cursor-pointer ${
                                            copied
                                                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500'
                                                : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                                        }`}
                                        title={copied ? 'Link Copied to Clipboard!' : 'Share Anime'}
                                    >
                                        {copied ? <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" /> : <Share2 className="w-4 h-4" />}
                                        <span>{copied ? 'Copied!' : 'Share'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Rich Episodes Section */}
                        <div className="mt-6 pt-5 border-t border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                        Episodes
                                        <span className="text-[11px] font-semibold text-gray-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                            {episodes.length} Total
                                        </span>
                                    </h3>
                                    {anime.nextAiringEpisode && (
                                        <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1.5 hidden sm:inline-flex">
                                            <Calendar className="w-3 h-3" />
                                            Ep {anime.nextAiringEpisode.episode}: {formatTimeUntilAiring(anime.nextAiringEpisode.timeUntilAiring)}
                                        </span>
                                    )}
                                </div>

                                {/* View Mode Toggle: Cards (Thumbnails) vs Pills */}
                                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                                    <button
                                        onClick={() => setEpisodeViewMode('cards')}
                                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${episodeViewMode === 'cards' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                        title="Thumbnails & Titles View"
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setEpisodeViewMode('pills')}
                                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${episodeViewMode === 'pills' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                        title="Compact Numbers View"
                                    >
                                        <List className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Cards View: Thumbnails + Episode Names */}
                            {episodeViewMode === 'cards' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 sm:max-h-80 overflow-y-auto pr-1 no-scrollbar">
                                    {episodes.map((ep) => {
                                        const epNum = ep.number;
                                        const released = isEpisodeReleased(epNum);

                                        return (
                                            <button
                                                key={epNum}
                                                disabled={!released}
                                                onClick={() => onPlay && onPlay(anime, epNum)}
                                                className={`modal-episode-card flex items-center gap-3 p-2.5 rounded-2xl text-left border transition-all group cursor-pointer ${
                                                    released
                                                        ? 'bg-gray-900/80 hover:bg-gray-800 border-white/10 hover:border-red-500/50 active:scale-[0.98] shadow-sm'
                                                        : 'bg-white/5 border-transparent opacity-40 cursor-not-allowed'
                                                }`}
                                            >
                                                <div className="relative w-24 aspect-video rounded-xl overflow-hidden bg-black/40 modal-episode-thumb shrink-0 border border-white/5">
                                                    <img
                                                        src={ep.thumbnail || bannerSrc || coverSrc}
                                                        alt={ep.title}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85 group-hover:opacity-100"
                                                    />
                                                    <div className="image-overlay-dark absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white shadow">
                                                            <Play className="w-3 h-3 fill-current ml-0.5" />
                                                        </div>
                                                    </div>
                                                    <div className="episode-badge-red absolute bottom-1 left-1 px-2 py-0.5 rounded-md bg-red-600 border border-red-400 text-[10px] font-black text-white shadow-md">
                                                        Ep {epNum}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors" title={ep.fullTitle || (ep.title ? (ep.title.startsWith('Episode ') ? ep.title : `Episode ${epNum}: ${ep.title}`) : `Episode ${epNum}`)}>
                                                        {ep.title && !ep.title.toLowerCase().includes('untitled')
                                                            ? (ep.title.startsWith('Episode ') ? ep.title : `Episode ${epNum}: ${ep.title}`)
                                                            : `Episode ${epNum}`}
                                                    </h4>
                                                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 font-medium" title={ep.description || (released ? 'Ready to Stream' : 'Upcoming')}>
                                                        {ep.description ? ep.description : (released ? 'Ready to Stream' : 'Upcoming')}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Pills View: Compact Number Grid */}
                            {episodeViewMode === 'pills' && (
                                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                                    {episodes.map((ep) => {
                                        const epNum = ep.number;
                                        const released = isEpisodeReleased(epNum);

                                        return (
                                            <button
                                                key={epNum}
                                                disabled={!released}
                                                onClick={() => onPlay && onPlay(anime, epNum)}
                                                className={`h-8 rounded-lg flex items-center justify-center font-bold text-[11px] sm:text-xs transition-all border cursor-pointer ${
                                                    released
                                                        ? 'bg-white/5 hover:bg-red-600 text-white hover:text-white border-white/10 hover:border-red-600 active:scale-95 shadow-sm'
                                                        : 'bg-white/5 text-gray-600 border-transparent cursor-not-allowed opacity-40'
                                                }`}
                                                title={`Episode ${epNum}: ${ep.title}`}
                                            >
                                                {epNum}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

AnimeDetailModal.displayName = 'AnimeDetailModal';

export default AnimeDetailModal;
