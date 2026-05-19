'use client';

import { useState, useCallback } from 'react';
import { Attendee, CoordinatorInfo } from '@/lib/tos2026/types';
import { calculatePriceBreakdown, formatPrice } from '@/lib/tos2026/pricing';
import AttendeeCard from './AttendeeCard';
import PriceSummary from './PriceSummary';

function createAttendee(churchName: string = ''): Attendee {
  return {
    id: Math.random().toString(36).substring(2, 10),
    fullName: '',
    gender: '',
    category: '',
    phoneNumber: '',
    emailAddress: '',
    region: '',
    localChurch: churchName,
    medicalConditions: '',
  };
}

type FormErrors = Record<string, Record<string, string>>;

export default function RegistrationForm() {
  const [registrationType, setRegistrationType] = useState<'individual' | 'group'>('individual');
  const [coordinator, setCoordinator] = useState<CoordinatorInfo>({
    fullName: '',
    phoneNumber: '',
    emailAddress: '',
    churchName: '',
  });
  const [attendees, setAttendees] = useState<Attendee[]>([createAttendee()]);
  const [coordErrors, setCoordErrors] = useState<Record<string, string>>({});
  const [attendeeErrors, setAttendeeErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registrationData, setRegistrationData] = useState<{
    registrationId: string;
    total: number;
    coordinator: CoordinatorInfo;
  } | null>(null);

  const updateCoordinator = (field: keyof CoordinatorInfo, value: string) => {
    setCoordinator((prev) => ({ ...prev, [field]: value }));
    if (coordErrors[field]) {
      setCoordErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateAttendee = useCallback((index: number, updated: Attendee) => {
    setAttendees((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
    setAttendeeErrors((prev) => {
      if (prev[updated.id]) {
        const next = { ...prev };
        delete next[updated.id];
        return next;
      }
      return prev;
    });
  }, []);

  const addAttendee = () => {
    setAttendees((prev) => [...prev, createAttendee(coordinator.churchName)]);
  };

  const removeAttendee = (index: number) => {
    setAttendees((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    let valid = true;
    const cErrors: Record<string, string> = {};
    const aErrors: FormErrors = {};

    // Coordinator validation (only for groups)
    if (registrationType === 'group') {
      if (!coordinator.fullName.trim()) {
        cErrors.fullName = 'Required';
        valid = false;
      }
      if (!coordinator.phoneNumber.trim()) {
        cErrors.phoneNumber = 'Required';
        valid = false;
      }
      if (!coordinator.emailAddress.trim()) {
        cErrors.emailAddress = 'Required';
        valid = false;
      } else if (!/\S+@\S+\.\S+/.test(coordinator.emailAddress)) {
        cErrors.emailAddress = 'Invalid email';
        valid = false;
      }
      if (!coordinator.churchName.trim()) {
        cErrors.churchName = 'Required';
        valid = false;
      }
    }

    // Attendee validation
    for (const att of attendees) {
      const errs: Record<string, string> = {};
      if (!att.fullName.trim()) { errs.fullName = 'Required'; valid = false; }
      if (!att.gender) { errs.gender = 'Required'; valid = false; }
      if (!att.category) { errs.category = 'Select a category'; valid = false; }
      if (!att.phoneNumber.trim()) { errs.phoneNumber = 'Required'; valid = false; }
      if (att.category !== 'toddler' && att.category !== 'child' && !att.emailAddress.trim()) {
        errs.emailAddress = 'Required';
        valid = false;
      }
      if (!att.region) { errs.region = 'Required'; valid = false; }
      if (!att.localChurch.trim()) { errs.localChurch = 'Required'; valid = false; }
      if (Object.keys(errs).length > 0) aErrors[att.id] = errs;
    }

    setCoordErrors(cErrors);
    setAttendeeErrors(aErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      // Scroll to first error
      const firstError = document.querySelector('.tos-input.error, .tos-error-text');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    const { total } = calculatePriceBreakdown(attendees);

    const finalCoordinator = registrationType === 'individual'
      ? {
        fullName: attendees[0].fullName,
        phoneNumber: attendees[0].phoneNumber,
        emailAddress: attendees[0].emailAddress,
        churchName: attendees[0].localChurch,
      }
      : coordinator;

    try {
      const res = await fetch('/api/tos2026/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinator: finalCoordinator, attendees, registrationType }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Registration failed');

      // Check if Flutterwave is configured
      if (data.paymentLink) {
        // Redirect to Flutterwave payment
        window.location.href = data.paymentLink;
      } else {
        // Placeholder mode: simulate success
        setRegistrationData({
          registrationId: data.registrationId,
          total,
          coordinator: finalCoordinator,
        });
        setShowSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success State ──
  if (showSuccess && registrationData) {
    return (
      <div className="container-custom py-16 max-w-2xl mx-auto">
        <div className="tos-card rounded-2xl p-8 md:p-12 text-center tos-fade-in">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">
            Registration Recorded
          </h2>
          <p className="text-slate-500 mb-6">
            Your registration has been recorded. Online payment is not configured yet,
            so the ELGCC admin team will follow up with payment instructions.
          </p>
          <div className="bg-slate-50 rounded-xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Registration ID</span>
              <span className="text-[#D4A843] font-mono font-bold text-sm">
                {registrationData.registrationId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">
                {registrationType === 'group' ? 'Coordinator' : 'Registrant'}
              </span>
              <span className="text-slate-900 font-semibold text-sm">{registrationData.coordinator.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Church</span>
              <span className="text-slate-900 font-semibold text-sm">{registrationData.coordinator.churchName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Attendees</span>
              <span className="text-slate-900 font-semibold text-sm">{attendees.length}</span>
            </div>
            <div className="w-full h-px bg-slate-200" />
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Total Amount</span>
              <span className="text-[#D4A843] font-black text-lg">
                {formatPrice(registrationData.total)}
              </span>
            </div>
          </div>
          <p className="text-slate-400 text-xs mb-6">
            A confirmation email will be sent to {registrationData.coordinator.emailAddress} once
            payment is confirmed.
          </p>
          <button
            onClick={() => {
              setShowSuccess(false);
              setRegistrationData(null);
              setCoordinator({ fullName: '', phoneNumber: '', emailAddress: '', churchName: '' });
              setAttendees([createAttendee()]);
            }}
            className="tos-btn-secondary inline-flex w-auto px-8"
          >
            Register Another Group
          </button>
        </div>
      </div>
    );
  }

  // ── Mobile Bottom Bar ──
  const { total } = calculatePriceBreakdown(attendees);

  return (
    <div className="container-custom py-12 md:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left Column: Form ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section: Registration Type */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setRegistrationType('individual');
                setAttendees([attendees[0]]); // Reset to 1 attendee
              }}
              className={`flex-1 py-4 px-2 rounded-xl border text-sm md:text-base font-bold transition-all ${registrationType === 'individual'
                  ? 'border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843]'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
            >
              👤 Just Myself
            </button>
            <button
              type="button"
              onClick={() => setRegistrationType('group')}
              className={`flex-1 py-4 px-2 rounded-xl border text-sm md:text-base font-bold transition-all ${registrationType === 'group'
                  ? 'border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843]'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
            >
              👥 Group / Church
            </button>
          </div>

          {/* Section: Coordinator Info (Groups Only) */}
          {registrationType === 'group' && (
            <section className="tos-fade-in">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#D4A843]/20 flex items-center justify-center">
                  <span className="text-[#D4A843] font-bold text-sm">1</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Your Information
                </h2>
              </div>
              <div className="tos-card rounded-2xl p-5 md:p-6">
                <p className="text-slate-500 text-sm mb-5">
                  This is the contact person coordinating this registration.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="tos-label">Full Name *</label>
                    <input
                      type="text"
                      className={`tos-input ${coordErrors.fullName ? 'error' : ''}`}
                      placeholder="Your full name"
                      value={coordinator.fullName}
                      onChange={(e) => updateCoordinator('fullName', e.target.value)}
                    />
                    {coordErrors.fullName && <p className="tos-error-text">{coordErrors.fullName}</p>}
                  </div>
                  <div>
                    <label className="tos-label">Church / Organization *</label>
                    <input
                      type="text"
                      className={`tos-input ${coordErrors.churchName ? 'error' : ''}`}
                      placeholder="Name of your church"
                      value={coordinator.churchName}
                      onChange={(e) => updateCoordinator('churchName', e.target.value)}
                    />
                    {coordErrors.churchName && <p className="tos-error-text">{coordErrors.churchName}</p>}
                  </div>
                  <div>
                    <label className="tos-label">Phone Number *</label>
                    <input
                      type="tel"
                      className={`tos-input ${coordErrors.phoneNumber ? 'error' : ''}`}
                      placeholder="e.g. 08012345678"
                      value={coordinator.phoneNumber}
                      onChange={(e) => updateCoordinator('phoneNumber', e.target.value)}
                    />
                    {coordErrors.phoneNumber && <p className="tos-error-text">{coordErrors.phoneNumber}</p>}
                  </div>
                  <div>
                    <label className="tos-label">Email Address *</label>
                    <input
                      type="email"
                      className={`tos-input ${coordErrors.emailAddress ? 'error' : ''}`}
                      placeholder="email@example.com"
                      value={coordinator.emailAddress}
                      onChange={(e) => updateCoordinator('emailAddress', e.target.value)}
                    />
                    {coordErrors.emailAddress && <p className="tos-error-text">{coordErrors.emailAddress}</p>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section: Attendees */}
          <section className="tos-fade-in">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4A843]/20 flex items-center justify-center">
                  <span className="text-[#D4A843] font-bold text-sm">
                    {registrationType === 'group' ? '2' : '1'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {registrationType === 'group' ? 'Attendees' : 'Your Details'}
                  {registrationType === 'group' && (
                    <span className="text-slate-400 font-normal text-base ml-2">
                      ({attendees.length})
                    </span>
                  )}
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              {attendees.map((att, i) => (
                <AttendeeCard
                  key={att.id}
                  attendee={att}
                  index={i}
                  total={attendees.length}
                  onChange={(updated) => updateAttendee(i, updated)}
                  onRemove={() => removeAttendee(i)}
                  errors={attendeeErrors[att.id] || {}}
                />
              ))}
            </div>

            {/* Add attendee (Groups Only) */}
            {registrationType === 'group' && (
              <button
                type="button"
                onClick={addAttendee}
                className="tos-btn-secondary mt-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Another Attendee
              </button>
            )}
          </section>

          {/* Special Registration Section */}
          <section id="special-registration">
            <div className="tos-card rounded-2xl p-5 md:p-6 border-dashed border-slate-200">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🎟️</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">
                    Special / Discounted Registration
                  </h3>
                  <p className="text-slate-500 text-sm mb-3">
                    If you have a special arrangement, referral, or have been
                    approved for special registration, please use the
                    special registration form below with your proof of payment.
                  </p>
                  <a
                    href="https://forms.gle/5CtijdKdMsh8xmMy8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#D4A843] font-semibold text-sm hover:text-[#F0D78C] transition-colors"
                  >
                    Open Special Registration Form
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Right Column: Price Summary (Desktop) ── */}
        <div className="hidden lg:block">
          <PriceSummary
            attendees={attendees}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      {/* ── Mobile Bottom Bar ── */}
      <div className="tos-mobile-bottom-bar lg:hidden">

        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-slate-500 text-xs">{attendees.length} attendee{attendees.length !== 1 ? 's' : ''}</span>
            <div className="text-[#D4A843] font-black text-xl">{formatPrice(total)}</div>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!attendees.some((a) => a.category) || isSubmitting}
            className="tos-btn-primary w-auto px-6 py-3 text-sm"
          >
            {isSubmitting ? 'Processing...' : `Register & Pay`}
          </button>
        </div>
      </div>
    </div>
  );
}
