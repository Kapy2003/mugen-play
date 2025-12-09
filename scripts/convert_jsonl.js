
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../data-dump/anime_az_list_with_iframes.jsonl');
const OUTPUT_FILE = path.join(__dirname, '../src/data/anime_data.json');

async function processLineByLine() {
    const fileStream = fs.createReadStream(INPUT_FILE);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let animeData = {};

    // 1. Try to load existing data to preserve "old" entries
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            console.log(`Reading existing data from ${OUTPUT_FILE}...`);
            const raw = fs.readFileSync(OUTPUT_FILE, 'utf-8');
            animeData = JSON.parse(raw);
            console.log(`Loaded ${Object.keys(animeData).length} existing entries.`);
        } catch (e) {
            console.error('Error reading existing file, starting fresh.', e);
        }
    }

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const entry = JSON.parse(line);
            let title = entry.title;
            let slug = entry.slug;

            // 2. [NEW] Verify Slug against watch_url
            // The user reported issues where the scraped slug might be wrong (e.g. "hackthe-movie..." vs "hackbeyond-the-world")
            // but the watch_url was correct ("/watch/hackbeyond-the-world").
            if (entry.watch_url) {
                // watch_url format expected: /watch/SLUG or /watch/SLUG/ep-...
                // We'll simplisticly take the part after /watch/ and before the next /
                const parts = entry.watch_url.split('/');
                const watchIndex = parts.indexOf('watch');
                if (watchIndex !== -1 && parts[watchIndex + 1]) {
                    const urlSlug = parts[watchIndex + 1];
                    if (urlSlug && urlSlug !== slug) {
                        console.warn(`[Slug Correction] Mismatch for "${title}":`);
                        console.warn(`  JSONL Slug: ${slug}`);
                        console.warn(`  URL Slug:   ${urlSlug} (Using this one)`);
                        slug = urlSlug;
                    }
                }
            }

            // Clean title if it looks like metadata (e.g., "12TV", "1OVA")
            // Heuristic: if title starts with digits and ends with "TV", "OVA", "Special", etc., use slug or clean it
            // For now, let's just use the clean title logic relative to what the user prompt implied or just keep it simple.
            // The prompt said: "Generate readable titles from slugs if scraped titles are invalid (e.g., '12TV' -> 'Hackroots')"
            // Looking at the data, "12TV" corresponds to slug "hacklegend-of-the-twilight". 
            // It seems the "title" field in jsonl is garbage for some entries.
            // A safer bet is to format the slug into a Title Case string if the title looks suspicious.

            const suspiciousPattern = /^\d+(TV|OVA|Special|Movie|ONA)$/;
            if (suspiciousPattern.test(title)) {
                title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            }

            // Map embed_url to episodes array
            // embed_url is an object {"1": "url", "2": "url"}
            const episodes = [];
            if (entry.embed_url) {
                Object.entries(entry.embed_url).forEach(([epNum, url]) => {
                    episodes.push({
                        number: parseInt(epNum),
                        url: url
                    });
                });
            }
            // Sort episodes by number
            episodes.sort((a, b) => a.number - b.number);

            animeData[slug] = {
                id: slug,
                title: title,
                description: entry.description || '',
                episodes: episodes
            };

        } catch (e) {
            console.error(`Error parsing line: ${line} `, e);
        }
    }

    // Write output
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(animeData, null, 2));
    console.log(`Converted data saved to ${OUTPUT_FILE} `);
    console.log(`Total entries: ${Object.keys(animeData).length} `);
}

processLineByLine();

