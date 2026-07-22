'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Hero() {
    const images = [
        '/images/IMG_E4117.JPG',
        '/images/IMG_0787.jpg'
    ];

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
        }, 10000); // 10 seconds

        return () => clearInterval(interval);
    }, [images.length]);

    return (
        <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-dark">
            {/* Background Slideshow */}
            {images.map((src, index) => (
                <div
                    key={src}
                    className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out z-0 ${index === currentImageIndex ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}
                >
                    <Image
                        src={src}
                        alt="ELGCC Welcome"
                        fill
                        className="object-cover object-top"
                        priority={index === 0}
                        quality={90}
                    />
                </div>
            ))}

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-dark/80 via-dark/50 to-dark/80 z-0">
                {/* Decorative elements */}
                <div className="absolute top-20 right-20 w-72 h-72 bg-primary/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"></div>
            </div>

            {/* Content */}
            <div className="container-custom relative z-10 text-center pt-20">
                <div className="max-w-4xl mx-auto">
                    {/* Main Heading */}
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight drop-shadow-2xl">
                        <span className="block text-white">UNVEILING THE FATHER</span>
                        <span className="block text-primary-light mix-blend-screen text-shadow-sm">IN THE FACE OF THE SON,</span>
                        <span className="block text-primary-light mix-blend-screen text-shadow-sm">JESUS CHRIST</span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-md font-medium">
                        Join us as we worship together, grow in faith, and transform lives through the power of God&apos;s word.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link href="#programmes" className="btn-primary shadow-xl hover:shadow-primary/20">
                            FELLOWSHIP WITH US
                        </Link>
                        <Link href="/live" className="btn-secondary shadow-xl hover:bg-white/10">
                            WATCH LIVE
                        </Link>
                    </div>

                    {/* Scroll Indicator */}
                    <div className="mt-16 animate-bounce drop-shadow-xl">
                        <svg
                            className="w-8 h-8 mx-auto text-primary-light"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                        </svg>
                    </div>
                </div>
            </div>
        </section>
    );
}
