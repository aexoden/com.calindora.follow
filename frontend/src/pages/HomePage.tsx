import { useState } from "react";
import { useNavigate } from "react-router";
import { FiArrowRight } from "react-icons/fi";

export default function HomePage() {
    const [deviceKey, setDeviceKey] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!deviceKey.trim()) {
            setError("Please enter a device key");
            return;
        }

        void navigate(`/follow/${deviceKey.trim()}`);
    };

    return (
        <div className="mx-auto mt-16 max-w-md p-6">
            <div className="rounded-lg bg-white p-8 shadow-lg">
                <h1 className="mb-6 text-center text-3xl font-bold text-slate-600">Calindora Follow</h1>

                <p className="mb-6 text-center text-gray-600">Enter a device key to start following the device</p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label
                            htmlFor="device-key"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Device Key
                        </label>
                        <input
                            id="device-key"
                            type="text"
                            value={deviceKey}
                            onChange={(e) => {
                                setDeviceKey(e.target.value);
                                setError("");
                            }}
                            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-slate-500 focus:ring-slate-500"
                            placeholder="Enter a device key"
                        />
                        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        className="flex w-full items-center justify-center rounded-md bg-slate-500 px-4 py-2 text-white transition-colors hover:bg-slate-600 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
                    >
                        <span>Start Following</span>
                        <FiArrowRight className="ml-2" />
                    </button>
                </form>
            </div>
        </div>
    );
}
