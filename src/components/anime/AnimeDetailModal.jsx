import { useState, useEffect, useRef } from 'react';
import { X, Play, Share2, Star, Calendar, Heart } from 'lucide-react';

const AnimeDetailModal = ({ anime, onClose, onPlay, isFavorite, onToggleFavorite }) => {
    const [showTrailer, setShowTrailer] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const touchStartYRef = useRef(0);

    useEffect(() => {
        setShowTrailer(false);
        if (anime?.trailer?.site === 'youtube') {
            const timer = setTimeout(() => {
                setShowTrailer(true);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [anime]);

    const handleTouchStart = (e) => {
        touchStartYRef.current = e.touches ? e.touches[0].clientY : 0;
    };

    const handleTouchEnd = (e) => {
        if (!e.changedTouches) return;
        const endY = e.changedTouches[0].clientY;
        if (endY - touchStartYRef.current > 75) {
            // Swiped down -> Close modal
            onClose();
        }
    };

    if (!anime) return null;

    const displayTitle = typeof anime.title === 'string'
        ? anime.title
        : (anime.title?.english || anime.title?.romaji || anime.title?.canonical || anime.name || 'Untitled Anime');

    const genresList = Array.isArray(anime.genres) ? anime.genres : [];
    const bannerSrc = anime.bannerUrl || anime.coverUrl || anime.image || '';
    const coverSrc = anime.coverUrl || anime.image || anime.poster || '';

    // Helper to check release status
    const isEpisodeReleased = (epNum) => {
        if (anime.status === 'NOT_YET_RELEASED') return false;
        if (anime.nextAiringEpisode && epNum >= anime.nextAiringEpisode.episode) return false;
        return true;
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="relative w-full max-w-2xl max-h-[85vh] sm:max-h-[88vh] overflow-y-auto bg-[#101014] rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10 animate-scale-in custom-scrollbar"
            >
                {/* Mobile Pull Bar Indicator */}
                <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full z-30 pointer-events-none" />

                {/* Banner with gradient overlay */}
                <div className="h-32 sm:h-44 relative overflow-hidden group bg-gray-900">
                    {bannerSrc ? (
                        <img
                            src={bannerSrc}
                            alt={displayTitle}
                            className={`w-full h-full object-cover transition-opacity duration-1000 ${showTrailer && anime.trailer?.site === 'youtube' ? 'opacity-0 absolute' : 'opacity-100'}`}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
                    )}

                    {showTrailer && anime.trailer && anime.trailer.site === 'youtube' && (
                        <div className="absolute inset-0 w-full h-full animate-fade-in">
                            <iframe
                                src={`https://www.youtube.com/embed/${anime.trailer.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${anime.trailer.id}&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1`}
                                title="Trailer"
                                className="w-full h-[150%] -mt-[10%] object-cover pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-700"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#101014] via-[#101014]/60 to-transparent pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#101014] via-transparent to-transparent pointer-events-none"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-black/60 backdrop-blur-md hover:bg-white/20 transition-colors text-white z-30 border border-white/10 cursor-pointer shadow-lg"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-4 sm:px-8 pb-6 -mt-10 sm:-mt-14 relative z-10">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        {/* Poster Image */}
                        <div className="shrink-0 mx-auto sm:mx-0 group perspective-1000">
                            <div className="relative w-24 sm:w-36 aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 sm:border-4 border-[#101014] group-hover:scale-105 transition-transform duration-300 will-change-transform bg-gray-800">
                                {coverSrc ? (
                                    <img
                                        src={coverSrc}
                                        alt={displayTitle}
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
                                <h2 className="text-lg sm:text-2xl font-black text-white leading-snug mb-2 tracking-tight">
                                    {displayTitle}
                                </h2>

                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-gray-300">
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                        <Star className="w-3 h-3 fill-current" />
                                        <span>{anime.rating || 85}</span>
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                        <Calendar className="w-3 h-3 text-gray-400" />
                                        <span>{anime.year || 2024}</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                        {anime.episodes || '?'} Eps
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-wide">
                                        {anime.format || 'TV'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full border uppercase tracking-wide ${anime.status === 'RELEASING' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
                                        {anime.status?.replace('_', ' ') || 'AVAILABLE'}
                                    </span>
                                </div>
                            </div>

                            {genresList.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {genresList.map(genre => (
                                        <span key={genre} className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/10 text-red-400 border border-red-600/20">
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
                                <p className={`text-gray-300 leading-relaxed text-xs sm:text-sm transition-all ${isDescriptionExpanded ? '' : 'line-clamp-3'}`}>
                                    {anime.synopsis ? anime.synopsis.replace(/<[^>]*>?/gm, '') : 'No description available.'}
                                </p>
                                <span className="text-[11px] text-red-400 group-hover:text-red-300 mt-1 inline-block font-semibold">
                                    {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                    onClick={() => onPlay && onPlay(anime)}
                                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/30 transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm cursor-pointer"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    Watch Now
                                </button>
                                <button
                                    onClick={() => onToggleFavorite && onToggleFavorite(anime)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold transition-all border hover:scale-105 active:scale-95 text-xs sm:text-sm cursor-pointer ${isFavorite
                                        ? 'bg-red-600/20 border-red-500/50 text-red-400'
                                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
                                >
                                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-red-500' : ''}`} />
                                    {isFavorite ? 'Saved' : 'Save'}
                                </button>
                                <button
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({ title: displayTitle, url: window.location.href }).catch(() => {});
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10 hover:scale-105 active:scale-95 text-xs sm:text-sm cursor-pointer"
                                    title="Share"
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Episode Grid */}
                            <div className="pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                                        Episodes
                                        <span className="text-[10px] font-normal text-gray-400 px-2 py-0.5 rounded-full bg-white/5">{anime.episodes || 12} Total</span>
                                    </h3>
                                    {anime.nextAiringEpisode && (
                                        <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" />
                                            Ep {anime.nextAiringEpisode.episode}: {formatTimeUntilAiring(anime.nextAiringEpisode.timeUntilAiring)}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5 max-h-32 sm:max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                    {Array.from({ length: anime.episodes || 12 }).map((_, i) => {
                                        const epNum = i + 1;
                                        const released = isEpisodeReleased(epNum);

                                        return (
                                            <button
                                                key={epNum}
                                                disabled={!released}
                                                onClick={() => onPlay && onPlay(anime, epNum)}
                                                className={`h-7 sm:h-8 rounded-lg flex items-center justify-center font-bold text-[11px] sm:text-xs transition-all border cursor-pointer ${released
                                                    ? 'bg-white/5 hover:bg-red-600 text-white hover:text-white border-white/10 hover:border-red-600 active:scale-95 shadow-sm'
                                                    : 'bg-white/5 text-gray-600 border-transparent cursor-not-allowed opacity-40'
                                                    }`}
                                            >
                                                {epNum}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnimeDetailModal;
