import { useState, useEffect } from "react";

export type ScreenSize = "sm" | "md" | "lg" | "xl" | "2xl";

export function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        height: typeof window !== "undefined" ? window.innerHeight : 768,
        width: typeof window !== "undefined" ? window.innerWidth : 1024,
    });

    const [screenSize, setScreenSize] = useState<ScreenSize>("lg");

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                height: window.innerHeight,
                width: window.innerWidth,
            });

            if (window.innerWidth < 640) {
                setScreenSize("sm");
            } else if (window.innerWidth < 1024) {
                setScreenSize("md");
            } else if (window.innerWidth < 1280) {
                setScreenSize("lg");
            } else if (window.innerWidth < 1536) {
                setScreenSize("xl");
            } else {
                setScreenSize("2xl");
            }
        }

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return { screenSize, windowSize };
}
