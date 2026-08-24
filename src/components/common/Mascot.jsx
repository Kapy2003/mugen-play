import React from 'react';

/**
 * Mascot
 * Mugen Play's official animated Chibi CRT TV Mascot.
 * Supports moods: 'dizzy' (broken stream / 404 / signal loss), 'sleepy' (empty favorites), 'happy' (welcome/active).
 */
const Mascot = ({
    mood = 'dizzy',
    className = 'w-32 h-28 sm:w-44 sm:h-36',
    showStars = true
}) => {
    return (
        <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
            {/* Orbiting Cartoon Dizzy Stars / Sparkles */}
            {showStars && mood === 'dizzy' && (
                <div className="absolute -top-2 w-full flex justify-center pointer-events-none z-20">
                    <div className="animate-anime-orbit flex items-center justify-center text-amber-300 font-black text-[10px] sm:text-xs">
                        <span>★</span>
                        <span className="text-red-400 font-bold ml-2 sm:ml-3">?</span>
                        <span className="text-yellow-400 text-[8px] sm:text-[10px] ml-2 sm:ml-3">✦</span>
                    </div>
                </div>
            )}

            {showStars && mood === 'happy' && (
                <div className="absolute -top-2 w-full flex justify-center pointer-events-none z-20">
                    <div className="animate-bounce flex items-center justify-center text-yellow-300 font-black text-[10px] sm:text-xs">
                        <span>✨</span>
                        <span className="text-pink-400 font-bold ml-2 sm:ml-3">💖</span>
                        <span className="text-yellow-300 text-[8px] sm:text-[10px] ml-2 sm:ml-3">✨</span>
                    </div>
                </div>
            )}

            {/* TV Mascot Body */}
            <svg
                viewBox="0 0 160 120"
                className={`w-full h-full drop-shadow-xl overflow-visible ${
                    mood === 'dizzy' ? 'animate-anime-panic' : mood === 'happy' ? 'animate-bounce' : ''
                }`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Twitching TV Antennas */}
                <g className="animate-anime-antenna origin-bottom">
                    <path d="M54 22 L32 4 M106 22 L128 4" stroke="#e50914" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                    <circle cx="32" cy="4" r="3.5" fill="#ff4d4d" />
                    <circle cx="128" cy="4" r="3.5" fill="#ff4d4d" />
                </g>
                
                {/* TV Body Frame */}
                <rect x="16" y="18" width="128" height="90" rx="16" fill="#181820" stroke="#333342" strokeWidth="2.5" />
                
                {/* Cute Band-Aid on Top-Right Corner */}
                <g transform="rotate(25 125 25)">
                    <rect x="110" y="20" width="22" height="9" rx="3" fill="#eab308" stroke="#ca8a04" strokeWidth="1" opacity="0.85" />
                    <circle cx="121" cy="24.5" r="1.2" fill="#ca8a04" />
                </g>

                {/* CRT Screen Frame */}
                <rect
                    x="26"
                    y="26"
                    width="90"
                    height="74"
                    rx="10"
                    fill="#09090d"
                    stroke={mood === 'dizzy' ? '#ef4444' : mood === 'happy' ? '#22c55e' : '#3b82f6'}
                    strokeWidth="1.5"
                    strokeDasharray={mood === 'dizzy' ? '5 3' : undefined}
                />
                
                {/* Subtle Glitch Scanlines */}
                <line x1="28" y1="40" x2="114" y2="40" stroke={mood === 'dizzy' ? '#ef4444' : '#ffffff'} strokeWidth="0.8" opacity="0.2" />
                <line x1="28" y1="56" x2="114" y2="56" stroke={mood === 'dizzy' ? '#ef4444' : '#ffffff'} strokeWidth="0.8" opacity="0.2" />
                <line x1="28" y1="72" x2="114" y2="72" stroke={mood === 'dizzy' ? '#ef4444' : '#ffffff'} strokeWidth="0.8" opacity="0.2" />
                <line x1="28" y1="88" x2="114" y2="88" stroke={mood === 'dizzy' ? '#ef4444' : '#ffffff'} strokeWidth="0.8" opacity="0.2" />
                
                {/* Eyes Rendering Based on Mood */}
                {mood === 'dizzy' && (
                    <>
                        {/* Left Dizzy Spiral Eye */}
                        <g transform="translate(48, 56)">
                            <circle cx="0" cy="0" r="10" fill="#221015" />
                            <path
                                className="animate-anime-spiral origin-center"
                                d="M0 0 C-2 -4, -6 -2, -6 0 C-6 5, 0 8, 5 5 C9 2, 8 -6, 2 -8 C-4 -9, -9 -2, -9 3"
                                stroke="#ff4d4d"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                fill="none"
                            />
                        </g>

                        {/* Right Dizzy Spiral Eye */}
                        <g transform="translate(94, 56)">
                            <circle cx="0" cy="0" r="10" fill="#221015" />
                            <path
                                className="animate-anime-spiral origin-center"
                                d="M0 0 C-2 -4, -6 -2, -6 0 C-6 5, 0 8, 5 5 C9 2, 8 -6, 2 -8 C-4 -9, -9 -2, -9 3"
                                stroke="#ff4d4d"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                fill="none"
                            />
                        </g>

                        {/* Trembling Wavy Comic Mouth */}
                        <path d="M62 76 Q66 71 71 76 Q76 81 81 76" stroke="#ff4d4d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        
                        {/* Blushing Comic Cheeks */}
                        <ellipse cx="38" cy="68" rx="4" ry="2" fill="#ef4444" opacity="0.4" />
                        <ellipse cx="104" cy="68" rx="4" ry="2" fill="#ef4444" opacity="0.4" />

                        {/* Dripping Giant Anime Sweatdrop */}
                        <g className="animate-anime-sweat" transform="translate(108, 38)">
                            <path d="M0 0 C-4 4, -4 10, 0 14 C4 10, 4 4, 0 0 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />
                        </g>
                    </>
                )}

                {mood === 'sleepy' && (
                    <>
                        {/* Sleepy Closed Eyes */}
                        <path d="M40 58 Q48 64 56 58" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        <path d="M86 58 Q94 64 102 58" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" fill="none" />

                        {/* Cute Sleeping Mouth */}
                        <circle cx="71" cy="74" r="3" fill="#94a3b8" />
                        
                        {/* Soft Blushing Cheeks */}
                        <ellipse cx="38" cy="68" rx="4" ry="2" fill="#38bdf8" opacity="0.3" />
                        <ellipse cx="104" cy="68" rx="4" ry="2" fill="#38bdf8" opacity="0.3" />

                        {/* Zzz floating */}
                        <text x="108" y="44" fill="#38bdf8" fontSize="12" fontWeight="bold" opacity="0.8">z</text>
                        <text x="116" y="34" fill="#38bdf8" fontSize="14" fontWeight="bold" opacity="0.9">Z</text>
                    </>
                )}

                {mood === 'happy' && (
                    <>
                        {/* Happy Curved Wink / Star Eyes */}
                        <path d="M40 56 Q48 48 56 56" stroke="#22c55e" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                        <path d="M86 56 Q94 48 102 56" stroke="#22c55e" strokeWidth="2.8" strokeLinecap="round" fill="none" />

                        {/* Happy Smile */}
                        <path d="M62 72 Q71 82 80 72" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        
                        {/* Rosy Cheeks */}
                        <ellipse cx="38" cy="66" rx="4" ry="2" fill="#f43f5e" opacity="0.5" />
                        <ellipse cx="104" cy="66" rx="4" ry="2" fill="#f43f5e" opacity="0.5" />
                    </>
                )}

                {/* TV Controls Dial */}
                <circle cx="130" cy="42" r="5" fill="#252530" stroke="#4b4b5a" strokeWidth="1.5" />
                <circle cx="130" cy="62" r="5" fill="#252530" stroke="#4b4b5a" strokeWidth="1.5" />
                <line x1="126" y1="80" x2="134" y2="80" stroke="#e50914" strokeWidth="2" strokeLinecap="round" />
                <line x1="126" y1="86" x2="134" y2="86" stroke="#e50914" strokeWidth="2" strokeLinecap="round" />
                
                {/* TV Stand Base */}
                <path d="M48 108 L38 116 M112 108 L122 116" stroke="#333340" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
        </div>
    );
};

export default Mascot;
