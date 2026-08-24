import { Compass, Filter, Search, X, RotateCcw } from 'lucide-react';
import AnimeCard from '../anime/AnimeCard';
import { formatAnimeTitle } from '../../lib/formatters';
import Mascot from '../common/Mascot';

const GENRES = [
    'All', 'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
    'Romance', 'Sci-Fi', 'Supernatural', 'Mystery', 'Thriller',
    'Slice of Life', 'Sports', 'Mecha', 'Horror', 'Ecchi'
];

// Historical Year Range: 1940 to future releases
const currentMaxYear = new Date().getFullYear() + 1;
const oldestAnimeYear = 1940;
const YEARS_LIST = Array.from({ length: currentMaxYear - oldestAnimeYear + 1 }, (_, i) => currentMaxYear - i);

const BrowseView = ({
    animeList = [],
    isLoading = false,
    searchQuery = '',
    onSearch,
    onClearSearch,
    filters = {},
    onFilterChange,
    onResetFilters,
    page = 1,
    setPage,
    totalPages = 1,
    hasNextPage = false,
    contentFilter = 'ALL',
    onCycleContentFilter,
    hasNsfwExtension = false,
    showSourceMenu = false,
    setShowSourceMenu,
    onSelectAnime,
    watchHistory = []
}) => {
    const selectedGenres = Array.isArray(filters?.genres)
        ? filters.genres
        : (filters?.genre ? [filters.genre] : []);

    const isAllSelected = selectedGenres.length === 0;

    const handleToggleGenre = (g) => {
        if (g === 'All') {
            onFilterChange('genres', []);
            onFilterChange('genre', '');
            return;
        }
        const next = selectedGenres.includes(g)
            ? selectedGenres.filter(item => item !== g)
            : [...selectedGenres, g];
        onFilterChange('genres', next);
        onFilterChange('genre', next.length === 1 ? next[0] : '');
    };

    const otherFilterKeys = Object.keys(filters || {}).filter(k => k !== 'genres' && k !== 'genre');
    const activeFilterCount = otherFilterKeys.length + selectedGenres.length + (contentFilter !== 'ALL' ? 1 : 0);

    const getHeaderTitle = () => {
        if (searchQuery) return `Search: "${searchQuery}"`;
        if (selectedGenres.length === 1) return `${selectedGenres[0]} Anime`;
        if (selectedGenres.length > 1) return `${selectedGenres.join(' + ')} Anime`;
        return 'Browse Catalog';
    };

    return (
        <div className="p-3 sm:p-8 flex flex-col gap-4 sm:gap-6 animate-fade-in max-w-full overflow-hidden">
            <div className="flex flex-col gap-5">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                            <Compass className="w-6 h-6 text-red-500" />
                            <span>{getHeaderTitle()}</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                            Explore, filter, and stream from thousands of titles via AniList
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold hidden sm:inline-flex items-center gap-1.5">
                            AniList Engine
                        </span>
                        <button
                            onClick={() => setShowSourceMenu(!showSourceMenu)}
                            className={`browse-filter-toggle px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-md ${showSourceMenu || activeFilterCount > 0 ? 'bg-red-600 text-white shadow-red-900/30' : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'}`}
                            title="Toggle Filter Options"
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-white text-red-600 text-[10px] font-black">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Instant Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search anime by English or Romaji title (e.g. Solo Leveling, Bleach, Attack on Titan)..."
                        value={searchQuery}
                        onChange={onSearch}
                        className="w-full pl-10 pr-10 py-3 bg-gray-900 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all border border-gray-800 hover:border-gray-700 text-sm shadow-inner"
                    />
                    {searchQuery && (
                        <button
                            onClick={onClearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Clear search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Multi-Select Genre Filter Pills */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 select-none touch-pan-x overscroll-x-contain">
                    {GENRES.map(g => {
                        const isSelected = g === 'All' ? isAllSelected : selectedGenres.includes(g);
                        return (
                            <button
                                key={g}
                                onClick={() => handleToggleGenre(g)}
                                className={`genre-pill px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                    isSelected
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-900/30 ring-1 ring-red-400'
                                        : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800 hover:border-gray-700'
                                }`}
                            >
                                {g}
                                {g !== 'All' && selectedGenres.includes(g) && (
                                    <span className="ml-1 opacity-80">✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Advanced Filters Drawer */}
                {showSourceMenu && (
                    <div className="browse-filter-drawer bg-gray-900/95 border border-gray-800 rounded-2xl p-4 sm:p-5 flex flex-wrap gap-4 animate-fade-in shadow-xl items-end">
                        {/* Sort */}
                        <div className="space-y-1.5 flex-1 min-w-[140px]">
                            <label className="browse-filter-label text-xs font-bold text-gray-400 uppercase tracking-wider">Sort Order</label>
                            <select
                                value={filters?.sort || 'POPULARITY_DESC'}
                                onChange={(e) => onFilterChange('sort', e.target.value)}
                                className="browse-filter-select w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                            >
                                <option value="POPULARITY_DESC">🔥 Most Popular</option>
                                <option value="TRENDING_DESC">📈 Trending</option>
                                <option value="SCORE_DESC">⭐ Highest Rated</option>
                                <option value="FAVOURITES_DESC">❤️ Most Favorites</option>
                                <option value="START_DATE_DESC">🆕 Newest</option>
                                <option value="START_DATE">⏳ Oldest</option>
                                <option value="TITLE_ENGLISH">🔤 Title (A-Z)</option>
                            </select>
                        </div>

                        {/* Format */}
                        <div className="space-y-1.5 flex-1 min-w-[120px]">
                            <label className="browse-filter-label text-xs font-bold text-gray-400 uppercase tracking-wider">Format</label>
                            <select
                                value={filters?.format || ''}
                                onChange={(e) => onFilterChange('format', e.target.value)}
                                className="browse-filter-select w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                            >
                                <option value="">Any Format</option>
                                <option value="TV">TV Show</option>
                                <option value="MOVIE">Movie</option>
                                <option value="TV_SHORT">TV Short</option>
                                <option value="OVA">OVA</option>
                                <option value="ONA">ONA</option>
                                <option value="SPECIAL">Special</option>
                            </select>
                        </div>

                        {/* Season */}
                        <div className="space-y-1.5 flex-1 min-w-[110px]">
                            <label className="browse-filter-label text-xs font-bold text-gray-400 uppercase tracking-wider">Season</label>
                            <select
                                value={filters?.season || ''}
                                onChange={(e) => onFilterChange('season', e.target.value)}
                                className="browse-filter-select w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                            >
                                <option value="">Any Season</option>
                                <option value="WINTER">Winter</option>
                                <option value="SPRING">Spring</option>
                                <option value="SUMMER">Summer</option>
                                <option value="FALL">Fall</option>
                            </select>
                        </div>

                        {/* Year (Full 1940 - Future Range) */}
                        <div className="space-y-1.5 flex-1 min-w-[100px]">
                            <label className="browse-filter-label text-xs font-bold text-gray-400 uppercase tracking-wider">Year</label>
                            <select
                                value={filters?.year || ''}
                                onChange={(e) => onFilterChange('year', e.target.value)}
                                className="browse-filter-select w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                            >
                                <option value="">Any Year</option>
                                {YEARS_LIST.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div className="space-y-1.5 flex-1 min-w-[120px]">
                            <label className="browse-filter-label text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                            <select
                                value={filters?.status || ''}
                                onChange={(e) => onFilterChange('status', e.target.value)}
                                className="browse-filter-select w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                            >
                                <option value="">Any Status</option>
                                <option value="RELEASING">Airing</option>
                                <option value="FINISHED">Finished</option>
                                <option value="NOT_YET_RELEASED">Upcoming</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="HIATUS">Hiatus</option>
                            </select>
                        </div>

                        {/* Content Rating */}
                        <div className="space-y-1.5 flex-1 min-w-[120px]">
                            <label className="browse-filter-label text-xs font-bold text-gray-400 uppercase tracking-wider">Content</label>
                            <select
                                value={contentFilter}
                                onChange={(e) => onCycleContentFilter(e.target.value)}
                                className="browse-filter-select w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                            >
                                <option value="ALL">All (Safe + NSFW)</option>
                                <option value="SAFE">Safe Only</option>
                                {hasNsfwExtension && <option value="NSFW">NSFW Only</option>}
                            </select>
                        </div>

                        {/* Reset Filters Button */}
                        {(Object.keys(filters || {}).length > 0 || searchQuery) && (
                            <div className="flex-1 min-w-[130px]">
                                <button
                                    onClick={onResetFilters}
                                    className="browse-reset-btn w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 border border-gray-700 cursor-pointer"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Reset Filters</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex h-64 items-center justify-center">
                    <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {/* 49-Card Paginated Grid */}
            {!isLoading && animeList.length > 0 && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-6 w-full">
                        {animeList.map(anime => {
                            const historyItem = (watchHistory || []).find(h => h.id === anime.id);
                            return (
                                <AnimeCard
                                    key={anime.id}
                                    anime={{
                                        ...anime,
                                        title: formatAnimeTitle(anime.title || anime.name),
                                        lastEpisode: historyItem ? historyItem.lastEpisode : null
                                    }}
                                    onClick={onSelectAnime}
                                />
                            );
                        })}
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className={`browse-page-btn px-4 py-2 rounded-xl border font-medium text-sm transition-colors cursor-pointer ${
                                page === 1
                                    ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                                    : 'border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 bg-gray-900'
                            }`}
                        >
                            Previous
                        </button>
                        <span className="text-gray-400 font-medium text-sm">Page {page} of {totalPages || '?'}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={!hasNextPage}
                            className={`browse-page-btn px-4 py-2 rounded-xl border font-medium text-sm transition-colors cursor-pointer ${
                                !hasNextPage
                                    ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                                    : 'border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 bg-gray-900'
                            }`}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}

            {/* Empty State */}
            {!isLoading && animeList.length === 0 && (
                <div className="text-center py-16 bg-gray-900/50 border border-gray-800 rounded-3xl p-8 max-w-lg mx-auto animate-fade-in flex flex-col items-center">
                    <Mascot mood="dizzy" className="w-32 h-26 sm:w-40 sm:h-32 mb-3" />
                    <h3 className="text-lg font-bold text-white mb-1">No Anime Found</h3>
                    <p className="text-sm text-gray-400 mb-6 max-w-xs">
                        We couldn&apos;t find any titles matching your query or filter criteria.
                    </p>
                    <button
                        onClick={onResetFilters}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-900/30 cursor-pointer"
                    >
                        Clear Filters &amp; Search
                    </button>
                </div>
            )}
        </div>
    );
};

export default BrowseView;
