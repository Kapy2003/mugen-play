import { Moon, Sun, Lock, ChevronRight, Code, Sliders, Link, Copy, Trash2, RefreshCw, BookOpen } from 'lucide-react';

const SettingsView = ({
    contentFilter = 'ALL',
    cycleContentFilter,
    hasNsfwExtension = false,
    theme = 'dark',
    setTheme,
    showToast,
    isDevUnlocked = false,
    devMode = false,
    setDevMode,
    setShowDevCodeModal,
    handleLockDevMode,
    videoYOffset = -72,
    setVideoYOffset,
    miniVideoYOffset = -50,
    setMiniVideoYOffset,
    videoScale = 1,
    setVideoScale,
    miniVideoScale = 1,
    setMiniVideoScale,
    playingAnime = null,
    isClearingCache = false,
    handleClearCacheOnly,
    setShowDeleteConfirmModal,
    handleVersionClick,
    onOpenUserGuide
}) => {
    return (
        <div className="p-4 sm:p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
            <div className="space-y-6 max-w-2xl">
                {/* User Guide Card */}
                <div
                    onClick={onOpenUserGuide}
                    className="settings-guide-card p-5 rounded-2xl bg-gradient-to-r from-red-950/30 via-gray-900 to-gray-900 border border-red-500/30 flex items-center justify-between cursor-pointer hover:border-red-500/50 transition-all group shadow-lg active-press"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 group-hover:bg-red-600/30 transition-colors">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                                User Guide &amp; Instructions
                            </h3>
                            <p className="text-xs text-gray-400">View getting started guide, shortcuts, and legal notices</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors" />
                </div>

                {/* Content Filter */}
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <h3 className="text-lg font-medium text-white mb-4">Content</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-gray-200">Content Rating</span>
                            <span className="text-xs text-gray-500">Filter content safety</span>
                        </div>
                        <select
                            value={contentFilter}
                            onChange={(e) => cycleContentFilter(e.target.value)}
                            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-1 text-sm cursor-pointer"
                        >
                            <option value="ALL">All (Safe + NSFW)</option>
                            <option value="SAFE">Safe (No NSFW)</option>
                            {hasNsfwExtension && <option value="NSFW">NSFW Only</option>}
                        </select>
                    </div>
                </div>

                {/* Appearance */}
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <h3 className="text-lg font-medium text-white mb-4">Appearance</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-gray-200">Theme</span>
                            <span className="text-xs text-gray-500">Select app visual theme</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setTheme('dark');
                                    showToast("Dark Theme Active", "info");
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                    theme === 'dark'
                                        ? 'bg-gray-800 text-white border-gray-600 shadow-sm font-bold'
                                        : 'bg-black/20 text-gray-400 border-transparent hover:text-white'
                                }`}
                            >
                                <Moon className="w-3.5 h-3.5" /> Dark
                            </button>
                            <button
                                onClick={() => {
                                    setTheme('light');
                                    showToast("Light Theme Active", "info");
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                    theme === 'light'
                                        ? 'bg-white text-black border-white shadow-sm font-bold'
                                        : 'bg-black/20 text-gray-400 border-transparent hover:text-white'
                                }`}
                            >
                                <Sun className="w-3.5 h-3.5" /> Light
                            </button>
                        </div>
                    </div>
                </div>

                {/* Advanced & Developer Options */}
                {!isDevUnlocked ? (
                    <div
                        onClick={() => setShowDevCodeModal(true)}
                        className="dev-locked-card bg-gradient-to-r from-amber-950/20 via-gray-900 to-gray-900 p-5 rounded-xl border border-amber-500/20 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all group shadow-lg active-press"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 group-hover:text-amber-300 transition-colors">
                                <Lock className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
                                    Developer Options
                                </h3>
                                <p className="text-xs text-gray-400">Advanced stream diagnostics &amp; viewport tools</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors" />
                    </div>
                ) : (
                    <div className="settings-card dev-unlocked-card bg-gradient-to-br from-amber-950/30 via-gray-900 to-gray-900 p-6 rounded-xl border border-amber-500/30 space-y-6 animate-fade-in shadow-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                    <Code className="w-5 h-5 text-amber-500" />
                                    Advanced &amp; Developer Options
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold">UNLOCKED</span>
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">Stream link inspection, viewport cropping, and developer tools</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const next = !devMode;
                                        setDevMode(next);
                                        localStorage.setItem('mugen_dev_mode', String(next));
                                        showToast(`Developer Mode: ${next ? 'Enabled' : 'Disabled'}`, 'info');
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer active-press ${
                                        devMode
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                                    }`}
                                >
                                    {devMode ? 'Dev Mode ON' : 'Dev Mode OFF'}
                                </button>
                                <button
                                    onClick={handleLockDevMode}
                                    className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/30 active-press"
                                    title="Lock Developer Mode"
                                >
                                    <Lock className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Viewport & Header Crop Calibration */}
                        <div className="pt-4 border-t border-gray-800 space-y-4">
                            <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-gray-400" />
                                Viewport Calibration (Desktop: 0px / -72px | Mobile: -62px | Mini: -50px)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="settings-subcard p-3 bg-black/40 border border-gray-800 rounded-xl space-y-2">
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Max Player Vertical Offset</span>
                                        <span className="font-mono text-amber-400 font-bold">{videoYOffset}px</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="-150"
                                            max="50"
                                            step="2"
                                            value={videoYOffset}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value, 10);
                                                setVideoYOffset(val);
                                                localStorage.setItem('mugen_video_y_offset', val.toString());
                                            }}
                                            className="w-full accent-amber-500 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <button
                                            onClick={() => {
                                                setVideoYOffset(0);
                                                localStorage.setItem('mugen_video_y_offset', '0');
                                                showToast("Max Player Offset set to 0px (Standard Live View)", "success");
                                            }}
                                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${videoYOffset === 0 ? 'bg-amber-500 text-black font-bold border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'}`}
                                        >
                                            Default: 0px
                                        </button>
                                        <button
                                            onClick={() => {
                                                setVideoYOffset(-72);
                                                localStorage.setItem('mugen_video_y_offset', '-72');
                                                showToast("Max Player Offset set to -72px (Desktop Crop)", "success");
                                            }}
                                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${videoYOffset === -72 ? 'bg-amber-500 text-black font-bold border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'}`}
                                        >
                                            Desktop: -72px
                                        </button>
                                        <button
                                            onClick={() => {
                                                setVideoYOffset(-62);
                                                localStorage.setItem('mugen_video_y_offset', '-62');
                                                showToast("Max Player Offset set to -62px (Mobile Crop)", "success");
                                            }}
                                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${videoYOffset === -62 ? 'bg-amber-500 text-black font-bold border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'}`}
                                        >
                                            Mobile: -62px
                                        </button>
                                        <button
                                            onClick={() => {
                                                setVideoYOffset(-50);
                                                setMiniVideoYOffset(-50);
                                                localStorage.setItem('mugen_video_y_offset', '-50');
                                                localStorage.setItem('mugen_mini_video_y_offset', '-50');
                                                showToast("Player Offset set to -50px (Desktop Mini)", "success");
                                            }}
                                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${videoYOffset === -50 ? 'bg-amber-500 text-black font-bold border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'}`}
                                        >
                                            Desktop Mini: -50px
                                        </button>
                                        <button
                                            onClick={() => {
                                                setVideoYOffset(-62);
                                                setMiniVideoYOffset(-62);
                                                setMiniVideoScale(0.92);
                                                localStorage.setItem('mugen_video_y_offset', '-62');
                                                localStorage.setItem('mugen_mini_video_y_offset', '-62');
                                                localStorage.setItem('mugen_mini_video_scale', '0.92');
                                                showToast("Mobile Mini set to -62px / 92%", "success");
                                            }}
                                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${videoYOffset === -62 && miniVideoScale === 0.92 ? 'bg-amber-500 text-black font-bold border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'}`}
                                        >
                                            Mobile Mini: -62px / 92%
                                        </button>
                                    </div>
                                </div>

                                <div className="settings-subcard p-3 bg-black/40 border border-gray-800 rounded-xl space-y-2">
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Player Zoom Level</span>
                                        <span className="font-mono text-amber-400 font-bold">{Math.round(videoScale * 100)}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="0.8"
                                            max="1.5"
                                            step="0.02"
                                            value={videoScale}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setVideoScale(val);
                                                localStorage.setItem('mugen_video_scale', val.toString());
                                            }}
                                            className="w-full accent-amber-500 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => {
                                                setVideoScale(1);
                                                setMiniVideoScale(1);
                                                localStorage.setItem('mugen_video_scale', '1');
                                                localStorage.setItem('mugen_mini_video_scale', '1');
                                                showToast("Zoom set to 100%", "success");
                                            }}
                                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded text-[11px] font-medium transition-colors cursor-pointer"
                                        >
                                            100% (Default)
                                        </button>
                                        <button
                                            onClick={() => {
                                                setVideoScale(1.08);
                                                localStorage.setItem('mugen_video_scale', '1.08');
                                            }}
                                            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded text-[11px] transition-colors cursor-pointer"
                                        >
                                            108% (Fill)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Active Stream Link Debugger */}
                        <div className="pt-4 border-t border-gray-800 space-y-3">
                            <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                <Link className="w-4 h-4 text-gray-400" />
                                Active Stream Link Debugger
                            </h4>
                            <div className="settings-subcard p-3 bg-black/50 border border-gray-800 rounded-xl space-y-3">
                                <div className="settings-codebox text-xs text-gray-400 font-mono break-all bg-black/40 p-2.5 rounded-lg border border-white/5">
                                    <span className="text-gray-500 font-sans block mb-1">Loaded Stream URL:</span>
                                    {playingAnime?.url || playingAnime?.streamUrl || 'No anime currently playing'}
                                </div>
                                {playingAnime?.url && (
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => {
                                                const url = playingAnime.url || playingAnime.streamUrl;
                                                if (url) {
                                                    navigator.clipboard.writeText(url);
                                                    showToast("Stream link copied to clipboard!", "success");
                                                }
                                            }}
                                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer active-press"
                                        >
                                            <Copy size={13} /> Copy Link
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Storage & Data Management */}
                <div className="settings-data-card bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4 animate-fade-in">
                    <div>
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-500" />
                            Storage &amp; Cache Management
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Manage cached data, watch history, and app storage</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Clear Cache */}
                        <div className="settings-subcard p-4 bg-black/40 border border-gray-800 rounded-xl space-y-2 flex flex-col justify-between">
                            <div>
                                <span className="text-sm font-semibold text-gray-200 block">Clear Temporary Cache</span>
                                <span className="text-xs text-gray-400 block mt-0.5">Removes cached images and temporary session data. Keeps your favorites and history intact.</span>
                            </div>
                            <button
                                onClick={handleClearCacheOnly}
                                disabled={isClearingCache}
                                className="settings-cache-btn mt-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition-all border border-gray-700 cursor-pointer flex items-center justify-center gap-1.5 active-press"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isClearingCache ? 'animate-spin' : ''}`} />
                                {isClearingCache ? 'Clearing Cache...' : 'Clear Temporary Cache'}
                            </button>
                        </div>

                        {/* Delete Everything */}
                        <div className="settings-subcard p-4 bg-red-950/20 border border-red-500/20 rounded-xl space-y-2 flex flex-col justify-between">
                            <div>
                                <span className="text-sm font-semibold text-red-400 block">Delete Everything &amp; Reset</span>
                                <span className="text-xs text-gray-400 block mt-0.5">Permanently erases watch history, favorites, custom extension settings, and resets app to initial state.</span>
                            </div>
                            <button
                                onClick={() => setShowDeleteConfirmModal(true)}
                                className="settings-danger-btn mt-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active-press"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete All Data &amp; Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* About */}
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-2">
                    <h3 className="text-lg font-medium text-white">About</h3>
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleVersionClick}
                            className="text-gray-300 hover:text-white text-sm font-mono cursor-pointer transition-colors text-left select-none"
                            title="Mugen Play Version"
                        >
                            <span>Mugen Play v0.1.0-alpha</span>
                            {isDevUnlocked && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-sans font-bold border border-amber-500/30">
                                    DEV
                                </span>
                            )}
                        </button>
                        <span className="text-xs text-red-400 font-bold">Developed by Kapy</span>
                    </div>
                    <p className="text-gray-500 text-xs">Metadata Engine: AniList • Developed by Kapy</p>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
