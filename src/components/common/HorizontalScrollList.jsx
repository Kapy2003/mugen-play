import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HorizontalScrollList = ({ title, icon: Icon, items, onItemClick, renderItem }) => {
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -350 : 350;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    if (!items || items.length === 0) return null;

    const getTitle = (item) => {
        if (!item) return 'Anime';
        if (typeof item.title === 'string') return item.title;
        return item.title?.english || item.title?.romaji || item.title?.canonical || item.name || 'Anime';
    };

    return (
        <div className="mb-6 sm:mb-8 animate-fade-in group/section">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />}
                    {title}
                </h2>

                {/* Navigation Buttons (Desktop) */}
                <div className="hidden sm:flex gap-1.5 opacity-0 group-hover/section:opacity-100 transition-opacity">
                    <button
                        onClick={() => scroll('left')}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors cursor-pointer"
                        aria-label="Scroll Left"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors cursor-pointer"
                        aria-label="Scroll Right"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1 sm:py-2 select-none cursor-grab active:cursor-grabbing touch-pan-x overscroll-x-contain"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                {items.map((item, idx) => (
                    <div
                        key={item.id || item.slug || idx}
                        className="flex-shrink-0"
                        onClick={() => {
                            if (!isDragging && onItemClick) onItemClick(item);
                        }}
                    >
                        {renderItem ? renderItem(item) : (
                            <div className="w-[130px] sm:w-[160px] group relative cursor-pointer">
                                <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative bg-gray-900 border border-gray-800">
                                    <img
                                        src={item.coverUrl || item.image || item.poster || ''}
                                        alt={getTitle(item)}
                                        className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <h3 className="text-xs sm:text-sm font-medium text-white truncate">{getTitle(item)}</h3>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HorizontalScrollList;
