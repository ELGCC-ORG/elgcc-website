import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import TOS2026Popup from "@/components/tos2026/TOS2026Popup";

const inter = Inter({
    subsets: ["latin"],
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: "ELGCC - Eternal Life Global Community Church",
    description: "Welcome to Eternal Life Global Community Church - A place of prayer, power, and purpose. Join us for worship, teachings, and community.",
    keywords: ["church", "worship", "sermons", "community", "faith", "ELGCC", "Eternal Life", "Ibadan", "Nigeria"],
    icons: {
        icon: '/images/favicon.png',
        apple: '/images/favicon.png',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={inter.variable}>
            <body className="antialiased">
                <Navigation />
                <TOS2026Popup />
                <main>{children}</main>
                <Footer />
            </body>
        </html>
    );
}
