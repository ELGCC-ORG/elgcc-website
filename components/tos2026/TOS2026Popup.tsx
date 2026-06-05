'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TOS2026Popup() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if user has already seen the popup in this session/browser
        const hasSeen = localStorage.getItem('elgcc_tos_2026_popup_seen');
        if (!hasSeen) {
            // Wait 1.5 seconds before showing the popup for a premium entrance feel
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('elgcc_tos_2026_popup_seen', 'true');
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={handleClose} />

            {/* Modal Box */}
            <div className="relative w-full max-w-lg bg-dark-card border border-[#D4A843]/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(212,168,67,0.15)] p-6 md:p-8 text-center flex flex-col items-center animate-scale-in">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/5"
                    aria-label="Close modal"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Animated Flame Icon Container */}
                <div className="mb-6 relative">
                    <div className="absolute inset-0 bg-[#D4A843]/20 rounded-full blur-xl scale-125 animate-pulse" />
                    <div className="relative w-16 h-16 bg-gradient-to-br from-[#D4A843]/10 to-[#F0D78C]/5 border border-[#D4A843]/30 rounded-full flex items-center justify-center text-3xl shadow-lg">
                        🔥
                    </div>
                </div>

                {/* Event Name */}
                <span className="text-xs font-semibold text-[#D4A843] tracking-widest uppercase mb-2">
                    Annual Spiritual Conference
                </span>
                <h2 className="text-2xl md:text-3xl font-black mb-3 text-white">
                    TRAINING OF
                    <br />
                    <span className="bg-gradient-to-r from-[#D4A843] via-[#F0D78C] to-[#D4A843] bg-clip-text text-transparent">
                        THE SPIRIT 2026
                    </span>
                </h2>

                {/* Description */}
                <p className="text-white/70 text-sm md:text-base leading-relaxed mb-6 max-w-md">
                    Join us for a supernatural shift and spiritual empowerment. Register yourself or your church group to reserve your spot.
                </p>

                {/* Event Highlights Info */}
                <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex flex-col sm:flex-row justify-around gap-4 text-left">
                    <div className="flex items-center gap-3">
                        <div className="text-[#D4A843]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-white/40 uppercase font-semibold">Date</p>
                            <p className="text-sm font-bold text-white">August 3 – 8, 2026</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-[#D4A843]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-white/40 uppercase font-semibold">Venue</p>
                            <p className="text-sm font-bold text-white">Coming Soon</p>
                        </div>
                    </div>
                </div>

                {/* Call to Actions */}
                <div className="w-full flex flex-col sm:flex-row gap-3">
                    <Link
                        href="/register/tos2026"
                        onClick={handleClose}
                        className="flex-1 bg-gradient-to-r from-[#D4A843] to-[#B8912E] hover:from-[#E5B954] hover:to-[#C9A23F] text-black font-extrabold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(212,168,67,0.3)] text-center text-sm tracking-wide flex items-center justify-center"
                    >
                        REGISTER NOW
                    </Link>
                    <button
                        onClick={handleClose}
                        className="flex-1 border border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 text-sm tracking-wide"
                    >
                        MAYBE LATER
                    </button>
                </div>

                {/* Muted note */}
                <span className="text-[10px] text-white/35 mt-4 italic block">
                    *Dismissing will hide this notification.
                </span>
            </div>
        </div>
    );
}
