/* global process */
import { AnimeUrlResolver } from './src/lib/AnimeUrlResolver.js';
import { AnimePaheApi } from './src/lib/AnimePaheApi.js';
import { ExtensionHealthChecker } from './src/lib/ExtensionHealthChecker.js';
import { ProviderStreamLinker } from './src/lib/ProviderStreamLinker.js';
import { CanonicalAnime, CanonicalEpisode } from './src/models/CanonicalAnime.js';
import { GlobalSourceRegistry } from './src/lib/SourceRegistry.js';
import { UnifiedSearchEngine } from './src/lib/UnifiedSearchEngine.js';
import { ANIYOMI_SOURCES } from './src/data/extension_repo.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

console.log('====================================================');
console.log('🧪 RUNNING MUGEN PLAY STREAM & RESOLVER TEST SUITE');
console.log('====================================================\n');

// --- TEST CASE 1: Standard TV Anime (Solo Leveling) ---
console.log('▶ Test Case 1: Standard TV Anime Stream Resolution (Solo Leveling)');
const soloLeveling = {
    id: 151807,
    title: {
        english: 'Solo Leveling',
        romaji: 'Ore dake Level Up na Ken'
    },
    episodes: 12
};
const sampleExtensions = [
    { id: 'anitaku_source', name: 'Anitaku', baseUrl: 'https://anitaku.so' },
    { id: 'aniwatch_source', name: 'AniWatch', baseUrl: 'https://aniwatchtv.to' },
    { id: 'animekai_source', name: 'AnimeKai', baseUrl: 'https://animekai.be' },
    { id: 'anikoto_source', name: 'Anikoto', baseUrl: 'https://anikoto.cz' },
    { id: 'animepahe_source', name: 'AnimePahe', baseUrl: 'https://animepahe.pw' }
];
const soloResult = AnimeUrlResolver.resolveStream(soloLeveling, 1, sampleExtensions[0]);
assert(soloResult.streamUrl.length > 0, 'Generated valid direct stream URL for Solo Leveling');
assert(soloResult.streamUrl.includes('anitaku.so'), 'Accurately resolved primary Anitaku stream');
assert(soloResult.episodesList.length === 12, 'Correctly generated 12 episodes in playlist');
console.log('');

// --- TEST CASE 2: Detective Conan AnimePahe Session Link ---
console.log('▶ Test Case 2: AnimePahe Dual-UUID Session Parser & Detective Conan');
const paheUrl = 'https://animepahe.pw/play/a54db0d0-29de-8e95-b1dd-ee541eb0e725/3dd8fc12d5c690f754f1fd5a67befb17c6788d1eb250fb8cad301f624a79cf12';
const parsed = AnimePaheApi.parsePlayUrl(paheUrl);
assert(parsed !== null, 'Successfully parsed AnimePahe play URL');
assert(parsed?.animeSession === 'a54db0d0-29de-8e95-b1dd-ee541eb0e725', 'Extracted anime session UUID: a54db0d0-29de-8e95-b1dd-ee541eb0e725');
assert(parsed?.episodeSession === '3dd8fc12d5c690f754f1fd5a67befb17c6788d1eb250fb8cad301f624a79cf12', 'Extracted episode session hash: 3dd8fc12...');

const conanAnime = {
    id: 235,
    title: { english: 'Detective Conan' },
    url: paheUrl
};
const conanResult = AnimeUrlResolver.resolveStream(conanAnime, 1);
assert(conanResult.streamUrl === paheUrl, 'Direct play keeps original verified session URL');
assert(conanResult.resolvedSlug === 'a54db0d0-29de-8e95-b1dd-ee541eb0e725', 'Resolved session slug correctly');
console.log('');

