
import { AnitakuScraper } from './src/lib/AnitakuScraper.js';

async function testSearch() {
    console.log("Testing Search...");

    const queries = [
        "Hunter x Hunter",
        "Jujutsu Kaisen Season 2",
        "Jujutsu Kaisen 2nd Season"
    ];

    for (const q of queries) {
        console.log(`\n--- Searching for: "${q}" ---`);
        try {
            const results = await AnitakuScraper.search(q);
            if (results && results.length > 0) {
                console.log(`Top Result: ID="${results[0].id}", Title="${results[0].title}"`);
                console.log("All Results:", results.map(r => `${r.title} (${r.id})`).slice(0, 3));
            } else {
                console.log("No results found.");
            }
        } catch (error) {
            console.error("Search Error:", error.message);
        }
    }
}

testSearch();
