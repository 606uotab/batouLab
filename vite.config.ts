import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(() => ({
  plugins: [react()],
                                   resolve: {
                                     alias: {
                                       "@": fileURLToPath(new URL("./src", import.meta.url)),
                                   "@components": fileURLToPath(new URL("./src/components", import.meta.url)),
                                     },
                                   },
                                   clearScreen: false,
                                   server: {
                                     port: 1420,
                                   strictPort: true,
                                   host: host || false,
                                   hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
                                   watch: { ignored: ["**/src-tauri/**"] },
                                   },
}));
