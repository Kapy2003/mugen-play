import { Extension } from '../lib/ExtensionSDK';

/**
 * TEMPLATE SOURCE
 * Copy this file to create a new extension.
 * Example: `AnimeKaiSource.js`
 */
export class TemplateSource extends Extension {
    constructor() {
        super({
            id: 'my_custom_source',       // Unique ID
            name: 'My Source Name',       // Display Name
            version: '1.0.0',
            icon: 'globe',                // icon name from lucide-react
            type: 'source'
        });
    }

    // 1. Get Trending Anime
    async getTrending() {
        // Fetch data from real site API
        // const response = await fetch('https://api.mysite.com/trending');
        // const data = await response.json();

        // Return array of objects matching your Card format
        return [
            {
                id: '1',
                title: 'Example Anime',
                bannerUrl: '...',
                // ...
            }
        ];
    }

    // 2. Search Logic
    async search() {
        // Fetch search results
        // ...
        return [];
    }

    // 3. Get Stream
    async getStream() {
        // Return the .m3u8 or .mp4 URL
        return "https://example.com/video.m3u8";
    }
}
