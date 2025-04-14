/* eslint-disable sort-keys */
import { create } from "zustand";
import { Report } from "../services/api";
import { z } from "zod";

// Define the threshold for splitting trips (2 minutes)
const TRIP_SPLIT_THRESHOLD = 120 * 1000;

// Define the default prune threshold (2 days)
export const DEFAULT_PRUNE_THRESHOLD = 2 * 24 * 60 * 60 * 1000;

const colorModeSchema = z.enum(["time", "speed", "elevation"]);

const positionSchema = z.object({
    lat: z.number(),
    lng: z.number(),
});

const mapSettingsSchema = z.object({
    zoom: z.number().default(16),
    center: z.nullable(positionSchema.optional()).default(null),
});

const settingsSchema = z.object({
    autoCenter: z.boolean().default(true),
    colorMode: colorModeSchema.default("time"),
    pruneThreshold: z.number().default(DEFAULT_PRUNE_THRESHOLD),
    mapSettings: mapSettingsSchema.default({}),
    version: z.number().default(1),
});

const deviceSettingsSchema = z.object({
    autoCenter: z.boolean(),
    colorMode: colorModeSchema,
    pruneThreshold: z.number(),
    mapSettings: mapSettingsSchema,
    version: z.number().default(1),
});

export type ColorMode = z.infer<typeof colorModeSchema>;
export type MapSettings = z.infer<typeof mapSettingsSchema>;
type Settings = z.infer<typeof settingsSchema>;
type DeviceSettings = z.infer<typeof deviceSettingsSchema>;

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
    mapSettings: MapSettings;
    isDeviceSpecific: boolean;
    currentDeviceKey: string | null;

    setColorMode: (mode: ColorMode) => void;
    setAutoCenter: (autoCenter: boolean) => void;
    addReports: (reports: Report[]) => void;
    clearReports: () => void;
    pruneReports: () => void;
    setPruneThreshold: (threshold: number) => void;
    shouldRefetch: () => boolean;
    setMapSettings: (settings: Partial<MapSettings>) => void;
    hasDeviceSettings: (deviceKey: string) => boolean;
    loadDeviceSettings: (deviceKey: string) => boolean;
    removeDeviceSettings: (deviceKey: string) => void;
    saveDeviceSettings: (deviceKey: string) => void;
    resetSettings: (deviceKey?: string | null) => void;
    setIsDeviceSpecific: (isDeviceSpecific: boolean, deviceKey?: string | null) => void;
    setCurrentDeviceKey: (deviceKey: string | null) => void;
}

// Default settings
const DEFAULT_SETTINGS = settingsSchema.parse({});

// Load settings from local storage
const loadSettings = (): Settings => {
    try {
        const savedSettings = localStorage.getItem("follow.settings");
        if (savedSettings) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const parsed = JSON.parse(savedSettings);
            return settingsSchema.parse(parsed);
        }
    } catch (e) {
        console.error("Failed to load or validate settings from local storage:", e);
    }

    return DEFAULT_SETTINGS;
};

// Save settings to local storage
const saveSettings = (settings: Settings) => {
    try {
        localStorage.setItem("follow.settings", JSON.stringify(settings));
    } catch (e) {
        console.error("Failed to save settings to local storage:", e);
    }
};

