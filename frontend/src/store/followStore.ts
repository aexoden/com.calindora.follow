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
    mobilePanelExpanded: z.boolean().default(false),
    version: z.number().default(1),
});

export type ColorMode = z.infer<typeof colorModeSchema>;
export type MapSettings = z.infer<typeof mapSettingsSchema>;
export type Settings = z.infer<typeof settingsSchema>;

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
    settingsDeviceKey: string | null;
    mobilePanelExpanded: boolean;

    setColorMode: (mode: ColorMode) => void;
    setAutoCenter: (autoCenter: boolean) => void;
    addReports: (reports: Report[]) => void;
    clearReports: () => void;
    pruneReports: () => void;
    setPruneThreshold: (threshold: number) => void;
    shouldRefetch: () => boolean;
    setMapSettings: (settings: Partial<MapSettings>) => void;
    resetSettings: (deviceKey?: string | null) => void;
    changeDevice: (deviceKey: string) => void;
    setSettingsDeviceKey: (deviceKey: string | null) => void;
    setMobilePanelExpanded: (expanded: boolean) => void;
}

// Default settings
const DEFAULT_SETTINGS = settingsSchema.parse({});

export const useFollowStore = create<FollowState>((set, get) => {
    const loadSettingsFromLocalStorage = (deviceKey: string | null = null): Settings | null => {
        const key = deviceKey ? `follow.settings.${deviceKey}` : "follow.settings";

        try {
            const savedSettings = localStorage.getItem(key);
            if (savedSettings) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const parsed = JSON.parse(savedSettings);
                return settingsSchema.parse(parsed);
            }
        } catch (e) {
            if (deviceKey) {
                console.error(
                    `Failed to load or validate device settings for device ${deviceKey} from local storage:`,
                    e,
                );
            } else {
                console.error("Failed to load or validate settings from local storage:", e);
            }
        }

        return null;
    };

    const loadSettings = () => {
        const { settingsDeviceKey } = get();
        let settings: Settings | null;

        if (settingsDeviceKey) {
            const deviceSettings = loadSettingsFromLocalStorage(settingsDeviceKey);

            if (deviceSettings) {
                settings = deviceSettings;
            } else {
                set({ settingsDeviceKey: null });
            }
        }

        settings ??= loadSettingsFromLocalStorage() ?? DEFAULT_SETTINGS;

        set({
            autoCenter: settings.autoCenter,
            colorMode: settings.colorMode,
            pruneThreshold: settings.pruneThreshold,
            previousPruneThreshold: settings.pruneThreshold,
            mapSettings: settings.mapSettings,
            mobilePanelExpanded: settings.mobilePanelExpanded,
        });
    };

    const saveSettings = () => {
        const { autoCenter, colorMode, pruneThreshold, mapSettings, settingsDeviceKey, mobilePanelExpanded } = get();
        const key = settingsDeviceKey ? `follow.settings.${settingsDeviceKey}` : "follow.settings";

        const settings = {
            autoCenter,
            colorMode,
            pruneThreshold,
            mapSettings,
            mobilePanelExpanded,
            version: 1,
        };

        try {
            localStorage.setItem(key, JSON.stringify(settings));
        } catch (e) {
            if (settingsDeviceKey) {
                console.error(`Failed to save device settings for device ${settingsDeviceKey} to local storage:`, e);
            } else {
                console.error("Failed to save settings to local storage:", e);
            }
        }
    };

    const changeDevice = (deviceKey: string) => {
        const { settingsDeviceKey } = get();

        if (settingsDeviceKey === deviceKey) return;

        set({ settingsDeviceKey: deviceKey });

        // Load the settings for the new device key. This will prefer the device-specific settings, falling back to
        // global settings and then default settings. It will also unset the device key if there are no device-specific
        // settings available.
        loadSettings();
    };

    const initialSettings = loadSettingsFromLocalStorage() ?? DEFAULT_SETTINGS;

    const pruneReports = () => {
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
    };

    return {
        autoCenter: initialSettings.autoCenter,
        colorMode: initialSettings.colorMode,
        lastReport: null,
        trips: [],
        pruneThreshold: initialSettings.pruneThreshold,
        previousPruneThreshold: initialSettings.pruneThreshold,
        mapSettings: initialSettings.mapSettings,
        settingsDeviceKey: null,
        mobilePanelExpanded: initialSettings.mobilePanelExpanded,

        changeDevice,

        setSettingsDeviceKey: (deviceKey: string | null) => {
            const { settingsDeviceKey } = get();

            // If the device key is the same as the current one, do nothing.
            if (settingsDeviceKey === deviceKey) return;

            // If the device key is being cleared, we want to remove the device-specific settings from local storage,
            // and reset the settings to global settings.
            if (settingsDeviceKey && !deviceKey) {
                try {
                    localStorage.removeItem(`follow.settings.${settingsDeviceKey}`);
                } catch (e) {
                    console.error(
                        `Failed to remove device settings for device ${settingsDeviceKey} from local storage:`,
                        e,
                    );
                }

                const globalSettings = loadSettingsFromLocalStorage() ?? DEFAULT_SETTINGS;
                set({
                    autoCenter: globalSettings.autoCenter,
                    colorMode: globalSettings.colorMode,
                    pruneThreshold: globalSettings.pruneThreshold,
                    mapSettings: globalSettings.mapSettings,
                    mobilePanelExpanded: globalSettings.mobilePanelExpanded,
                });
            }

            // If the device key is being set, we want to save the current settings with the new key.
            if (!settingsDeviceKey && deviceKey) {
                set({ settingsDeviceKey: deviceKey });
                saveSettings();
            }

            // If the device key is being changed, just reuse the changeDevice logic. This will potentially end up
            // using global settings, but I'm not sure changing the device key and enforcing device-specific settings
            // in one step makes sense.
            if (settingsDeviceKey && deviceKey) {
                changeDevice(deviceKey);
            }

            set({ settingsDeviceKey: deviceKey });
        },

        setMobilePanelExpanded: (expanded) => {
            set({ mobilePanelExpanded: expanded });
            saveSettings();
        },

        setColorMode: (mode) => {
            set({ colorMode: mode });
            saveSettings();
        },

        setAutoCenter: (autoCenter) => {
            set({ autoCenter });
            saveSettings();
        },

        setPruneThreshold: (threshold) => {
            const currentThreshold = get().pruneThreshold;
            set({ pruneThreshold: threshold, previousPruneThreshold: currentThreshold });
            saveSettings();
        },

        setMapSettings: (newSettings) => {
            const currentSettings = get().mapSettings;
            const updatedSettings = { ...currentSettings, ...newSettings };
            set({ mapSettings: updatedSettings });
            saveSettings();
        },

        resetSettings: () => {
            const currentPruneThreshold = get().pruneThreshold;

            set({
                autoCenter: DEFAULT_SETTINGS.autoCenter,
                colorMode: DEFAULT_SETTINGS.colorMode,
                pruneThreshold: DEFAULT_SETTINGS.pruneThreshold,
                mapSettings: DEFAULT_SETTINGS.mapSettings,
                mobilePanelExpanded: DEFAULT_SETTINGS.mobilePanelExpanded,
            });

            saveSettings();

            if (DEFAULT_SETTINGS.pruneThreshold < currentPruneThreshold) {
                pruneReports();
            }
        },

        shouldRefetch: () => {
            const { pruneThreshold, previousPruneThreshold } = get();
            return pruneThreshold > previousPruneThreshold;
        },

        clearReports: () => {
            set({ trips: [], lastReport: null });
        },

        pruneReports,

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
