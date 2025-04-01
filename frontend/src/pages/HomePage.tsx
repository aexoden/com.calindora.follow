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
        <div className="max-w-md mx-auto p-6 mt-16">
            <div className="bg-white shadow-lg rounded-lg p-8">
                <h1 className="text-3xl font-bold text-slate-600 mb-6 text-center">Calindora Follow</h1>

                <p className="text-gray-600 mb-6 text-center">Enter a device key to start following the device</p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label
                            htmlFor="device-key"
                            className="block text-sm font-medium text-gray-700 mb-1"
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
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-slate-500 focus:border-slate-500"
                            placeholder="Enter a device key"
                        />
                        {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-slate-500 text-white py-2 px-4 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
                    >
                        <span>Start Following</span>
                        <FiArrowRight className="ml-2" />
                    </button>
                </form>
            </div>
        </div>
    );
}
