'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface SchoolData {
  [location: string]: string[];
}

const DEFAULT_LOCATIONS = [
  'IKOLABA',
  'UI',
  'UCH',
  'BODIJA',
  'SANGO',
  'CHALLENGE',
  'APATA',
  'MAPO',
  'IWOROAD',
  'BASHORUN',
  'ILESHA',
  'IKIRUN',
  'ILE-IFE',
  'OTHERS',
];

const CLASS_OPTIONS = [
  { id: 'Secondary (Senior: SS1-SS3)', label: 'Secondary (SS1–SS3)', icon: '🎒' },
  { id: 'Junior Class (JSS1-JSS3)', label: 'Junior Class (JSS1–JSS3)', icon: '📘' },
  { id: 'Primary Class', label: 'Primary Class', icon: '✏️' },
  { id: 'Tertiary / Other', label: 'Tertiary / Other', icon: '🎓' },
];

function CornerstoneFormContent() {
  const searchParams = useSearchParams();
  const queryGroup = searchParams.get('group') || searchParams.get('location') || '';

  const [locations, setLocations] = useState<string[]>(DEFAULT_LOCATIONS);
  const [schoolsByLoc, setSchoolsByLoc] = useState<SchoolData>({});
  const [selectedLocation, setSelectedLocation] = useState<string>('UI');
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [isCustomSchool, setIsCustomSchool] = useState<boolean>(false);
  const [customSchoolName, setCustomSchoolName] = useState<string>('');

  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isWhatsApp, setIsWhatsApp] = useState<boolean>(true);
  const [homeAddress, setHomeAddress] = useState<string>('');
  const [classCategory, setClassCategory] = useState<string>('Secondary (Senior: SS1-SS3)');
  const [notes, setNotes] = useState<string>('');
  const [recordedBy, setRecordedBy] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{ id: string; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Remember counselor name locally
  useEffect(() => {
    const savedCounselor = localStorage.getItem('cornerstone_counselor_name');
    if (savedCounselor) {
      setRecordedBy(savedCounselor);
    }
  }, []);

  // Fetch school lists from backend
  const fetchSchools = async () => {
    try {
      const res = await fetch('/api/cornerstone/schools');
      const data = await res.json();
      if (data.success && data.schools) {
        setSchoolsByLoc(data.schools);
        if (data.locations && data.locations.length > 0) {
          // Merge unique locations
          const mergedLocs = Array.from(new Set([...DEFAULT_LOCATIONS, ...data.locations]));
          setLocations(mergedLocs);
        }
      }
    } catch (err) {
      console.error('Failed to load schools list:', err);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  // If queryGroup passed in URL, auto-select it
  useEffect(() => {
    if (queryGroup) {
      const matched = locations.find((l) => l.toLowerCase() === queryGroup.toLowerCase());
      if (matched) {
        setSelectedLocation(matched);
      } else {
        setSelectedLocation(queryGroup.toUpperCase());
      }
    }
  }, [queryGroup, locations]);

  // When location changes, reset school selection
  const currentSchools = schoolsByLoc[selectedLocation] || [];

  const handleLocationChange = (loc: string) => {
    setSelectedLocation(loc);
    setSelectedSchool('');
    setIsCustomSchool(false);
    setCustomSchoolName('');
  };

  const handleSchoolSelect = (val: string) => {
    if (val === '__CUSTOM_NEW__') {
      setIsCustomSchool(true);
      setSelectedSchool('');
    } else {
      setIsCustomSchool(false);
      setSelectedSchool(val);
      setCustomSchoolName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const finalSchool = isCustomSchool ? customSchoolName.trim() : selectedSchool.trim();

    if (!selectedLocation) {
      setErrorMessage('Please select a strategic location / group.');
      return;
    }
    if (!finalSchool) {
      setErrorMessage('Please choose or enter a school name.');
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage('Please enter the full name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter a phone number.');
      return;
    }

    setLoading(true);

    try {
      // Save counselor name for subsequent records
      if (recordedBy.trim()) {
        localStorage.setItem('cornerstone_counselor_name', recordedBy.trim());
      }

      const res = await fetch('/api/cornerstone/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: selectedLocation,
          school: finalSchool,
          isCustomSchool: isCustomSchool,
          fullName: fullName.trim(),
          phone: phone.trim(),
          isWhatsApp,
          homeAddress: homeAddress.trim(),
          classCategory,
          notes: notes.trim(),
          recordedBy: recordedBy.trim(),
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to save record.');
      }

      // Success
      setSuccessData({ id: result.id, name: fullName.trim() });
      // Refresh schools list so any newly added school appears right away
      fetchSchools();
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForNext = () => {
    setSuccessData(null);
    setFullName('');
    setPhone('');
    setIsWhatsApp(true);
    setHomeAddress('');
    setNotes('');
    // Keep location and school selected for rapid-fire entries at the same school/group!
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#111411] text-[#EBE6DF] pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6B7F4C]/20 border border-[#6B7F4C]/40 text-[#A2B87D] text-xs font-semibold uppercase tracking-wider mb-2">
            <span>📖</span> Cornerstone 2026 Outreach
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Member & School Recording Form
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Records directly to Google Sheets with live tabled dashboard.
          </p>

          <div className="mt-3 flex justify-center gap-3">
            <Link
              href="/cornerstone/records"
              className="inline-flex items-center gap-1.5 text-xs text-[#A2B87D] hover:text-white bg-[#1A1F1A] border border-[#6B7F4C]/30 px-3 py-1.5 rounded-lg transition"
            >
              <span>📊</span> View Records Table & Stats
            </Link>
          </div>
        </div>

        {/* Success Modal / Banner */}
        {successData ? (
          <div className="bg-[#182018] border-2 border-[#6B7F4C] rounded-2xl p-6 sm:p-8 text-center shadow-2xl animate-fade-in">
            <div className="w-16 h-16 bg-[#6B7F4C]/20 text-[#A2B87D] rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-[#6B7F4C]/50">
              ✓
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
              Contact Recorded Successfully!
            </h2>
            <p className="text-sm text-gray-300 mb-6">
              <strong className="text-white">{successData.name}</strong> has been saved directly to the church Google Sheet database.
            </p>

            <div className="bg-[#121612] p-4 rounded-xl border border-white/5 text-xs text-left mb-6 space-y-1">
              <div><span className="text-gray-400">Location Group:</span> <strong className="text-[#A2B87D]">{selectedLocation}</strong></div>
              <div><span className="text-gray-400">School:</span> <strong className="text-white">{isCustomSchool ? customSchoolName : selectedSchool}</strong></div>
              <div><span className="text-gray-400">Record ID:</span> <span className="font-mono text-gray-300">{successData.id}</span></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleResetForNext}
                className="flex-1 bg-[#6B7F4C] hover:bg-[#7D9459] text-white font-bold py-3 px-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                <span>➕</span> Record Next Contact
              </button>
              <Link
                href="/cornerstone/records"
                className="bg-[#242A24] hover:bg-[#2C332C] text-gray-200 font-medium py-3 px-4 rounded-xl border border-white/10 transition flex items-center justify-center gap-2"
              >
                <span>📊</span> View All Records
              </Link>
            </div>
          </div>
        ) : (
          /* Main Form Card */
          <form
            onSubmit={handleSubmit}
            className="bg-[#181D18] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-6"
          >
            {/* Error banner */}
            {errorMessage && (
              <div className="bg-red-950/60 border border-red-500/50 rounded-xl p-3 text-red-200 text-sm flex items-start gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Strategic Location */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[#A2B87D] uppercase tracking-wider">
                  1. Strategic Location / Group *
                </label>
                <span className="text-[11px] text-gray-400">
                  Current: <strong className="text-white">{selectedLocation}</strong>
                </span>
              </div>

              {/* Responsive Location Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {locations.map((loc) => {
                  const isSelected = selectedLocation.toUpperCase() === loc.toUpperCase();
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => handleLocationChange(loc)}
                      className={`text-xs py-2 px-2.5 rounded-lg font-semibold transition border text-center truncate ${
                        isSelected
                          ? 'bg-[#6B7F4C] text-white border-[#8CA563] shadow-md shadow-[#6B7F4C]/30 scale-[1.02]'
                          : 'bg-[#121612] text-gray-300 border-white/5 hover:border-[#6B7F4C]/40 hover:bg-[#1C231C]'
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: School Selector */}
            <div className="pt-2 border-t border-white/5">
              <label className="block text-xs font-bold text-[#A2B87D] uppercase tracking-wider mb-2">
                2. School (For {selectedLocation}) *
              </label>

              {/* Dropdown */}
              <select
                value={isCustomSchool ? '__CUSTOM_NEW__' : selectedSchool}
                onChange={(e) => handleSchoolSelect(e.target.value)}
                className="w-full bg-[#121612] border border-white/15 focus:border-[#6B7F4C] focus:ring-1 focus:ring-[#6B7F4C] text-white rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
              >
                <option value="">-- Select School in {selectedLocation} --</option>
                {currentSchools.map((sch) => (
                  <option key={sch} value={sch}>
                    {sch}
                  </option>
                ))}
                <option value="__CUSTOM_NEW__">
                  ➕ School Not Listed / Add New School...
                </option>
              </select>

              {/* Dynamic Add School Input */}
              {(isCustomSchool || currentSchools.length === 0) && (
                <div className="mt-3 bg-[#131913] p-3.5 rounded-xl border border-[#6B7F4C]/40 animate-fade-in">
                  <label className="block text-xs font-medium text-emerald-300 mb-1 flex items-center gap-1.5">
                    <span>✏️</span> Enter School Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Baptist Model High School"
                    value={customSchoolName}
                    onChange={(e) => setCustomSchoolName(e.target.value)}
                    className="w-full bg-[#0D110D] border border-[#6B7F4C]/60 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                  <p className="mt-1.5 text-[11px] text-gray-400 leading-snug">
                    💡 This new school will automatically be saved to <strong>{selectedLocation}</strong> so all future workers will see it in the dropdown!
                  </p>
                </div>
              )}
            </div>

            {/* Step 3: Member Contact Details */}
            <div className="pt-2 border-t border-white/5 space-y-4">
              <label className="block text-xs font-bold text-[#A2B87D] uppercase tracking-wider">
                3. Student / Member Information *
              </label>

              {/* Full Name */}
              <div>
                <label className="block text-xs text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oluwaseun Adeleke"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#121612] border border-white/15 focus:border-[#6B7F4C] text-white placeholder-gray-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
                />
              </div>

              {/* Phone Number + WhatsApp Checkbox */}
              <div>
                <label className="block text-xs text-gray-300 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#121612] border border-white/15 focus:border-[#6B7F4C] text-white placeholder-gray-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
                />

                <label className="mt-2.5 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isWhatsApp}
                    onChange={(e) => setIsWhatsApp(e.target.checked)}
                    className="w-4 h-4 accent-[#6B7F4C] rounded cursor-pointer"
                  />
                  <span className="text-xs text-gray-300 flex items-center gap-1">
                    <span className="text-emerald-400">💬</span> This phone number is on WhatsApp
                  </span>
                </label>
              </div>

              {/* Home Address */}
              <div>
                <label className="block text-xs text-gray-300 mb-1">Home / Residential Address</label>
                <input
                  type="text"
                  placeholder="e.g. 12, Agodi Gate, Ibadan"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  className="w-full bg-[#121612] border border-white/15 focus:border-[#6B7F4C] text-white placeholder-gray-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
                />
              </div>
            </div>

            {/* Step 4: Class / Level */}
            <div className="pt-2 border-t border-white/5">
              <label className="block text-xs font-bold text-[#A2B87D] uppercase tracking-wider mb-2">
                4. Class / Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CLASS_OPTIONS.map((c) => {
                  const isSelected = classCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClassCategory(c.id)}
                      className={`text-xs p-2.5 rounded-xl font-medium border text-left transition flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#6B7F4C]/25 text-white border-[#6B7F4C]'
                          : 'bg-[#121612] text-gray-400 border-white/5 hover:bg-[#181D18]'
                      }`}
                    >
                      <span className="text-base">{c.icon}</span>
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 5: Optional Follow-up notes & Worker Name */}
            <div className="pt-2 border-t border-white/5 space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Follow-up Notes / Decision (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gave life to Christ, interested in youth fellowship"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#121612] border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#6B7F4C]"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Your Name (Worker / Counselor)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bro Samuel"
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  className="w-full bg-[#121612] border border-white/10 text-white placeholder-gray-600 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#6B7F4C]"
                />
                <span className="text-[10px] text-gray-500">
                  * Saved on your device so you don&apos;t need to retype for each student.
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6B7F4C] hover:bg-[#7D9459] disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-[#6B7F4C]/20 flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span> Saving to Sheet...
                  </>
                ) : (
                  <>
                    <span>💾</span> Record Contact for {selectedLocation}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-gray-500 space-y-1">
          <p>Eternal Light of God Christian Centre • Cornerstone Outreach 2026</p>
          <p>
            Dedicated group link:{' '}
            <code className="text-[#A2B87D] bg-black/40 px-1.5 py-0.5 rounded">
              /cornerstone?group={selectedLocation}
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CornerstonePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111411] text-center text-white pt-20">Loading Cornerstone form...</div>}>
      <CornerstoneFormContent />
    </Suspense>
  );
}

