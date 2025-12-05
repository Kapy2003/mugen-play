import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HorizontalScrollList = ({ title, icon: Icon, items, onItemClick, renderItem }) => {
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -400 : 400;
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
        const walk = (x - startX) * 2; // Scroll speed multiplier
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    if (!items || items.length === 0) return null;

    return (
        <div className="mb-8 animate-fade-in group/section">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {Icon && <Icon className="w-5 h-5 text-red-500" />}
                    {title}
                </h2>

                {/* Navigation Buttons - Show on hover of section or always? User said "top right". */}
                <div className="flex gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                    <button
                        onClick={() => scroll('left')}
                        className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors"
                        aria-label="Scroll Left"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors"
                        aria-label="Scroll Right"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar for Firefox/IE
            >
                {items.map((item, index) => (
                    <div
                        key={item.id || index}
                        className="flex-shrink-0"
                        onClick={(e) => {
                            // Prevent click if we were dragging
                            if (!isDragging) onItemClick(item);
                        }}
                    >
                        {renderItem ? renderItem(item) : (
                            <div className="w-[160px] group relative">
                                <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative">
                                    <img
                                        src={item.coverUrl || item.image}
                                        alt={item.title.romaji || item.title}
                                        className="w-full h-full object-cover pointer-events-none" // prevent img drag
                                    />
                                </div>
                                <h3 className="text-sm font-medium text-white truncate">{item.title.romaji || item.title}</h3>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HorizontalScrollList;
