import { useState, useRef, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight, Play, Star } from 'lucide-react';

const HeroCarousel = memo(({ items, onPlay, onInfo }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const containerRef = useRef(null);
    const dragRef = useRef({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
    });

    // Auto-advance (pauses when dragging or hovered)
    useEffect(() => {
        if (isHovered || !items || items.length === 0) return;

        const interval = setInterval(() => {
            if (!dragRef.current.isDragging) {
                setCurrentIndex(prev => (prev + 1) % items.length);
            }
        }, 7000);

        return () => clearInterval(interval);
    }, [items, isHovered]);

    // Drag / Touch Swipe Handlers
    const handleTouchStart = (e) => {
        const touch = e.touches ? e.touches[0] : e;
        const clientX = touch.clientX || touch.pageX || 0;
        const clientY = touch.clientY || touch.pageY || 0;
        dragRef.current = {
            isDragging: true,
            startX: clientX,
            startY: clientY,
            currentX: clientX,
            currentY: clientY
        };
    };

    const handleTouchMove = (e) => {
        if (!dragRef.current.isDragging) return;
        const touch = e.touches ? e.touches[0] : e;
        dragRef.current.currentX = touch.clientX || touch.pageX || 0;
        dragRef.current.currentY = touch.clientY || touch.pageY || 0;

        const diffX = Math.abs(dragRef.current.currentX - dragRef.current.startX);
        const diffY = Math.abs(dragRef.current.currentY - dragRef.current.startY);

        // If user is predominantly scrolling vertically, release carousel drag so page scrolls smoothly
        if (diffY > diffX && diffY > 10) {
            dragRef.current.isDragging = false;
        }
    };

    const handleTouchEnd = () => {
        if (!dragRef.current.isDragging || !items || items.length === 0) {
            dragRef.current.isDragging = false;
            return;
        }

        const diffX = dragRef.current.currentX - dragRef.current.startX;
        const diffY = dragRef.current.currentY - dragRef.current.startY;
        const threshold = 35;

        if (dragRef.current.startX !== 0 && Math.abs(diffX) > threshold && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0) {
                // Swiped Right -> Previous
                setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
            } else {
                // Swiped Left -> Next
                setCurrentIndex(prev => (prev + 1) % items.length);
            }
        }

        dragRef.current.isDragging = false;
        dragRef.current.startX = 0;
        dragRef.current.startY = 0;
        dragRef.current.currentX = 0;
        dragRef.current.currentY = 0;
    };

    if (!items || items.length === 0) return null;

    const safeIndex = (currentIndex >= 0 && currentIndex < items.length) ? currentIndex : 0;
    const featured = items[safeIndex] || items[0];
    if (!featured) return null;

    const titleText = typeof featured.title === 'string'
        ? featured.title
        : (featured.title?.english || featured.title?.romaji || featured.title?.canonical || featured.name || 'Featured Anime');

    const imageSrc = featured.bannerUrl || featured.coverUrl || featured.image || '';

    return (
        <div
            ref={containerRef}
            className="relative h-[200px] xs:h-[230px] sm:h-[340px] md:h-[420px] lg:h-[460px] rounded-2xl sm:rounded-3xl overflow-hidden group mb-5 sm:mb-8 select-none max-w-full shadow-xl bg-gray-900 border border-white/5"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                handleTouchEnd();
            }}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <img
                key={featured.id || safeIndex}
                src={imageSrc}
                alt={titleText}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover object-top sm:object-center transition-transform duration-700 group-hover:scale-105 animate-fade-in pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 sm:via-gray-950/40 to-transparent pointer-events-none" />

            {/* Top Right Navigation Buttons (Desktop Only) */}
            <div className="hidden sm:flex absolute top-4 right-4 sm:top-6 sm:right-6 gap-2 z-20">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
                    }}
                    className="carousel-nav-btn p-1.5 sm:p-2 bg-black/60 hover:bg-black/80 text-white rounded-full border border-white/10 transition-all hover:scale-105 cursor-pointer shadow-lg active:scale-95"
                    title="Previous"
                >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(prev => (prev + 1) % items.length);
                    }}
                    className="carousel-nav-btn p-1.5 sm:p-2 bg-black/60 hover:bg-black/80 text-white rounded-full border border-white/10 transition-all hover:scale-105 cursor-pointer shadow-lg active:scale-95"
                    title="Next"
                >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
            </div>

            {/* Hero Info Overlay */}
            <div className="absolute bottom-0 left-0 p-3 sm:p-7 md:p-9 w-full sm:w-4/5 md:w-3/4 space-y-1.5 sm:space-y-3 animate-slide-up pointer-events-none hero-protected-text z-10">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-red-600 text-white text-[9px] sm:text-xs font-black rounded-full uppercase tracking-wider shadow-md shadow-red-600/30 inline-block">
                        #{safeIndex + 1} Trending
                    </span>
                    {featured.rating && (
                        <span className="flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-3 sm:py-1 bg-black/90 text-amber-300 text-[9px] sm:text-xs font-black rounded-full border border-amber-400/60 shadow-sm">
                            <Star className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
                            {Number(featured.rating) > 10 ? (Number(featured.rating) / 10).toFixed(1) : Number(featured.rating).toFixed(1)}
                        </span>
                    )}
                    <span className="px-1.5 py-0.5 sm:px-3 sm:py-1 bg-black/90 text-white text-[9px] sm:text-xs font-black rounded-full border border-white/20 shadow-sm">
                        {featured.year || 2024}
                    </span>
                    {featured.episodes && (
                        <span className="px-1.5 py-0.5 sm:px-3 sm:py-1 bg-black/90 text-white text-[9px] sm:text-xs font-bold rounded-full border border-white/20 shadow-sm">
                            {featured.episodes} Eps
                        </span>
                    )}
                </div>
                <h1 className="text-sm xs:text-base sm:text-2xl md:text-4xl font-black text-white leading-tight tracking-tight line-clamp-1 sm:line-clamp-2 drop-shadow-md">
                    {titleText}
                </h1>
                <p className="hidden sm:block text-gray-200 line-clamp-2 text-xs sm:text-sm md:text-base max-w-2xl drop-shadow-sm font-medium">
                    {featured.synopsis ? featured.synopsis.replace(/<[^>]*>?/gm, '') : ''}
                </p>
                <div className="flex items-center gap-2 sm:gap-3.5 pt-0.5 sm:pt-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onPlay) onPlay(featured);
                        }}
                        className="pointer-events-auto px-3.5 py-1.5 sm:px-6 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl flex items-center gap-1 sm:gap-2 transition-all hover:scale-105 active:scale-95 shadow-md shadow-red-600/40 cursor-pointer"
                    >
                        <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                        Watch Now
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onInfo) onInfo(featured);
                        }}
                        className="carousel-info-btn pointer-events-auto px-3 py-1.5 sm:px-5 sm:py-2.5 bg-black/60 hover:bg-black/80 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all border border-white/20 hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                    >
                        More Info
                    </button>
                </div>
            </div>

            {/* Bottom Indicators */}
            <div className="absolute bottom-2.5 right-2.5 sm:bottom-5 sm:right-6 flex gap-1 sm:gap-1.5 z-20">
                {items.slice(0, 10).map((_, idx) => (
                    <button
                        key={idx}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(idx);
                        }}
                        className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === safeIndex
                            ? 'w-3.5 sm:w-5 bg-red-600 shadow-sm shadow-red-600/50'
                            : 'w-1 sm:w-1.5 bg-white/40 hover:bg-white/70'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
});

HeroCarousel.displayName = 'HeroCarousel';

export default HeroCarousel;
