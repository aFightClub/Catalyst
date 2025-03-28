import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 3001,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          jsonWorker: ["monaco-editor/esm/vs/language/json/json.worker"],
          cssWorker: ["monaco-editor/esm/vs/language/css/css.worker"],
          htmlWorker: ["monaco-editor/esm/vs/language/html/html.worker"],
          tsWorker: ["monaco-editor/esm/vs/language/typescript/ts.worker"],
          editorWorker: ["monaco-editor/esm/vs/editor/editor.worker"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
