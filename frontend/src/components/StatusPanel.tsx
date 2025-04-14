import { memo, useMemo, useState, useEffect } from "react";
import { formatDistance } from "date-fns";
import { useFollowStore, ColorMode, DEFAULT_PRUNE_THRESHOLD } from "../store/followStore";
import { useToast } from "../hooks/useToast";
import { Switch } from "@headlessui/react";
import {
    MdAccessTime,
    MdChevronRight,
    MdExpandMore,
    MdHeight,
    MdMyLocation,
    MdNearMe,
    MdSpeed,
    MdTimelapse,
    MdTerrain,
    MdInfo,
    MdDeviceHub,
    MdPublic,
    MdLocationOn,
} from "react-icons/md";
import ColorLegend from "./ColorLegend";

// Constants
const TIME_RANGE_OPTIONS = [
    { label: "2 hours", value: 2 * 60 * 60 * 1000 },
    { label: "6 hours", value: 6 * 60 * 60 * 1000 },
    { label: "12 hours", value: 12 * 60 * 60 * 1000 },
    { label: "1 day", value: 24 * 60 * 60 * 1000 },
    { label: "2 days", value: 2 * 24 * 60 * 60 * 1000 },
    { label: "1 week", value: 7 * 24 * 60 * 60 * 1000 },
];

// Types
interface StatusPanelProps {
    className?: string;
    isMobile?: boolean;
    deviceKey?: string;
    screenSize?: "sm" | "md" | "lg" | "xl" | "2xl";
}

interface FormattedValues {
    timestamp: Date;
    submitTimestamp: Date | null;
    speedMph: number;
    altitudeFeet: number;
    latFormatted: string;
    lngFormatted: string;
    bearingFormatted: number;
    bearingRotation: number;
    bearingText: string;
    formattedTime: string;
    formattedDate: string;
    delayText: string;
}