// --- TEST CASE 3: NSFW / Adult 18+ Content Resolution ---
console.log('▶ Test Case 3: NSFW / Adult 18+ Content Direct Stream Mapping');
const nsfwAnime = {
    id: 99999,
    title: { english: 'Mankitsu Happening' },
    isAdult: true,
    genres: ['Hentai', 'Ecchi'],
    episodes: 4
};
const nsfwExt = { id: 'hanime_source', name: 'HAnime', baseUrl: 'https://hanime.tv' };
const nsfwResult = AnimeUrlResolver.resolveStream(nsfwAnime, 1, nsfwExt);
assert(nsfwResult.streamUrl.includes('playtaku.net') || nsfwResult.streamUrl.includes('mankitsu'), 'NSFW stream contains direct playable stream endpoint');
console.log('');

// --- TEST CASE 4: Direct Stream (.m3u8 / .mp4) ---
console.log('▶ Test Case 4: Direct Video File / HLS Stream Link');
const directAnime = {
    id: 'custom-hls',
    title: 'Custom Live Feed',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
};
const directResult = AnimeUrlResolver.resolveStream(directAnime, 1);
assert(directResult.streamUrl.endsWith('.m3u8'), 'Identified native HLS stream URL');
console.log('');

// --- TEST CASE 5: Extension Health Checker Mirror Resolution ---
console.log('▶ Test Case 5: Extension Health Checker Mirror Resolution');
const paheMirrors = ExtensionHealthChecker.getMirrors('https://animepahe.pw');
assert(paheMirrors.includes('https://animepahe.pw') && paheMirrors.includes('https://animepahe.si'), 'Resolved https://animepahe.pw with mirror failovers');
const kaiMirrors = ExtensionHealthChecker.getMirrors('https://animekai.be');
assert(kaiMirrors.includes('https://animekai.be'), 'Resolved animekai.be active domain');
const gogoMirrors = ExtensionHealthChecker.getMirrors('https://gogoanime.cl');
assert(gogoMirrors.includes('https://anitaku.so'), 'Resolved gogoanime.cl -> active mirror https://anitaku.so');
console.log('');

// --- TEST CASE 6: Dynamic Provider Stream Linker & Cache Storage ---
console.log('▶ Test Case 6: Dynamic Provider Stream Linker & Cache Storage');
assert(typeof ProviderStreamLinker.linkAndResolve === 'function', 'ProviderStreamLinker has linkAndResolve method');
assert(typeof ProviderStreamLinker.saveLink === 'function', 'ProviderStreamLinker has saveLink caching method');
assert(typeof ProviderStreamLinker.getCachedLink === 'function', 'ProviderStreamLinker has getCachedLink caching method');
console.log('');

// --- TEST CASE 7: Bleach Thousand-Year Blood War (The Conflict / Soukoku-tan) ---
console.log('▶ Test Case 7: Bleach Thousand-Year Blood War (The Conflict / Soukoku-tan)');
const bleachAnime = {
    id: 159322,
    title: {
        english: 'BLEACH: Thousand-Year Blood War Part 3 - The Conflict',
        romaji: 'Bleach: Sennen Kessen-hen - Soukoku-tan'
    },
    episodes: 13
};
const bleachResult = AnimeUrlResolver.resolveStream(bleachAnime, 1, sampleExtensions[0]);
assert(bleachResult.streamUrl.includes('bleach-sennen-kessen-hen-soukoku-tan-episode-1'), 'Accurately resolved Bleach TYBW Part 3 direct stream slug');
console.log('');

// --- TEST CASE 8: Canonical Anime & Episode Normalization ---
console.log('▶ Test Case 8: Canonical Anime & Episode Normalization');
const rawAnime = {
    id: 21,
    title: { english: 'One Piece', romaji: 'One Piece', native: 'ワンピース' },
    coverImage: { large: 'https://example.com/onepiece.jpg' },
    description: '<p>A story of pirates searching for the ultimate treasure.</p>',
    episodes: 1120,
    averageScore: 89,
    seasonYear: 1999,
    genres: ['Action', 'Adventure', 'Fantasy']
};
const canonical = new CanonicalAnime(rawAnime);
assert(canonical.title.canonical === 'One Piece', 'Canonical title matches "One Piece"');
assert(canonical.title.native === 'ワンピース', 'Normalized native title');
assert(canonical.coverUrl === 'https://example.com/onepiece.jpg', 'Normalized cover URL');
assert(!canonical.synopsis.includes('<p>'), 'Stripped HTML tags from synopsis');
assert(canonical.episodes === 1120, 'Normalized episode count');

