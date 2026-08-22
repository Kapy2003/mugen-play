import { useRef } from 'react';
import { Home, Compass, Heart, Film, Settings, LogOut, LogIn, Link } from 'lucide-react';

const Sidebar = ({
    activeTab,
    onTabChange,
    isMobileOpen,
    setIsMobileOpen,
    user,
    onLogin,
    onLogout,
    onOpenDirectPlay,
    width,
    setWidth,
    collapsed,
    setCollapsed
}) => {
    const menuItems = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'browse', label: 'Browse', icon: Compass },
        { id: 'favorites', label: 'Favorites', icon: Heart },
        { id: 'extensions', label: 'Extensions', icon: Film },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    // Drag Resize Logic
    const startResizing = (mouseDownEvent) => {
        mouseDownEvent.preventDefault();

        const startWidth = collapsed ? 80 : (width || 256);
        const startX = mouseDownEvent.clientX;

        const onMouseMove = (mouseMoveEvent) => {
            const newWidth = startWidth + (mouseMoveEvent.clientX - startX);
            if (newWidth >= 60 && newWidth <= 600) {
                if (newWidth < 160) {
                    if (!collapsed) setCollapsed(true);
                } else {
                    if (collapsed) setCollapsed(false);
                    setWidth(newWidth);
                }
            }
        };

        const onMouseUp = () => {
            document.body.removeEventListener("mousemove", onMouseMove);
            document.body.removeEventListener("mouseup", onMouseUp);
        };

        document.body.addEventListener("mousemove", onMouseMove);
        document.body.addEventListener("mouseup", onMouseUp);
    };

    const touchStartXRef = useRef(0);

    const handleSidebarTouchStart = (e) => {
        touchStartXRef.current = e.touches ? e.touches[0].clientX : 0;
    };

    const handleSidebarTouchEnd = (e) => {
        if (!e.changedTouches) return;
        const endX = e.changedTouches[0].clientX;
        if (touchStartXRef.current - endX > 50) {
            // Swiped left -> Close mobile drawer
            setIsMobileOpen(false);
        }
    };

    return (
        <>
            {/* Sidebar Container */}
            <aside
                style={{ width: isMobileOpen ? 256 : (collapsed ? 80 : (width || 256)) }}
                onTouchStart={handleSidebarTouchStart}
                onTouchEnd={handleSidebarTouchEnd}
                className={`
          fixed top-0 left-0 z-40 h-screen bg-gray-900 border-r border-gray-800 transition-[width,transform] duration-200 ease-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                {/* Drag Handle */}
                <div
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-red-500/50 transition-colors z-50"
                    onMouseDown={startResizing}
                    title="Drag to resize sidebar"
                />

                <div className="flex flex-col h-full p-4 relative overflow-hidden">
                    {/* Logo */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onTabChange('home');
                        }}
                        className={`flex items-center gap-2 ${collapsed ? 'justify-center px-0' : 'px-4'} py-6 w-full text-left hover:opacity-80 transition-opacity cursor-pointer`}
                        type="button"
                    >
                        <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md shadow-red-900/30">
                            <span className="text-white font-black text-lg">M</span>
                        </div>
                        {!collapsed && (
                            <h1 className="text-xl font-black text-white whitespace-nowrap overflow-hidden tracking-tight">
                                MUGEN<span className="text-red-600">PLAY</span>
                            </h1>
                        )}
                    </button>

                    {/* Direct Play */}
                    <div className={`px-2 mb-6 ${collapsed ? 'hidden' : 'block'}`}>
                        <button
                            onClick={onOpenDirectPlay}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white rounded-xl transition-all border border-gray-700/50 hover:border-gray-600 group cursor-pointer shadow-sm"
                        >
                            <Link className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-semibold">Direct Stream</span>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onTabChange(item.id);
                                        setIsMobileOpen(false);
                                    }}
                                    title={collapsed ? item.label : ''}
                                    className={`
                    w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group cursor-pointer
                    ${isActive
                                            ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-900/30'
                                            : 'text-gray-300 hover:bg-gray-800 hover:text-white font-medium'
                                        }
                  `}
                                >
                                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                    {!collapsed && <span className="font-semibold text-sm truncate">{item.label}</span>}
                                    {isActive && !collapsed && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* User Profile / Bottom */}
                    <div className="mt-auto pt-6 border-t border-gray-800 overflow-hidden">
                        {user ? (
                            <div className="space-y-3">
                                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-4'}`}>
                                    <img
                                        src={user.avatar?.large}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full border border-gray-700 flex-shrink-0"
                                    />
                                    {!collapsed && (
                                        <span className="text-sm font-medium text-white truncate max-w-[120px]">
                                            {user.name}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onLogout();
                                    }}
                                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl text-gray-400 hover:bg-red-900/20 hover:text-red-500 transition-colors cursor-pointer`}
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5 flex-shrink-0" />
                                    {!collapsed && <span className="font-medium">Logout</span>}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onLogin();
                                }}
                                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl text-white bg-[#02A9FF] hover:bg-[#02A9FF]/80 transition-colors font-semibold shadow-lg shadow-[#02A9FF]/20 cursor-pointer`}
                                title="Login with AniList"
                            >
                                <LogIn className="w-5 h-5 flex-shrink-0" />
                                {!collapsed && <span className="font-medium">Login</span>}
                            </button>
                        )}
                    </div>
                    {!collapsed && (
                        <div className="mt-4 px-4 text-center">
                            <a href="https://github.com/Kapy2003/" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-gray-400 transition-colors block">Created by Kapy</a>
                        </div>
                    )}
                </div>
            </aside>

            {/* Overlay for mobile drawer */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Mobile Bottom Navigation Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 flex items-center justify-around py-2 px-3 shadow-2xl safe-area-bottom">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                onTabChange(item.id);
                                setIsMobileOpen(false);
                            }}
                            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                                isActive
                                    ? 'text-red-500 font-bold scale-105'
                                    : 'text-gray-400 hover:text-white font-medium'
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-red-500 stroke-[2.5]' : 'text-gray-400'}`} />
                            <span className="text-[10px] tracking-tight">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </>
    );
};

export default Sidebar;
