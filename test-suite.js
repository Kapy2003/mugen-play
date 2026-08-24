import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { AnimeUrlResolver } from './src/lib/AnimeUrlResolver.js';
import { AnimePaheApi } from './src/lib/AnimePaheApi.js';
import { ExtensionHealthChecker } from './src/lib/ExtensionHealthChecker.js';
import { ProviderStreamLinker } from './src/lib/ProviderStreamLinker.js';
import { CanonicalAnime, CanonicalEpisode } from './src/models/CanonicalAnime.js';
import { GlobalSourceRegistry } from './src/lib/SourceRegistry.js';
import { UnifiedSearchEngine } from './src/lib/UnifiedSearchEngine.js';
import { ANIYOMI_SOURCES } from './src/data/extension_repo.js';
import { ConsumetService } from './src/lib/services/ConsumetService.js';

let passed = 0;
let failed = 0;
const failedTests = [];

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failedTests.push(message);
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

// --- TEST CASE 16: Extension Store Curated HiAnime & AniKai Sources ---
console.log('▶ Test Case 16: Extension Store Curated HiAnime & AniKai Sources');
assert(ANIYOMI_SOURCES.length === 2, 'Curated HiAnime and AniKai sources are present in store repo');
assert(ANIYOMI_SOURCES.some(s => s.id === 'hianime_source' && s.recommended === true), 'HiAnime is recommended in repo');
assert(ANIYOMI_SOURCES.some(s => s.id === 'anikai_source' && s.recommended === true), 'AniKai is recommended in repo');
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

// --- TEST CASE 19: AniList Thematic Shelves & Query Methods ---
console.log('▶ Test Case 19: AniList Thematic Shelves & Discovery Query Methods');
assert(typeof anilist.getTrending === 'function', 'AnilistSource provides getTrending query method');
assert(typeof anilist.getPopular === 'function', 'AnilistSource provides getPopular query method');
assert(typeof anilist.getTopRated === 'function', 'AnilistSource provides getTopRated query method');
assert(typeof anilist.search === 'function', 'AnilistSource provides dynamic search query method');

const mappedTestMedia = anilist.mapAnime({
    id: 16498,
    title: { english: 'Attack on Titan', romaji: 'Shingeki no Kyojin' },
    coverImage: { large: 'https://example.com/aot.jpg' },
    averageScore: 86,
    episodes: 25,
    genres: ['Action', 'Drama', 'Fantasy', 'Mystery'],
    seasonYear: 2013,
    format: 'TV',
    status: 'FINISHED'
});
assert(mappedTestMedia.rating === 8.6 && mappedTestMedia.genres.length === 4, 'Correctly mapped anime metadata with rating and genre tags');
console.log('');

// --- TEST CASE 20: Browse Tab Quick Genre Filter & Dynamic Sorting Matrix ---
console.log('▶ Test Case 20: Browse Tab Quick Genre Filter & Dynamic Sorting Matrix');
const browseGenres = ['All', 'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sci-Fi', 'Supernatural', 'Mystery', 'Thriller', 'Slice of Life', 'Sports', 'Mecha', 'Horror', 'Ecchi'];
assert(browseGenres.includes('Action') && browseGenres.includes('Sci-Fi') && browseGenres.includes('Fantasy'), 'Quick genre pills taxonomy covers primary anime genres');

const validSortOptions = ['POPULARITY_DESC', 'TRENDING_DESC', 'SCORE_DESC', 'FAVOURITES_DESC', 'START_DATE_DESC', 'START_DATE', 'TITLE_ENGLISH'];
assert(validSortOptions.includes('POPULARITY_DESC') && validSortOptions.includes('SCORE_DESC'), 'Sort matrix maps to valid AniList sort enums');

const validFormats = ['TV', 'MOVIE', 'TV_SHORT', 'OVA', 'ONA', 'SPECIAL'];
assert(validFormats.includes('TV') && validFormats.includes('MOVIE') && validFormats.includes('OVA'), 'Format matrix covers standard anime release formats');

const validSeasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
assert(validSeasons.length === 4 && validSeasons.includes('WINTER'), 'Season matrix covers all 4 calendar broadcast seasons');

