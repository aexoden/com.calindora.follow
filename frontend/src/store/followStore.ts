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
    pruneThreshold: number;
    previousPruneThreshold: number;

    setColorMode: (mode: ColorMode) => void;
    setAutoCenter: (autoCenter: boolean) => void;
    addReports: (reports: Report[]) => void;
    clearReports: () => void;
    pruneReports: () => void;
    setPruneThreshold: (threshold: number) => void;
    shouldRefetch: () => boolean;
}

// Define the threshold for splitting trips (2 minutes)
const TRIP_SPLIT_THRESHOLD = 120 * 1000;

// Default pruning threshold (2 days)
export const DEFAULT_PRUNE_THRESHOLD = 2 * 24 * 60 * 60 * 1000;

export const useFollowStore = create<FollowState>((set, get) => ({
    autoCenter: true,
    colorMode: "time",
    lastReport: null,
    trips: [],
    pruneThreshold: DEFAULT_PRUNE_THRESHOLD,
    previousPruneThreshold: DEFAULT_PRUNE_THRESHOLD,

    setColorMode: (mode) => {
        set({ colorMode: mode });
    },
    setAutoCenter: (autoCenter) => {
        set({ autoCenter });
    },
    setPruneThreshold: (threshold) => {
        const currentThreshold = get().pruneThreshold;

        set({ pruneThreshold: threshold, previousPruneThreshold: currentThreshold });
    },

    shouldRefetch: () => {
        const { pruneThreshold, previousPruneThreshold } = get();
        return pruneThreshold > previousPruneThreshold;
    },

    clearReports: () => {
        set({ trips: [], lastReport: null });
    },

    pruneReports: () => {
        const { trips, pruneThreshold } = get();
        const now = new Date().getTime();
        const cutoffTime = now - pruneThreshold;

        const prunedTrips = trips
            .map((trip) => {
                const prunedReports = trip.reports.filter((report) => {
                    const reportTime = new Date(report.timestamp).getTime();
                    return reportTime >= cutoffTime;
                });

                return { reports: prunedReports };
            })
            .filter((trip) => trip.reports.length > 0);

        set({ trips: prunedTrips });
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

        // Prune reports after adding new ones
        get().pruneReports();
    },
}));
