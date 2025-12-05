import { useState, useEffect } from 'react';
import { X, Globe, Lock, Key, Check, Save } from 'lucide-react';

const AddSourceModal = ({ isOpen, onClose, onAdd, onEdit, initialData = null }) => {
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        username: '',
        password: ''
    });

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                name: initialData.name || '',
                url: initialData.url || '',
                username: initialData.username || '',
                password: initialData.password || ''
            });
        } else if (isOpen) {
            setFormData({
                name: '',
                url: '',
                username: '',
                password: ''
            });
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (initialData && onEdit) {
            onEdit({
                ...initialData,
                ...formData
            });
        } else {
            onAdd({
                ...formData,
                id: Date.now().toString(),
                type: 'custom', // Default to 'custom' for URL-added sources
                enabled: true,
                status: 'installed',
                version: '1.0.0',
            });
        }
        onClose();
    };

    if (!isOpen) return null;

    const isEdit = !!initialData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{isEdit ? 'Edit Source' : 'Add Custom Source'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Source Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                            placeholder="e.g., My Anime Server"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Source URL</label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="url"
                                required
                                className="w-full bg-black/40 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                                placeholder="https://..."
                                value={formData.url}
                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Username (Optional)</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Password (Optional)</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="password"
                                    className="w-full bg-black/40 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isEdit ? <Save className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                            {isEdit ? 'Save Changes' : 'Add Source'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddSourceModal;
