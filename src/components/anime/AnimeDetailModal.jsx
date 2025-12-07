import { useState, useEffect } from 'react';
import { X, Play, Plus, Share2, Star, Calendar, Heart } from 'lucide-react';

const AnimeDetailModal = ({ anime, onClose, onPlay, isFavorite, onToggleFavorite }) => {
    const [showTrailer, setShowTrailer] = useState(false);

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-4xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 animate-scale-in">
                {/* Banner with gradient overlay */}
                <div className="h-64 sm:h-80 relative overflow-hidden group">
                    <img
                        src={anime.bannerUrl}
                        alt={anime.title}
                        className={`w-full h-full object-cover transition-opacity duration-700 ${showTrailer && anime.trailer?.site === 'youtube' ? 'opacity-0 absolute' : 'opacity-100'}`}
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
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent pointer-events-none"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors text-white z-10"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 -mt-24 relative">
                    <div className="flex flex-col sm:flex-row gap-6">
                        {/* Poster Image */}
                        <div className="shrink-0 mx-auto sm:mx-0">
                            <img
                                src={anime.coverUrl}
                                alt={anime.title}
                                className="w-48 h-72 object-cover rounded-xl shadow-2xl border-2 border-gray-800"
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-4">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white">{anime.title}</h2>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-1 text-yellow-400">
                                    <Star className="w-4 h-4 fill-yellow-400" />
                                    <span className="font-semibold text-white">{anime.rating}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{anime.year}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                                    {anime.episodes} Episodes
                                </span>
                                <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                                    HD
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {anime.genres.map(genre => (
                                    <span key={genre} className="text-xs px-3 py-1 rounded-full bg-red-600/10 text-red-500 border border-red-600/20 font-medium">
                                        {genre}
                                    </span>
                                ))}
                            </div>

                            <p className="text-gray-300 leading-relaxed text-sm sm:text-base line-clamp-[7] transition-all">
                                {anime.synopsis}
                            </p>

                            {/* Episode List */}
                            <div className="pt-6 border-t border-gray-800">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    Episodes
                                    <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{anime.episodes || '?'}</span>
                                </h3>
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {Array.from({ length: anime.episodes || 12 }).map((_, i) => {
                                        const epNum = i + 1;
                                        return (
                                            <button
                                                key={epNum}
                                                onClick={() => onPlay(anime, epNum)}
                                                className="px-2 py-2 rounded-lg bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white text-sm font-medium transition-colors border border-gray-700 hover:border-red-500"
                                            >
                                                {epNum}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 pt-4">
                                <button
                                    onClick={() => onPlay(anime)}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-transform hover:scale-105"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    Watch Now
                                </button>
                                <button
                                    onClick={() => onToggleFavorite(anime)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors border ${isFavorite ? 'bg-red-600 border-red-600 text-white hover:bg-red-700' : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700'}`}
                                >
                                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                                    {isFavorite ? 'Favorited' : 'Add to Favorites'}
                                </button>
                                <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors border border-gray-700">
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnimeDetailModal;
