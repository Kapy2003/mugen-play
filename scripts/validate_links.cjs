
const fs = require('fs');
const https = require('https');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../data-dump/anime_az_list.csv');
const BASE_URL = 'https://hianimez.live';
const CONCURRENCY = 25;
const TIMEOUT_MS = 10000;

function parseCSV(text) {
    const lines = text.split('\n');
    const results = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        let watchUrl = parts.find(p => p.startsWith('/watch/'));
        let title = parts[0];
        if (watchUrl) results.push({ title, watchUrl, originalLine: line });
    }
    return results;
}

function check(url, redirects = 0) {
    return new Promise((resolve) => {
        if (redirects > 5) {
            resolve({ ok: false, status: 'TOO_MANY_REDIRECTS' });
            return;
        }
        const req = https.request(url, { method: 'HEAD', timeout: TIMEOUT_MS }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const newUrl = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : BASE_URL + res.headers.location;

                check(newUrl, redirects + 1).then(resolve);
            } else {
                // Check if it's the home page or root
                try {
                    const urlObj = new URL(url);
                    const isHome = urlObj.pathname === '/home' || urlObj.pathname === '/';

                    if (res.statusCode === 200 && !isHome) {
                        resolve({ ok: true, status: 200 });
                    } else {
                        resolve({ ok: false, status: isHome ? 'REDIRECTED_TO_HOME' : res.statusCode, finalUrl: url });
                    }
                } catch (e) {
                    resolve({ ok: false, status: 'URL_PARSE_ERROR', error: e.message });
                }
            }
        });
        req.on('error', (e) => resolve({ ok: false, status: 'ERROR', error: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 'TIMEOUT' }); });
        req.end();
    });
}

async function processBatch(batch) {
    const promises = batch.map(async (item) => {
        const fullUrl = `${BASE_URL}${item.watchUrl}`;
        const result = await check(fullUrl);
        return { ...item, ...result, fullUrl };
    });
    return Promise.all(promises);
}

async function main() {
    console.log('Reading CSV...');
    if (!fs.existsSync(CSV_PATH)) {
        console.error('CSV file not found');
        process.exit(1);
    }
    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const items = parseCSV(content);
    console.log(`Parsed ${items.length} items. Starting validation...`);

    const brokenLinks = [];
    const total = items.length;

    for (let i = 0; i < total; i += CONCURRENCY) {
        const batch = items.slice(i, i + CONCURRENCY);
        const results = await processBatch(batch);

        results.forEach(res => {
            if (!res.ok) {
                console.log(`[BROKEN] "${res.title}" -> ${res.status}`);
                brokenLinks.push(res);
            }
        });

        if ((i + CONCURRENCY) % 100 === 0 || i + CONCURRENCY >= total) {
            console.log(`Progress: ${Math.min(i + CONCURRENCY, total)}/${total} checked. Broken so far: ${brokenLinks.length}`);
        }
        await new Promise(r => setTimeout(r, 50));
    }

    console.log('\n--- BROKEN LINKS FOUND ---');
    console.log(`Total Broken: ${brokenLinks.length}`);

    console.log('\n--- CONSTANTS OVERRIDE SNIPPET ---');
    console.log('export const ANIME_SLUG_OVERRIDES = {');

    brokenLinks.forEach(link => {
        const safeTitle = link.title.replace(/'/g, "\\'");
        // Extract slug from bad URL for context
        // /watch/bad-slug -> bad-slug
        const badSlug = link.watchUrl.split('/').pop() || 'unknown';
        console.log(`    '${safeTitle}': 'FIXME_${badSlug}', // Broken: ${link.watchUrl} (${link.status})`);
    });
    console.log('};');
}

main().catch(console.error);
