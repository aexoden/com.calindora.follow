/* eslint-disable sort-keys */
import axios, { AxiosError } from "axios";
import { z } from "zod";

const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }

    return "";
};

const API_BASE_URL = getApiBaseUrl();

const errorResponseSchema = z.object({
    code: z.string(),
    success: z.literal(false),
    reason: z.string(),
});

export type ApiErrorResponse = z.infer<typeof errorResponseSchema>;

export class ApiError extends Error {
    status: number;
    responseData?: unknown;

    constructor(message: string, status: number, responseData?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.responseData = responseData;
    }
}

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const status = error.response?.status ?? 500;
        let errorMessage = "An unexpected error occurred";

        if (error.response?.data) {
            try {
                const errorData = errorResponseSchema.parse(error.response.data);
                errorMessage = errorData.reason;
            } catch (_error) {
                errorMessage = "Failed to parse error response";
            }
        }

        return Promise.reject(new ApiError(errorMessage, status, error.response?.data));
    },
);

const reportSchema = z.object({
    id: z.string(),
    timestamp: z.string(),
    submit_timestamp: z.string().nullable(),
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    altitude: z.coerce.number(),
    speed: z.coerce.number(),
    bearing: z.coerce.number(),
    accuracy: z.coerce.number(),
});

export type Report = z.infer<typeof reportSchema>;

export interface ReportParams {
    since?: string;
    until?: string;
    limit?: number;
    order?: "asc" | "desc";
}

export const apiService = {
    async checkDeviceExists(deviceKey: string): Promise<boolean> {
        try {
            const params = { limit: 1 };
            await api.get(`/api/v1/devices/${deviceKey}/reports`, { params });
            return true;
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return false;
            }

            throw error;
        }
    },

    async getReport(deviceKey: string, reportId: string): Promise<Report> {
        try {
            const response = await api.get<Report>(`/api/v1/devices/${deviceKey}/reports/${reportId}`);
            return await reportSchema.parseAsync(response.data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ApiError("Invalid report data received from server", 422, error.format());
            }

            throw error;
        }
    },

    async getReports(deviceKey: string, params: ReportParams = {}): Promise<Report[]> {
        try {
            const response = await api.get<Report[]>(`/api/v1/devices/${deviceKey}/reports`, { params });
            return await z.array(reportSchema).parseAsync(response.data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ApiError("Invalid report data received from server", 422, error.format());
            }

            throw error;
        }
    },
};
