import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { SWRConfig } from "swr";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import FollowPage from "./pages/FollowPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { configService } from "./services/config";
import { useToast } from "./hooks/useToast";

export default function App() {
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>("");
    const [configLoaded, setConfigLoaded] = useState<boolean>(false);

    const toast = useToast();

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const config = await configService.getConfig();
                setGoogleMapsApiKey(config.maps_api_key);
                setConfigLoaded(true);
            } catch (_error: unknown) {
                toast.error("Failed to load configuration", "Some features may not work correctly");
                setConfigLoaded(true);
            }
        };

        void loadConfig();
    }, [toast]);

    return (
        <ErrorBoundary>
            <SWRConfig
                value={{
                    errorRetryCount: 1,
                    onError: (error) => {
                        console.error("SWR Error:", error);
                    },
                    revalidateOnFocus: false,
                }}
            >
                <BrowserRouter>
                    <Routes>
                        <Route
                            path="/"
                            element={<Layout />}
                        >
                            <Route
                                index
                                element={<HomePage />}
                            />
                            <Route
                                path="follow/:deviceKey"
                                element={
                                    configLoaded ? (
                                        <FollowPage googleMapsApiKey={googleMapsApiKey} />
                                    ) : (
                                        <div>Loading...</div>
                                    )
                                }
                            />
                            <Route
                                path="*"
                                element={<NotFoundPage />}
                            />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </SWRConfig>
            <Toaster
                position="bottom-right"
                toastOptions={{
                    className: "text-sm",

                    error: {
                        style: {
                            background: "#FEF2F2",
                            color: "#B91C1C",
                        },
                    },

                    success: {
                        style: {
                            background: "#EFF6FF",
                            color: "#1E40AF",
                        },
                    },
                }}
            />
        </ErrorBoundary>
    );
}
