import { Home, Compass, Heart, Film, Settings, LogOut, LogIn, Search, Menu, X, Link } from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange, isMobileOpen, setIsMobileOpen, searchQuery, onSearch, user, onLogin, onLogout, onOpenDirectPlay, width, setWidth, collapsed, setCollapsed }) => {
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

        const startWidth = width;
        const startX = mouseDownEvent.clientX;

        const onMouseMove = (mouseMoveEvent) => {
            const newWidth = startWidth + mouseMoveEvent.clientX - startX;
            if (newWidth > 60 && newWidth < 600) { // Min/Max constraints
                setWidth(newWidth);
                if (newWidth < 160 && !collapsed) setCollapsed(true);
                if (newWidth > 160 && collapsed) setCollapsed(false);
            }
        };

        const onMouseUp = () => {
            document.body.removeEventListener("mousemove", onMouseMove);
            document.body.removeEventListener("mouseup", onMouseUp);
        };

        document.body.addEventListener("mousemove", onMouseMove);
        document.body.addEventListener("mouseup", onMouseUp);
    };

    return (
        <>
            {/* Mobile Toggle */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 rounded-lg text-white border border-gray-800"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Sidebar Container */}
            <aside
                style={{ width: isMobileOpen ? 256 : (collapsed ? 80 : width) }}
                className={`
          fixed top-0 left-0 z-40 h-screen bg-gray-900 border-r border-gray-800 transition-all duration-75 ease-linear
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                {/* Drag Handle */}
                <div
                    className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-red-500/50 transition-colors z-50"
                    onMouseDown={startResizing}
                />

                <div className="flex flex-col h-full p-4 relative overflow-hidden">
                    {/* Toggle Collapse Button (Desktop Only) */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={`hidden lg:flex absolute top-4 z-10 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all ${collapsed ? 'left-1/2 -translate-x-1/2' : 'right-4'}`}
                        title={collapsed ? "Expand" : "Collapse"}
                    >
                        <Menu size={24} />
                    </button>

                    {/* Logo */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onTabChange('home');
                        }}
                        className={`flex items-center gap-2 ${collapsed ? 'justify-center px-0 mt-14' : 'px-4'} py-8 w-full text-left hover:opacity-80 transition-opacity`}
                        type="button"
                    >
                        <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">M</span>
                        </div>
                        {!collapsed && (
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 whitespace-nowrap overflow-hidden">
                                Mugen Play
                            </h1>
                        )}
                    </button>

                    {/* Direct Play */}
                    <div className={`px-2 mb-6 ${collapsed ? 'hidden' : 'block'}`}>
                        <button
                            onClick={onOpenDirectPlay}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-gray-700 group"
                        >
                            <Link className="w-4 h-4 text-gray-500 group-hover:text-red-500 transition-colors" />
                            <span className="text-sm font-medium">Stream</span>
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
                    w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group
                    ${isActive
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                        }
                  `}
                                >
                                    <Icon className={`w-5 h-5 flex-shrink-0`} />
                                    {!collapsed && <span className="font-medium truncate">{item.label}</span>}
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
                                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl text-gray-400 hover:bg-red-900/20 hover:text-red-500 transition-colors`}
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
                                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl text-white bg-[#02A9FF] hover:bg-[#02A9FF]/80 transition-colors font-semibold shadow-lg shadow-[#02A9FF]/20`}
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

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
};

export default Sidebar;
