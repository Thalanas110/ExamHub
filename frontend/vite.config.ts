import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

const devPhpProxyTarget = process.env.VITE_DEV_PHP_PROXY_TARGET?.trim() || 'http://localhost'
const devPhpProxyBasePath = (process.env.VITE_DEV_PHP_PROXY_BASE_PATH?.trim() || '/group8/api/index.php')
  .replace(/\/+$/, '')

export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
      },
      prerender: {
        enabled: false,
      },
    }),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used - do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: devPhpProxyTarget,
        changeOrigin: true,
        secure: false,
        rewrite: (requestPath) => `${devPhpProxyBasePath}${requestPath.replace(/^\/api/, '')}`,
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
