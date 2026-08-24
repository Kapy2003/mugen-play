import { memo } from 'react';
import { Play, Star } from 'lucide-react';

const AnimeCard = memo(({ anime, onClick }) => {
    if (!anime) return null;

    const displayTitle = typeof anime.title === 'string'
        ? anime.title
        : (anime.title?.english || anime.title?.romaji || anime.title?.canonical || anime.name || 'Untitled Anime');

    const displayGenres = Array.isArray(anime.genres) ? anime.genres.slice(0, 2).join(', ') : 'Anime';
    const coverSrc = anime.coverUrl || anime.image || anime.poster || '';

    // Standardize rating representation (e.g. 8.5)
    const rawRating = anime.rating || anime.score;
    const formattedRating = rawRating && !isNaN(rawRating) && Number(rawRating) > 0
        ? (Number(rawRating) > 10 ? (Number(rawRating) / 10).toFixed(1) : Number(rawRating).toFixed(1))
        : null;

    return (
        <div
            className="group relative rounded-2xl overflow-hidden cursor-pointer bg-gray-900 border border-gray-800/80 fluid-card-lift transform-gpu shadow-md hover:border-red-500/30 hover:shadow-2xl hover:shadow-red-950/20 active-press select-none"
            onClick={() => onClick && onClick(anime)}
        >
            <div className="relative aspect-[2/3] overflow-hidden bg-gray-800">
                {coverSrc ? (
                    <img
                        src={coverSrc}
                        alt={displayTitle}
                        loading="lazy"
                        decoding="async"
                        draggable="false"
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 pointer-events-none select-none"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No Image
                    </div>
                )}

                {/* Hover Play Button Overlay */}
                <div className="image-overlay-dark absolute inset-0 bg-black/45 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl shadow-red-900/50">
                        <Play className="w-5 h-5 text-white ml-0.5 fill-current" />
                    </div>
                </div>

                {/* High-Contrast Vibrant Star Rating Badge (Never camouflages on dark/light posters) */}
                {formattedRating && (
                    <div className="star-badge-vibrant absolute top-2 right-2 bg-black/90 backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center gap-1 border border-amber-400/70 shadow-xl z-10">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 filter drop-shadow-sm" />
                        <span className="text-[11px] font-black leading-none text-amber-300">{formattedRating}</span>
                    </div>
                )}

                {/* High-Contrast Progress Episode Badge */}
                {anime.lastEpisode && (
                    <div className="episode-badge-red absolute top-2 left-2 bg-red-600 px-2 py-0.5 rounded-lg shadow-xl border border-red-400 z-10">
                        <span className="text-[11px] font-black tracking-tight text-white">Ep {anime.lastEpisode}</span>
                    </div>
                )}
            </div>

            <div className="p-3.5 sm:p-4">
                <h3 className="card-title text-white font-bold text-xs sm:text-sm truncate group-hover:text-red-500 transition-colors">
                    {displayTitle}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-xs font-medium text-nowrap overflow-hidden">
                    <span className="card-year-badge px-2 py-0.5 rounded-md bg-white/10 text-white font-black text-[11px] border border-white/15 tracking-tight shrink-0 shadow-sm">
                        {anime.year || 2024}
                    </span>
                    <span className="card-genres text-gray-300 truncate text-[11px] font-semibold">
                        {displayGenres}
                    </span>
                </div>
            </div>
        </div>
    );
});

AnimeCard.displayName = 'AnimeCard';

export default AnimeCard;
