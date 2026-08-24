import { Heart } from 'lucide-react';
import AnimeCard from '../anime/AnimeCard';
import { formatAnimeTitle } from '../../lib/formatters';

const FavoritesView = ({
    favorites = [],
    onSelectAnime
}) => {
    return (
        <div className="p-4 sm:p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-600 fill-current" />
                Favorites
            </h2>

            {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Heart className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Favorites Yet</h3>
                    <p className="text-gray-400 max-w-sm">
                        Click the &quot;Add to List&quot; button on any anime details to save it here.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                    {favorites.map(anime => (
                        <AnimeCard
                            key={anime.id}
                            anime={{ ...anime, title: formatAnimeTitle(anime.title || anime.name) }}
                            onClick={onSelectAnime}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FavoritesView;
