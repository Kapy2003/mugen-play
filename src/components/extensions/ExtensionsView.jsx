import { useState, useMemo, memo } from 'react';
import { Power, Trash2, Cog, ShoppingBag, RotateCcw, AlertCircle, Activity, Loader2, Plus, Sparkles, Film } from 'lucide-react';
import ExtensionStoreModal from './ExtensionStoreModal';
import { ExtensionHealthChecker } from '../../lib/ExtensionHealthChecker';

const ExtensionsView = memo(({
    extensions,
    onToggle,
    onAddSource,
    onInstallExtension,
    onEditExtension,
    onRemove,
    onReset,
    onUpdateExtension
}) => {
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [checkingId, setCheckingId] = useState(null);
    const [isAuditing, setIsAuditing] = useState(false);

    // Sort extensions alphabetically while keeping Core metadata engine pinned at the top
    const sortedExtensions = useMemo(() => {
        return [...extensions].sort((a, b) => {
            const aIsCore = a.isCore || a.type === 'metadata' || a.id === 'anilist_source';
            const bIsCore = b.isCore || b.type === 'metadata' || b.id === 'anilist_source';
            if (aIsCore && !bIsCore) return -1;
            if (!aIsCore && bIsCore) return 1;
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        });
    }, [extensions]);

    const handleAuditAll = async () => {
        setIsAuditing(true);
        try {
            const updatedExtensions = await ExtensionHealthChecker.auditAll(extensions);
            if (onUpdateExtension) {
                updatedExtensions.forEach(ext => onUpdateExtension(ext));
            }
        } finally {
            setIsAuditing(false);
        }
    };

    const handleCheckSingle = async (ext) => {
        setCheckingId(ext.id);
        try {
            const health = await ExtensionHealthChecker.checkSingle(ext);
            const updated = {
                ...ext,
                ...health,
                status: health.isHealthy ? 'installed' : 'dead'
            };
            if (onUpdateExtension) {
                onUpdateExtension(updated);
            }
        } finally {
            setCheckingId(null);
        }
    };

    return (
        <div className="p-4 sm:p-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Extensions & Sources</h2>
                    <p className="text-gray-400">Manage your metadata engines, video streaming extensions, and custom sources</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Add Source / Extension Button */}
                    <button
                        onClick={onAddSource}
                        className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-all whitespace-nowrap shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Source</span>
                    </button>

                    {/* Browse Store Button */}
                    <button
                        onClick={() => setIsStoreOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-[#02A9FF] hover:bg-[#02A9FF]/80 text-white rounded-xl font-medium transition-colors whitespace-nowrap shadow-lg shadow-[#02A9FF]/20 active:scale-95 cursor-pointer"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        <span>Browse Store</span>
                    </button>

                    {/* Check Links Button */}
                    <button
                        onClick={handleAuditAll}
                        disabled={isAuditing}
                        className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl font-medium transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
                        title="Audit all extension links"
                    >
                        {isAuditing ? (
                            <Loader2 className="w-5 h-5 animate-spin text-[#02A9FF]" />
                        ) : (
                            <Activity className="w-5 h-5" />
                        )}
                        <span className="hidden sm:inline">{isAuditing ? 'Checking...' : 'Check Links'}</span>
                    </button>

                    {/* Restore Defaults */}
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer"
                        title="Restore Default Extensions"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Extension Store Modal */}
            <ExtensionStoreModal
                isOpen={isStoreOpen}
                onClose={() => setIsStoreOpen(false)}
                onOpenAddSource={onAddSource}
                onInstall={(source) => {
                    onInstallExtension(source);
                }}
                installedIds={extensions.map(e => e.id)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Installed Extensions Cards */}
                {sortedExtensions.map((ext) => {
                    const isDead = ext.status === 'dead';
                    const isMetadata = ext.type === 'metadata' || ext.id === 'anilist_source';
                    const isCardChecking = checkingId === ext.id || isAuditing;

                    return (
                        <div
                            key={ext.id}
                            className={`
                  p-6 rounded-2xl border transition-all duration-300 extension-card
                  ${isDead
                                    ? 'extension-card-dead bg-red-950/20 border-red-900/50 shadow-lg shadow-red-950/20'
                                    : isMetadata
                                        ? 'extension-card-metadata bg-gradient-to-br from-[#02A9FF]/10 to-gray-900 border-[#02A9FF]/30 shadow-lg shadow-black/50'
                                        : ext.enabled
                                            ? 'bg-gray-900 border-gray-700 shadow-lg shadow-black/50'
                                            : 'extension-card-disabled bg-gray-900/50 border-gray-800 opacity-75 grayscale'
                                }
                `}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isDead
                                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                    : isMetadata
                                        ? 'bg-[#02A9FF]/20 border-[#02A9FF]/40 text-[#02A9FF]'
                                        : 'bg-gray-800 border-gray-700 text-gray-400'
                                    }`}>
                                    {isMetadata ? <Sparkles className="w-6 h-6" /> : <Film className="w-6 h-6" />}
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isMetadata && (
                                        <>
                                            {/* Per-card Check Link Button */}
                                            <button
                                                onClick={() => handleCheckSingle(ext)}
                                                disabled={isCardChecking}
                                                className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-800 disabled:opacity-80 cursor-pointer"
                                                title="Check link status"
                                            >
                                                {isCardChecking ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-[#02A9FF]" />
                                                ) : (
                                                    <Activity className="w-4 h-4" />
                                                )}
                                            </button>
                                            <button
                                                className={`p-2 transition-colors ${ext.type === 'custom' ? 'text-gray-500 hover:text-white cursor-pointer' : 'text-gray-700 cursor-not-allowed invisible'}`}
                                                onClick={() => ext.type === 'custom' && onEditExtension && onEditExtension(ext)}
                                            >
                                                <Cog className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}

                                    {/* Enable / Disable Toggle */}
                                    <button
                                        className={`p-2 rounded-lg transition-colors cursor-pointer ${ext.enabled
                                            ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                            : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                                            }`}
                                        onClick={() => onToggle(ext.id)}
                                        title={ext.enabled ? "Disable Extension" : "Enable Extension"}
                                    >
                                        <Power className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-white truncate">{ext.name}</h3>
                                    {isMetadata ? (
                                        <span className="px-2 py-0.5 rounded bg-[#02A9FF]/20 border border-[#02A9FF]/40 text-[#02A9FF] text-[10px] font-bold uppercase tracking-wider">
                                            Metadata
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
                                            Video Stream
                                        </span>
                                    )}
                                    {isDead && (
                                        <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Dead
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                                    {ext.description || (isMetadata ? 'Supplies anime catalogs, search, posters, and HD banners.' : ext.baseUrl || 'Streaming video provider')}
                                </p>

                                <div className="flex items-center gap-2 pt-4 border-t border-gray-800">
                                    {isCardChecking ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#02A9FF]" />
                                            <span className="text-sm text-[#02A9FF] font-medium animate-pulse">
                                                Checking connection...
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <div className={`w-2 h-2 rounded-full ${isDead ? 'bg-red-500' : ext.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                                            <span className={`text-sm ${isDead ? 'text-red-400 font-medium' : ext.enabled ? 'text-green-500' : 'text-gray-500'}`}>
                                                {isDead ? 'Unreachable / Dead' : ext.enabled ? (isMetadata ? 'Active Engine' : 'Ready to Stream') : 'Disabled'}
                                            </span>
                                        </>
                                    )}
                                    {isMetadata || ext.id === 'anilist_source' ? (
                                        <span className="ml-auto text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full select-none">
                                            Core Engine
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => onRemove(ext.id)}
                                            className="ml-auto text-red-500 hover:text-red-400 text-xs sm:text-sm flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Add Source Card */}
                <button
                    onClick={onAddSource}
                    className="extension-add-card p-6 rounded-2xl border-2 border-dashed border-gray-800 hover:border-red-500/50 bg-gray-900/30 hover:bg-red-500/5 transition-all duration-300 flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-white min-h-[190px] group cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-xl bg-gray-800 group-hover:bg-red-600/20 group-hover:text-red-500 flex items-center justify-center transition-colors">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm">Add Custom Stream URL</span>
                    <span className="text-xs text-gray-600 group-hover:text-gray-400">Paste any anime website or API link</span>
                </button>
            </div>

            <div className="mt-12 mb-4 text-center">
                <p className="text-gray-500 text-sm">
                    AniList provides rich anime metadata & search, while installed extensions provide video streams.
                </p>
            </div>
        </div>
    );
});

ExtensionsView.displayName = 'ExtensionsView';

export default ExtensionsView;
