import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import TOS2026Popup from "@/components/tos2026/TOS2026Popup";
import Script from "next/script";

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
                <Script id="fb-pixel" strategy="afterInteractive">
                    {`
                        !function(f,b,e,v,n,t,s)
                        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                        n.queue=[];t=b.createElement(e);t.async=!0;
                        t.src=v;s=b.getElementsByTagName(e)[0];
                        s.parentNode.insertBefore(t,s)}(window, document,'script',
                        'https://connect.facebook.net/en_US/fbevents.js');
                        fbq('init', '1494311118592592');
                        fbq('track', 'PageView');
                    `}
                </Script>
                <noscript>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        height="1"
                        width="1"
                        style={{ display: "none" }}
                        src="https://www.facebook.com/tr?id=1494311118592592&ev=PageView&noscript=1"
                        alt=""
                    />
                </noscript>
                <Navigation />
                <TOS2026Popup />
                <main>{children}</main>
                <Footer />
            </body>
        </html>
    );
}

