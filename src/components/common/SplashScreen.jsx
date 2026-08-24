import { useEffect, useState, useRef } from 'react';

const SplashScreen = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [opacity, setOpacity] = useState(100);
    const [isLight, setIsLight] = useState(false);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        // Detect theme on mount
        try {
            const savedTheme = localStorage.getItem('mugen_theme');
            const isLightActive = savedTheme === 'light' || document.documentElement.classList.contains('light-theme');
            setIsLight(isLightActive);
        } catch {
            setIsLight(false);
        }

        // Start fade out after 800ms
        const timer1 = setTimeout(() => {
            setOpacity(0);
        }, 800);

        // Unmount and trigger complete after 1100ms
        const timer2 = setTimeout(() => {
            setIsVisible(false);
            if (onCompleteRef.current) {
                onCompleteRef.current();
            }
        }, 1100);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []); // Run ONLY once on mount

    const handleDismiss = () => {
        setIsVisible(false);
        if (onCompleteRef.current) {
            onCompleteRef.current();
        }
    };

    if (!isVisible) return null;

    return (
        <div
            onClick={handleDismiss}
            className={`fixed inset-0 z-[999] flex flex-col items-center justify-center transition-opacity duration-300 ease-out cursor-pointer select-none ${
                isLight ? 'bg-[#f8fafc]' : 'bg-[#08080a]'
            }`}
            style={{ opacity: opacity / 100 }}
            title="Click to continue"
        >
            <div className="relative flex items-center justify-center">
                {/* Pulsing Glow */}
                <div className="absolute w-32 h-32 bg-red-600/25 rounded-full blur-2xl animate-pulse"></div>

                {/* Logo Container */}
                <div className={`relative z-10 w-24 h-24 rounded-3xl border flex items-center justify-center shadow-2xl overflow-hidden group transition-colors ${
                    isLight 
                        ? 'bg-white border-slate-200/80 shadow-slate-200' 
                        : 'bg-gradient-to-br from-gray-900 to-black border-gray-800'
                }`}>
                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/30 animate-pop-in">
                        <span className="text-white font-black text-4xl leading-none">M</span>
                    </div>
                </div>
            </div>

            <div className="mt-8 overflow-hidden text-center">
                <h1 className={`text-3xl font-black tracking-wider animate-slide-up ${
                    isLight ? 'text-slate-900' : 'text-white'
                }`}>
                    MUGEN <span className="text-red-600">PLAY</span>
                </h1>
                <p className={`text-xs font-semibold tracking-wider uppercase mt-1 animate-slide-up ${
                    isLight ? 'text-slate-500' : 'text-gray-400'
                }`}>
                    Developed by Kapy
                </p>
            </div>

            <div className="mt-3 flex items-center gap-2 opacity-0 animate-fade-in-delayed">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>

            <style>{`
                .animate-pop-in {
                    opacity: 0;
                    transform: scale(0);
                    animation: pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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
                    animation: slide-up 0.5s ease-out 0.1s forwards;
                    opacity: 0;
                }
                .animate-fade-in-delayed {
                    animation: fade-in-delayed 0.8s linear forwards;
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
