import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

const HeroCarousel = ({ items, onPlay, onInfo }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const containerRef = useRef(null);

    // Auto-advance
    useEffect(() => {
        if (isDragging) return; // Pause on drag

        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % items.length);
        }, 7000);

        return () => clearInterval(interval);
    }, [items.length, isDragging]);

    // Handlers
    const handleDragStart = (e) => {
        setIsDragging(true);
        setStartX(e.type.includes('mouse') ? e.pageX : e.touches[0].clientX);
    };

    const handleDragMove = (e) => {
        if (!isDragging) return;
        const x = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        setCurrentX(x);
    };

    const handleDragEnd = () => {
        if (!isDragging) return;

        const diff = currentX - startX;
        const threshold = 50; // Minimum swipe distance

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                // Swiped Right -> Previous
                setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
            } else {
                // Swiped Left -> Next
                setCurrentIndex(prev => (prev + 1) % items.length);
            }
        }

        setIsDragging(false);
        setStartX(0);
        setCurrentX(0);
    };

    if (!items || items.length === 0) return null;

    const featured = items[currentIndex];

    return (
        <div
            ref={containerRef}
            className={`relative h-[400px] sm:h-[500px] rounded-3xl overflow-hidden group mb-8 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
        >
            <img
                key={featured.id} // Key change ensures fade animation triggers
                src={featured.bannerUrl}
                alt={featured.title.english || featured.title.romaji || featured.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 animate-fade-in pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent pointer-events-none">
                {/* Top Right Navigation Buttons (Clickable, so pointer-events-auto) */}
                <div className="absolute top-6 right-6 flex gap-2 z-20 pointer-events-auto">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
                        }}
                        className="p-2 bg-black/30 hover:bg-black/60 backdrop-blur-sm rounded-full text-white border border-white/10 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(prev => (prev + 1) % items.length);
                        }}
                        className="p-2 bg-black/30 hover:bg-black/60 backdrop-blur-sm rounded-full text-white border border-white/10 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 p-8 sm:p-12 w-full sm:w-2/3 space-y-4 animate-slide-up pointer-events-auto">
                    <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                        Trending #{currentIndex + 1}
                    </span>
                    <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight">
                        {featured.title.english || featured.title.romaji || featured.title}
                    </h1>
                    <p className="text-gray-200 line-clamp-2 text-lg">
                        {featured.synopsis?.replace(/<[^>]*>?/gm, '')}
                    </p>
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={() => onPlay(featured)}
                            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 transition-transform hover:scale-105"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Watch Now
                        </button>
                        <button
                            onClick={() => onInfo(featured)}
                            className="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-xl transition-colors border border-white/10"
                        >
                            More Info
                        </button>
                    </div>
                </div>

                {/* Bottom Indicators */}
                <div className="absolute bottom-8 right-8 flex gap-2 z-20 pointer-events-auto">
                    {items.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex(idx);
                            }}
                            className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex
                                ? 'w-6 bg-red-600'
                                : 'w-2 bg-white/30 hover:bg-white/50'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HeroCarousel;
