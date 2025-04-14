import { BrowserRouter, Routes, Route } from "react-router";
import { SWRConfig } from "swr";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import FollowPage from "./pages/FollowPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
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
                                element={<FollowPage />}
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
