import { Outlet } from "react-router";

export default function Layout() {
    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <main className="flex-grow flex flex-col">
                <Outlet />
            </main>
        </div>
    );
}
