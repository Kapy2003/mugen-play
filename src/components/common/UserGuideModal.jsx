import { useState } from 'react';
import { BookOpen, Film, Search, Play, ShieldAlert, AlertTriangle, X, ChevronRight, CheckCircle2, Layout } from 'lucide-react';

const UserGuideModal = ({ isOpen, onClose }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem('mugen_has_seen_guide', 'true');
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none">
            <div className="user-guide-modal-container bg-gray-900 border border-red-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="user-guide-header p-5 sm:p-6 bg-gradient-to-r from-red-950/60 via-gray-900 to-gray-900 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 sm:p-3 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/30 shadow-inner">
                            <BookOpen size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="user-guide-title text-base sm:text-lg font-black tracking-wide text-white">
                                    Welcome to MugenPlay
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider">
                                    v0.1.0-alpha
                                </span>
                            </div>
                            <p className="user-guide-subtitle text-xs text-gray-400 mt-0.5">Quick User Guide &amp; Getting Started Instructions</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="user-guide-close-btn p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                        title="Close Guide"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="user-guide-body p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 text-gray-300 text-xs sm:text-sm">
                    {/* Important Alpha & Early Build Notice */}
                    <div className="user-guide-alpha-box p-4 rounded-2xl bg-amber-950/25 border border-amber-500/30 flex items-start gap-3.5 shadow-sm">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="user-guide-alpha-title font-bold text-amber-300 text-xs sm:text-sm">
                                Early Alpha Preview Build
                            </h4>
                            <p className="user-guide-alpha-desc text-[11px] sm:text-xs text-amber-200/80 leading-relaxed">
                                Mugen Play is actively in development. Third-party streaming sources or custom extensions you install may experience downtime or fail depending on external server availability and naming variations.
                            </p>
                        </div>
                    </div>

                    {/* How It Works Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Stream Sources */}
                        <div className="user-guide-card p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 hover:border-white/10 transition-colors">
                            <div className="user-guide-card-title flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                                <div className="p-1.5 rounded-lg bg-red-600/20 text-red-500 border border-red-500/20">
                                    <Film size={14} />
                                </div>
                                Stream Sources &amp; Extensions
                            </div>
                            <p className="user-guide-card-desc text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                                Enable streaming providers like HiAnime or configure your own custom video endpoints in the <strong className="font-semibold text-white user-guide-strong">Extensions</strong> tab.
                            </p>
                        </div>

                        {/* AniList Discovery */}
                        <div className="user-guide-card p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 hover:border-white/10 transition-colors">
                            <div className="user-guide-card-title flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                                <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-500 border border-blue-500/20">
                                    <Search size={14} />
                                </div>
                                Browse &amp; Search Anime
                            </div>
                            <p className="user-guide-card-desc text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                                Explore trending seasonal charts, top-rated classics, and use instant search and genre filters powered by the AniList engine.
                            </p>
                        </div>

                        {/* Floating Miniplayer */}
                        <div className="user-guide-card p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 hover:border-white/10 transition-colors">
                            <div className="user-guide-card-title flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                                <div className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-500 border border-emerald-500/20">
                                    <Play size={14} />
                                </div>
                                Floating Miniplayer
                            </div>
                            <p className="user-guide-card-desc text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                                Minimize any playing video into a movable floating miniplayer so you can keep listening and watching while browsing the catalog.
                            </p>
                        </div>

                        {/* Easy Navigation & Layout */}
                        <div className="user-guide-card p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 hover:border-white/10 transition-colors">
                            <div className="user-guide-card-title flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                                <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-500 border border-purple-500/20">
                                    <Layout size={14} />
                                </div>
                                Layout &amp; Quick Controls
                            </div>
                            <p className="user-guide-card-desc text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                                Use keyboard arrow keys or mouse drag to slide the carousel, access the side episode playlist on desktop, or toggle Light &amp; Dark themes.
                            </p>
                        </div>
                    </div>

                    {/* Legal & Anti-Piracy Compliance Statement */}
                    <div className="user-guide-legal-box p-4 rounded-2xl bg-red-950/20 border border-red-500/25 flex items-start gap-3.5 shadow-sm">
                        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="user-guide-legal-title font-bold text-red-300 text-xs sm:text-sm">
                                Legal &amp; Anti-Piracy Compliance
                            </h4>
                            <p className="user-guide-legal-desc text-[11px] sm:text-xs text-red-200/80 leading-relaxed">
                                Mugen Play does not host, upload, store, or condone illegal distribution or piracy of copyrighted material. Mugen Play is an open-source client and metadata indexer that interfaces with public APIs and user-provided source resolvers.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="user-guide-footer p-4 sm:p-5 bg-[#050505] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <label className="user-guide-checkbox-label flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="rounded border-gray-700 bg-gray-800 text-red-600 focus:ring-red-500 cursor-pointer w-4 h-4 accent-red-600"
                        />
                        <span>Don&apos;t show this guide on startup</span>
                    </label>

                    <button
                        onClick={handleClose}
                        className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 cursor-pointer active-press"
                    >
                        <CheckCircle2 size={16} />
                        <span>Got it, Start Streaming</span>
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserGuideModal;
