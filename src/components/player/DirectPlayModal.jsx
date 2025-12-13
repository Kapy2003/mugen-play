import { useState } from 'react';
import { X, Play, Link } from 'lucide-react';

const DirectPlayModal = ({ isOpen, onClose, onPlay }) => {
    const [url, setUrl] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (url.trim()) {
            onPlay(url.trim());
            setUrl(''); // Reset
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Link className="w-5 h-5 text-red-500" />
                        Direct Stream
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Stream or Portal URL</label>
                        <input
                            type="url"
                            required
                            autoFocus
                            className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                            placeholder="https://..."
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">
                            Paste a link to a video page or stream. Mugen Play will attempt to embed it.
                        </p>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Play className="w-5 h-5" />
                            Play Now
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DirectPlayModal;
