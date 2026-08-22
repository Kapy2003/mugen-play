import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

const HeroCarousel = ({ items, onPlay, onInfo }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const containerRef = useRef(null);

    // Auto-advance (pauses when dragging or hovered)
    useEffect(() => {
        if (isDragging || isHovered || !items || items.length === 0) return;

        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % items.length);
        }, 7000);

        return () => clearInterval(interval);
    }, [items, isDragging, isHovered]);

    // Drag / Touch Swipe Handlers
    const handleTouchStart = (e) => {
        const touch = e.touches ? e.touches[0] : e;
        const clientX = touch.clientX || touch.pageX || 0;
        const clientY = touch.clientY || touch.pageY || 0;
        setIsDragging(true);
        setStartX(clientX);
        setStartY(clientY);
        setCurrentX(clientX);
        setCurrentY(clientY);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const touch = e.touches ? e.touches[0] : e;
        const clientX = touch.clientX || touch.pageX || 0;
        const clientY = touch.clientY || touch.pageY || 0;
        setCurrentX(clientX);
        setCurrentY(clientY);
    };

    const handleTouchEnd = () => {
        if (!isDragging || !items || items.length === 0) {
            setIsDragging(false);
            return;
        }

        const diffX = currentX - startX;
        const diffY = currentY - startY;
        const threshold = 35; // Responsive swipe distance

        // Only trigger horizontal swipe if horizontal movement dominates vertical scroll
        if (startX !== 0 && currentX !== 0 && Math.abs(diffX) > threshold && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0) {
                // Swiped Right -> Previous
                setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
            } else {
                // Swiped Left -> Next
                setCurrentIndex(prev => (prev + 1) % items.length);
            }
        }

        setIsDragging(false);
        setStartX(0);
        setStartY(0);
        setCurrentX(0);
        setCurrentY(0);
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
            className={`relative h-[320px] sm:h-[480px] rounded-2xl sm:rounded-3xl overflow-hidden group mb-6 sm:mb-8 select-none touch-pan-y ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
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
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 animate-fade-in pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent pointer-events-none">
                {/* Top Right Navigation Buttons (Desktop) */}
                <div
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2 z-20 pointer-events-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
                        }}
                        className="p-1.5 sm:p-2 bg-black/40 hover:bg-black/70 backdrop-blur-sm rounded-full text-white border border-white/10 transition-all hover:scale-105 cursor-pointer shadow-lg"
                        title="Previous"
                    >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(prev => (prev + 1) % items.length);
                        }}
                        className="p-1.5 sm:p-2 bg-black/40 hover:bg-black/70 backdrop-blur-sm rounded-full text-white border border-white/10 transition-all hover:scale-105 cursor-pointer shadow-lg"
                        title="Next"
                    >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>

                {/* Hero Info Overlay */}
                <div
                    className="absolute bottom-0 left-0 p-4 sm:p-10 w-full sm:w-3/4 space-y-2 sm:space-y-4 animate-slide-up pointer-events-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider shadow-lg shadow-red-600/30 inline-block">
                        Trending #{safeIndex + 1}
                    </span>
                    <h1 className="text-xl sm:text-4xl md:text-5xl font-black text-white leading-snug tracking-tight line-clamp-2">
                        {titleText}
                    </h1>
                    <p className="text-gray-200 line-clamp-2 text-xs sm:text-base max-w-2xl">
                        {featured.synopsis ? featured.synopsis.replace(/<[^>]*>?/gm, '') : ''}
                    </p>
                    <div className="flex items-center gap-2.5 sm:gap-4 pt-1 sm:pt-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onPlay) onPlay(featured);
                            }}
                            className="px-4 py-2 sm:px-8 sm:py-3 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/30 cursor-pointer"
                        >
                            <Play className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current" />
                            Watch Now
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onInfo) onInfo(featured);
                            }}
                            className="px-4 py-2 sm:px-8 sm:py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-bold rounded-xl transition-all border border-white/15 hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            More Info
                        </button>
                    </div>
                </div>

                {/* Bottom Indicators */}
                <div
                    className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 flex gap-1.5 sm:gap-2 z-20 pointer-events-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    {items.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex(idx);
                            }}
                            className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${idx === safeIndex
                                ? 'w-4 sm:w-6 bg-red-600'
                                : 'w-1.5 sm:w-2 bg-white/30 hover:bg-white/60'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HeroCarousel;
