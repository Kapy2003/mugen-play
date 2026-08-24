import { useEffect, useRef } from 'react';
import { Maximize2, X } from 'lucide-react';
import VideoPlayer from '../player/VideoPlayer';

const MiniPlayerOverlay = ({
    playingAnime,
    onExpand,
    onClose,
    miniVideoScale = 1,
    miniVideoYOffset = -50,
    videoXOffset = 0,
    devMode = false,
    onUpdateStreamUrl,
    reportProgress,
    saveProgress,
    onOpenExtensionStore,
    onRetry
}) => {
    const miniPlayerRef = useRef(null);
    const miniPosRef = useRef({ x: 0, y: 0 });
    const miniDragOriginRef = useRef({ hasMoved: false });

    useEffect(() => {
        const miniEl = miniPlayerRef.current;
        if (!miniEl) return;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initX = 0;
        let initY = 0;

        const onPointerDown = (e) => {
            // If touching close or expand button, let click pass through
            if (e.target.closest('.minimized-btn') || e.target.closest('button')) {
                return;
            }
            isDragging = true;
            miniDragOriginRef.current.hasMoved = false;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            startX = clientX;
            startY = clientY;
            initX = miniPosRef.current.x;
            initY = miniPosRef.current.y;

            miniEl.style.transition = 'none';
            miniEl.style.willChange = 'transform';
        };

        const onPointerMove = (e) => {
            if (!isDragging) return;
            // 100% prevent background page scrolling
            if (e.cancelable) {
                e.preventDefault();
                e.stopPropagation();
            }

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const dx = clientX - startX;
            const dy = clientY - startY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                miniDragOriginRef.current.hasMoved = true;
            }

            const newX = initX + dx;
            const newY = initY + dy;
            miniPosRef.current = { x: newX, y: newY };

            // Direct hardware transform at native 120fps
            miniEl.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
        };

        const onPointerUp = (e) => {
            if (!isDragging) return;
            isDragging = false;

            const clientX = e.changedTouches ? e.changedTouches[0].clientX : (e.clientX || startX);
            const dx = clientX - startX;

            // Dismiss if swiped off-screen horizontally (> 160px)
            if (Math.abs(dx) > 160) {
                onClose();
                miniPosRef.current = { x: 0, y: 0 };
                return;
            }

            // Magnetic 4-Corner / Edge Snapping with safe margins
            if (typeof window !== 'undefined') {
                const screenW = window.innerWidth;
                const screenH = window.innerHeight;
                const miniW = screenW < 640 ? screenW - 24 : 384;
                const miniH = screenW < 640 ? 192 : 224;

                const maxLeftX = -(screenW - miniW - 24);
                const currentX = miniPosRef.current.x;
                const targetSnapX = currentX < maxLeftX / 2 ? maxLeftX : 0;

                const minY = -(screenH - miniH - 120);
                const currentY = miniPosRef.current.y;
                const clampedY = Math.min(0, Math.max(minY, currentY));
                let targetSnapY = clampedY;
                if (currentY < minY * 0.7) {
                    targetSnapY = minY;
                } else if (currentY > minY * 0.3) {
                    targetSnapY = 0;
                }

                miniEl.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
                miniEl.style.transform = `translate3d(${targetSnapX}px, ${targetSnapY}px, 0)`;
                miniPosRef.current = { x: targetSnapX, y: targetSnapY };

                setTimeout(() => {
                    miniDragOriginRef.current.hasMoved = false;
                }, 100);
            }
        };

        miniEl.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp, { passive: false });
        window.addEventListener('touchcancel', onPointerUp, { passive: false });

        miniEl.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        return () => {
            miniEl.removeEventListener('touchstart', onPointerDown);
            window.removeEventListener('touchmove', onPointerMove);
            window.removeEventListener('touchend', onPointerUp);
            window.removeEventListener('touchcancel', onPointerUp);

            miniEl.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
        };
    }, [onClose]);

    if (!playingAnime) return null;

    return (
        <div
            ref={miniPlayerRef}
            onClick={() => {
                if (!miniDragOriginRef.current.hasMoved) {
                    onExpand();
                }
            }}
            className="fixed z-50 bg-[#0a0a0a] playback-modal text-white flex flex-col font-sans shadow-2xl overflow-hidden bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 h-48 sm:h-56 rounded-2xl border border-white/15 ring-1 ring-black/50 cursor-grab active:cursor-grabbing select-none touch-none transform-gpu will-change-transform"
        >
            {/* Draggable Indicator Handle for Miniplayer */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-[130] pointer-events-none">
                <div className="w-10 h-1 rounded-full bg-white/40 shadow-sm" />
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col relative">
                    <div className="w-full bg-black relative h-full rounded-2xl overflow-hidden shadow-2xl z-[100]">
                        <VideoPlayer
                            src={playingAnime.url || playingAnime.streamUrl || playingAnime.source}
                            poster={playingAnime.bannerUrl || playingAnime.coverUrl}
                            title={playingAnime.title}
                            isMinimized={true}
                            scale={miniVideoScale}
                            xOffset={videoXOffset}
                            yOffset={miniVideoYOffset}
                            devMode={devMode}
                            initialTime={playingAnime.initialTime}
                            onUpdateStreamUrl={onUpdateStreamUrl}
                            onProgress={reportProgress}
                            onEnded={saveProgress}
                            onToggleMinimize={onExpand}
                            onClose={onClose}
                            onOpenExtensionStore={onOpenExtensionStore}
                            onRetry={onRetry}
                        />
                        {/* Mini Overlay Controls */}
                        <div className="minimized-player-overlay absolute top-0 left-0 right-0 p-2.5 flex justify-end gap-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent z-[120] pointer-events-auto opacity-100 sm:opacity-90 sm:hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onExpand();
                                }}
                                className="minimized-btn p-2 bg-black/80 hover:bg-black text-white rounded-full backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/20 cursor-pointer"
                                title="Expand Player"
                            >
                                <Maximize2 size={16} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-red-500/30 cursor-pointer"
                                title="Close Player"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MiniPlayerOverlay;
