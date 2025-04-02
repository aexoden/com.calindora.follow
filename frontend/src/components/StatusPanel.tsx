import { formatDistance } from "date-fns";
import { useFollowStore, ColorMode } from "../store/followStore";
import { Switch } from "@headlessui/react";
import { MdSpeed, MdTimelapse, MdTerrain } from "react-icons/md";

interface ColorModeButtonProps {
    mode: ColorMode;
    current: ColorMode;
    onChange: (mode: ColorMode) => void;
    icon: React.ReactNode;
    label: string;
}

function ColorModeButton({ mode, current, onChange, icon, label }: ColorModeButtonProps) {
    const isActive = mode === current;

    return (
        <button
            onClick={() => {
                onChange(mode);
            }}
            className={`flex flex-col items-center justify-center rounded p-2 transition-colors ${
                isActive
                    ? "border-2 border-slate-500 bg-slate-100 text-slate-700"
                    : "border-2 border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
        >
            {icon}
            <span className="mt-1 text-xs">{label}</span>
        </button>
    );
}

interface StatusPanelProps {
    className?: string;
}

export default function StatusPanel({ className = "" }: StatusPanelProps) {
    const { lastReport, autoCenter, setAutoCenter, colorMode, setColorMode } = useFollowStore();

    if (!lastReport) {
        return (
            <div className={`rounded bg-white p-4 shadow ${className}`}>
                <h1 className="mb-4 text-2xl font-bold text-slate-600">Calindora Follow</h1>
                <p className="text-gray-600">Waiting for location data...</p>
            </div>
        );
    }

    const timestamp = new Date(lastReport.timestamp);
    const submitTimestamp = lastReport.submit_timestamp ? new Date(lastReport.submit_timestamp) : null;
    const latitude = lastReport.latitude;
    const longitude = lastReport.longitude;
    const altitude = lastReport.altitude;
    const speed = lastReport.speed;
    const bearing = lastReport.bearing;

    const speedMph = Math.round(speed * 2.23693629);

    const altitudeFeet = Math.round(altitude * 3.280839895);

    const latFormatted = Math.round(latitude * 100000) / 100000;
    const lngFormatted = Math.round(longitude * 100000) / 100000;
    const bearingFormatted = Math.round(bearing * 100) / 100;

    let delayText = "";
    if (submitTimestamp && submitTimestamp.getTime() - timestamp.getTime() > 15000) {
        delayText = `(delayed ${formatDistance(submitTimestamp, timestamp, { addSuffix: false })})`;
    }

    return (
        <div className={`rounded bg-white p-4 shadow ${className}`}>
            <h1 className="mb-4 text-2xl font-bold text-slate-600">Calindora Follow</h1>

            <div className="mb-4">
                <dl className="space-y-2">
                    <div className="flex justify-between">
                        <dt className="font-medium text-gray-600">Last Update:</dt>
                        <dd className="text-gray-900">{timestamp.toLocaleString()}</dd>
                    </div>

                    {delayText && <div className="-mt-2 flex justify-end text-sm text-red-500">{delayText}</div>}

                    <div className="flex justify-between">
                        <dt className="font-medium text-gray-600">Latitude:</dt>
                        <dd className="text-gray-900">{latFormatted}°</dd>
                    </div>

                    <div className="flex justify-between">
                        <dt className="font-medium text-gray-600">Longitude:</dt>
                        <dd className="text-gray-900">{lngFormatted}°</dd>
                    </div>

                    <div className="flex justify-between">
                        <dt className="font-medium text-gray-600">Altitude:</dt>
                        <dd className="text-gray-900">{altitudeFeet} ft</dd>
                    </div>

                    <div className="flex justify-between">
                        <dt className="font-medium text-gray-600">Speed:</dt>
                        <dd className="text-gray-900">{speedMph} mph</dd>
                    </div>

                    <div className="flex justify-between">
                        <dt className="font-medium text-gray-600">Bearing:</dt>
                        <dd className="text-gray-900">{bearingFormatted}°</dd>
                    </div>
                </dl>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-600">Auto-Center Map</span>
                    <Switch
                        checked={autoCenter}
                        onChange={setAutoCenter}
                        className={`${
                            autoCenter ? "bg-slate-500" : "bg-gray-300"
                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none`}
                    >
                        <span
                            className={`${
                                autoCenter ? "translate-x-6" : "translate-x-1"
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                    </Switch>
                </div>
            </div>

            <div>
                <label className="mb-2 block font-medium text-gray-600">Color Tracks By:</label>
                <div className="grid grid-cols-3 gap-2">
                    <ColorModeButton
                        mode="time"
                        current={colorMode}
                        onChange={setColorMode}
                        icon={<MdTimelapse className="h-5 w-5" />}
                        label="Time"
                    />
                    <ColorModeButton
                        mode="speed"
                        current={colorMode}
                        onChange={setColorMode}
                        icon={<MdSpeed className="h-5 w-5" />}
                        label="Speed"
                    />
                    <ColorModeButton
                        mode="elevation"
                        current={colorMode}
                        onChange={setColorMode}
                        icon={<MdTerrain className="h-5 w-5" />}
                        label="Elevation"
                    />
                </div>
            </div>
        </div>
    );
}