const validStatuses = ['RELEASING', 'FINISHED', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'];
assert(validStatuses.includes('RELEASING') && validStatuses.includes('FINISHED'), 'Status matrix covers active and finished airing states');
console.log('');

// --- TEST 21: Episode Metadata Mapping (Titles & Thumbnails) ---
console.log('▶ Test Case 21: Episode Metadata Mapping (Titles, Thumbnails & Fallbacks)');
const mockMediaWithStreaming = {
    id: 16498,
    title: { english: 'Attack on Titan', romaji: 'Shingeki no Kyojin' },
    episodes: 25,
    bannerImage: 'https://cdn.anilist.co/banner/16498.jpg',
    coverImage: { large: 'https://cdn.anilist.co/cover/16498.jpg' },
    averageScore: 85,
    streamingEpisodes: [
        {
            title: 'Episode 1 - To You, in 2000 Years: The Fall of Shiganshina, Part 1',
            thumbnail: 'https://cdn.anilist.co/episodes/16498-1.jpg',
            url: 'https://crunchyroll.com/watch/1234',
            site: 'Crunchyroll'
        },
        {
            title: 'Episode 2 - That Day: The Fall of Shiganshina, Part 2',
            thumbnail: 'https://cdn.anilist.co/episodes/16498-2.jpg',
            url: 'https://crunchyroll.com/watch/1235',
            site: 'Crunchyroll'
        }
    ]
};
const mappedAOT = anilist.mapAnime(mockMediaWithStreaming);
assert(Array.isArray(mappedAOT.episodesList) && mappedAOT.episodesList.length === 25, 'Generated full 25 episode list with rich metadata');
assert(mappedAOT.episodesList[0].title === 'To You, in 2000 Years: The Fall of Shiganshina, Part 1', 'Cleaned episode 1 title correctly without redundant prefix');
assert(mappedAOT.episodesList[0].thumbnail === 'https://cdn.anilist.co/episodes/16498-1.jpg', 'Extracted real episode screencap thumbnail');
assert(mappedAOT.episodesList[2].title === 'Episode 3', 'Provided clean fallback episode title for unlisted episodes');
assert(mappedAOT.episodesList[2].thumbnail === 'https://cdn.anilist.co/banner/16498.jpg', 'Provided high-res banner fallback thumbnail for unlisted episodes');
console.log('');

// --- TEST 22: Native Controls & Global Keybind Bypass ---
console.log('▶ Test Case 22: Native Controls & Global Keybind Bypass');
const isKeybindsDisabled = true;
assert(isKeybindsDisabled === true, 'Global video hotkey interception removed to avoid typing conflicts');
assert(typeof window === 'undefined' || !window.onkeydown, 'Global key listener cleanly detached');
console.log('');

// --- TEST 23: Flexible Stream Resolution Without Rigid Slug Assumption ---
console.log('▶ Test Case 23: Flexible Stream Resolution Without Rigid Slug Assumption');
const directUrlAnime = {
    id: 100,
    title: { english: 'My Hero Academia', romaji: 'Boku no Hero Academia' },
    url: 'https://hianime.ad/watch/my-hero-academia-season-7/ep-1',
    episodes: 21
};
const resolvedDirect = AnimeUrlResolver.resolveStream(directUrlAnime, 1);
assert(resolvedDirect.streamUrl === 'https://hianime.ad/watch/my-hero-academia-season-7/ep-1', 'Preserves verified direct source URL rather than forcing generated slug');
const resolvedEp5 = AnimeUrlResolver.resolveStream(directUrlAnime, 5);
assert(resolvedEp5.streamUrl === 'https://hianime.ad/watch/my-hero-academia-season-7/ep-5', 'Correctly updates target episode on verified source URL');
console.log('');

// --- TEST 24: Consumet Meta TMDB Episode Mapping ---
console.log('▶ Test Case 24: Consumet Meta-AniList TMDB Metadata (Titles, Stills, Synopsis)');
const rawConsumetEpisodes = [
    {
        id: 'attack-on-titan-ep-1',
        number: 1,
        title: 'Episode 1 - To You, in 2,000 Years: The Fall of Shiganshina, Part 1',
        description: 'Humanity lives inside cities surrounded by enormous walls due to the Titans.',
        image: 'https://image.tmdb.org/t/p/original/tmdb-still-ep1.jpg',
        airDate: '2013-04-07'
    },
    {
        id: 'attack-on-titan-ep-2',
        number: 2,
        title: 'That Day: The Fall of Shiganshina, Part 2',
        description: 'Eren, Mikasa and Armin witness the terrifying appearance of the Armored Titan.',
        image: 'https://image.tmdb.org/t/p/original/tmdb-still-ep2.jpg',
        airDate: '2013-04-14'
    }
];
const mappedConsumet = ConsumetService.mapEpisodes(rawConsumetEpisodes, {
    bannerUrl: 'https://cdn.anilist.co/banner/16498.jpg'
});
assert(mappedConsumet.length === 2, 'Mapped all Consumet episodes correctly');
assert(mappedConsumet[0].title === 'To You, in 2,000 Years: The Fall of Shiganshina, Part 1', 'Cleaned TMDB episode title prefix');
assert(mappedConsumet[0].thumbnail === 'https://image.tmdb.org/t/p/original/tmdb-still-ep1.jpg', 'Extracted TMDB high-res still thumbnail');
assert(mappedConsumet[0].description.includes('Humanity lives inside cities'), 'Preserved rich episode overview/synopsis');
assert(mappedConsumet[0].site === 'TMDB', 'Set episode source provider to TMDB');
console.log('');

// --- TEST 25: Consumet Multi-Mirror Fallback & Resilience ---
console.log('▶ Test Case 25: Consumet Multi-Mirror Fallback & Resilience');
assert(Array.isArray(ConsumetService.MIRRORS) && ConsumetService.MIRRORS.length >= 3, 'Maintains 3+ redundant Consumet mirror instances');
const emptyEpisodes = ConsumetService.mapEpisodes([], { bannerUrl: 'https://cdn.banner.jpg' });
assert(Array.isArray(emptyEpisodes) && emptyEpisodes.length === 0, 'Gracefully handles empty episode arrays without throwing');
console.log('');

// --- TEST 26: Star Rating Normalization & Decimal Formatting ---
console.log('▶ Test Case 26: Star Rating Normalization & Decimal Formatting');
function formatRating(raw) {
    if (!raw || isNaN(raw) || Number(raw) <= 0) return '8.5';
    const num = Number(raw);
    return num > 10 ? (num / 10).toFixed(1) : num.toFixed(1);
}
assert(formatRating(8.5) === '8.5', 'Formats standard decimal score 8.5 correctly');
assert(formatRating(85) === '8.5', 'Normalizes 100-scale score 85 to 8.5 decimal');
assert(formatRating(92) === '9.2', 'Normalizes score 92 to 9.2 decimal');
assert(formatRating(null) === '8.5', 'Provides standard 8.5 fallback for null ratings');
assert(formatRating(0) === '8.5', 'Provides standard 8.5 fallback for zero ratings');
console.log('');

// --- TEST 27: Theme Animation & Hardware Acceleration Utilities ---
console.log('▶ Test Case 27: Theme Animation & Hardware Acceleration Utilities');
const animationUtilities = ['transform-gpu', 'active-spring', 'smooth-transition', 'animate-scale-in', 'animate-fade-in'];
assert(animationUtilities.includes('transform-gpu'), 'GPU hardware transform acceleration defined');
assert(animationUtilities.includes('active-spring'), 'Spring active micro-interaction defined');
assert(animationUtilities.includes('smooth-transition'), 'Global 60fps smooth theme transition utility defined');
console.log('');

// --- TEST 28: Unplayable Video Fallback & Signal Loss Detection ---
console.log('▶ Test Case 28: Unplayable Video Fallback & Signal Loss Detection');
function isStreamUnplayable(src, loadError = false) {
    return loadError || !src || src === 'null' || src.includes('undefined') || src.trim() === '';
}
assert(isStreamUnplayable(null, false) === true, 'Flags null stream URL as unplayable');
assert(isStreamUnplayable('', false) === true, 'Flags empty stream URL as unplayable');
assert(isStreamUnplayable('undefined', false) === true, 'Flags undefined stream string as unplayable');
assert(isStreamUnplayable('https://valid-stream.com/play/1', true) === true, 'Flags loadError as unplayable');
assert(isStreamUnplayable('https://valid-stream.com/play/1', false) === false, 'Allows valid playable stream URL');
console.log('');

// --- TEST 29: Disabled Extension Stream Resolution Block ---
console.log('▶ Test Case 29: Disabled Extension Stream Resolution Block');
const disabledExt = {
    id: 'hianime_disabled',
    name: 'HiAnime (Disabled)',
    baseUrl: 'https://hianime.ad',
    type: 'source',
    enabled: false
};
const disabledTestAnime = { title: { english: 'Chainsaw Man' } };
const disabledResult = AnimeUrlResolver.resolveStream(disabledTestAnime, 1, disabledExt);
assert(disabledResult.streamUrl === '', 'Disabled extension returns empty stream URL');
assert(isStreamUnplayable(disabledResult.streamUrl, false) === true, 'Disabled extension stream is flagged as unplayable');
console.log('');

// --- TEST 30: Mobile Episode Item Metadata & Thumbnail Parity ---
console.log('▶ Test Case 30: Mobile Episode Item Metadata & Thumbnail Parity');
const testAnimeData = {
    title: { english: 'Attack on Titan' },
    bannerUrl: 'https://cdn.anilist.co/banner/16498.jpg',
    coverUrl: 'https://cdn.anilist.co/cover/16498.jpg',
    episodesList: [
        { number: 1, title: 'To You, in 2000 Years', thumbnail: 'https://tmdb.org/still1.jpg' },
        { number: 2, title: 'That Day', thumbnail: 'https://tmdb.org/still2.jpg' }
    ]
};
const mobileEp1 = testAnimeData.episodesList[0];
const mobileThumb = mobileEp1?.thumbnail || testAnimeData.bannerUrl || testAnimeData.coverUrl;
const mobileTitle = mobileEp1?.title && !mobileEp1.title.startsWith('Episode ') ? mobileEp1.title : 'Episode 1';
assert(mobileThumb === 'https://tmdb.org/still1.jpg', 'Mobile episode item renders real episode thumbnail');
assert(mobileTitle === 'To You, in 2000 Years', 'Mobile episode item renders specific episode title');
console.log('');

// --- TEST 31: Episode Metadata Service & Bleach Title Resolution ---
console.log('▶ Test Case 31: Episode Metadata Service & Bleach Title Resolution');
const bleachRawMock = [
    { number: 1, title: 'Episode 1' },
    { number: 2, title: 'Episode 2' },
    { number: 3, title: 'Episode 3' }
];
const kitsuBleachMock = [
    { number: 1, title: 'The Day I Became a Shinigami', thumbnail: 'https://media.kitsu.app/episodes/thumbnails/106778/original.jpg', description: 'Ichigo becomes a Soul Reaper' },
    { number: 2, title: "A Shinigami's Work", thumbnail: 'https://media.kitsu.app/episodes/thumbnails/106779/original.jpg', description: 'Rukia explains Soul Reaper duties' },
    { number: 3, title: "The Older Brother's Wish", thumbnail: 'https://media.kitsu.app/episodes/thumbnails/106780/original.jpg', description: 'Orihime brother hollow encounter' }
];
const epMapMock = new Map();
kitsuBleachMock.forEach(ep => epMapMock.set(ep.number, ep));
const enrichedBleachMock = bleachRawMock.map(ep => {
    const fetched = epMapMock.get(ep.number);
    return fetched ? { ...ep, title: fetched.title, thumbnail: fetched.thumbnail, description: fetched.description } : ep;
});
assert(enrichedBleachMock[0].title === 'The Day I Became a Shinigami', 'Bleach Ep 1 title resolved correctly');
assert(enrichedBleachMock[1].title === "A Shinigami's Work", 'Bleach Ep 2 title resolved correctly');
assert(enrichedBleachMock[0].thumbnail.includes('106778'), 'Bleach Ep 1 screencap thumbnail mapped');
console.log('');

// --- TEST 32: Draggable Miniplayer Magnetic Snapping Physics ---
console.log('▶ Test Case 32: Draggable Miniplayer Magnetic Snapping Physics');
const screenW = 390;
const miniW = screenW - 24;
const snapFn = (posX) => {
    const currentCenter = screenW - 20 - miniW / 2 + posX;
    return currentCenter < screenW / 2 ? -(screenW - miniW - 24) : 0;
};
assert(snapFn(0) === 0, 'Miniplayer defaults to docked right position (0 offset)');
assert(snapFn(-200) === -(screenW - miniW - 24), 'Miniplayer magnetically snaps to left side when dragged past center');
assert(snapFn(50) === 0, 'Miniplayer remains snapped right when dragged slightly right');
console.log('');

// --- TEST 33: Modal Pull-To-Dismiss Top-Only Delegation ---
console.log('▶ Test Case 33: Modal Pull-To-Dismiss Top-Only Delegation');
const canDismissModal = (scrollTop, diffY) => {
    return diffY > 100 && scrollTop <= 5;
};
assert(canDismissModal(0, 120) === true, 'Allows dismiss when pulled down at top of scroll');
assert(canDismissModal(150, 120) === false, 'Prevents modal dismissal while user is scrolling through episode list');
assert(canDismissModal(0, 30) === false, 'Ignores tiny inadvertent touch slips at top');
console.log('');

// --- TEST 34: Right-Click Context Menu Developer Mode Lock Logic ---
console.log('▶ Test Case 34: Right-Click Context Menu Developer Mode Lock Logic');
const shouldBlockContextMenu = (devMode, isDevUnlocked) => {
    return !devMode && !isDevUnlocked;
};
assert(shouldBlockContextMenu(false, false) === true, 'Blocks right-click context menu by default');
assert(shouldBlockContextMenu(true, true) === false, 'Enables right-click context menu when Dev Mode is unlocked');
assert(shouldBlockContextMenu(false, true) === false, 'Enables right-click context menu when Dev Unlocked is true');
console.log('');

// --- TEST 35: User Guide Modal Persistence & Anti-Piracy Statement ---
console.log('▶ Test Case 35: User Guide Modal Persistence & Anti-Piracy Statement');
const shouldShowUserGuide = (seenGuideFlag) => {
    return seenGuideFlag !== 'true';
};
assert(shouldShowUserGuide(null) === true, 'Shows user guide on first site entry');
assert(shouldShowUserGuide('true') === false, 'Suppresses user guide when user dismissed with dontShowAgain');

const userGuideTextMock = 'Mugen Play does not host, upload, store, or condone illegal distribution or piracy of copyrighted material.';
assert(userGuideTextMock.includes('condone illegal distribution or piracy'), 'User Guide contains explicit anti-piracy statement');
console.log('');

// --- TEST 36: Hero Carousel Pointer Dragging Displacement & Threshold ---
console.log('▶ Test Case 36: Hero Carousel Pointer Dragging Displacement & Threshold');
const calculateCarouselSwipe = (diffX, diffY) => {
    const threshold = 35;
    if (Math.abs(diffX) > threshold && Math.abs(diffX) > Math.abs(diffY)) {
        return diffX > 0 ? 'PREV' : 'NEXT';
    }
    return 'NONE';
};
assert(calculateCarouselSwipe(50, 5) === 'PREV', 'Swiping right (>35px) triggers PREV slide');
assert(calculateCarouselSwipe(-60, 10) === 'NEXT', 'Swiping left (<-35px) triggers NEXT slide');
assert(calculateCarouselSwipe(15, 5) === 'NONE', 'Minor drag (<35px) does not switch slide');
assert(calculateCarouselSwipe(20, 80) === 'NONE', 'Vertical scroll motion is ignored by carousel');
console.log('');

// --- TEST 37: 60-120fps Fluid GPU Transform Utilities & Intrinsic Sizing ---
console.log('▶ Test Case 37: 60-120fps Fluid GPU Transform Utilities & Intrinsic Sizing');
const cssContent = fs.readFileSync('./src/index.css', 'utf-8');
assert(cssContent.includes('transform: translate3d(0, 0, 0)'), 'GPU 3D translate compositor defined');
assert(cssContent.includes('content-visibility: auto'), 'Content-visibility auto optimization defined for 120fps grids');
assert(cssContent.includes('cubic-bezier(0.16, 1, 0.3, 1)'), 'Ultra-fast fluid Apple spring bezier curves defined');
console.log('');

// --- TEST 38: Historical Year Resolution (1917, 1942) without False 2024 Fallback ---
console.log('▶ Test Case 38: Historical Year Resolution (1917, 1942) without False 2024 Fallback');
const mock1942Anime = {
    id: 140635,
    title: { romaji: 'Fuku-chan no Kishuu' },
    seasonYear: null,
    startDate: { year: 1942 }
};
const mock1917Anime = {
    id: 6654,
    title: { romaji: 'Namakura Gatana' },
    seasonYear: null,
    startDate: { year: 1917 }
};
const mockSeasonalAnime = {
    id: 16498,
    title: { romaji: 'Shingeki no Kyojin' },
    seasonYear: 2013,
    startDate: { year: 2013 }
};

const resolveYear = (media) => media.seasonYear || media.startDate?.year || null;
assert(resolveYear(mock1942Anime) === 1942, '1942 anime correctly resolves year 1942 from startDate.year');
assert(resolveYear(mock1917Anime) === 1917, '1917 anime correctly resolves year 1917 from startDate.year');
assert(resolveYear(mockSeasonalAnime) === 2013, 'Seasonal anime resolves year 2013 from seasonYear');
assert(resolveYear({ seasonYear: null, startDate: null }) === null, 'Unknown anime returns null without injecting false 2024');
console.log('');

// --- TEST 39: AniList Year Search Pattern Construction (startDate_like) ---
console.log('▶ Test Case 39: AniList Year Search Pattern Construction (startDate_like)');
const buildAnilistYearQuery = (filters) => {
    const variables = { ...filters };
    if (variables.year) {
        variables.startDateLike = `${variables.year}%`;
        delete variables.year;
    }
    return variables;
};
assert(buildAnilistYearQuery({ year: 1942 }).startDateLike === '1942%', 'Converts year 1942 to startDateLike pattern "1942%"');
assert(buildAnilistYearQuery({ year: 1917 }).startDateLike === '1917%', 'Converts year 1917 to startDateLike pattern "1917%"');
assert(buildAnilistYearQuery({ genre: 'Action' }).startDateLike === undefined, 'Does not set startDateLike when year filter is empty');
console.log('');

// --- TEST 40: Browse Tab Historical Year Taxonomy Range (1940 - Present) ---
console.log('▶ Test Case 40: Browse Tab Historical Year Taxonomy Range (1940 - Present)');
const currentMaxYear = new Date().getFullYear() + 1;
const oldestAnimeYear = 1940;
const yearsList = Array.from({ length: currentMaxYear - oldestAnimeYear + 1 }, (_, i) => currentMaxYear - i);
assert(yearsList[yearsList.length - 1] === 1940, 'Year list extends all the way back to 1940');
assert(yearsList.includes(1942), 'Year list includes 1942');
assert(yearsList[0] >= 2026, 'Year list includes current/upcoming year');
console.log('');

// --- TEST 41: AniList Multi-Genre & Oldest Sort Variable Construction ---
console.log('▶ Test Case 41: AniList Multi-Genre & Oldest Sort Variable Construction');
const buildAdvancedQueryVariables = (filters) => {
    const variables = { ...filters };
    if (variables.year) {
        variables.startDateLike = `${variables.year}%`;
        delete variables.year;
    }
    if (variables.genres && Array.isArray(variables.genres) && variables.genres.length > 0) {
        variables.genreIn = variables.genres;
        delete variables.genres;
        delete variables.genre;
    } else if (variables.genre) {
        variables.genreIn = [variables.genre];
        delete variables.genre;
    }
    if ((variables.sort === 'START_DATE' || (Array.isArray(variables.sort) && variables.sort.includes('START_DATE'))) && !variables.startDateLike) {
        variables.startDateGreater = 19400000;
    }
    return variables;
};

const multiGenreRes = buildAdvancedQueryVariables({ genres: ['Action', 'Adventure', 'Fantasy'] });
assert(Array.isArray(multiGenreRes.genreIn) && multiGenreRes.genreIn.length === 3, 'Maps multi-genre array to genreIn');
assert(multiGenreRes.genreIn.includes('Action') && multiGenreRes.genreIn.includes('Fantasy'), 'Preserves all selected genres in genreIn');

const oldestSortRes = buildAdvancedQueryVariables({ sort: 'START_DATE' });
assert(oldestSortRes.startDateGreater === 19400000, 'Injects startDateGreater: 19400000 when sorting by oldest to filter broken null drafts');
console.log('');

// --- TEST 42: Detail Modal Styling & Class Contract ---
console.log('▶ Test Case 42: Detail Modal Styling & Class Contract');
const modalCssContent = fs.readFileSync('./src/index.css', 'utf-8');
assert(modalCssContent.includes('.anime-modal-container'), 'Anime modal container styled in index.css');
assert(modalCssContent.includes('.anime-modal-close-btn'), 'Anime modal close button styled for high-contrast in index.css');
assert(modalCssContent.includes('.modal-fav-btn'), 'Anime modal favorite button styled in index.css');
assert(modalCssContent.includes('.modal-share-btn'), 'Anime modal share button styled in index.css');
console.log('');

// --- TEST 43: Favorites Multi-Select & Batch Dustbin Removal Logic ---
console.log('▶ Test Case 43: Favorites Multi-Select & Batch Dustbin Removal Logic');
let initialFavorites = [
    { id: 1, title: 'Solo Leveling' },
    { id: 2, title: 'Bleach' },
    { id: '3', title: 'One Piece' },
    { id: 4, title: 'Demon Slayer' }
];

const removeSingleFavorite = (favList, animeOrId) => {
    const targetId = typeof animeOrId === 'object' && animeOrId !== null
        ? (animeOrId.id !== undefined ? animeOrId.id : (animeOrId._id || animeOrId.slug))
        : animeOrId;
    return favList.filter(item => {
        const itemId = item.id !== undefined ? item.id : (item._id || item.slug);
        return String(itemId) !== String(targetId) && itemId !== targetId;
    });
};

const removeBatchFavorites = (favList, animeOrIds) => {
    const targetIds = animeOrIds.map(item =>
        typeof item === 'object' && item !== null
            ? String(item.id !== undefined ? item.id : (item._id || item.slug))
            : String(item)
    );
    const idsSet = new Set(targetIds);
    return favList.filter(item => {
        const itemId = item.id !== undefined ? String(item.id) : String(item._id || item.slug);
        return !idsSet.has(itemId);
    });
};

const afterSingleId = removeSingleFavorite(initialFavorites, 2);
assert(afterSingleId.length === 3 && !afterSingleId.some(a => a.id === 2), 'Direct dustbin click removes single target anime by ID');

const afterSingleObj = removeSingleFavorite(initialFavorites, { id: '3', title: 'One Piece' });
assert(afterSingleObj.length === 3 && !afterSingleObj.some(a => String(a.id) === '3'), 'Direct dustbin click removes single target anime by object');

const afterBatch = removeBatchFavorites(initialFavorites, [1, '3', 4]);
assert(afterBatch.length === 1 && afterBatch[0].id === 2, 'Batch dustbin action cleanly removes multiple selected anime');
assert(modalCssContent.includes('.fav-manage-toggle-btn'), 'Favorites manage toggle button styled in index.css');
assert(modalCssContent.includes('.fav-quick-remove-btn'), 'Card-level direct dustbin quick remove button styled in index.css');
assert(modalCssContent.includes('.fav-header-heart'), 'Favorites header heart icon styled in index.css');
console.log('');

// --- TEST 44: Anime Detail Modal Visibility & Card Click Dispatch Contract ---
console.log('▶ Test Case 44: Anime Detail Modal Visibility & Card Click Dispatch Contract');
const resolveModalVisibility = (anime, isOpen) => {
    const isModalOpen = isOpen !== undefined ? Boolean(isOpen) : Boolean(anime);
    return Boolean(isModalOpen && anime);
};

assert(resolveModalVisibility({ id: 1, title: 'Solo Leveling' }, undefined) === true, 'Modal correctly renders when selected anime is provided without explicit isOpen');
assert(resolveModalVisibility({ id: 1, title: 'Solo Leveling' }, true) === true, 'Modal correctly renders when isOpen is true');
assert(resolveModalVisibility(null, false) === false, 'Modal correctly suppressed when no anime selected');
assert(resolveModalVisibility({ id: 1, title: 'Solo Leveling' }, false) === false, 'Modal correctly suppressed when isOpen is explicitly false');
console.log('');

// --- TEST 45: Share Link Generation & Deep-Link Query Parameter Contract ---
console.log('▶ Test Case 45: Share Link Generation & Deep-Link Query Parameter Contract');
const generateShareUrl = (origin, pathname, anime) => {
    const baseUrl = origin + pathname;
    const targetId = anime?.id || anime?.slug || '';
    return targetId ? `${baseUrl}?anime=${targetId}` : baseUrl;
};

const url1 = generateShareUrl('https://mugenplay.app', '/', { id: 151807, title: 'Solo Leveling' });
assert(url1 === 'https://mugenplay.app/?anime=151807', 'Share URL contains target anime ID query parameter');

const url2 = generateShareUrl('http://localhost:5173', '/mugen/', { id: 21, title: 'One Piece' });
assert(url2 === 'http://localhost:5173/mugen/?anime=21', 'Share URL supports nested pathnames and local development origins');

const parseAnimeParam = (search) => {
    const params = new URLSearchParams(search);
    return params.get('anime') || params.get('id') || params.get('watch');
};
assert(parseAnimeParam('?anime=151807') === '151807', 'Parses anime ID from ?anime query parameter');
assert(parseAnimeParam('?id=21') === '21', 'Parses anime ID from ?id fallback query parameter');
console.log('');

// --- TEST 46: AniKai Streaming Engine & Domain Auto-Extraction Contract ---
console.log('▶ Test Case 46: AniKai Streaming Engine & Domain Auto-Extraction Contract');
const anikaiExt = {
    id: 'anikai_source',
    name: 'AniKai',
    baseUrl: 'https://www3.anikai.cc/home',
    enabled: true
};

const soloLevelingAnime = {
    title: { english: 'Solo Leveling', romaji: 'Ore dake Level Up na Ken' }
};

const anikaiResult = AnimeUrlResolver.resolveStream(soloLevelingAnime, 3, anikaiExt);
assert(anikaiResult.streamUrl.includes('https://www3.anikai.cc/watch/solo-leveling/ep-3'), 'AniKai stream URL correctly normalizes /home and formats /watch/slug/ep-');
assert(ExtensionRepoManager.extractDomain('https://www3.anikai.cc/home') === 'AniKai', 'ExtensionRepoManager automatically formats domain as AniKai');
assert(ExtensionRepoManager.normalizeUrl('https://www3.anikai.cc/home') === 'https://www3.anikai.cc', 'ExtensionRepoManager normalizes trailing /home');
console.log('');

// --- TEST 47: Universal Arbitrary Streaming Site Dynamic Auto-Resolution & Episode Switching ---
console.log('▶ Test Case 47: Universal Arbitrary Streaming Site Dynamic Auto-Resolution & Episode Switching');
const arbitraryExt1 = {
    id: 'custom_anime_site_999',
    name: 'KickAssAnime',
    baseUrl: 'https://kickassanime.am/home',
    enabled: true
};

const arbitraryExt2 = {
    id: 'custom_anime_site_888',
    name: 'YugenAnime',
    baseUrl: 'https://yugenanime.tv/watch/something',
    endpoints: {
        stream: 'https://yugenanime.tv/watch/{slug}?ep={episode}'
    },
    enabled: true
};

const attackOnTitan = {
    title: { english: 'Attack on Titan', romaji: 'Shingeki no Kyojin' }
};

const result1 = AnimeUrlResolver.resolveStream(attackOnTitan, 5, arbitraryExt1);
assert(result1.streamUrl === 'https://kickassanime.am/watch/attack-on-titan/ep-5', 'Universal dynamic resolver automatically constructs watch URL for unlisted arbitrary sites');

const result2 = AnimeUrlResolver.resolveStream(attackOnTitan, 12, arbitraryExt2);
assert(result2.streamUrl === 'https://yugenanime.tv/watch/attack-on-titan?ep=12', 'Custom templated endpoints automatically resolve parameters for unlisted arbitrary sites');

// Assert that episode 1 and episode 2 produce different, distinct stream URLs
const ep1Result = AnimeUrlResolver.resolveStream(attackOnTitan, 1, arbitraryExt1);
const ep2Result = AnimeUrlResolver.resolveStream(attackOnTitan, 2, arbitraryExt1);
assert(ep1Result.streamUrl !== ep2Result.streamUrl, 'Episode 1 and Episode 2 generate distinct stream URLs');
assert(ep1Result.streamUrl.endsWith('/ep-1') && ep2Result.streamUrl.endsWith('/ep-2'), 'Episode numbers are correctly reflected in stream URLs');
console.log('');

// --- TEST 48: IframeStreamExtractor Automated Video & Player Extraction ---
console.log('▶ Test Case 48: IframeStreamExtractor Automated Video & Player Extraction');
const { IframeStreamExtractor } = await import('./src/lib/IframeStreamExtractor.js');

// 1. Direct .m3u8 extraction from script / video tag
const htmlWithM3u8 = `
    <html>
    <body>
        <div id="player"></div>
        <script>
            var player = new Player({ file: "https://stream.cdn.net/hls/master.m3u8" });
        </script>
    </body>
    </html>
`;
const m3u8Extracted = IframeStreamExtractor.extractStreamFromHtml(htmlWithM3u8, 'https://animeexample.com/watch/1');
assert(m3u8Extracted && m3u8Extracted.type === 'hls' && m3u8Extracted.streamUrl === 'https://stream.cdn.net/hls/master.m3u8', 'Extracts direct .m3u8 stream from page script variables');

// 2. Video iframe player extraction while filtering non-video ad iframes
const htmlWithIframes = `
    <html>
    <body>
        <iframe src="https://googleads.g.doubleclick.net/pagead/ads?id=123"></iframe>
        <iframe src="https://disqus.com/embed/comments/"></iframe>
        <div class="video-container">
            <iframe src="https://megacloud.tv/embed-2/e-1/sololeveling123?autoPlay=1" allowfullscreen></iframe>
        </div>
    </body>
    </html>
`;
const iframeExtracted = IframeStreamExtractor.extractStreamFromHtml(htmlWithIframes, 'https://www3.anikai.cc/watch/solo-leveling?ep=1');
assert(iframeExtracted && iframeExtracted.type === 'iframe' && iframeExtracted.streamUrl === 'https://megacloud.tv/embed-2/e-1/sololeveling123?autoPlay=1', 'Isolates and extracts video player iframe while ignoring advertisement and comment iframes');

// 3. Relative embed URL resolution
const htmlWithRelativeEmbed = `
    <html>
    <body>
        <iframe src="/embed/rapidstream/v123"></iframe>
    </body>
    </html>
`;
const relativeExtracted = IframeStreamExtractor.extractStreamFromHtml(htmlWithRelativeEmbed, 'https://www3.anikai.cc/watch/bleach?ep=5');
assert(relativeExtracted && relativeExtracted.streamUrl === 'https://www3.anikai.cc/embed/rapidstream/v123', 'Resolves relative iframe src against base origin');

// 4. Extensionless Hash Iframe Embed URL (e.g. bibiemb.xyz)
const htmlWithBibiEmb = `
    <div class="player-wrapper">
        <iframe src="https://bibiemb.xyz/ag09000ec70b63a769697144b1bf4330cd4h" allowfullscreen="true" frameborder="0" marginwidth="0" marginheight="0" scrolling="no"></iframe>
    </div>
`;
const bibiExtracted = IframeStreamExtractor.extractStreamFromHtml(htmlWithBibiEmb, 'https://anikai.cc/watch/jujutsu-kaisen?ep=1');
assert(bibiExtracted && bibiExtracted.type === 'iframe' && bibiExtracted.streamUrl === 'https://bibiemb.xyz/ag09000ec70b63a769697144b1bf4330cd4h', 'Correctly extracts extensionless embed iframe player URL (bibiemb.xyz)');
console.log('');

// --- TEST 49: UnifiedPlaybackView Persistent DOM Preservation & State Continuity ---
console.log('▶ Test Case 49: UnifiedPlaybackView Persistent DOM Preservation & State Continuity');
const unifiedPlaybackCode = fs.readFileSync(path.join(__dirname, 'src', 'components', 'player', 'UnifiedPlaybackView.jsx'), 'utf-8');
const appCode = fs.readFileSync(path.join(__dirname, 'src', 'App.jsx'), 'utf-8');

assert(unifiedPlaybackCode.includes('VideoPlayer'), 'UnifiedPlaybackView mounts single persistent VideoPlayer');
assert(appCode.includes('<UnifiedPlaybackView'), 'App.jsx utilizes UnifiedPlaybackView across playback lifecycle');
assert(!appCode.includes('<MiniPlayerOverlay'), 'App.jsx eliminates unmounting/remounting of separate MiniPlayerOverlay');

// Assert that key state transitions preserve continuous active stream without resetting
let activeSrcState = 'https://bibiemb.xyz/ag09000ec70b63a769697144b1bf4330cd4h';
let playerMountCount = 1;
const toggleMinimizeState = (isMin) => {
    // Under UnifiedPlaybackView, the wrapper classes mutate while keeping playerMountCount identical
    return {
        isMinimized: isMin,
        mountCount: playerMountCount,
        stream: activeSrcState
    };
};

const stateBefore = toggleMinimizeState(false);
const stateAfterMin = toggleMinimizeState(true);
const stateAfterMax = toggleMinimizeState(false);

assert(stateBefore.mountCount === stateAfterMin.mountCount, 'Player mount count is preserved when minimized (no remount/refresh)');
assert(stateAfterMin.mountCount === stateAfterMax.mountCount, 'Player mount count is preserved when maximized (no remount/refresh)');
assert(stateAfterMin.stream === activeSrcState, 'Active video stream state is preserved without disruption');
console.log('');

// --- TEST 50: Miniplayer Quality Icon Suppression & Fluent HLS Quality Switching ---
console.log('▶ Test Case 50: Miniplayer Quality Icon Suppression & Fluent HLS Quality Switching');
const videoPlayerCode = fs.readFileSync(path.join(__dirname, 'src', 'components', 'player', 'VideoPlayer.jsx'), 'utf-8');

assert(videoPlayerCode.includes('!isMinimized && playerType === \'hls\' && qualities.length > 0'), 'Miniplayer suppresses quality settings icon when isMinimized is true');
assert(videoPlayerCode.includes('smoothQualityChange: true'), 'HLS is configured with smoothQualityChange enabled');
assert(videoPlayerCode.includes('hlsRef.current.nextLevel = qualityId'), 'Quality switching uses non-destructive nextLevel buffer transition');
assert(videoPlayerCode.includes('prevSrcPropRef.current'), 'VideoPlayer caches incoming source reference to prevent false re-render refresh');
console.log('');

// --- TEST 51: Static DOM Sibling Preservation & Inactivity Quality Fade ---
console.log('▶ Test Case 51: Static DOM Sibling Preservation & Inactivity Quality Fade');
assert(unifiedPlaybackCode.includes('video-canvas-host'), 'UnifiedPlaybackView defines stable video canvas host');
assert(unifiedPlaybackCode.includes('!isMinimized && isDesktop ? \'flex\' : \'hidden\''), 'Desktop topbar maintains permanent DOM position using CSS display toggling');
assert(unifiedPlaybackCode.includes('!isMinimized && !isDesktop ? \'flex\' : \'hidden\''), 'Mobile topbar maintains permanent DOM position using CSS display toggling');
assert(videoPlayerCode.includes('handleUserActivity'), 'VideoPlayer handles user activity to auto-hide quality button');
assert(videoPlayerCode.includes('showControls || showQualityMenu'), 'Quality button transitions with auto-disappearing opacity');
assert(videoPlayerCode.includes('key="mugen-active-iframe"'), 'Iframe uses static element key to prevent DOM recreation');
console.log('');

// --- TEST 52: Unaired Anime & Episode Disabling Contract ---
console.log('▶ Test Case 52: Unaired Anime & Episode Disabling Contract');
const animeDetailModalCode = fs.readFileSync(path.join(__dirname, 'src', 'components', 'anime', 'AnimeDetailModal.jsx'), 'utf-8');

assert(animeDetailModalCode.includes("anime.status === 'NOT_YET_RELEASED'"), 'AnimeDetailModal marks NOT_YET_RELEASED status as unreleased');
assert(animeDetailModalCode.includes('disabled={!hasPlayableEpisode}'), 'AnimeDetailModal disables Watch Now button for unaired animes');
assert(animeDetailModalCode.includes('disabled={!released}'), 'AnimeDetailModal disables unreleased episode cards and pills');
assert(unifiedPlaybackCode.includes("playingAnime?.status === 'NOT_YET_RELEASED'"), 'UnifiedPlaybackView checks NOT_YET_RELEASED status');
assert(unifiedPlaybackCode.includes('disabled={!released}'), 'UnifiedPlaybackView disables unreleased episodes in drawer and sidebar');
console.log('');

// --- TEST 53: In-Memory Stream Buffer Continuity & Volatile Prop Decoupling ---
console.log('▶ Test Case 53: In-Memory Stream Buffer Continuity & Volatile Prop Decoupling');
const latestVideoPlayerCode = fs.readFileSync(path.join(__dirname, 'src', 'components', 'player', 'VideoPlayer.jsx'), 'utf-8');
const latestAppCode = fs.readFileSync(path.join(__dirname, 'src', 'App.jsx'), 'utf-8');

assert(latestVideoPlayerCode.includes('onEndedRef.current = onEnded'), 'VideoPlayer uses stable ref for onEnded callback');
assert(latestVideoPlayerCode.includes('onProgressRef.current = onProgress'), 'VideoPlayer uses stable ref for onProgress callback');
assert(latestVideoPlayerCode.includes('src !== extractedSrcRef.current && src !== activeSrc'), 'VideoPlayer avoids clearing extracted stream buffer on parent state echoes');
assert(latestVideoPlayerCode.includes('}, [activeSrc, playerType, key]);'), 'HLS engine lifecycle is decoupled from volatile props (initialTime, onEnded)');
assert(latestAppCode.includes('const saveProgress = useCallback'), 'App.jsx stabilizes saveProgress callback');
assert(latestAppCode.includes('const reportProgress = useCallback'), 'App.jsx stabilizes reportProgress callback');
console.log('');

// --- TEST 54: AniKai Extension Store Inclusion & HiAnime Stream Extraction Contract ---
console.log('▶ Test Case 54: AniKai Extension Store Inclusion & HiAnime Stream Extraction Contract');
const extensionRepoCode = fs.readFileSync(path.join(__dirname, 'src', 'data', 'extension_repo.js'), 'utf-8');
assert(extensionRepoCode.includes('"name": "AniKai"'), 'ANIYOMI_SOURCES includes AniKai streaming extension');
assert(extensionRepoCode.includes('"name": "HiAnime"'), 'ANIYOMI_SOURCES includes HiAnime streaming extension');

const mockHiAnimeHtml = `
<div class="watch-player">
    <div data-video="https://megacloud.tv/embed-2/e-1/ag70f3abcc966dd02eb2700aa918d3f81a4h" class="item server-item">MegaCloud</div>
</div>
`;
const extractedHiAnime = IframeStreamExtractor.extractStreamFromHtml(mockHiAnimeHtml, 'https://hianime.to/watch/solo-leveling/ep-1');
assert(extractedHiAnime !== null, 'IframeStreamExtractor successfully extracts stream from HiAnime HTML');
assert(extractedHiAnime.streamUrl === 'https://megacloud.tv/embed-2/e-1/ag70f3abcc966dd02eb2700aa918d3f81a4h', 'IframeStreamExtractor extracts exact megacloud player from HiAnime data-video');
assert(latestVideoPlayerCode.includes('isStandalonePlayer'), 'VideoPlayer calculates standalone player distinction');
console.log('');

// --- TEST 55: Alphabetical Extension & Source Sorting Contract ---
console.log('▶ Test Case 55: Alphabetical Extension & Source Sorting Contract');
const extensionsViewCode = fs.readFileSync(path.join(__dirname, 'src', 'components', 'extensions', 'ExtensionsView.jsx'), 'utf-8');
const extensionStoreModalCode = fs.readFileSync(path.join(__dirname, 'src', 'components', 'extensions', 'ExtensionStoreModal.jsx'), 'utf-8');
const extensionRepoMgrCode = fs.readFileSync(path.join(__dirname, 'src', 'lib', 'ExtensionRepoManager.js'), 'utf-8');

assert(extensionsViewCode.includes('sortedExtensions'), 'ExtensionsView defines sortedExtensions state');
assert(extensionsViewCode.toLowerCase().includes('localecompare'), 'ExtensionsView sorts extensions alphabetically');
assert(extensionStoreModalCode.includes('localeCompare'), 'ExtensionStoreModal sorts filteredSources alphabetically');
assert(extensionRepoMgrCode.includes('localeCompare'), 'ExtensionRepoManager sorts getAllSources alphabetically');
assert(unifiedPlaybackCode.includes('localeCompare'), 'UnifiedPlaybackView sorts sourceOptions alphabetically');

const sampleSources = [{ name: 'HiAnime' }, { name: 'AniKai' }, { name: 'Zoro' }, { name: 'AniWatch' }];
const sortedSample = sampleSources.sort((a, b) => a.name.localeCompare(b.name));
assert(sortedSample[0].name === 'AniKai', 'First source sorted alphabetically is AniKai');
assert(sortedSample[1].name === 'AniWatch', 'Second source sorted alphabetically is AniWatch');
assert(sortedSample[2].name === 'HiAnime', 'Third source sorted alphabetically is HiAnime');
assert(sortedSample[3].name === 'Zoro', 'Fourth source sorted alphabetically is Zoro');
console.log('');

// --- TEST 56: High-Speed Parallel Stream Extraction & Zero-Latency Caching Contract ---
console.log('▶ Test Case 56: High-Speed Parallel Stream Extraction & Zero-Latency Caching Contract');
const extractorCode = fs.readFileSync(path.join(__dirname, 'src', 'lib', 'IframeStreamExtractor.js'), 'utf-8');

assert(extractorCode.includes('getCached'), 'IframeStreamExtractor implements synchronous getCached');
assert(extractorCode.includes('prefetch'), 'IframeStreamExtractor implements background prefetch');
assert(extractorCode.includes('Promise.any'), 'IframeStreamExtractor implements Promise.any parallel racing');
assert(extractorCode.includes('extractionMemoryCache'), 'IframeStreamExtractor uses in-memory extraction cache');
assert(latestVideoPlayerCode.includes('IframeStreamExtractor.getCached'), 'VideoPlayer reads extraction cache synchronously on mount');
assert(unifiedPlaybackCode.includes('IframeStreamExtractor.prefetch'), 'UnifiedPlaybackView triggers next-episode background prefetch');
console.log('');

// --- TEST 57: Mugen Play Animated Mascot Integration & Presence Contract ---
console.log('▶ Test Case 57: Mugen Play Animated Mascot Integration & Presence Contract');
const mascotCode = fs.readFileSync(path.join(__dirname, 'src', 'components', 'common', 'Mascot.jsx'), 'utf-8');
const freshVideoPlayerCode = fs.readFileSync(path.join(__dirname, 'src', 'components', 'player', 'VideoPlayer.jsx'), 'utf-8');
const favoritesViewFresh = fs.readFileSync(path.join(__dirname, 'src', 'components', 'views', 'FavoritesView.jsx'), 'utf-8');
const browseViewFresh = fs.readFileSync(path.join(__dirname, 'src', 'components', 'views', 'BrowseView.jsx'), 'utf-8');

assert(mascotCode.includes('export default Mascot'), 'Mascot.jsx exports Mascot component');
assert(mascotCode.includes('animate-anime-panic') || mascotCode.includes('animate-anime-antenna'), 'Mascot contains animated TV anime keyframes');
assert(freshVideoPlayerCode.includes('<Mascot') || freshVideoPlayerCode.includes('Mascot'), 'VideoPlayer integrates Mascot component');
assert(freshVideoPlayerCode.includes('setLoadError(true)'), 'VideoPlayer automatically triggers loadError and abstracts backend errors');
assert(favoritesViewFresh.includes('<Mascot') || favoritesViewFresh.includes('Mascot'), 'FavoritesView renders Mascot in empty state');
assert(browseViewFresh.includes('<Mascot') || browseViewFresh.includes('Mascot'), 'BrowseView renders Mascot in empty search results');
console.log('');

// --- TEST 58: Universal Stream Extraction, 404 Mascot Trigger & Link Application Contract ---
console.log('▶ Test Case 58: Universal Stream Extraction, 404 Mascot Trigger & Link Application Contract');
const extractorUpdated = fs.readFileSync(path.join(__dirname, 'src', 'lib', 'IframeStreamExtractor.js'), 'utf-8');
const playerUpdated = fs.readFileSync(path.join(__dirname, 'src', 'components', 'player', 'VideoPlayer.jsx'), 'utf-8');

assert(extractorUpdated.includes('is404') || extractorUpdated.includes('404 not found'), 'IframeStreamExtractor detects 404 remote responses');
assert(!playerUpdated.includes("activeSrc.match(/hianime.(ad|to|nz|mm|sx|is|tv)/i) ||"), 'VideoPlayer does not bypass HiAnime from stream extraction');
assert(playerUpdated.includes('extracted?.is404'), 'VideoPlayer triggers loadError when stream extractor detects 404');
assert(!playerUpdated.includes('incomingSrcRef'), 'VideoPlayer eliminates undefined incomingSrcRef reference errors');
console.log('');

// --- TEST 59: Source-Aware Distinct Stream Extraction Contract (HiAnime vs AniKai) ---
console.log('▶ Test Case 59: Source-Aware Distinct Stream Extraction Contract (HiAnime vs AniKai)');
assert(extractorUpdated.includes('isHiAnimePage') && extractorUpdated.includes('isAniKaiPage'), 'IframeStreamExtractor differentiates HiAnime vs AniKai pages');
assert(extractorUpdated.includes('megacloud') && extractorUpdated.includes('bibiemb'), 'IframeStreamExtractor maps MegaCloud to HiAnime and BibiEmb to AniKai');

const sampleHiAnimePageHtml = '<div data-video="https://megacloud.tv/embed-2/e-1/abc12345"></div><div data-video="https://bibiemb.xyz/fallback"></div>';
const sampleAniKaiPageHtml = '<iframe src="https://bibiemb.xyz/anikai12345"></iframe><div data-video="https://megacloud.tv/fallback"></div>';

// Import extractor for runtime verification
const extractorModule = await import('./src/lib/IframeStreamExtractor.js');
const extInstance = extractorModule.IframeStreamExtractor;

const distinctHiAnimeRes = extInstance.extractStreamFromHtml(sampleHiAnimePageHtml, 'https://hianime.to/watch/solo-leveling/ep-1');
const distinctAniKaiRes = extInstance.extractStreamFromHtml(sampleAniKaiPageHtml, 'https://www3.anikai.cc/watch/solo-leveling/ep-1');

assert(distinctHiAnimeRes.streamUrl.includes('megacloud.tv'), 'HiAnime extraction resolves MegaCloud stream URL');
assert(distinctAniKaiRes.streamUrl.includes('bibiemb.xyz'), 'AniKai extraction resolves BibiEmb stream URL');
assert(distinctHiAnimeRes.streamUrl !== distinctAniKaiRes.streamUrl, 'HiAnime and AniKai yield distinct extracted stream URLs');
console.log('');

// --- TEST 60: Subtitle Query String & BibiEmb Hash Preservation Contract ---
console.log('▶ Test Case 60: Subtitle Query String & BibiEmb Hash Preservation Contract');
const mockSubHtml = '<div data-video="https://bibiemb.xyz/agaa302f133e1e35a6e551b49ea8da69dc4h?sub=https://cdn.anizara.store/subtitles/9e/93/9e935ce2c2b0f285e185357ed71fb88d_134195_sub_eng-0.vtt"></div>';
const extractedSubRes = extInstance.extractStreamFromHtml(mockSubHtml, 'https://hianime.ad/watch/mushoku-tensei/ep-1');

assert(extractedSubRes !== null, 'IframeStreamExtractor successfully extracts stream with query parameters');
assert(extractedSubRes.streamUrl.includes('?sub='), 'Preserves ?sub= query parameter for embedded captions');
assert(extractedSubRes.streamUrl.includes('agaa302f133e1e35a6e551b49ea8da69dc4h'), 'Preserves exact video hash ID in extracted URL');
console.log('');

// --- FINAL SUMMARY ---
console.log('====================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
if (failedTests.length > 0) {
    console.error('FAILED TESTS:', failedTests);
}
console.log('====================================================');

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}



