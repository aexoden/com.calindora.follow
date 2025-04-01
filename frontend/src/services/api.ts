/* eslint-disable sort-keys */
import axios from "axios";
import { z } from "zod";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
});

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
    async checkDeviceExists(deviceKey: string) {
        try {
            const params = { limit: 1 };
            await api.get(`/api/v1/devices/${deviceKey}/reports`, { params });
            return true;
        } catch (_error) {
            return false;
        }
    },

    async getReport(deviceKey: string, reportId: string) {
        const response = await api.get<Report>(`/api/v1/devices/${deviceKey}/reports/${reportId}`);
        return reportSchema.parseAsync(response.data);
    },

    async getReports(deviceKey: string, params: ReportParams = {}) {
        const response = await api.get<Report[]>(`/api/v1/devices/${deviceKey}/reports`, { params });
        return z.array(reportSchema).parseAsync(response.data);
    },
};
