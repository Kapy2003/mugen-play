import { ShieldAlert, CheckCircle2, ArrowLeft } from 'lucide-react';

const LegalDisclaimerModal = ({ isOpen, onAccept, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="legal-modal-card bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
                {/* Header Banner */}
                <div className="legal-modal-header bg-gradient-to-r from-red-950/80 via-gray-900 to-gray-900 p-6 border-b border-white/10 flex items-start gap-4">
                    <div className="p-3 bg-red-600/20 text-red-500 rounded-xl border border-red-500/30 shrink-0">
                        <ShieldAlert size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-wide">Important Notice & Disclaimer</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Please review the platform terms before accessing extensions</p>
                    </div>
                </div>

                {/* Content Body */}
                <div className="legal-modal-body p-6 space-y-4 text-sm text-gray-300 leading-relaxed max-h-[60vh] overflow-y-auto no-scrollbar">
                    <div className="legal-modal-notice p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-center gap-2">
                        <span className="font-bold shrink-0">⚠️ 100% User-Driven:</span>
                        <span>Mugen Play is strictly an open-source client aggregator.</span>
                    </div>

                    <div className="space-y-3 text-xs text-gray-300">
                        <div className="flex items-start gap-2.5">
                            <span className="text-red-500 font-bold shrink-0">1.</span>
                            <p><strong className="text-white font-bold">Zero Server Hosting:</strong> This application does not host, upload, scrape, store, archive, or transmit any video files, media, or copyrighted content on any servers.</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <span className="text-red-500 font-bold shrink-0">2.</span>
                            <p><strong className="text-white font-bold">Client-Side Resolution:</strong> All metadata, video streams, and media playback are resolved purely client-side inside your own browser via user-configured community extensions and public repository links.</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <span className="text-red-500 font-bold shrink-0">3.</span>
                            <p><strong className="text-white font-bold">User Responsibility:</strong> Users are solely responsible for the repository URLs, third-party extensions, and media streams they install and access.</p>
                        </div>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="legal-modal-footer p-5 bg-gray-950/60 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                        onClick={onCancel}
                        className="legal-modal-btn-cancel w-full sm:w-auto px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/5"
                    >
                        <ArrowLeft size={14} /> Back to Home
                    </button>
                    <button
                        onClick={onAccept}
                        className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
                    >
                        <CheckCircle2 size={15} /> I Understand & Accept Terms
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LegalDisclaimerModal;