// Sub-components
const ToggleSwitch = memo(
    ({
        enabled,
        onChange,
        size = "default",
        label,
        description,
    }: {
        enabled: boolean;
        onChange: (value: boolean) => void;
        size?: "default" | "small";
        label?: string;
        description?: string;
    }) => {
        const height = size === "small" ? "h-5" : "h-6";
        const width = size === "small" ? "w-9" : "w-11";
        const thumbHeight = size === "small" ? "h-3" : "h-4";
        const thumbWidth = size === "small" ? "w-3" : "w-4";
        const thumbTranslate = enabled
            ? size === "small"
                ? "translate-x-5"
                : "translate-x-6"
            : size === "small"
              ? "translate-x-1"
              : "translate-x-1";

        return (
            <div className="flex flex-col">
                <div className="flex items-center justify-between">
                    {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
                    <Switch
                        checked={enabled}
                        onChange={onChange}
                        className={`${
                            enabled ? "bg-slate-600" : "bg-gray-300"
                        } relative inline-flex ${height} ${width} items-center rounded-full transition-colors focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none`}
                    >
                        <span
                            className={`${thumbTranslate} inline-block ${thumbHeight} ${thumbWidth} transform rounded-full bg-white transition-transform`}
                        />
                    </Switch>
                </div>
                {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
            </div>
        );
    },
);

const ColorModeButton = memo(
    ({
        mode,
        current,
        onChange,
        icon,
        label,
        isCompact = false,
    }: {
        mode: ColorMode;
        current: ColorMode;
        onChange: (mode: ColorMode) => void;
        icon: React.ReactNode;
        label: string;
        isCompact?: boolean;
    }) => {
        const isActive = mode === current;

        return (
            <button
                onClick={() => {
                    onChange(mode);
                }}
                className={`flex items-center ${isCompact ? "justify-start" : "justify-center"} rounded-lg p-2 transition-all ${
                    isActive
                        ? "bg-slate-600 text-white shadow-md"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                }`}
            >
                <span className={isCompact ? "mr-1.5" : "mr-2"}>{icon}</span>
                <span className={`${isCompact ? "text-xs" : "text-sm"} font-medium`}>{label}</span>
            </button>
        );
    },
);

const TimeRangeButton = memo(
    ({
        option,
        isSelected,
        onClick,
        isCompact = false,
    }: {
        option: { label: string; value: number };
        isSelected: boolean;
        onClick: () => void;
        isCompact?: boolean;
    }) => {
        return (
            <button
                onClick={onClick}
                className={`rounded-lg ${isCompact ? "px-2 py-0.5" : "px-3 py-1"} text-xs transition-all ${
                    isSelected
                        ? "bg-slate-600 text-white shadow-md"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                }`}
            >
                {option.label}
            </button>
        );
    },
);

const NoDataAlert = () => (
    <div className="mb-4 rounded-lg bg-amber-50 p-3">
        <div className="flex items-start">
            <MdInfo className="mt-0.5 mr-2 h-5 w-5 flex-shrink-0 text-amber-500" />
            <p className="text-sm text-amber-700">
                No location data available in the selected time range. Try selecting a longer time range below.
            </p>
        </div>
    </div>
);

// Stat card component
const StatCard = ({
    icon,
    value,
    label,
    className = "",
    isCompact = false,
    isMobile = false,
}: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    className?: string;
    isCompact?: boolean;
    isMobile?: boolean;
}) => {
    const sizeClass = isCompact || isMobile ? "p-1.5" : "p-2";
    const valueClass = isCompact || isMobile ? "text-lg" : "text-xl";

    return (
        <div className={`rounded-lg border border-gray-100 bg-white ${sizeClass} text-center shadow-sm ${className}`}>
            <div className="mx-auto text-slate-500">{icon}</div>
            <div className={`mt-1 ${valueClass} font-bold text-slate-700`}>{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
        </div>
    );
};

// Mobile-specific components
const MobileHeader = ({
    formattedValues,
    expanded,
    setExpanded,
}: {
    formattedValues: FormattedValues | null;
    expanded: boolean;
    setExpanded: (expanded: boolean) => void;
}) => (
    <div
        className="flex cursor-pointer items-center p-3"
        onClick={() => {
            setExpanded(!expanded);
        }}
    >
        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            {formattedValues ? (
                <MdLocationOn className="h-5 w-5 text-slate-600" />
            ) : (
                <MdInfo className="h-5 w-5 text-amber-500" />
            )}
        </div>

        <div className="flex-1">
            <h2 className="text-l font-medium text-slate-800">
                {formattedValues ? "Current Location" : "No Location Data"}
            </h2>
            <p className="text-sm text-gray-500">
                {formattedValues ? formattedValues.formattedTime : "Adjust time range"}
            </p>
        </div>

        {formattedValues && (
            <div className="mr-5 flex flex-col items-center">
                <div className="text-2xl">
                    <MdNearMe
                        className="text-slate-500"
                        style={{
                            transform: `rotate(${formattedValues.bearingRotation.toString()}deg)`,
                        }}
                    />
                </div>
                <div className="text-sm font-medium text-slate-600">{formattedValues.bearingText}</div>
            </div>
        )}

        {formattedValues && (
            <div className="flex flex-col items-end">
                <div className="flex items-baseline">
                    <span className="text-l font-semibold text-slate-700">{formattedValues.speedMph}</span>
                    <span className="ml-1 text-xs text-gray-500">MPH</span>
                </div>
                <div className="flex items-baseline">
                    <span className="text-sm font-medium text-slate-600">{formattedValues.altitudeFeet}</span>
                    <span className="ml-1 text-xs text-gray-500">FT</span>
                </div>
            </div>
        )}

        <div className={`${formattedValues ? "ml-2" : "ml-auto"} flex flex-col items-end`}>
            {expanded ? (
                <MdExpandMore className="mt-1 h-5 w-5 text-gray-500" />
            ) : (
                <MdChevronRight className="mt-1 h-5 w-5 text-gray-500" />
            )}
        </div>
    </div>
);

const MobileLocationMetrics = ({ formattedValues }: { formattedValues: FormattedValues }) => (
    <div className="mb-3 grid grid-cols-3 gap-1.5">
        <StatCard
            icon={<MdHeight className="mx-auto h-4 w-4" />}
            value={formattedValues.altitudeFeet}
            label="FT"
            isMobile={true}
        />
        <StatCard
            icon={<MdNearMe className="mx-auto h-4 w-4" />}
            value={formattedValues.bearingText}
            label={`${formattedValues.bearingFormatted.toString()}°`}
            isMobile={true}
        />
        <StatCard
            icon={<MdMyLocation className="mx-auto h-4 w-4" />}
            value={formattedValues.latFormatted}
            label={formattedValues.lngFormatted}
            isMobile={true}
        />
    </div>
);

// Settings components
const SettingsModeToggle = ({
    isDeviceSpecific,
    handleSettingsScopeToggle,
    isCompact = false,
    isMobile = false,
}: {
    isDeviceSpecific: boolean;
    handleSettingsScopeToggle: () => void;
    isCompact?: boolean;
    isMobile?: boolean;
}) => {
    const padding = isMobile ? "p-2" : "p-3";
    const marginBottom = isMobile ? "mb-3" : "mb-4";

    return (
        <div className={`${marginBottom} rounded-lg bg-slate-50 ${padding} ${isCompact ? "text-sm" : ""}`}>
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center">
                    <span className="font-medium text-gray-700">Settings Mode</span>
                </div>
                <div className="flex items-center">
                    {isDeviceSpecific ? (
                        <MdDeviceHub className="mr-1 h-4 w-4 text-blue-600" />
                    ) : (
                        <MdPublic className="mr-1 h-4 w-4 text-gray-500" />
                    )}
                    <span className="mr-2 text-xs text-gray-500">{isDeviceSpecific ? "Device" : "Global"}</span>
                    <Switch
                        checked={isDeviceSpecific}
                        onChange={handleSettingsScopeToggle}
                        className={`${
                            isDeviceSpecific ? "bg-blue-600" : "bg-gray-300"
                        } relative inline-flex h-4 w-8 items-center rounded-full`}
                    >
                        <span
                            className={`${
                                isDeviceSpecific ? "translate-x-4" : "translate-x-1"
                            } inline-block h-3 w-3 rounded-full bg-white transition-transform`}
                        />
                    </Switch>
                </div>
            </div>
            <p className="text-xs text-gray-500">
                {isDeviceSpecific
                    ? "Device-specific: Settings apply only to this device."
                    : "Global: Settings apply to all devices."}
            </p>
        </div>
    );
};

const TimeRangeSettings = ({
    selectedTimeRangeIndex,
    handleTimeRangeChange,
    isCompact = false,
    isMobile = false,
}: {
    selectedTimeRangeIndex: number;
    handleTimeRangeChange: (option: (typeof TIME_RANGE_OPTIONS)[0]) => void;
    isCompact?: boolean;
    isMobile?: boolean;
}) => {
    const marginBottom = isMobile ? "mb-3" : "mb-4";

    return (
        <div className={marginBottom}>
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center">
                    <MdAccessTime className="mr-2 h-5 w-5 text-slate-600" />
                    <span className={`${isCompact ? "text-sm" : "text-base"} font-medium text-gray-700`}>
                        Time Range
                    </span>
                </div>
            </div>

            <div className={`grid ${isMobile ? "grid-cols-3" : isCompact ? "grid-cols-2" : "grid-cols-3"} gap-1.5`}>
                {TIME_RANGE_OPTIONS.map((option, index) => (
                    <TimeRangeButton
                        key={option.label}
                        option={option}
                        isSelected={index === selectedTimeRangeIndex}
                        onClick={() => {
                            handleTimeRangeChange(option);
                        }}
                        isCompact={isCompact || isMobile}
                    />
                ))}
            </div>
        </div>
    );
};

const ColorModeSettings = ({
    colorMode,
    handleColorModeChange,
    isCompact = false,
    isMobile = false,
}: {
    colorMode: ColorMode;
    handleColorModeChange: (mode: ColorMode) => void;
    isCompact?: boolean;
    isMobile?: boolean;
}) => {
    return (
        <div>
            <div className="mb-2 flex items-center">
                <span className={`${isCompact ? "text-sm" : "text-base"} font-medium text-gray-700`}>
                    Track Coloring
                </span>
            </div>
            <div className={`grid ${isCompact && !isMobile ? "grid-cols-1 gap-2" : "grid-cols-3 gap-1.5"}`}>
                <ColorModeButton
                    mode="time"
                    current={colorMode}
                    onChange={handleColorModeChange}
                    icon={<MdTimelapse className={isCompact || isMobile ? "h-4 w-4" : "h-5 w-5"} />}
                    label="Time"
                    isCompact={isCompact || isMobile}
                />
                <ColorModeButton
                    mode="speed"
                    current={colorMode}
                    onChange={handleColorModeChange}
                    icon={<MdSpeed className={isCompact || isMobile ? "h-4 w-4" : "h-5 w-5"} />}
                    label="Speed"
                    isCompact={isCompact || isMobile}
                />
                <ColorModeButton
                    mode="elevation"
                    current={colorMode}
                    onChange={handleColorModeChange}
                    icon={<MdTerrain className={isCompact || isMobile ? "h-4 w-4" : "h-5 w-5"} />}
                    label="Elevation"
                    isCompact={isCompact || isMobile}
                />
            </div>
            <div className="mt-2">
                <ColorLegend
                    mode={colorMode}
                    isCompact={isCompact || isMobile}
                />
            </div>
        </div>
    );
};

// Main sections for desktop view
const Header = ({ isCompact = false }) => (
    <div className={`mb-4 flex items-center ${isCompact ? "space-x-2" : "space-x-3"}`}>
        <div
            className={`flex ${isCompact ? "h-10 w-10" : "h-12 w-12"} items-center justify-center rounded-full bg-slate-600 text-white`}
        >
            <MdMyLocation className="h-6 w-6" />
        </div>
        <div>
            <h1 className={`${isCompact ? "text-xl" : "text-2xl"} font-bold text-slate-700`}>Calindora Follow</h1>
            <p className="text-sm text-gray-500">Live location tracking</p>
        </div>
    </div>
);

const TimeCard = ({
    formattedValues,
    isCompact = false,
}: {
    formattedValues: FormattedValues;
    isCompact?: boolean;
}) => (
    <div className="mb-4 rounded-lg bg-slate-50 p-3">
        <div className="mb-1 text-sm font-medium text-gray-500">LAST UPDATE</div>
        <div className="flex items-baseline justify-between">
            <div className={`${isCompact ? "text-lg" : "text-xl"} font-semibold text-slate-800`}>
                {formattedValues.formattedTime}
            </div>
            <div className="text-sm text-gray-500">{formattedValues.formattedDate}</div>
        </div>
        {formattedValues.delayText && <div className="mt-1 text-sm text-amber-600">{formattedValues.delayText}</div>}
    </div>
);

const LocationStats = ({
    formattedValues,
    isCompact = false,
}: {
    formattedValues: FormattedValues;
    isCompact?: boolean;
}) => (
    <div className="mb-4 grid grid-cols-3 gap-2">
        <StatCard
            icon={<MdSpeed className="mx-auto h-5 w-5" />}
            value={formattedValues.speedMph}
            label="MPH"
            isCompact={isCompact}
        />
        <StatCard
            icon={<MdHeight className="mx-auto h-5 w-5" />}
            value={formattedValues.altitudeFeet}
            label="FT"
            isCompact={isCompact}
        />
        <StatCard
            icon={
                <MdNearMe
                    className="mx-auto h-5 w-5"
                    style={{ transform: `rotate(${formattedValues.bearingRotation.toString()}deg)` }}
                />
            }
            value={formattedValues.bearingText}
            label={`${formattedValues.bearingFormatted.toString()}°`}
            isCompact={isCompact}
        />
    </div>
);

const CoordinatesCard = ({
    formattedValues,
    isCompact = false,
}: {
    formattedValues: FormattedValues;
    isCompact?: boolean;
}) => (
    <div className="mb-4 rounded-lg bg-slate-50 p-3">
        <div className="mb-1 text-sm font-medium text-gray-500">COORDINATES</div>
        <div className="grid grid-cols-2 gap-2">
            <div>
                <div className="text-xs text-gray-500">LATITUDE</div>
                <div className={`${isCompact ? "text-base" : "text-lg"} font-medium text-slate-700`}>
                    {formattedValues.latFormatted}
                </div>
            </div>
            <div>
                <div className="text-xs text-gray-500">LONGITUDE</div>
                <div className={`${isCompact ? "text-base" : "text-lg"} font-medium text-slate-700`}>
                    {formattedValues.lngFormatted}
                </div>
            </div>
        </div>
    </div>
);

const SettingsSection = ({
    deviceKey,
    isDeviceSpecific,
    handleSettingsScopeToggle,
    autoCenter,
    handleAutoCenterToggle,
    selectedTimeRangeIndex,
    handleTimeRangeChange,
    colorMode,
    handleColorModeChange,
    isCompact = false,
    isMobile = false,
}: {
    deviceKey?: string;
    isDeviceSpecific: boolean;
    handleSettingsScopeToggle: () => void;
    autoCenter: boolean;
    handleAutoCenterToggle: (value: boolean) => void;
    selectedTimeRangeIndex: number;
    handleTimeRangeChange: (option: (typeof TIME_RANGE_OPTIONS)[0]) => void;
    colorMode: ColorMode;
    handleColorModeChange: (mode: ColorMode) => void;
    isCompact?: boolean;
    isMobile?: boolean;
}) => (
    <div className={isMobile ? "space-y-3" : "space-y-4"}>
        {deviceKey && (
            <SettingsModeToggle
                isDeviceSpecific={isDeviceSpecific}
                handleSettingsScopeToggle={handleSettingsScopeToggle}
                isCompact={isCompact}
                isMobile={isMobile}
            />
        )}

        <ToggleSwitch
            enabled={autoCenter}
            onChange={handleAutoCenterToggle}
            size={isCompact || isMobile ? "small" : "default"}
            label="Auto-Center Map"
            description={
                isCompact || isMobile ? undefined : "Automatically center the map on the latest location report"
            }
        />

        <TimeRangeSettings
            selectedTimeRangeIndex={selectedTimeRangeIndex}
            handleTimeRangeChange={handleTimeRangeChange}
            isCompact={isCompact}
            isMobile={isMobile}
        />

        <ColorModeSettings
            colorMode={colorMode}
            handleColorModeChange={handleColorModeChange}
            isCompact={isCompact}
            isMobile={isMobile}
        />
    </div>
);

// Main StatusPanel component
export default function StatusPanel({
    className = "",
    isMobile = false,
    deviceKey,
    screenSize = "lg",
}: StatusPanelProps) {
    const {
        lastReport,
        autoCenter,
        setAutoCenter,
        colorMode,
        setColorMode,
        pruneThreshold,
        setPruneThreshold,
        pruneReports,
        hasDeviceSettings,
        isDeviceSpecific,
        setIsDeviceSpecific,
    } = useFollowStore();

    const [expandedOnMobile, setExpandedOnMobile] = useState(false);
    const toast = useToast();

    const isCompact = !isMobile && screenSize === "md";

    // Check for device-specific settings on load
    useEffect(() => {
        if (deviceKey) {
            const hasSpecificSettings = hasDeviceSettings(deviceKey);
            setIsDeviceSpecific(hasSpecificSettings);
        } else {
            setIsDeviceSpecific(false);
        }
    }, [deviceKey, hasDeviceSettings, setIsDeviceSpecific]);

    // Find the closest matching time range option to the current prune threshold
    const selectedTimeRangeIndex = useMemo(() => {
        const index = TIME_RANGE_OPTIONS.findIndex((option) => option.value === pruneThreshold);
        return index !== -1
            ? index
            : TIME_RANGE_OPTIONS.findIndex((option) => option.value === DEFAULT_PRUNE_THRESHOLD);
    }, [pruneThreshold]);

    // Format values for display
    const formattedValues = useMemo(() => {
        if (!lastReport) return null;

        const timestamp = new Date(lastReport.timestamp);
        const submitTimestamp = lastReport.submit_timestamp ? new Date(lastReport.submit_timestamp) : null;

        const speedMph = Math.round(lastReport.speed * 2.23693629);
        const altitudeFeet = Math.round(lastReport.altitude * 3.280839895);

        const latDirection = lastReport.latitude >= 0 ? "N" : "S";
        const lngDirection = lastReport.longitude >= 0 ? "E" : "W";

        const latFormatted = `${Math.abs(lastReport.latitude).toFixed(4)} ${latDirection}`;
        const lngFormatted = `${Math.abs(lastReport.longitude).toFixed(4)} ${lngDirection}`;

        const bearingFormatted = Math.round(lastReport.bearing);
        const bearingRotation = (bearingFormatted < 45 ? bearingFormatted + 360 : bearingFormatted) - 45;

        const formattedTime = timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        const formattedDate = timestamp.toLocaleDateString([], {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

        let delayText = "";
        if (submitTimestamp && submitTimestamp.getTime() - timestamp.getTime() > 15000) {
            delayText = `(update delayed ${formatDistance(submitTimestamp, timestamp, { addSuffix: false })})`;
        }

        const bearing = lastReport.bearing;
        const bearingText =
            bearing >= 337.5 || bearing < 22.5
                ? "N"
                : bearing >= 22.5 && bearing < 67.5
                  ? "NE"
                  : bearing >= 67.5 && bearing < 112.5
                    ? "E"
                    : bearing >= 112.5 && bearing < 157.5
                      ? "SE"
                      : bearing >= 157.5 && bearing < 202.5
                        ? "S"
                        : bearing >= 202.5 && bearing < 247.5
                          ? "SW"
                          : bearing >= 247.5 && bearing < 292.5
                            ? "W"
                            : "NW";

        return {
            altitudeFeet,
            bearingFormatted,
            bearingRotation,
            bearingText,
            delayText,
            formattedDate,
            formattedTime,
            latFormatted,
            lngFormatted,
            speedMph,
            submitTimestamp,
            timestamp,
        };
    }, [lastReport]);

    // Handle settings changes
    const handleAutoCenterToggle = (newValue: boolean) => {
        setAutoCenter(newValue);

        toast.info(
            `Auto-center ${newValue ? "enabled" : "disabled"}`,
            isDeviceSpecific
                ? "This setting is device-specific and won't affect other devices."
                : "This is a global setting that applies to all devices.",
        );
    };

    const handleColorModeChange = (mode: ColorMode) => {
        setColorMode(mode);

        toast.info(
            `Track coloring changed to ${mode}`,
            isDeviceSpecific
                ? "This setting is device-specific and won't affect other devices."
                : "This is a global setting that applies to all devices.",
        );
    };

    const handleTimeRangeChange = (option: (typeof TIME_RANGE_OPTIONS)[0]) => {
        setPruneThreshold(option.value);
        pruneReports();
        toast.info(
            `Time range changed: ${option.label}`,
            isDeviceSpecific
                ? "This setting is device-specific and won't affect other devices."
                : "This is a global setting that applies to all devices.",
        );
    };

    const handleSettingsScopeToggle = () => {
        if (!deviceKey) return;

        const newIsDeviceSpecific = !isDeviceSpecific;

        setIsDeviceSpecific(newIsDeviceSpecific, deviceKey);
        setIsDeviceSpecific(newIsDeviceSpecific);

        if (newIsDeviceSpecific) {
            toast.info(
                "Device-specific settings enabled",
                "All settings (map position, auto-center, colors, time range) will now be saved for this device only.",
            );
        } else {
            toast.info(
                "Global settings enabled",
                "This device will now use global settings for maps, colors and time range.",
            );
        }
    };

    // Mobile view
    if (isMobile) {
        return (
            <div className={`rounded-lg bg-white shadow-md transition-all ${className}`}>
                <MobileHeader
                    formattedValues={formattedValues}
                    expanded={expandedOnMobile}
                    setExpanded={setExpandedOnMobile}
                />

                <div
                    className={`overflow-hidden transition-all duration-300 ${
                        expandedOnMobile ? "max-h-screen" : "max-h-0"
                    }`}
                >
                    <div className="border-t border-gray-100 p-2">
                        {formattedValues && <MobileLocationMetrics formattedValues={formattedValues} />}

                        <SettingsSection
                            deviceKey={deviceKey}
                            isDeviceSpecific={isDeviceSpecific}
                            handleSettingsScopeToggle={handleSettingsScopeToggle}
                            autoCenter={autoCenter}
                            handleAutoCenterToggle={handleAutoCenterToggle}
                            selectedTimeRangeIndex={selectedTimeRangeIndex}
                            handleTimeRangeChange={handleTimeRangeChange}
                            colorMode={colorMode}
                            handleColorModeChange={handleColorModeChange}
                            isCompact={true}
                            isMobile={true}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Desktop view with no data
    if (!formattedValues) {
        return (
            <div className={`rounded-lg bg-white p-4 shadow-md ${className}`}>
                <Header isCompact={isCompact} />
                <NoDataAlert />

                <SettingsSection
                    deviceKey={deviceKey}
                    isDeviceSpecific={isDeviceSpecific}
                    handleSettingsScopeToggle={handleSettingsScopeToggle}
                    autoCenter={autoCenter}
                    handleAutoCenterToggle={handleAutoCenterToggle}
                    selectedTimeRangeIndex={selectedTimeRangeIndex}
                    handleTimeRangeChange={handleTimeRangeChange}
                    colorMode={colorMode}
                    handleColorModeChange={handleColorModeChange}
                    isCompact={isCompact}
                />
            </div>
        );
    }

    // Desktop view with data
    return (
        <div className={`rounded-lg bg-white p-4 shadow-md ${className}`}>
            <Header isCompact={isCompact} />
            <TimeCard
                formattedValues={formattedValues}
                isCompact={isCompact}
            />
            <LocationStats
                formattedValues={formattedValues}
                isCompact={isCompact}
            />
            <CoordinatesCard
                formattedValues={formattedValues}
                isCompact={isCompact}
            />

            <SettingsSection
                deviceKey={deviceKey}
                isDeviceSpecific={isDeviceSpecific}
                handleSettingsScopeToggle={handleSettingsScopeToggle}
                autoCenter={autoCenter}
                handleAutoCenterToggle={handleAutoCenterToggle}
                selectedTimeRangeIndex={selectedTimeRangeIndex}
                handleTimeRangeChange={handleTimeRangeChange}
                colorMode={colorMode}
                handleColorModeChange={handleColorModeChange}
                isCompact={isCompact}
            />
        </div>
    );
}