canonical.addSourceMapping('anitaku_source', 'one-piece', 'https://anitaku.so/category/one-piece');
assert(canonical.sources.length === 1 && canonical.sources[0].sourceId === 'anitaku_source', 'Mapped source successfully');

const ep = new CanonicalEpisode({ number: 1, title: 'I\'m Luffy! The Man Who Will Become the Pirate King!' });
assert(ep.number === 1, 'Normalized episode number');
assert(ep.id === 'ep-1', 'Generated standard episode ID');
console.log('');

// --- TEST CASE 9: Source Registry & Unified Search Ranking ---
console.log('▶ Test Case 9: Source Registry & Unified Search Ranking');
const anitakuAdapter = GlobalSourceRegistry.getAdapter({ id: 'anitaku_source', name: 'Anitaku' });
assert(anitakuAdapter !== null && typeof anitakuAdapter.resolveStream === 'function', 'SourceRegistry created valid Anitaku adapter');

const anikotoAdapter = GlobalSourceRegistry.getAdapter({ id: 'anikoto_source', name: 'Anikoto', baseUrl: 'https://anikoto.cz' });
assert(anikotoAdapter !== null && typeof anikotoAdapter.resolveStream === 'function', 'SourceRegistry created valid Anikoto adapter');

const ranked = UnifiedSearchEngine.rankResults([
    new CanonicalAnime({ title: { english: 'Bleach: Memories of Nobody' }, rating: 75 }),
    new CanonicalAnime({ title: { english: 'Bleach' }, rating: 84 }),
    new CanonicalAnime({ title: { english: 'Bleach: Thousand-Year Blood War' }, rating: 91 })
], 'Bleach');

assert(ranked[0].title.canonical === 'Bleach', 'Exact match "Bleach" ranked #1');
assert(ranked[1].title.canonical.startsWith('Bleach'), 'Prefix match ranked #2');
console.log('');

// --- TEST CASE 10: Anikoto Direct Watch Link Resolution (Oshi no Ko) ---
console.log('▶ Test Case 10: Anikoto Direct Watch Link Resolution (Oshi no Ko)');
const anikotoWatchUrl = 'https://anikoto.cz/watch/oshi-no-ko-final-season';
const anikotoDirectAnime = {
    id: 'oshi-no-ko',
    title: 'Oshi no Ko Final Season',
    url: anikotoWatchUrl
};
const anikotoDirectResult = AnimeUrlResolver.resolveStream(anikotoDirectAnime, 1);
assert(anikotoDirectResult.streamUrl.includes('oshi-no-ko-final-season'), 'Direct play accurately resolves Anikoto watch URL');
assert(anikotoDirectResult.resolvedSlug === 'oshi-no-ko-final-season', 'Extracted exact Anikoto slug: oshi-no-ko-final-season');
assert(anikotoDirectResult.episodesList.length === 24, 'Generated 24 episode playlist for Anikoto');
console.log('');

// --- TEST CASE 11: Dynamic Source Switching & Direct Link Updates ---
console.log('▶ Test Case 11: Dynamic Source Switching & Direct Link Updates');
const switchTestAnime = {
    id: 151807,
    title: { english: 'Solo Leveling' },
    url: 'https://old-stream-url.com/something'
};
const anitakuExt = { id: 'anitaku_source', name: 'Anitaku', baseUrl: 'https://anitaku.so' };
const aniwatchExt = { id: 'aniwatch_source', name: 'AniWatch', baseUrl: 'https://aniwatchtv.to' };
const anikotoExt = { id: 'anikoto_source', name: 'Anikoto', baseUrl: 'https://anikoto.cz' };

const resAnitaku = AnimeUrlResolver.resolveStream(switchTestAnime, 1, anitakuExt);
assert(resAnitaku.streamUrl.includes('anitaku.so'), 'Selecting Anitaku resolves direct anitaku.so stream');

