
import React, { useEffect, useState } from 'react';

const SplashScreen = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [opacity, setOpacity] = useState(100);

    useEffect(() => {
        // Start fade out after delay
        const timer1 = setTimeout(() => {
            setOpacity(0);
        }, 2000); // Show for 2 seconds

        // Unmount after fade out
        const timer2 = setTimeout(() => {
            setIsVisible(false);
            onComplete();
        }, 2500); // 2s show + 0.5s fade

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [onComplete]);

    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-700 ease-out"
            style={{ opacity: opacity / 100 }}
        >
            <div className="relative flex items-center justify-center">
                {/* Pulsing Glow */}
                <div className="absolute w-32 h-32 bg-red-600/30 rounded-full blur-2xl animate-pulse"></div>

                {/* Logo Container */}
                <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-gray-900 to-black rounded-3xl border border-gray-800 flex items-center justify-center shadow-2xl overflow-hidden group">
                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg animate-pop-in">
                        <span className="text-white font-bold text-4xl leading-none">M</span>
                    </div>
                </div>
            </div>

            <div className="mt-8 overflow-hidden">
                <h1 className="text-3xl font-bold text-white tracking-wider animate-slide-up">
                    MUGEN <span className="text-red-500">PLAY</span>
                </h1>
            </div>

            <div className="mt-2 flex items-center gap-2 opacity-0 animate-fade-in-delayed">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>

            <style>{`
                .animate-pop-in {
                    opacity: 0;
                    transform: scale(0);
                    animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                @keyframes pop-in {
                    0% { transform: scale(0); opacity: 0; }
                    60% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes slide-up {
                    0% { transform: translateY(100%); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes fade-in-delayed {
                    0% { opacity: 0; }
                    90% { opacity: 0; }
                    100% { opacity: 0.6; }
                }
                .animate-slide-up {
                    animation: slide-up 0.8s ease-out 0.2s forwards;
                    opacity: 0; /* keep hidden initially */
                }
                .animate-fade-in-delayed {
                    animation: fade-in-delayed 1.5s linear forwards;
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
