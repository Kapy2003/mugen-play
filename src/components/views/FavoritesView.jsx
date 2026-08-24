import React, { useState } from 'react';
import { Heart, Trash2, CheckSquare, Square, X, Check } from 'lucide-react';
import AnimeCard from '../anime/AnimeCard';
import { formatAnimeTitle } from '../../lib/formatters';
import Mascot from '../common/Mascot';

const FavoritesView = ({
    favorites = [],
    onSelectAnime,
    onRemoveFavorite,
    onRemoveMultipleFavorites
}) => {
    const [isManageMode, setIsManageMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const toggleManageMode = () => {
        setIsManageMode(!isManageMode);
        setSelectedIds([]);
    };

    const handleToggleSelect = (anime) => {
        setSelectedIds(prev =>
            prev.includes(anime.id)
                ? prev.filter(id => id !== anime.id)
                : [...prev, anime.id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === favorites.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(favorites.map(a => a.id));
        }
    };

    const handleDeleteSelected = () => {
        if (selectedIds.length === 0) return;
        if (onRemoveMultipleFavorites) {
            onRemoveMultipleFavorites(selectedIds);
        } else if (onRemoveFavorite) {
            selectedIds.forEach(id => onRemoveFavorite(id));
        }
        setSelectedIds([]);
        setIsManageMode(false);
    };

    const handleQuickRemove = (anime) => {
        if (onRemoveFavorite && anime) {
            onRemoveFavorite(anime);
        }
    };

    const allSelected = favorites.length > 0 && selectedIds.length === favorites.length;

    return (
        <div className="p-3 sm:p-8 animate-fade-in relative min-h-[70vh]">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="fav-header-title text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <Heart className="fav-header-heart w-6 h-6 text-red-600 fill-red-600 shrink-0" />
                        <span>Favorites</span>
                    </h2>
                    {favorites.length > 0 && (
                        <span className="fav-counter-badge px-2.5 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold">
                            {favorites.length}
                        </span>
                    )}
                </div>

                {/* Header Action: Dustbin / Manage Mode Button */}
                {favorites.length > 0 && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleManageMode}
                            className={`fav-manage-toggle-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 ${
                                isManageMode
                                    ? 'bg-red-600 text-white shadow-red-900/40 ring-1 ring-red-400'
                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700'
                            }`}
                            title={isManageMode ? 'Exit Selection Mode' : 'Select multiple anime to remove'}
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>{isManageMode ? 'Done' : 'Manage / Remove'}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Manage Mode Floating / Sticky Control Bar */}
            {isManageMode && favorites.length > 0 && (
                <div className="fav-manage-bar mb-6 p-3 sm:p-4 bg-gray-900/95 border border-red-500/30 rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-xl backdrop-blur-md animate-fade-in">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold flex items-center gap-1.5 border border-gray-700 transition-colors cursor-pointer"
                        >
                            {allSelected ? (
                                <>
                                    <CheckSquare className="w-4 h-4 text-red-400" />
                                    <span>Deselect All</span>
                                </>
                            ) : (
                                <>
                                    <Square className="w-4 h-4 text-gray-400" />
                                    <span>Select All ({favorites.length})</span>
                                </>
                            )}
                        </button>
                        <span className="text-xs text-gray-400 font-medium">
                            {selectedIds.length} selected
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDeleteSelected}
                            disabled={selectedIds.length === 0}
                            className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                                selectedIds.length > 0
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/40 active:scale-95'
                                    : 'bg-gray-800 text-gray-500 border border-gray-700/50 cursor-not-allowed'
                            }`}
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Selected {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
                        </button>
                        <button
                            type="button"
                            onClick={toggleManageMode}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title="Cancel"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                    <Mascot mood="sleepy" className="w-32 h-26 sm:w-40 sm:h-32 mb-4" />
                    <h3 className="fav-empty-title text-xl font-bold text-white mb-2">No Favorites Yet</h3>
                    <p className="fav-empty-desc text-gray-400 max-w-sm text-sm">
                        Click the &quot;Save&quot; heart button on any anime to keep your favorite titles in one place.
                    </p>
                </div>
            ) : (
                /* Compact Anime Grid matching BrowseView sizing */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-6 w-full">
                    {favorites.map(anime => {
                        const isSelected = selectedIds.includes(anime.id);
                        return (
                            <AnimeCard
                                key={anime.id}
                                anime={{ ...anime, title: formatAnimeTitle(anime.title || anime.name) }}
                                onClick={onSelectAnime}
                                isSelectable={isManageMode}
                                isSelected={isSelected}
                                onToggleSelect={handleToggleSelect}
                                onQuickRemove={handleQuickRemove}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

FavoritesView.displayName = 'FavoritesView';

export default FavoritesView;
