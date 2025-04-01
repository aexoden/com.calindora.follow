import { BrowserRouter, Routes, Route } from "react-router";
import { SWRConfig } from "swr";
import Layout from "./components/Layout";
import FollowPage from "./pages/FollowPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
    return (
        <SWRConfig
            value={{
                errorRetryCount: 1,
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
    );
}
