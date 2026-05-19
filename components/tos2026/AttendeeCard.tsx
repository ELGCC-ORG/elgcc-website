'use client';

import { Attendee, AttendeeCategory, Gender, Region } from '@/lib/tos2026/types';
import { CATEGORIES, formatPrice } from '@/lib/tos2026/pricing';

interface AttendeeCardProps {
  attendee: Attendee;
  index: number;
  total: number;
  onChange: (updated: Attendee) => void;
  onRemove: () => void;
  errors: Record<string, string>;
}

export default function AttendeeCard({
  attendee,
  index,
  total,
  onChange,
  onRemove,
  errors,
}: AttendeeCardProps) {
  const update = (field: keyof Attendee, value: string) => {
    onChange({ ...attendee, [field]: value });
  };

  const selectedCat = CATEGORIES.find((c) => c.id === attendee.category);

  return (
    <div className="tos-card rounded-2xl p-5 md:p-6 tos-attendee-enter relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{
              background: selectedCat
                ? `${selectedCat.color}20`
                : 'rgba(0,0,0,0.08)',
              color: selectedCat ? selectedCat.color : 'rgba(0,0,0,0.5)',
            }}
          >
            {index + 1}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {attendee.fullName || `Attendee ${index + 1}`}
            </h3>
            {selectedCat && (
              <span
                className="text-xs font-semibold"
                style={{ color: selectedCat.color }}
              >
                {selectedCat.icon} {selectedCat.label} · {formatPrice(selectedCat.price)}
              </span>
            )}
          </div>
        </div>
        {total > 1 && (
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
            title="Remove attendee"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="md:col-span-2">
          <label className="tos-label">Full Name *</label>
          <input
            type="text"
            className={`tos-input ${errors.fullName ? 'error' : ''}`}
            placeholder="Enter full name"
            value={attendee.fullName}
            onChange={(e) => update('fullName', e.target.value)}
          />
          {errors.fullName && <p className="tos-error-text">{errors.fullName}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className="tos-label">Gender *</label>
          <div className="tos-radio-group">
            {(['Male', 'Female'] as Gender[]).map((g) => (
              <label
                key={g}
                className={`tos-radio-option ${attendee.gender === g ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name={`gender-${attendee.id}`}
                  value={g}
                  checked={attendee.gender === g}
                  onChange={() => update('gender', g)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    attendee.gender === g
                      ? 'border-[#D4A843] bg-[#D4A843]'
                      : 'border-slate-300'
                  }`}
                >
                  {attendee.gender === g && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
                  )}
                </div>
                <span className="text-slate-700 text-sm">{g}</span>
              </label>
            ))}
          </div>
          {errors.gender && <p className="tos-error-text">{errors.gender}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="tos-label">Category *</label>
          <div className="flex flex-col gap-2">
            {CATEGORIES.map((cat) => (
              <label
                key={cat.id}
                className={`tos-radio-option ${
                  attendee.category === cat.id ? 'selected' : ''
                }`}
                style={
                  attendee.category === cat.id
                    ? { borderColor: cat.color, background: `${cat.color}15` }
                    : {}
                }
              >
                <input
                  type="radio"
                  name={`category-${attendee.id}`}
                  value={cat.id}
                  checked={attendee.category === cat.id}
                  onChange={() => update('category', cat.id)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all`}
                  style={
                    attendee.category === cat.id
                      ? { borderColor: cat.color, backgroundColor: cat.color }
                      : { borderColor: 'rgba(0,0,0,0.3)' }
                  }
                >
                  {attendee.category === cat.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
                  )}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-slate-700 text-sm">
                    {cat.icon} {cat.label}
                    <span className="text-slate-500 text-xs ml-1">({cat.ageRange})</span>
                  </span>
                  <span
                    className="font-bold text-xs"
                    style={{ color: cat.color }}
                  >
                    {formatPrice(cat.price)}
                  </span>
                </div>
              </label>
            ))}
          </div>
          {errors.category && <p className="tos-error-text">{errors.category}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="tos-label">Phone Number *</label>
          <input
            type="tel"
            className={`tos-input ${errors.phoneNumber ? 'error' : ''}`}
            placeholder="e.g. 08012345678"
            value={attendee.phoneNumber}
            onChange={(e) => update('phoneNumber', e.target.value)}
          />
          {errors.phoneNumber && <p className="tos-error-text">{errors.phoneNumber}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="tos-label">
            Email Address {attendee.category === 'toddler' || attendee.category === 'child' ? '(optional)' : '*'}
          </label>
          <input
            type="email"
            className={`tos-input ${errors.emailAddress ? 'error' : ''}`}
            placeholder="email@example.com"
            value={attendee.emailAddress}
            onChange={(e) => update('emailAddress', e.target.value)}
          />
          {errors.emailAddress && <p className="tos-error-text">{errors.emailAddress}</p>}
        </div>

        {/* Region */}
        <div>
          <label className="tos-label">Region of Residence *</label>
          <select
            className={`tos-input tos-select ${errors.region ? 'error' : ''}`}
            value={attendee.region}
            onChange={(e) => update('region', e.target.value)}
          >
            <option value="">Select region</option>
            <option value="Southern Nigeria">Southern Nigeria</option>
            <option value="Northern Nigeria">Northern Nigeria</option>
            <option value="Outside Nigeria">Outside Nigeria</option>
          </select>
          {errors.region && <p className="tos-error-text">{errors.region}</p>}
        </div>

        {/* Local Church */}
        <div>
          <label className="tos-label">Local Church *</label>
          <input
            type="text"
            className={`tos-input ${errors.localChurch ? 'error' : ''}`}
            placeholder="Name of local church"
            value={attendee.localChurch}
            onChange={(e) => update('localChurch', e.target.value)}
          />
          {errors.localChurch && <p className="tos-error-text">{errors.localChurch}</p>}
        </div>

        {/* Medical Conditions */}
        <div className="md:col-span-2">
          <label className="tos-label">
            Medical Conditions{' '}
            <span className="text-slate-400 normal-case">(Peptic ulcer, Sickle cell, Asthma, Diabetes, Seizure, etc.)</span>
          </label>
          <input
            type="text"
            className="tos-input"
            placeholder="None, or describe conditions..."
            value={attendee.medicalConditions}
            onChange={(e) => update('medicalConditions', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
