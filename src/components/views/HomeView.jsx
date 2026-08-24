import { memo } from 'react';
import { Shuffle, Play, Sun, Moon, Film, ChevronRight, X, Flame, Star, Trophy, Heart, Compass, BookOpen } from 'lucide-react';
import HeroCarousel from '../home/HeroCarousel';
import HorizontalScrollList from '../common/HorizontalScrollList';
import AnimeCard from '../anime/AnimeCard';
import { formatAnimeTitle } from '../../lib/formatters';

const HomeView = memo(({
    trendingList = [],
    popularList = [],
    topRatedList = [],
    heroCarouselItems = [],
    isShelvesLoading = false,
    watchHistory = [],
    favorites = [],
    hasDismissedExtensionNotice = false,
    onDismissExtensionNotice,
    theme = 'dark',
    toggleTheme,
    onPlay,
    onInfo,
    onRandomPlay,
    onDirectPlay,
    onNavigateTab,
    onRemoveFromHistory,
    onOpenUserGuide
}) => {
    return (
        <div className="p-3 sm:p-8 flex flex-col gap-4 sm:gap-6 animate-fade-in max-w-full overflow-hidden">
            {/* Top Bar with Brand, Surprise Me, Direct Play, User Guide, & Sun/Moon Theme Toggle */}
            <div className="flex items-center justify-between gap-3 pb-1">
                <div className="flex items-center gap-2 sm:gap-3">
                    <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white">
                        MUGEN<span className="text-red-600">PLAY</span>
                    </h1>
                    <span className="px-2 py-0.5 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block">
                        v0.1.0-alpha
                    </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5">
                    {/* User Guide Action Button */}
                    <button
                        onClick={onOpenUserGuide}
                        className="px-3 sm:px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 border border-gray-700/80 cursor-pointer shadow-sm active-press"
                        title="Open User Guide & Instructions"
                    >
                        <BookOpen className="w-3.5 h-3.5 text-red-500" />
                        <span className="hidden sm:inline">Guide</span>
                    </button>

                    {/* Random Surprise Me Button */}
                    <button
                        onClick={onRandomPlay}
                        className="px-3 sm:px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 border border-gray-700/80 cursor-pointer shadow-sm active-press"
                        title="Surprise Me (Watch Random Anime)"
                    >
                        <Shuffle className="w-3.5 h-3.5 text-red-500" />
                        <span className="hidden sm:inline">Surprise Me</span>
                    </button>

                    {/* Direct Play Action */}
                    <button
                        onClick={onDirectPlay}
                        className="px-3 sm:px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 border border-gray-700/80 cursor-pointer shadow-sm active-press"
                        title="Paste & Play Direct Link"
                    >
                        <Play className="w-3.5 h-3.5 text-red-500 fill-current" />
                        <span className="hidden sm:inline">Direct Play</span>
                    </button>

                    {/* Sun / Moon Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 sm:p-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all border border-gray-700/80 cursor-pointer shadow-sm hover:scale-105 active-press"
                        title={theme === 'light' ? 'Switch to Dark Mode (Moon)' : 'Switch to Light Mode (Sun)'}
                        aria-label="Toggle Theme"
                    >
                        {theme === 'light' ? (
                            <Moon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-indigo-400 fill-current" />
                        ) : (
                            <Sun className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* First-Time Onboarding Prompt for Extensions */}
            {!hasDismissedExtensionNotice && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-gray-900 to-gray-900 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-xl animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0">
                            <Film className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                                Welcome to MugenPlay!
                                <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 text-[9px] sm:text-[10px] uppercase font-black tracking-wider">Quick Start</span>
                            </h3>
                            <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">
                                To stream anime episodes, head over to the <strong className="text-white">Extensions</strong> tab and enable a stream source.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                            onClick={() => onNavigateTab('extensions')}
                            className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-900/30 flex items-center gap-1.5 cursor-pointer active-press"
                        >
                            <span>Go to Extensions</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={onDismissExtensionNotice}
                            className="p-1.5 sm:p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                            title="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isShelvesLoading && trendingList.length === 0 && (
                <div className="flex h-64 items-center justify-center">
                    <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {/* Featured Hero Carousel */}
            {heroCarouselItems.length > 0 && (
                <HeroCarousel
                    items={heroCarouselItems}
                    onPlay={onPlay}
                    onInfo={onInfo}
                />
            )}

            {/* Shelves Container */}
            {!isShelvesLoading && (
                <div className="flex flex-col gap-4 sm:gap-6 pb-8">
                    {/* Continue Watching Shelf */}
                    {watchHistory.length > 0 && (
                        <HorizontalScrollList
                            title="Continue Watching"
                            items={watchHistory.filter(i => i && i.id)}
                            onItemClick={(anime) => onPlay(anime)}
                            renderItem={(anime) => (
                                <div className="min-w-[160px] w-[160px] sm:min-w-[210px] sm:w-[210px] flex-shrink-0 cursor-pointer group relative fluid-card-lift">
                                    <div className="aspect-video rounded-xl overflow-hidden mb-1.5 relative bg-gray-900 border border-gray-800 shadow-md">
                                        <img
                                            src={anime.bannerUrl || anime.coverUrl}
                                            alt={formatAnimeTitle(anime.title)}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300 opacity-85 group-hover:opacity-100"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:bg-red-600 transition-colors shadow-lg">
                                                <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current ml-0.5" />
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        {anime.duration > 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                                <div
                                                    className="h-full bg-red-600"
                                                    style={{ width: `${Math.min(100, (anime.progress / anime.duration) * 100)}%` }}
                                                />
                                            </div>
                                        )}

                                        {/* High-Contrast Episode Badge */}
                                        <div className="episode-badge-red absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-600 border border-red-400 text-[10px] sm:text-xs font-black text-white shadow-lg">
                                            Ep {anime.lastEpisode || 1}
                                        </div>

                                        {/* Remove Cross Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveFromHistory(anime.id);
                                            }}
                                            className="continue-watching-cross absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-black/80 hover:bg-red-600 text-gray-200 hover:text-white flex items-center justify-center backdrop-blur-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer shadow-md active-press border border-white/10"
                                            title="Remove from Continue Watching"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                    <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-red-500 transition-colors">{formatAnimeTitle(anime.title)}</h3>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="card-year-badge px-1.5 py-0.5 rounded text-[10px] font-black">
                                            Episode {anime.lastEpisode || 1}
                                        </span>
                                    </div>
                                </div>
                            )}
                        />
                    )}

                    {/* Thematic Shelf 1: Trending This Season */}
                    {trendingList.length > 0 && (
                        <HorizontalScrollList
                            title="Trending This Season"
                            icon={Flame}
                            items={trendingList}
                            onItemClick={(anime) => onInfo(anime)}
                            renderItem={(anime) => (
                                <div className="min-w-[135px] w-[135px] sm:min-w-[170px] sm:w-[170px] flex-shrink-0">
                                    <AnimeCard anime={anime} onClick={onInfo} />
                                </div>
                            )}
                        />
                    )}

                    {/* Thematic Shelf 2: All-Time Fan Favorites */}
                    {popularList.length > 0 && (
                        <HorizontalScrollList
                            title="All-Time Fan Favorites"
                            icon={Star}
                            items={popularList}
                            onItemClick={(anime) => onInfo(anime)}
                            renderItem={(anime) => (
                                <div className="min-w-[135px] w-[135px] sm:min-w-[170px] sm:w-[170px] flex-shrink-0">
                                    <AnimeCard anime={anime} onClick={onInfo} />
                                </div>
                            )}
                        />
                    )}

                    {/* Thematic Shelf 3: Top Rated Classics */}
                    {topRatedList.length > 0 && (
                        <HorizontalScrollList
                            title="Top Rated Classics"
                            icon={Trophy}
                            items={topRatedList}
                            onItemClick={(anime) => onInfo(anime)}
                            renderItem={(anime) => (
                                <div className="min-w-[135px] w-[135px] sm:min-w-[170px] sm:w-[170px] flex-shrink-0">
                                    <AnimeCard anime={anime} onClick={onInfo} />
                                </div>
                            )}
                        />
                    )}

                    {/* Thematic Shelf 4: My Favorites / Bookmarks */}
                    {favorites.length > 0 && (
                        <HorizontalScrollList
                            title="Saved to Favorites"
                            icon={Heart}
                            items={favorites}
                            onItemClick={(anime) => onInfo(anime)}
                            renderItem={(anime) => (
                                <div className="min-w-[135px] w-[135px] sm:min-w-[170px] sm:w-[170px] flex-shrink-0">
                                    <AnimeCard anime={anime} onClick={onInfo} />
                                </div>
                            )}
                        />
                    )}

                    {/* Discovery Banner CTA */}
                    <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-950/40 via-gray-900 to-gray-900 border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
                        <div className="flex items-center gap-4 text-center sm:text-left">
                            <div className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                                <Compass className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-white">
                                    Looking for something specific?
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
                                    Explore our full catalog of thousands of anime with live search, genre filters, format selectors, and seasonal archives.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onNavigateTab('browse')}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center gap-2 cursor-pointer hover:scale-105 active-press shrink-0"
                        >
                            <span>Explore Full Catalog</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

HomeView.displayName = 'HomeView';

export default HomeView;
