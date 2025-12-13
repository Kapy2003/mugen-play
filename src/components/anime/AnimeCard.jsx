import { Play, Star } from 'lucide-react';

const AnimeCard = ({ anime, onClick }) => {
    return (
        <div
            className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] bg-gray-900 border border-gray-800"
            onClick={() => onClick(anime)}
        >
            <div className="relative aspect-[2/3] overflow-hidden">
                <img
                    src={anime.coverUrl}
                    alt={anime.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100 hover:bg-red-700">
                        <Play className="w-5 h-5 text-white ml-1" />
                    </button>
                </div>
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-white font-medium">{anime.rating}</span>
                </div>
                {/* Progress Badge */}
                {anime.lastEpisode && (
                    <div className="absolute top-2 left-2 bg-red-600/90 backdrop-blur-md px-2 py-1 rounded-md shadow-lg z-10">
                        <span className="text-xs text-white font-bold">Ep {anime.lastEpisode}</span>
                    </div>
                )}
            </div>

            <div className="p-4">
                <h3 className="text-white font-semibold truncate group-hover:text-red-500 transition-colors">
                    {anime.title}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-gray-400 text-xs text-nowrap overflow-hidden">
                    <span>{anime.year}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                    <span className="truncate">{anime.genres.slice(0, 2).join(', ')}</span>
                </div>
            </div>
        </div>
    );
};

export default AnimeCard;
