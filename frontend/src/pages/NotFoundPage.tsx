import { useNavigate } from "react-router";
import { FiArrowLeft } from "react-icons/fi";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
            <p className="text-xl text-gray-600 mb-8">Oops! The page you're looking for doesn't exist.</p>
            <button
                onClick={() => void navigate("/")}
                className="flex items-center bg-slate-500 text-white px-4 py-2 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
                <FiArrowLeft className="mr-2" />
                Go Home
            </button>
        </div>
    );
}
