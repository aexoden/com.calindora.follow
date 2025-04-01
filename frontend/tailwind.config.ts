import type { Config } from "tailwindcss";

export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "#e6f0ff",
                    100: "#b3d1ff",
                    200: "#80b3ff",
                    300: "#4d94ff",
                    400: "#1a75ff",
                    500: "#0066cc",
                    600: "#0052a3",
                    700: "#003d7a",
                    800: "#002952",
                    900: "#001429",
                },
            },
        },
    },
} satisfies Config;
