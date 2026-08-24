import { useRef, memo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HorizontalScrollList = memo(({ title, icon: Icon, items, onItemClick, renderItem }) => {
    const scrollRef = useRef(null);
    const dragRef = useRef({
        isDragging: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        hasMoved: false
    });

    const scroll = useCallback((direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -380 : 380;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }, []);

    // Desktop Mouse Drag Only (Touch devices use 100% pure native kinetic momentum scroll)
    const handleMouseDown = (e) => {
        if (!scrollRef.current) return;
        if (e.target.closest('button')) return;
        dragRef.current = {
            isDragging: true,
            startX: e.pageX - scrollRef.current.offsetLeft,
            startY: e.pageY,
            scrollLeft: scrollRef.current.scrollLeft,
            hasMoved: false
        };
    };

    const handleMouseLeave = () => {
        dragRef.current.isDragging = false;
    };

    const handleMouseUp = () => {
        if (dragRef.current.isDragging) {
            setTimeout(() => {
                dragRef.current.isDragging = false;
                dragRef.current.hasMoved = false;
            }, 50);
        }
    };

    const handleMouseMove = (e) => {
        if (!dragRef.current.isDragging || !scrollRef.current) return;
        const currentX = e.pageX - scrollRef.current.offsetLeft;
        const dx = currentX - dragRef.current.startX;
        const dy = e.pageY - dragRef.current.startY;

        // If user movement is vertical, release mouse drag
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
            dragRef.current.isDragging = false;
            return;
        }

        const walk = dx * 1.5;
        if (Math.abs(walk) > 5) {
            dragRef.current.hasMoved = true;
        }
        scrollRef.current.scrollLeft = dragRef.current.scrollLeft - walk;
    };

    if (!items || items.length === 0) return null;

    const getTitle = (item) => {
        if (!item) return 'Anime';
        if (typeof item.title === 'string') return item.title;
        return item.title?.english || item.title?.romaji || item.title?.canonical || item.name || 'Anime';
    };

    return (
        <div className="animate-fade-in group/section">
            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />}
                    {title}
                </h2>

                {/* Navigation Buttons (Desktop) */}
                <div className="hidden sm:flex gap-1.5 opacity-0 group-hover/section:opacity-100 transition-opacity duration-200">
                    <button
                        onClick={() => scroll('left')}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors cursor-pointer"
                        aria-label="Scroll Left"
                        title="Scroll Left"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors cursor-pointer"
                        aria-label="Scroll Right"
                        title="Scroll Right"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 sm:py-2 select-none cursor-grab active:cursor-grabbing overscroll-x-contain"
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
                            if (!dragRef.current.hasMoved && onItemClick) onItemClick(item);
                        }}
                    >
                        {renderItem ? renderItem(item) : (
                            <div className="w-[130px] sm:w-[160px] group relative cursor-pointer">
                                <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative bg-gray-900 border border-gray-800 shadow-md">
                                    <img
                                        src={item.coverUrl || item.image || item.poster || ''}
                                        alt={getTitle(item)}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <h3 className="text-xs sm:text-sm font-medium text-white truncate group-hover:text-red-500 transition-colors">{getTitle(item)}</h3>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

HorizontalScrollList.displayName = 'HorizontalScrollList';

export default HorizontalScrollList;
