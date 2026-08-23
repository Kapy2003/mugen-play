import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react({
            babel: {
                plugins: [
                    ["babel-plugin-react-compiler", {}],
                ],
            },
        }),
        tailwindcss(),
    ],
    server: {
        host: true,
        cors: true
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/hls.js')) {
                        return 'vendor-hls';
                    }
                    if (id.includes('node_modules/lucide-react')) {
                        return 'vendor-icons';
                    }
                    if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                        return 'vendor-react';
                    }
                }
            }
        }
    }
})
