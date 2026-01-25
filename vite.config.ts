import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import compression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: true,
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Brotli compression for production (best compression ratio)
    mode === 'production' && compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024, // Only compress files > 1KB
    }),
    // Gzip fallback for older browsers
    mode === 'production' && compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Use esbuild for fast minification
    minify: 'esbuild',
    
    // Disable source maps in production for smaller bundles
    sourcemap: false,
    
    // Chunk size warning threshold
    chunkSizeWarningLimit: 500,
    
    // Rollup options for optimal chunking
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal browser caching
        manualChunks: {
          // React core - rarely changes, cache long-term
          'vendor-react': ['react', 'react-dom'],
          
          // React Router - rarely changes
          'vendor-router': ['react-router-dom'],
          
          // Icons - large, cache separately to reduce initial JS
          'vendor-icons': ['lucide-react'],
          
          // Charting library - large, cache separately
          'vendor-charts': ['recharts'],
          
          // Radix UI components - core UI framework
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-label',
          ],
          
          // Date utilities
          'vendor-date': ['date-fns'],
          
          // TanStack Query for data fetching
          'vendor-query': ['@tanstack/react-query'],
          
          // Form handling
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
        
        // Asset file naming for efficient cache busting
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          const ext = name.split('.').pop() || '';
          
          // Images go to assets/images/
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          // Fonts go to assets/fonts/
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          // Everything else to assets/
          return `assets/[name]-[hash][extname]`;
        },
        
        // JS chunk naming for debugging and caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },
  
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'recharts',
      'lucide-react',
      'date-fns',
      'clsx',
      'tailwind-merge',
    ],
  },
  
  // CSS optimization
  css: {
    devSourcemap: false,
  },
}));
