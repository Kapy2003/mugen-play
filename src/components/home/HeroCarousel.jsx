import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Star, Info } from 'lucide-react';

const HeroCarousel = memo(({ items, onPlay, onInfo }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const containerRef = useRef(null);
    const dragRef = useRef({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        hasMoved: false
    });

    const nextSlide = useCallback(() => {
        if (!items || items.length === 0) return;
        setCurrentIndex(prev => (prev + 1) % items.length);
    }, [items]);

    const prevSlide = useCallback(() => {
        if (!items || items.length === 0) return;
        setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
    }, [items]);

    // Auto-advance interval (pauses when hovered or interacting)
    useEffect(() => {
        if (isHovered || !items || items.length === 0) return;

        const interval = setInterval(() => {
            if (!dragRef.current.isDragging) {
                nextSlide();
            }
        }, 7000);

        return () => clearInterval(interval);
    }, [items, isHovered, nextSlide]);

    // Keyboard navigation (Desktop Arrow Keys)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isHovered) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevSlide();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextSlide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHovered, prevSlide, nextSlide]);

    // Desktop Mouse Drag Handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('button')) return;
        dragRef.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            currentY: e.clientY,
            hasMoved: false
        };
    };

    const handleMouseMove = (e) => {
        if (!dragRef.current.isDragging) return;
        dragRef.current.currentX = e.clientX;
        dragRef.current.currentY = e.clientY;
        const diffX = e.clientX - dragRef.current.startX;
        if (Math.abs(diffX) > 6) {
            dragRef.current.hasMoved = true;
            setDragOffset(Math.max(-80, Math.min(80, diffX * 0.4)));
        }
    };

    const handleMouseUp = () => {
        if (!dragRef.current.isDragging) return;
        const diffX = dragRef.current.currentX - dragRef.current.startX;
        if (dragRef.current.hasMoved && Math.abs(diffX) > 35) {
            if (diffX > 0) {
                prevSlide();
            } else {
                nextSlide();
            }
        }
        dragRef.current.isDragging = false;
        dragRef.current.hasMoved = false;
        setDragOffset(0);
    };

    // Mobile Touch Gesture Handlers (Ultra-fluid, preserves native vertical page scroll)
    const handleTouchStart = (e) => {
        if (e.target.closest('button')) return;
        const touch = e.touches[0];
        dragRef.current = {
            isDragging: true,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            hasMoved: false
        };
    };

    const handleTouchMove = (e) => {
        if (!dragRef.current.isDragging) return;
        const touch = e.touches[0];
        dragRef.current.currentX = touch.clientX;
        dragRef.current.currentY = touch.clientY;

        const diffX = touch.clientX - dragRef.current.startX;
        const diffY = touch.clientY - dragRef.current.startY;

        // If vertical scrolling, immediately release so page scrolls normally
        if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 8) {
            dragRef.current.isDragging = false;
            setDragOffset(0);
            return;
        }

        if (Math.abs(diffX) > 6) {
            dragRef.current.hasMoved = true;
            setDragOffset(Math.max(-60, Math.min(60, diffX * 0.35)));
        }
    };

    const handleTouchEnd = () => {
        if (!dragRef.current.isDragging) return;
        const diffX = dragRef.current.currentX - dragRef.current.startX;
        const diffY = dragRef.current.currentY - dragRef.current.startY;

        if (dragRef.current.hasMoved && Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0) {
                prevSlide();
            } else {
                nextSlide();
            }
        }
        dragRef.current.isDragging = false;
        dragRef.current.hasMoved = false;
        setDragOffset(0);
    };

    if (!items || items.length === 0) return null;

    const safeIndex = (currentIndex >= 0 && currentIndex < items.length) ? currentIndex : 0;
    const featured = items[safeIndex] || items[0];
    if (!featured) return null;

    const titleText = typeof featured.title === 'string'
        ? featured.title
        : (featured.title?.english || featured.title?.romaji || featured.title?.canonical || featured.name || 'Featured Anime');

    const imageSrc = featured.bannerUrl || featured.coverUrl || featured.image || '';

    const cleanSynopsis = featured.synopsis
        ? featured.synopsis.replace(/<[^>]*>?/gm, '').trim()
        : '';

    const shortSynopsis = cleanSynopsis
        ? (cleanSynopsis.length > 130 ? cleanSynopsis.slice(0, 130).trim() + '...' : cleanSynopsis)
        : '';

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            className="relative h-[210px] xs:h-[240px] sm:h-[310px] md:h-[370px] lg:h-[400px] rounded-2xl sm:rounded-3xl overflow-hidden group mb-5 sm:mb-8 select-none max-w-full shadow-2xl bg-gray-950 border border-white/10 cursor-grab active:cursor-grabbing transform-gpu outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                handleMouseUp();
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            {/* Layer 1: Ambient Blurred Backdrop */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                    src={imageSrc}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover filter blur-2xl opacity-30 scale-110"
                />
            </div>

            {/* Layer 2: Main Featured Artwork */}
            <div
                className="absolute inset-0 w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                style={{
                    transform: `translate3d(${dragOffset}px, 0, 0)`
                }}
            >
                <img
                    key={featured.id || safeIndex}
                    src={imageSrc}
                    alt={titleText}
                    loading="eager"
                    decoding="async"
                    draggable="false"
                    className="w-full h-full object-cover object-[center_20%] sm:object-[center_15%] transition-transform duration-700 ease-out group-hover:scale-[1.015] animate-fade-in pointer-events-none select-none"
                />
            </div>

            {/* Subtle Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 sm:via-gray-950/35 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/40 to-transparent pointer-events-none w-full sm:w-3/4" />

            {/* Top Right Navigation Buttons (Desktop Controls) */}
            <div className="hidden sm:flex absolute top-4 right-4 sm:top-5 sm:right-6 gap-2 z-20">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        prevSlide();
                    }}
                    className="carousel-nav-btn p-2 sm:p-2.5 bg-black/60 hover:bg-red-600 text-white rounded-full border border-white/10 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-lg backdrop-blur-md"
                    title="Previous Slide (or Left Arrow Key)"
                    aria-label="Previous Slide"
                >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        nextSlide();
                    }}
                    className="carousel-nav-btn p-2 sm:p-2.5 bg-black/60 hover:bg-red-600 text-white rounded-full border border-white/10 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-lg backdrop-blur-md"
                    title="Next Slide (or Right Arrow Key)"
                    aria-label="Next Slide"
                >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
            </div>

            {/* Hero Info Overlay */}
            <div className="absolute bottom-0 left-0 p-4 sm:p-7 md:p-8 w-full sm:w-4/5 md:w-3/4 max-h-[85%] flex flex-col justify-end space-y-2 sm:space-y-2.5 animate-slide-up pointer-events-none hero-protected-text z-10">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-red-600 text-white text-[10px] sm:text-xs font-black rounded-full uppercase tracking-wider shadow-md shadow-red-600/30 inline-block">
                        #{safeIndex + 1} Trending
                    </span>
                    {featured.rating && (
                        <span className="flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-black/90 text-amber-300 text-[10px] sm:text-xs font-black rounded-full border border-amber-400/60 shadow-sm backdrop-blur-md">
                            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
                            {Number(featured.rating) > 10 ? (Number(featured.rating) / 10).toFixed(1) : Number(featured.rating).toFixed(1)}
                        </span>
                    )}
                    <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-black/90 text-white text-[10px] sm:text-xs font-black rounded-full border border-white/20 shadow-sm backdrop-blur-md">
                        {featured.year || 2024}
                    </span>
                    {featured.episodes && (
                        <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-black/90 text-white text-[10px] sm:text-xs font-bold rounded-full border border-white/20 shadow-sm backdrop-blur-md">
                            {featured.episodes} Episodes
                        </span>
                    )}
                </div>

                <h1 className="text-base xs:text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight line-clamp-1 sm:line-clamp-2 drop-shadow-lg">
                    {titleText}
                </h1>

                {shortSynopsis && (
                    <p
                        className="text-gray-300 text-xs sm:text-sm max-w-lg md:max-w-xl drop-shadow-sm font-medium leading-snug line-clamp-2 overflow-hidden"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxHeight: '2.75rem'
                        }}
                    >
                        {shortSynopsis}
                    </p>
                )}

                <div className="flex items-center gap-2.5 sm:gap-3 pt-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onPlay) onPlay(featured);
                        }}
                        className="pointer-events-auto px-4 py-2 sm:px-6 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/40 cursor-pointer"
                    >
                        <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
                        Watch Now
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onInfo) onInfo(featured);
                        }}
                        className="carousel-info-btn pointer-events-auto px-3.5 py-2 sm:px-5 sm:py-2.5 bg-black/70 hover:bg-black/90 text-white text-xs sm:text-sm font-bold rounded-xl transition-all border border-white/20 hover:scale-105 active:scale-95 cursor-pointer shadow-md backdrop-blur-md flex items-center gap-1.5"
                    >
                        <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300" />
                        More Info
                    </button>
                </div>
            </div>

            {/* Bottom Pagination Pill Indicators */}
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-6 flex gap-1 sm:gap-1.5 z-20">
                {items.slice(0, 10).map((_, idx) => (
                    <button
                        key={idx}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(idx);
                        }}
                        className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === safeIndex
                            ? 'w-4 sm:w-6 bg-red-600 shadow-sm shadow-red-600/50'
                            : 'w-1 sm:w-1.5 bg-white/40 hover:bg-white/80'
                            }`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
});

HeroCarousel.displayName = 'HeroCarousel';

export default HeroCarousel;
