import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

// Custom plugin to copy the AudioWorklet processor file into the build output.
// AudioWorklet.addModule() requires a real URL — it can't use bundled modules.
function copyWorkletPlugin() {
  return {
    name: 'copy-noise-suppressor-worklet',
    buildStart() {
      // Copy to public/ so it's available in both dev and prod
      try {
        const src = resolve(
          __dirname,
          'node_modules/@sapphi-red/web-noise-suppressor/workletProcessors.js'
        )
        const dest = resolve(__dirname, 'public/workletProcessors.js')
        copyFileSync(src, dest)
      } catch (e) {
        console.warn('Could not copy noise suppressor worklet:', e)
      }
    },
  }
}

// Also copy the WASM file which the worklet needs at runtime
function copyWasmPlugin() {
  return {
    name: 'copy-noise-suppressor-wasm',
    buildStart() {
      try {
        const wasmSrc = resolve(
          __dirname,
          'node_modules/@sapphi-red/web-noise-suppressor/rnnoise.wasm'
        )
        const wasmDest = resolve(__dirname, 'public/rnnoise.wasm')
        copyFileSync(wasmSrc, wasmDest)
      } catch (e) {
        // WASM file may be named differently — not fatal, suppressor falls back gracefully
        console.warn('Could not copy rnnoise.wasm:', e)
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    copyWorkletPlugin(),
    copyWasmPlugin(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    }
  }
})