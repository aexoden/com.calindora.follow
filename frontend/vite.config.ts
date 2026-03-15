import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
    base: process.env.NODE_ENV === "production" ? "/static/app" : "/",
    build: {
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: "maps",
                            test: /node_modules[\\/]@react-google-maps/,
                        },
                        {
                            name: "react",
                            test: /node_modules[\\/](react|react-dom)/,
                        },
                    ],
                    minSize: 20000,
                },
            },
        },
    },
    plugins: [react(), tailwindcss()],
});
