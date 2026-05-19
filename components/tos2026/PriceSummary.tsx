'use client';

import { Attendee } from '@/lib/tos2026/types';
import { calculatePriceBreakdown, formatPrice } from '@/lib/tos2026/pricing';

interface PriceSummaryProps {
  attendees: Attendee[];
  isSubmitting: boolean;
  onSubmit: () => void;
}

export default function PriceSummary({
  attendees,
  isSubmitting,
  onSubmit,
}: PriceSummaryProps) {
  const { breakdown, total } = calculatePriceBreakdown(attendees);
  const hasAttendees = attendees.some((a) => a.category);

  return (
    <div className="tos-summary-sticky">
      <div className="tos-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#D4A843]/20 to-[#D4A843]/5 p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#D4A843]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Registration Summary
          </h3>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Attendee count */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Total Attendees</span>
            <span className="text-slate-900 font-bold text-lg">{attendees.length}</span>
          </div>

          {/* Breakdown */}
          {breakdown.length > 0 ? (
            <div className="space-y-3">
              <div className="w-full h-px bg-slate-200" />
              {breakdown.map((item) => (
                <div key={item.category.id} className="tos-price-update">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.category.color }}
                      />
                      <span className="text-slate-700 text-sm">
                        {item.count}× {item.category.label}
                      </span>
                    </div>
                    <span className="text-slate-900 font-semibold text-sm">
                      {formatPrice(item.subtotal)}
                    </span>
                  </div>
                  <div className="ml-5 text-slate-400 text-xs">
                    @ {formatPrice(item.category.price)} each
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-400 text-sm">
                Select categories for your attendees to see pricing
              </p>
            </div>
          )}

          {/* Total */}
          <div className="w-full h-px bg-slate-200" />
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Total Amount</span>
            <span className="text-2xl font-black text-[#D4A843] tos-price-update">
              {formatPrice(total)}
            </span>
          </div>

          {total > 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-slate-500 text-xs leading-relaxed">
                A small processing fee of <span className="font-semibold text-slate-700">2%</span> will
                be added by Flutterwave at checkout. For example, a ₦10,000 registration
                will have a ₦200 fee, making the total ₦10,200.
              </p>
            </div>
          )}

          {/* CTA Button */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={!hasAttendees || isSubmitting}
            className={`tos-btn-primary mt-2 ${total > 0 && !isSubmitting ? 'pulse' : ''}`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                Register & Pay {total > 0 ? formatPrice(total) : ''}
              </>
            )}
          </button>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secured by Flutterwave
          </div>
        </div>
      </div>

      {/* Special registration note */}
      <div className="mt-4 tos-card rounded-xl p-4">
        <p className="text-slate-500 text-xs leading-relaxed">
          <span className="text-[#D4A843] font-semibold">Special / Discounted Registration?</span>
          <br />
          If you have a special arrangement or referral code, please{' '}
          <a
            href="#special-registration"
            className="text-[#D4A843] underline hover:text-[#F0D78C] transition-colors"
          >
            use the special form
          </a>{' '}
          instead.
        </p>
      </div>
    </div>
  );
}
