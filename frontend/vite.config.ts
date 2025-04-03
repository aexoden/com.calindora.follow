import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
    base: process.env.NODE_ENV === "production" ? "/static/app" : "/",
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    maps: ["@react-google-maps/api"],
                    react: ["react", "react-dom"],
                    router: ["react-router"],
                },
            },
        },
    },
    plugins: [react(), tailwindcss()],
});
