import { useState, useMemo } from 'react';
import { X, Search, Globe, Download, Check, Sparkles, Activity, Loader2, UserPlus, Star, Trash2, Plus } from 'lucide-react';
import { ExtensionRepoManager } from '../../lib/ExtensionRepoManager';
import { ExtensionHealthChecker } from '../../lib/ExtensionHealthChecker';

const ExtensionStoreModal = ({ isOpen, onClose, onInstall, onOpenAddSource, installedIds = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLang, setSelectedLang] = useState('all');
    const [showNsfw, setShowNsfw] = useState(false);
    const [pingStatus, setPingStatus] = useState({}); // { [sourceId]: 'testing' | 'online' | 'offline' }
    const [version, setVersion] = useState(0);

    // Fetch combined sources dynamically (Built-in + User Appended)
    const allRepoSources = useMemo(() => {
        return ExtensionRepoManager.getAllSources();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version, isOpen]);

    // Extract unique languages
    const languages = useMemo(() => {
        const langs = new Set(allRepoSources.map(s => s.lang));
        return ['all', ...Array.from(langs).sort()];
    }, [allRepoSources]);

    // Filter sources
    const filteredSources = useMemo(() => {
        return allRepoSources.filter(source => {
            const matchesQuery = source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                source.baseUrl.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesLang = selectedLang === 'all' || source.lang === selectedLang;
            const matchesNsfw = showNsfw ? true : !source.nsfw;
            return matchesQuery && matchesLang && matchesNsfw;
        });
    }, [allRepoSources, searchQuery, selectedLang, showNsfw]);

    const handleTestPing = async (source) => {
        setPingStatus(prev => ({ ...prev, [source.id]: 'testing' }));
        const isHealthy = await ExtensionHealthChecker.checkSingle(source.baseUrl);
        setPingStatus(prev => ({ ...prev, [source.id]: isHealthy ? 'online' : 'offline' }));
    };

    const handleDeleteFromStore = (source) => {
        const confirmDelete = window.confirm(`Do you want to permanently remove "${source.name}" from your Extension Store?`);
        if (confirmDelete) {
            ExtensionRepoManager.removeCustomSource(source.id);
            setVersion(v => v + 1);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950/60">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20 shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                Extension Store
                            </h2>
                            <p className="text-xs text-gray-400">Discover, install, and manage community stream engines</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onOpenAddSource && (
                            <button
                                onClick={() => {
                                    onClose();
                                    onOpenAddSource();
                                }}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-red-600/20"
                                title="Add Custom Extension to Store"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Add Custom to Store</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-3 sm:p-4 border-b border-gray-800 bg-gray-900/30 flex flex-wrap gap-3 items-center justify-between">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search sources by name or URL..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <select
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value)}
                            className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-red-500 uppercase font-semibold"
                        >
                            {languages.map(lang => (
                                <option key={lang} value={lang}>
                                    {lang === 'all' ? 'All Langs' : lang.toUpperCase()}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => setShowNsfw(!showNsfw)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${showNsfw
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                                }`}
                        >
                            18+ NSFW
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSources.map((source) => {
                            const isInstalled = installedIds.includes(source.id);
                            const status = pingStatus[source.id];

                            return (
                                <div
                                    key={source.id}
                                    className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xl flex flex-col justify-between ${
                                        source.recommended
                                            ? 'border-red-500/40 bg-gradient-to-b from-gray-900 via-gray-900 to-red-950/25 hover:border-red-500/70'
                                            : 'border-gray-800 bg-gray-900/60 hover:bg-gray-800/80 hover:border-gray-700'
                                    }`}
                                >
                                    <div>
                                        {/* Recommended Top Badge */}
                                        {source.recommended && (
                                            <div className="mb-3.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-red-700 to-pink-700 text-white flex items-center justify-between text-xs font-bold shadow-md shadow-red-600/30">
                                                <span className="flex items-center gap-1.5">
                                                    <Star className="w-3.5 h-3.5 fill-current" />
                                                    RECOMMENDED
                                                </span>
                                                <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full font-black">
                                                    Official Pick
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center border font-black text-sm uppercase shadow-sm"
                                                    style={{
                                                        backgroundColor: source.color ? `${source.color}25` : '#1f2937',
                                                        borderColor: source.color ? `${source.color}70` : '#374151',
                                                        color: source.color || '#ff5c5c'
                                                    }}
                                                >
                                                    {source.lang}
                                                </div>
                                                {source.isUserAdded && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold flex items-center gap-1">
                                                        <UserPlus className="w-3 h-3" /> Custom
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {/* Live Ping/Check Button */}
                                                <button
                                                    onClick={() => handleTestPing(source)}
                                                    disabled={status === 'testing'}
                                                    className={`px-2.5 py-1 rounded-lg text-xs border transition-colors flex items-center gap-1.5 font-medium ${status === 'online'
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                                        : status === 'offline'
                                                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                                            : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border-gray-700'
                                                        }`}
                                                    title="Check connection"
                                                >
                                                    {status === 'testing' ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Activity className="w-3 h-3" />
                                                    )}
                                                    {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Check'}
                                                </button>

                                                {source.nsfw && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 font-bold">
                                                        18+
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-white mb-1 truncate flex items-center gap-2" title={source.name}>
                                            {source.name}
                                            {source.color && (
                                                <span
                                                    className="w-2 h-2 rounded-full inline-block shrink-0"
                                                    style={{ backgroundColor: source.color }}
                                                />
                                            )}
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                                            <Globe className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{source.baseUrl.replace(/^https?:\/\//, '')}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                if (!isInstalled) {
                                                    onInstall({
                                                        id: source.id,
                                                        name: source.name,
                                                        url: source.baseUrl,
                                                        baseUrl: source.baseUrl,
                                                        endpoints: {
                                                            search: `${source.baseUrl}?search={query}`,
                                                            trending: `${source.baseUrl}`,
                                                            stream: `${source.baseUrl}`
                                                        },
                                                        type: 'custom',
                                                        version: '1.0.0',
                                                        icon: 'globe',
                                                        enabled: true,
                                                        status: 'installed',
                                                        color: source.color,
                                                        lang: source.lang,
                                                        nsfw: source.nsfw
                                                    });
                                                }
                                            }}
                                            disabled={isInstalled}
                                            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all ${isInstalled
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/30 cursor-default'
                                                : 'bg-white text-black hover:bg-gray-200 active:scale-95 cursor-pointer shadow-md'
                                                }`}
                                        >
                                            {isInstalled ? (
                                                <>
                                                    <Check className="w-4 h-4" />
                                                    Installed
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4" />
                                                    Install Source
                                                </>
                                            )}
                                        </button>

                                        {/* Permanently delete from Store for Custom Sources */}
                                        {source.isUserAdded && (
                                            <button
                                                onClick={() => handleDeleteFromStore(source)}
                                                className="p-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl transition-colors cursor-pointer"
                                                title="Permanently remove from Extension Store"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredSources.length === 0 && (
                        <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-4">
                            <Search className="w-12 h-12 opacity-20" />
                            <p>No extensions found matching your filters.</p>
                        </div>
                    )}
                </div>

                <div className="p-3.5 border-t border-gray-800 bg-gray-950/60 text-[11px] text-gray-400 text-center">
                    Community streaming engines • Mugen Play does not host or store any video files.
                </div>
            </div>
        </div>
    );
};

export default ExtensionStoreModal;
