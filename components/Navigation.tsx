'use client';

import Link from 'next/link';
import { useState } from 'react';
import { liveConfig } from '@/lib/live';

export default function Navigation() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinks = [
        { name: 'HOME', href: '/' },
        { name: 'ABOUT', href: '#about' },
        { name: 'TOS 2026', href: '/register/tos2026', highlight: true },
        { name: 'LIVE', href: '/live', live: true as const },
        { name: 'TEACHINGS', href: '/teachings' },
        { name: 'SPECIAL PROGRAMMES', href: '/programmes' },
        { name: 'LOCATIONS', href: '/locations' },
        { name: 'PARTNERSHIP', href: '/partnership' },
        { name: 'CONTACT US', href: '/contact' },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-dark border-b border-primary/10">
            <div className="container-custom">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 shrink-0">
                        <div className="bg-primary-light rounded-lg overflow-hidden p-1.5 flex items-center justify-center">
                            <img
                                src="/images/elgcc-logo1.png"
                                alt="ELGCC - Eternal Life Global Community Church"
                                className="h-10 sm:h-12 lg:h-14 w-auto object-contain"
                            />
                        </div>
                    </Link>
 
                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center lg:space-x-4 xl:space-x-6 2xl:space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name + link.href}
                                href={link.href}
                                className={
                                    link.live && liveConfig.isLive
                                        ? "lg:text-xs xl:text-sm font-semibold text-red-400 hover:text-red-300 transition-colors duration-300 tracking-wide flex items-center gap-1 shrink-0"
                                        : link.highlight
                                        ? "lg:text-xs xl:text-sm font-semibold text-[#D4A843] hover:text-[#F0D78C] transition-colors duration-300 tracking-wide flex items-center gap-1 shrink-0"
                                        : "lg:text-xs xl:text-sm font-medium text-white/80 hover:text-primary transition-colors duration-300 tracking-wide shrink-0"
                                }
                            >
                                {link.highlight && <span className="animate-pulse">🔥</span>}
                                {link.live && liveConfig.isLive && (
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                                )}
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* CTA Button */}
                    <div className="hidden lg:block shrink-0">
                        <Link href="/contact" className="btn-primary lg:px-4 lg:py-2 xl:px-6 xl:py-3 lg:text-xs xl:text-sm">
                            JOIN US
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="lg:hidden text-white p-2"
                        aria-label="Toggle menu"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {isMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="lg:hidden py-4 border-t border-primary/10">
                        <div className="flex flex-col space-y-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name + link.href}
                                    href={link.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={
                                        link.live && liveConfig.isLive
                                            ? "text-sm font-semibold text-red-400 hover:text-red-300 transition-colors duration-300 tracking-wide flex items-center gap-1"
                                            : link.highlight
                                            ? "text-sm font-semibold text-[#D4A843] hover:text-[#F0D78C] transition-colors duration-300 tracking-wide flex items-center gap-1"
                                            : "text-sm font-medium text-white/80 hover:text-primary transition-colors duration-300 tracking-wide"
                                    }
                                >
                                    {link.highlight && <span className="animate-pulse">🔥</span>}
                                    {link.live && liveConfig.isLive && (
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                                    )}
                                    {link.name}
                                </Link>
                            ))}
                            <Link
                                href="/contact"
                                onClick={() => setIsMenuOpen(false)}
                                className="btn-primary text-sm inline-block text-center"
                            >
                                JOIN US
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
