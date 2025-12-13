import { useState, useEffect } from 'react';
import { X, Play, Plus, Share2, Star, Calendar, Heart } from 'lucide-react';

const AnimeDetailModal = ({ anime, onClose, onPlay, isFavorite, onToggleFavorite }) => {
    const [showTrailer, setShowTrailer] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    useEffect(() => {
        setShowTrailer(false);
        if (anime?.trailer?.site === 'youtube') {
            const timer = setTimeout(() => {
                setShowTrailer(true);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [anime]);

    if (!anime) return null;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            {/* Reduced max-width to 3xl for compact feel */}
            <div className="relative w-full max-w-3xl bg-[#0f0f0f] rounded-3xl overflow-hidden shadow-2xl border border-white/5 animate-scale-in">
                {/* Banner with gradient overlay */}
                <div className="h-48 sm:h-64 relative overflow-hidden group">
                    <img
                        src={anime.bannerUrl}
                        alt={anime.title}
                        className={`w-full h-full object-cover transition-opacity duration-1000 ${showTrailer && anime.trailer?.site === 'youtube' ? 'opacity-0 absolute' : 'opacity-100'}`}
                    />

                    {showTrailer && anime.trailer && anime.trailer.site === 'youtube' && (
                        <div className="absolute inset-0 w-full h-full animate-fade-in">
                            <iframe
                                src={`https://www.youtube.com/embed/${anime.trailer.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${anime.trailer.id}&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1`}
                                title="Trailer"
                                className="w-full h-[150%] sm:h-[150%] -mt-[10%] object-cover pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-700"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/60 to-transparent pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f] via-transparent to-transparent pointer-events-none"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-white/10 transition-colors text-white/70 hover:text-white z-20 border border-white/5"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 sm:px-10 pb-8 -mt-20 relative z-10">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Poster Image */}
                        <div className="shrink-0 mx-auto md:mx-0 group perspective-1000">
                            <div className="relative w-32 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-[#0f0f0f] group-hover:scale-105 transition-transform duration-500 will-change-transform">
                                <img
                                    src={anime.coverUrl}
                                    alt={anime.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-4 pt-4 md:pt-8">
                            <div>
                                <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-3 tracking-tight">
                                    {anime.title}
                                </h2>

                                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-gray-300">
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                        <Star className="w-3 h-3 fill-current" />
                                        <span>{anime.rating}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                                        <Calendar className="w-3 h-3 text-gray-400" />
                                        <span>{anime.year}</span>
                                    </div>
                                    <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                                        {anime.episodes || '?'} Eps
                                    </span>
                                    <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-wide">
                                        {anime.format || 'TV'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full border text-xs uppercase tracking-wide ${anime.status === 'RELEASING' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
                                        {anime.status?.replace('_', ' ') || 'FINISHED'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {anime.genres.map(genre => (
                                    <span key={genre} className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-red-600/5 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-600/10 transition-colors cursor-default">
                                        {genre}
                                    </span>
                                ))}
                            </div>

                            {/* Synopsis: Clamped to 3 lines, Click to Expand */}
                            <div
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                className="cursor-pointer group"
                            >
                                <p className={`text-gray-300 leading-relaxed text-sm transition-all ${isDescriptionExpanded ? '' : 'line-clamp-3'}`}>
                                    {anime.synopsis}
                                </p>
                                <span className="text-xs text-gray-500 group-hover:text-white mt-1 inline-block font-medium">
                                    {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 pt-1">
                                <button
                                    onClick={() => onPlay(anime)}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/20 transition-all hover:scale-105 active:scale-95 text-sm"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    Watch Now
                                </button>
                                <button
                                    onClick={() => onToggleFavorite(anime)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all border hover:scale-105 active:scale-95 text-sm ${isFavorite
                                        ? 'bg-white/10 border-red-500/50 text-red-500'
                                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
                                >
                                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                                    {isFavorite ? 'Saved' : 'Add to List'}
                                </button>
                                <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10 hover:scale-105 active:scale-95 text-sm">
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Episode List */}
                            <div className="pt-6 border-t border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                        Episodes
                                        <span className="text-xs font-normal text-gray-500 px-2 py-0.5 rounded-full bg-white/5">{anime.episodes || '?'} Total</span>
                                    </h3>
                                    {/* Next Airing Info: Yellow-ish/Blue theme for visibility */}
                                    {anime.nextAiringEpisode && (
                                        <span className="text-xs text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 flex items-center gap-2 animate-pulse">
                                            <Calendar className="w-3 h-3" />
                                            Ep {anime.nextAiringEpisode.episode}: {formatTimeUntilAiring(anime.nextAiringEpisode.timeUntilAiring)}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                                    {Array.from({ length: anime.episodes || 12 }).map((_, i) => {
                                        const epNum = i + 1;
                                        const released = isEpisodeReleased(epNum);

                                        return (
                                            <button
                                                key={epNum}
                                                disabled={!released}
                                                onClick={() => onPlay(anime, epNum)}
                                                className={`relative group aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 border ${released
                                                    ? 'bg-white/5 hover:bg-red-600 text-gray-300 hover:text-white border-white/10 hover:border-red-500 hover:shadow-lg hover:shadow-red-900/20'
                                                    : 'bg-black/40 text-gray-600 border-white/5 cursor-not-allowed opacity-60'
                                                    }`}
                                            >
                                                {epNum}
                                                {!released && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-[1px]">
                                                        {/* Lock Icon or similar indicating unreleased */}
                                                        <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                                                    </div>
                                                )}
                                                {/* Tooltip for unreleased */}
                                                {!released && (
                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-xs text-white rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-20">
                                                        Not Aired
                                                    </div>
                                                )}
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