export const useFollowStore = create<FollowState>((set, get) => {
    const savedSettings = loadSettings();

    return {
        // Combine defaults with saved settings
        autoCenter: savedSettings.autoCenter,
        colorMode: savedSettings.colorMode,
        lastReport: null,
        trips: [],
        pruneThreshold: savedSettings.pruneThreshold,
        previousPruneThreshold: savedSettings.pruneThreshold,
        mapSettings: savedSettings.mapSettings,
        isDeviceSpecific: false,
        currentDeviceKey: null,

        setCurrentDeviceKey: (deviceKey) => {
            set({ currentDeviceKey: deviceKey });

            if (deviceKey) {
                const isDeviceSpecific = get().hasDeviceSettings(deviceKey);
                set({ isDeviceSpecific });
            } else {
                set({ isDeviceSpecific: false });
            }
        },

        setIsDeviceSpecific: (isDeviceSpecific, deviceKey = null) => {
            set({ isDeviceSpecific });

            if (isDeviceSpecific && deviceKey) {
                get().saveDeviceSettings(deviceKey);
            } else if (deviceKey) {
                get().removeDeviceSettings(deviceKey);

                const globalSettings = loadSettings();
                set({
                    autoCenter: globalSettings.autoCenter,
                    colorMode: globalSettings.colorMode,
                    pruneThreshold: globalSettings.pruneThreshold,
                    mapSettings: globalSettings.mapSettings,
                });
            }
        },

        setColorMode: (mode) => {
            set({ colorMode: mode });

            const { isDeviceSpecific, currentDeviceKey } = get();

            if (isDeviceSpecific && currentDeviceKey) {
                get().saveDeviceSettings(currentDeviceKey);
            } else {
                const settings = get();
                saveSettings({
                    autoCenter: settings.autoCenter,
                    colorMode: mode,
                    pruneThreshold: settings.pruneThreshold,
                    mapSettings: settings.mapSettings,
                    version: 1,
                });
            }
        },

        setAutoCenter: (autoCenter) => {
            set({ autoCenter });

            const { isDeviceSpecific, currentDeviceKey } = get();

            if (isDeviceSpecific && currentDeviceKey) {
                get().saveDeviceSettings(currentDeviceKey);
            } else {
                const settings = get();
                saveSettings({
                    autoCenter,
                    colorMode: settings.colorMode,
                    pruneThreshold: settings.pruneThreshold,
                    mapSettings: settings.mapSettings,
                    version: 1,
                });
            }
        },

        setPruneThreshold: (threshold) => {
            const currentThreshold = get().pruneThreshold;
            set({ pruneThreshold: threshold, previousPruneThreshold: currentThreshold });

            const { isDeviceSpecific, currentDeviceKey } = get();

            if (isDeviceSpecific && currentDeviceKey) {
                get().saveDeviceSettings(currentDeviceKey);
            } else {
                const settings = get();
                saveSettings({
                    autoCenter: settings.autoCenter,
                    colorMode: settings.colorMode,
                    pruneThreshold: threshold,
                    mapSettings: settings.mapSettings,
                    version: 1,
                });
            }
        },

        setMapSettings: (newSettings) => {
            const currentSettings = get().mapSettings;
            const updatedSettings = { ...currentSettings, ...newSettings };
            set({ mapSettings: updatedSettings });

            const { isDeviceSpecific, currentDeviceKey } = get();

            if (isDeviceSpecific && currentDeviceKey) {
                get().saveDeviceSettings(currentDeviceKey);
            } else {
                const settings = get();
                saveSettings({
                    autoCenter: settings.autoCenter,
                    colorMode: settings.colorMode,
                    pruneThreshold: settings.pruneThreshold,
                    mapSettings: updatedSettings,
                    version: 1,
                });
            }
        },

        hasDeviceSettings: (deviceKey: string) => {
            try {
                const savedSettings = localStorage.getItem(`follow.settings.${deviceKey}`);
                return savedSettings !== null;
            } catch (e) {
                console.error(`Failed to check device settings for device ${deviceKey} in local storage:`, e);
                return false;
            }
        },

        removeDeviceSettings: (deviceKey: string) => {
            try {
                localStorage.removeItem(`follow.settings.${deviceKey}`);
            } catch (e) {
                console.error(`Failed to remove device settings for device ${deviceKey} from local storage:`, e);
            }
        },

        loadDeviceSettings: (deviceKey: string) => {
            try {
                const savedSettings = localStorage.getItem(`follow.settings.${deviceKey}`);

                if (savedSettings) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const parsed = JSON.parse(savedSettings);
                    const validatedSettings = deviceSettingsSchema.parse(parsed);

                    set({
                        autoCenter: validatedSettings.autoCenter,
                        colorMode: validatedSettings.colorMode,
                        pruneThreshold: validatedSettings.pruneThreshold,
                        previousPruneThreshold: validatedSettings.pruneThreshold,
                        mapSettings: validatedSettings.mapSettings,
                        isDeviceSpecific: true,
                        currentDeviceKey: deviceKey,
                    });

                    return true;
                }
            } catch (e) {
                console.error(
                    `Failed to load or validate device settings for device ${deviceKey} from local storage:`,
                    e,
                );
            }

            return false;
        },

        saveDeviceSettings: (deviceKey) => {
            try {
                const { autoCenter, colorMode, pruneThreshold, mapSettings } = get();
                const deviceSettings: DeviceSettings = {
                    autoCenter,
                    colorMode,
                    pruneThreshold,
                    mapSettings,
                    version: 1,
                };
                localStorage.setItem(`follow.settings.${deviceKey}`, JSON.stringify(deviceSettings));
            } catch (e) {
                console.error(`Failed to save device settings for device ${deviceKey} to local storage:`, e);
            }
        },

        resetSettings: (deviceKey = null) => {
            const { isDeviceSpecific } = get();

            set({
                autoCenter: DEFAULT_SETTINGS.autoCenter,
                colorMode: DEFAULT_SETTINGS.colorMode,
                pruneThreshold: DEFAULT_SETTINGS.pruneThreshold,
                mapSettings: DEFAULT_SETTINGS.mapSettings,
            });

            if (deviceKey) {
                if (isDeviceSpecific) {
                    get().saveDeviceSettings(deviceKey);
                } else {
                    saveSettings(DEFAULT_SETTINGS);
                }
            } else {
                saveSettings(DEFAULT_SETTINGS);
            }
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
    };
});
