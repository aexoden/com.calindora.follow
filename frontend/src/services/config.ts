import axios from "axios";
import { z } from "zod";

const frontendConfigSchema = z.object({
    maps_api_key: z.string(),
});

export type FrontendConfig = z.infer<typeof frontendConfigSchema>;

const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }

    return "";
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
});

class ConfigService {
    private static instance: ConfigService | undefined;
    private config: FrontendConfig | null = null;
    private isLoading = false;
    private loadPromise: Promise<FrontendConfig> | null = null;

    private constructor() {
        // Private constructor to enforce singleton pattern
    }

    public static getInstance(): ConfigService {
        ConfigService.instance ??= new ConfigService();

        return ConfigService.instance;
    }

    public async getConfig(): Promise<FrontendConfig> {
        if (this.config) {
            return this.config;
        }

        if (this.isLoading && this.loadPromise) {
            return this.loadPromise;
        }

        this.isLoading = true;
        this.loadPromise = this.loadConfig();

        try {
            this.config = await this.loadPromise;
            return this.config;
        } finally {
            this.isLoading = false;
        }
    }

    private async loadConfig(): Promise<FrontendConfig> {
        try {
            // First try to use Vite's environment variables (for development)
            if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
                return {
                    maps_api_key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
                };
            }

            // Otherwise, fetch the config from the backend
            const response = await api.get("/api/v1/frontend_config");
            return frontendConfigSchema.parse(response.data);
        } catch (error) {
            console.error("Failed to load frontend configuration", error);

            return {
                maps_api_key: "",
            };
        }
    }
}

export const configService = ConfigService.getInstance();
