import { BrowserRouter, Routes, Route } from "react-router";
import { SWRConfig } from "swr";
import Layout from "./components/Layout";
import FollowPage from "./pages/FollowPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { ErrorProvider } from "./components/ErrorProvider";

export default function App() {
    return (
        <ErrorBoundary>
            <ErrorProvider>
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
            </ErrorProvider>
        </ErrorBoundary>
    );
}