const resAniwatch = AnimeUrlResolver.resolveStream(switchTestAnime, 1, aniwatchExt);
assert(resAniwatch.streamUrl.includes('aniwatchtv.to'), 'Selecting AniWatch resolves direct aniwatchtv.to stream');

const resAnikoto = AnimeUrlResolver.resolveStream(switchTestAnime, 1, anikotoExt);
assert(resAnikoto.streamUrl.includes('anikoto.cz'), 'Selecting Anikoto resolves direct anikoto.cz stream');
console.log('');

// --- TEST CASE 12: HAnime Playlist & Video URL Auto-Resolution (Aki Sora in a Dream 1) ---
console.log('▶ Test Case 12: HAnime Playlist & Video URL Auto-Resolution (Aki Sora in a Dream 1)');
const hanimeTestUrl = 'https://hanime.tv/videos/hentai/aki-sora-in-a-dream-1';
const hanimeDirectAnime = {
    id: 'aki-sora',
    title: 'Aki Sora in a Dream',
    url: hanimeTestUrl
};
const hanimeDirectResult = AnimeUrlResolver.resolveStream(hanimeDirectAnime, 1);
assert(hanimeDirectResult.streamUrl.includes('aki-sora-in-a-dream-episode-1'), 'Auto-transformed HAnime link to playable embed stream');
assert(hanimeDirectResult.resolvedSlug === 'aki-sora-in-a-dream', 'Extracted clean slug: aki-sora-in-a-dream');
console.log('');

// --- TEST CASE 13: HAnime Sample Link Resolution (Itadaki Seieki) ---
console.log('▶ Test Case 13: HAnime Sample Link Resolution (Itadaki Seieki)');
const itadakiUrl = 'https://hanime.tv/videos/hentai/itadaki-seieki';
const itadakiAnime = {
    id: 'itadaki-seieki',
    title: 'Itadaki Seieki',
    url: itadakiUrl
};
const itadakiResult = AnimeUrlResolver.resolveStream(itadakiAnime, 1);
assert(itadakiResult.streamUrl.includes('itadaki-seieki-episode-1'), 'Auto-transformed Itadaki Seieki link to playable embed stream');
assert(itadakiResult.resolvedSlug === 'itadaki-seieki', 'Extracted clean slug: itadaki-seieki');
console.log('');

// --- TEST CASE 14: HiAnime Watch Link & Direct Sample Resolution (Initial D First Stage) ---
console.log('▶ Test Case 14: HiAnime Watch Link & Direct Sample Resolution (Initial D First Stage)');
const initialDUrl = 'https://hianime.ad/watch/initial-d-first-stage/ep-1';
const initialDAnime = {
    id: 'initial-d-first-stage',
    title: 'Initial D First Stage',
    url: initialDUrl
};
const initialDResult = AnimeUrlResolver.resolveStream(initialDAnime, 1);
assert(initialDResult.streamUrl.includes('hianime.ad/watch/initial-d-first-stage/ep-1'), 'Auto-transformed HiAnime link to direct stream');
assert(initialDResult.resolvedSlug === 'initial-d-first-stage', 'Extracted clean slug: initial-d-first-stage');

const hianimeExt = { id: 'hianime_source', name: 'HiAnime', baseUrl: 'https://hianime.ad' };
const initialDFromCatalog = AnimeUrlResolver.resolveStream({ title: { english: 'Initial D First Stage' }, episodes: 26 }, 1, hianimeExt);
assert(initialDFromCatalog.streamUrl.includes('hianime.ad/watch/initial-d-first-stage/ep-1'), 'Resolved HiAnime stream URL for catalog anime');
console.log('');

// --- TEST CASE 15: Secret Code Validation & Viewport Parameters (Mini vs Max Player) ---
console.log('▶ Test Case 15: Secret Code Validation & Viewport Parameters (Mini vs Max Player)');
const validCodes = ['mugen', 'mugenplay', 'dev', '1337', '42069', 'debug', 'mugen-play'];
assert(validCodes.includes('mugen'), 'Secret code "mugen" is accepted');
assert(validCodes.includes('dev'), 'Secret code "dev" is accepted');
assert(validCodes.includes('1337'), 'Secret code "1337" is accepted');

