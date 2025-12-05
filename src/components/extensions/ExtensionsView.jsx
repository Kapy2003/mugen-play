import { useState } from 'react';
import { Plus, Trash2, Settings as Cog, Puzzle, RotateCcw, Power, ShoppingBag } from 'lucide-react';
import ExtensionStoreModal from './ExtensionStoreModal';

const ExtensionsView = ({ extensions, onToggle, onAddSource, onInstallExtension, onRemove, onReset }) => {
    const [isStoreOpen, setIsStoreOpen] = useState(false);

    return (
        <div className="p-4 sm:p-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Extensions & Sources</h2>
                    <p className="text-gray-400">Manage your anime providers and custom sources</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors whitespace-nowrap"
                        title="Restore Default Extensions"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsStoreOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#02A9FF] hover:bg-[#02A9FF]/80 text-white rounded-xl font-medium transition-colors whitespace-nowrap shadow-lg shadow-[#02A9FF]/20"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        Browse Store
                    </button>
                    <button
                        onClick={onAddSource}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        Add Source
                    </button>
                </div>
            </div>

            <ExtensionStoreModal
                isOpen={isStoreOpen}
                onClose={() => setIsStoreOpen(false)}
                onInstall={(source) => {
                    onInstallExtension(source);
                    // Don't close store immediately, user might want to install more
                }}
                installedIds={extensions.map(e => e.id)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {extensions.map((ext) => (
                    <div
                        key={ext.id}
                        className={`
              p-6 rounded-2xl border transition-all duration-300
              ${ext.enabled
                                ? 'bg-gray-900 border-gray-700 shadow-lg shadow-black/50'
                                : 'bg-gray-900/50 border-gray-800 opacity-75 grayscale'
                            }
            `}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center border border-gray-700">
                                <Puzzle className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-gray-500 hover:text-white transition-colors">
                                    <Cog className="w-4 h-4" />
                                </button>
                                {(() => {
                                    // Logic: Allow disable only if there is another provider of the same critical type ('source' for DBs)
                                    // If it's a 'source' (DB), we need at least 2 sources total to allow disabling one.
                                    // If it's a 'custom' (Portal), we can usually disable it freely, unless we enforce 1 portal rule (not requested).
                                    const sourceCount = extensions.filter(e => e.type === 'source').length;
                                    const isLocked = ext.type === 'source' && sourceCount <= 1;

                                    if (isLocked) return null;

                                    return (
                                        <button
                                            className={`p-2 rounded-lg transition-colors ${ext.enabled
                                                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                                : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                                                }`}
                                            onClick={() => onToggle(ext.id)}
                                            title={ext.enabled ? "Disable Extension" : "Enable Extension"}
                                        >
                                            <Power className="w-4 h-4" />
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">{ext.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700">v{ext.version || '1.0.0'}</span>
                                <span className="uppercase">{ext.status}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-gray-800">
                                <div className={`w-2 h-2 rounded-full ${ext.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                                <span className={`text-sm ${ext.enabled ? 'text-green-500' : 'text-gray-500'}`}>
                                    {ext.enabled ? 'Ready' : 'Disabled'}
                                </span>
                                {ext.id !== 'anilist_source' && (
                                    <button
                                        onClick={() => onRemove(ext.id)}
                                        className="ml-auto text-red-500 hover:text-red-400 text-sm flex items-center gap-1 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExtensionsView;
