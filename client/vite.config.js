import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFile } from 'node:fs/promises';

// Vite's dev import middleware rejects public modules marked with ?import.
// Serve only this fixed teaching asset unchanged, matching the production copy.
// Do not relax the public-directory guard globally or serve user-selected files.
function nativeConceptDemo() {
  return {
    name: 'native-concept-demo',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/demos/javascript-concepts.mjs') return next();
        try {
          const source = await readFile(new URL('./public/demos/javascript-concepts.mjs', import.meta.url));
          res.setHeader('Content-Type', 'text/javascript');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(source);
        } catch (error) { next(error); }
      });
    },
  };
}

export default defineConfig({
  plugins: [nativeConceptDemo(), react(), tailwindcss()],
});
