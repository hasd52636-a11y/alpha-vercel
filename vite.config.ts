import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3003,
    host: '0.0.0.0',
    open: true,
    hmr: {
      timeout: 30000,
      overlay: true
    },
    watch: {
      usePolling: false,
      interval: 100,
      binaryInterval: 300,
      ignored: ['**/node_modules/**', '**/dist/**']
    },
    proxy: {
      // API代理配置 - 在开发环境中代理到本地API服务器
      // 在生产环境中，API由Vercel Serverless Functions处理，不需要代理
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending request to the target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received response from the target:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 优化chunk分割
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('react-router')) {
              return 'router';
            }
            if (id.includes('lucide-react') || id.includes('recharts')) {
              return 'ui';
            }
            if (id.includes('zhipuai')) {
              return 'ai';
            }
            if (id.includes('d3')) {
              return 'graph';
            }
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  plugins: [
    react({
      fastRefresh: true,
      jsxRuntime: 'automatic',
      babel: {
        plugins: [
          // 可选的Babel插件
        ]
      }
    })
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'zhipuai'
    ],
    exclude: [],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.API_KEY': JSON.stringify(''),
    'process.env.ZHIPU_API_KEY': JSON.stringify('')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@src': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'components'),
      '@services': path.resolve(__dirname, 'services'),
      '@utils': path.resolve(__dirname, 'utils')
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  },
  cacheDir: '.vite-cache',
  envDir: '.',
  envPrefix: ['VITE_', 'REACT_']
});