import { defineConfig, type Plugin } from 'vite';
import { renderJsonLd, renderStaticContent } from './src/content/renderStatic.ts';

/** Injects the semantic content + JSON-LD at build/dev time (doc 8 §11: lightweight, indexable payload). */
function staticContent(): Plugin {
  return {
    name: 'pz-static-content',
    transformIndexHtml(html) {
      return html.replace('<!--PZ_STATIC_CONTENT-->', renderStaticContent()).replace('<!--PZ_JSONLD-->', renderJsonLd());
    },
  };
}

export default defineConfig({
  plugins: [staticContent()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: { host: '127.0.0.1' },
});
