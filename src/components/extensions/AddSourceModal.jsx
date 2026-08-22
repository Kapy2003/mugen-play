import { useState, useEffect } from 'react';
import { X, Globe, Lock, Key, Check, Save, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { ExtensionLoader } from '../../lib/ExtensionLoader';
import { ExtensionRepoManager } from '../../lib/ExtensionRepoManager';

const AddSourceModal = ({ isOpen, onClose, onAdd, onEdit, initialData = null }) => {
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        username: '',
        password: ''
    });

    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionStatus, setDetectionStatus] = useState(null); // { type: 'success'|'error', message: string }
    const [detectedManifest, setDetectedManifest] = useState(null);
    const [savePermanently, setSavePermanently] = useState(true);

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                name: initialData.name || '',
                url: initialData.url || '',
                username: initialData.username || '',
                password: initialData.password || ''
            });
            setDetectionStatus(null);
            setDetectedManifest(null);
            setSavePermanently(true);
        } else if (isOpen) {
            setFormData({
                name: '',
                url: '',
                username: '',
                password: ''
            });
            setDetectionStatus(null);
            setDetectedManifest(null);
            setSavePermanently(true);
        }
    }, [isOpen, initialData]);

    const handleAutoDetect = async () => {
        if (!formData.url) {
            setDetectionStatus({ type: 'error', message: 'Please enter a URL first.' });
            return;
        }

        setIsDetecting(true);
        setDetectionStatus(null);

        try {
            const { manifest } = await ExtensionLoader.loadFromUrl(formData.url, formData.name);
            setDetectedManifest(manifest);
            if (!formData.name && manifest.name) {
                setFormData(prev => ({ ...prev, name: manifest.name }));
            }
            setDetectionStatus({
                type: 'success',
                message: `Successfully detected "${manifest.name}" extension configuration!`
            });
        } catch (err) {
            setDetectionStatus({
                type: 'error',
                message: err.message || 'Could not auto-detect extension at this URL.'
            });
        } finally {
            setIsDetecting(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const basePayload = detectedManifest || {
            id: Date.now().toString(),
            name: formData.name || ExtensionLoader.extractDomainName(formData.url),
            url: formData.url,
            baseUrl: formData.url,
            username: formData.username,
            password: formData.password,
            type: 'custom',
            enabled: true,
            status: 'installed',
            version: '1.0.0'
        };

        const finalExtensionData = {
            ...basePayload,
            name: formData.name || basePayload.name,
            url: formData.url,
            baseUrl: formData.url,
            username: formData.username,
            password: formData.password
        };

        // If user opted to keep permanently in Extension Store
        if (savePermanently) {
            ExtensionRepoManager.appendIfMissing(finalExtensionData);
        }

        if (initialData && onEdit) {
            onEdit({
                ...initialData,
                ...finalExtensionData
            });
        } else {
            onAdd(finalExtensionData);
        }
        onClose();
    };

    if (!isOpen) return null;

    const isEdit = !!initialData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-red-500" />
                        <h3 className="text-xl font-bold text-white">
                            {isEdit ? 'Edit Source Extension' : 'Add Extension URL'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Extension URL / Endpoint</label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="url"
                                required
                                className="w-full bg-black/40 border border-gray-700 rounded-xl pl-10 pr-24 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                                placeholder="https://..."
                                value={formData.url}
                                onChange={e => {
                                    setFormData({ ...formData, url: e.target.value });
                                    setDetectionStatus(null);
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAutoDetect}
                                disabled={isDetecting || !formData.url}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                                {isDetecting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3.5 h-3.5" />
                                )}
                                Detect
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Extension Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                            placeholder="e.g., Remote Anime Stream"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {detectionStatus && (
                        <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${detectionStatus.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                            {detectionStatus.type === 'success' ? (
                                <Check className="w-4 h-4 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span>{detectionStatus.message}</span>
                        </div>
                    )}

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

                    {/* Save to Extension Store Option */}
                    <div className="p-3.5 bg-black/40 rounded-xl border border-gray-700/80 space-y-1">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={savePermanently}
                                onChange={(e) => setSavePermanently(e.target.checked)}
                                className="w-4 h-4 mt-0.5 rounded text-red-600 focus:ring-red-500 bg-gray-900 border-gray-600 accent-red-600 cursor-pointer shrink-0"
                            />
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-white block">Keep permanently in Extension Store?</span>
                                <p className="text-[11px] text-gray-400">
                                    Save this provider in your Extension Store repository so you can reinstall or share it anytime.
                                </p>
                            </div>
                        </label>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/30"
                        >
                            {isEdit ? <Save className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                            {isEdit ? 'Save Changes' : 'Install Extension'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddSourceModal;
