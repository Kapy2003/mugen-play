import React, { useState, useMemo } from 'react';
import { X, Search, Globe, Download, Check, AlertTriangle } from 'lucide-react';
import { ANIYOMI_SOURCES } from '../../data/extension_repo';

const ExtensionStoreModal = ({ isOpen, onClose, onInstall, installedIds = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLang, setSelectedLang] = useState('all');
    const [showNsfw, setShowNsfw] = useState(false);

    // Extract unique languages
    const languages = useMemo(() => {
        const langs = new Set(ANIYOMI_SOURCES.map(s => s.lang));
        return ['all', ...Array.from(langs).sort()];
    }, []);

    // Filter sources
    const filteredSources = useMemo(() => {
        return ANIYOMI_SOURCES.filter(source => {
            const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesLang = selectedLang === 'all' || source.lang === selectedLang;
            const matchesNsfw = showNsfw ? true : !source.nsfw;

            return matchesSearch && matchesLang && matchesNsfw;
        });
    }, [searchQuery, selectedLang, showNsfw]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-4xl bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900 z-10">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            Extension Store
                            <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20">Beta</span>
                        </h3>
                        <p className="text-sm text-gray-400">Discover and install community sources</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search sources..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                        />
                    </div>
                    <div className="flex gap-4">
                        <select
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value)}
                            className="bg-black/40 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors appearance-none cursor-pointer min-w-[120px]"
                        >
                            {languages.map(lang => (
                                <option key={lang} value={lang}>
                                    {lang === 'all' ? 'All Languages' : lang.toUpperCase()}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => setShowNsfw(!showNsfw)}
                            className={`px-4 py-2.5 rounded-xl border transition-colors flex items-center gap-2 font-medium ${showNsfw
                                    ? 'bg-red-500/10 border-red-500/50 text-red-500'
                                    : 'bg-black/40 border-gray-700 text-gray-400 hover:text-white'
                                }`}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            NSFW
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSources.map((source) => {
                            const isInstalled = installedIds.includes(source.id);
                            return (
                                <div
                                    key={source.id}
                                    className="p-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 transition-all hover:border-gray-700 group"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-700 font-bold text-gray-500">
                                            {source.lang.toUpperCase().slice(0, 2)}
                                        </div>
                                        {source.nsfw && (
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 font-bold">
                                                18+
                                            </span>
                                        )}
                                    </div>

                                    <h4 className="font-bold text-white mb-1 truncate" title={source.name}>{source.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                        <Globe className="w-3 h-3" />
                                        <span className="truncate">{source.baseUrl.replace(/^https?:\/\//, '')}</span>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (!isInstalled) {
                                                onInstall({
                                                    id: source.id,
                                                    name: source.name,
                                                    url: source.baseUrl,
                                                    type: 'custom',
                                                    version: '1.0.0',
                                                    icon: 'globe',
                                                    enabled: true,
                                                    status: 'installed'
                                                });
                                            }
                                        }}
                                        disabled={isInstalled}
                                        className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${isInstalled
                                                ? 'bg-green-500/10 text-green-500 cursor-default'
                                                : 'bg-white text-black hover:bg-gray-200'
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
                                                Install
                                            </>
                                        )}
                                    </button>
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

                <div className="p-4 border-t border-gray-800 bg-gray-900 text-xs text-gray-500 text-center">
                    These extensions are community-provided portals. Mugen Play is not affiliated with these services.
                </div>
            </div>
        </div>
    );
};

export default ExtensionStoreModal;
