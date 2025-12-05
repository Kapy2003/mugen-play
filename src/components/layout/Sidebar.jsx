import { Home, Compass, Heart, Film, Settings, LogOut, LogIn, Search, Menu, X, Link } from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange, isMobileOpen, setIsMobileOpen, searchQuery, onSearch, user, onLogin, onLogout, onOpenDirectPlay }) => {
    const menuItems = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'browse', label: 'Browse', icon: Compass },
        { id: 'favorites', label: 'Favorites', icon: Heart },
        { id: 'extensions', label: 'Extensions', icon: Film },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

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
                className={`
          fixed top-0 left-0 z-40 h-screen w-64 bg-gray-900 border-r border-gray-800 transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="flex flex-col h-full p-4">
                    {/* Logo (Clickable Home) */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onTabChange('home');
                        }}
                        className="flex items-center gap-2 px-4 py-8 w-full text-left hover:opacity-80 transition-opacity"
                        type="button"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">M</span>
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Mugen Play
                        </h1>
                    </button>

                    {/* Search */}
                    <div className="px-2 mb-2">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search anime..."
                                value={searchQuery}
                                onChange={(e) => {
                                    onSearch(e.target.value);
                                    if (activeTab !== 'browse') onTabChange('browse');
                                }}
                                onFocus={() => {
                                    if (activeTab !== 'browse') onTabChange('browse');
                                }}
                                className="w-full bg-black/40 border border-gray-800 text-sm text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-gray-600"
                            />
                        </div>
                    </div>

                    {/* Direct Play */}
                    <div className="px-2 mb-6">
                        <button
                            onClick={onOpenDirectPlay}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-gray-700 group"
                        >
                            <Link className="w-4 h-4 text-gray-500 group-hover:text-red-500 transition-colors" />
                            <span className="text-sm font-medium">Direct Stream</span>
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
                                    className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                        }
                  `}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
                                    <span className="font-medium">{item.label}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* User Profile / Bottom */}
                    <div className="mt-auto pt-6 border-t border-gray-800">
                        {user ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 px-4">
                                    <img
                                        src={user.avatar?.large}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full border border-gray-700"
                                    />
                                    <span className="text-sm font-medium text-white truncate max-w-[120px]">
                                        {user.name}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onLogout();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-900/20 hover:text-red-500 transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="font-medium">Logout</span>
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onLogin();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white bg-[#02A9FF] hover:bg-[#02A9FF]/80 transition-colors font-semibold shadow-lg shadow-[#02A9FF]/20"
                            >
                                <LogIn className="w-5 h-5" />
                                <span className="font-medium">Login with AniList</span>
                            </button>
                        )}
                    </div>
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
