/* eslint-disable sort-keys */
import { create } from "zustand";
import { Report } from "../services/api";

export type ColorMode = "time" | "speed" | "elevation";

export interface Trip {
    reports: Report[];
}

interface FollowState {
    colorMode: ColorMode;
    autoCenter: boolean;
    trips: Trip[];
    lastReport: Report | null;

    setColorMode: (mode: ColorMode) => void;
    setAutoCenter: (autoCenter: boolean) => void;
    addReports: (reports: Report[]) => void;
    clearReports: () => void;
}

// Define the threshold for splitting trips (2 minutes)
const TRIP_SPLIT_THRESHOLD = 120 * 1000;

export const useFollowStore = create<FollowState>((set, get) => ({
    autoCenter: true,
    colorMode: "time",
    lastReport: null,
    trips: [],

    setColorMode: (mode) => {
        set({ colorMode: mode });
    },
    setAutoCenter: (autoCenter) => {
        set({ autoCenter });
    },

    clearReports: () => {
        set({ trips: [], lastReport: null });
    },

    addReports: (reports) => {
        if (reports.length === 0) return;

        const state = get();

        const updatedTrips = [...state.trips];

        for (const report of reports) {
            if (updatedTrips.length === 0 || !updatedTrips[updatedTrips.length - 1].reports.length) {
                updatedTrips.push({ reports: [report] });
            } else {
                const lastTrip = updatedTrips[updatedTrips.length - 1];
                const lastReport = lastTrip.reports[lastTrip.reports.length - 1];

                const timeDiff = new Date(report.timestamp).getTime() - new Date(lastReport.timestamp).getTime();

                if (timeDiff < TRIP_SPLIT_THRESHOLD) {
                    lastTrip.reports.push(report);
                } else {
                    updatedTrips.push({ reports: [report] });
                }
            }
        }

        const lastReport = reports[reports.length - 1];

        set({
            trips: updatedTrips,
            lastReport,
        });
    },
}));
