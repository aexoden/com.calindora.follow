import { useNavigate } from "react-router";
import { FiArrowLeft } from "react-icons/fi";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <>
            <title>Not Found « Calindora Follow</title>
            <div className="flex h-screen flex-col items-center justify-center bg-gray-100 p-4">
                <h1 className="mb-4 text-6xl font-bold text-gray-800">404</h1>
                <p className="mb-8 text-xl text-gray-600">Oops! The page you're looking for doesn't exist.</p>
                <button
                    onClick={() => void navigate("/")}
                    className="flex items-center rounded-md bg-slate-500 px-4 py-2 text-white hover:bg-slate-600 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
                >
                    <FiArrowLeft className="mr-2" />
                    Go Home
                </button>
            </div>
        </>
    );
}
