import { Outlet } from "react-router";

export default function Layout() {
    return (
        <div className="flex h-dvh flex-col bg-gray-50">
            <main className="flex flex-grow flex-col">
                <Outlet />
            </main>
        </div>
    );
}