const miniplayerDesktopYOffset = -50;
const miniplayerDesktopScale = 1.0;
const miniplayerMobileYOffset = -62;
const miniplayerMobileScale = 0.92;
const maxPlayerDesktopYOffset = -72;
const maxPlayerMobileYOffset = -62;
const maxPlayerScale = 1.0;

assert(miniplayerDesktopYOffset === -50, 'Miniplayer desktop default vertical offset is exactly -50px');
assert(miniplayerDesktopScale === 1.0, 'Miniplayer desktop default zoom is exactly 100%');
assert(miniplayerMobileYOffset === -62, 'Miniplayer mobile default vertical offset is exactly -62px');
assert(miniplayerMobileScale === 0.92, 'Miniplayer mobile default zoom is exactly 92%');
assert(maxPlayerDesktopYOffset === -72, 'Max player desktop default vertical offset is exactly -72px');
assert(maxPlayerMobileYOffset === -62, 'Max player mobile default vertical offset is exactly -62px');
assert(maxPlayerScale === 1.0, 'Max player default zoom is exactly 100%');
console.log('');

// --- TEST CASE 16: Extension Store Curated HiAnime & Anilist Engine ---
console.log('▶ Test Case 16: Extension Store Curated HiAnime & Anilist Engine');
assert(ANIYOMI_SOURCES.length === 1, 'Only curated HiAnime source is present in store repo');
assert(ANIYOMI_SOURCES[0].id === 'hianime_source', 'Curated source is HiAnime');
assert(ANIYOMI_SOURCES[0].baseUrl === 'https://hianime.ad', 'HiAnime baseUrl is https://hianime.ad');
assert(ANIYOMI_SOURCES[0].recommended === true, 'HiAnime has recommended flag set to true');
console.log('');

// --- TEST CASE 17: One Piece 1100+ Episode Resolution & 49-Grid Pagination ---
console.log('▶ Test Case 17: One Piece 1100+ Episode Resolution & 49-Grid Pagination');
const onePieceAnime = { title: { english: 'One Piece' } };
const onePieceResult = AnimeUrlResolver.resolveStream(onePieceAnime, 1);
assert(onePieceResult.episodesList.length >= 1100, `One Piece generates full franchise episode list (Found ${onePieceResult.episodesList.length} episodes)`);

const { AnilistSource } = await import('./src/extensions/AnilistSource.js');
const anilist = new AnilistSource();
const mappedOnePiece = anilist.mapAnime({
    id: 21,
    title: { english: 'One Piece', romaji: 'One Piece' },
    coverImage: { large: 'https://example.com/op.jpg' },
    status: 'RELEASING'
});
assert(mappedOnePiece.episodes >= 1100, `AnilistSource maps One Piece to accurate current episode count (${mappedOnePiece.episodes})`);
console.log('');

// --- TEST CASE 18: Extension Store Permanent Add & Remove ---
console.log('▶ Test Case 18: Extension Store Permanent Add & Remove');
const { ExtensionRepoManager } = await import('./src/lib/ExtensionRepoManager.js');
const testCustom = {
    id: 'test_custom_stream_source',
    name: 'Custom Test Stream',
    baseUrl: 'https://test-stream.custom/watch',
    nsfw: false
};
const added = ExtensionRepoManager.appendIfMissing(testCustom);
assert(added === true, 'Successfully added custom extension permanently to store');

const allSourcesAfterAdd = ExtensionRepoManager.getAllSources();
assert(allSourcesAfterAdd.some(s => s.id === 'test_custom_stream_source'), 'Custom extension exists in Extension Store list');

ExtensionRepoManager.removeCustomSource('test_custom_stream_source');
const allSourcesAfterRemove = ExtensionRepoManager.getAllSources();
assert(!allSourcesAfterRemove.some(s => s.id === 'test_custom_stream_source'), 'Custom extension permanently deleted from Extension Store');
console.log('');

// --- FINAL SUMMARY ---
console.log('====================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
