'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CornerstoneRecord } from '@/lib/cornerstone/types';

const LOCATIONS = [
  'ALL',
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

function RecordsDashboardContent() {
  const searchParams = useSearchParams();
  const initLoc = (searchParams.get('location') || searchParams.get('group') || 'ALL').toUpperCase();

  const [records, setRecords] = useState<CornerstoneRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<string>(initLoc);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cornerstone/records');
      const data = await res.json();
      if (data.success && data.records) {
        setRecords(data.records);
        setLastRefreshed(new Date().toLocaleTimeString('en-NG'));
      }
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesLoc =
        selectedLocation === 'ALL' ||
        r.location?.toUpperCase() === selectedLocation.toUpperCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        r.fullName?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.school?.toLowerCase().includes(q) ||
        r.homeAddress?.toLowerCase().includes(q) ||
        r.classCategory?.toLowerCase().includes(q);

      return matchesLoc && matchesQuery;
    });
  }, [records, selectedLocation, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const whatsappCount = records.filter((r) => r.isWhatsApp).length;
    const groupCount = new Set(records.map((r) => r.location?.toUpperCase()).filter(Boolean)).size;

    // School counts
    const schoolMap: Record<string, number> = {};
    records.forEach((r) => {
      if (r.school) {
        schoolMap[r.school] = (schoolMap[r.school] || 0) + 1;
      }
    });

    const topSchools = Object.entries(schoolMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total, whatsappCount, groupCount, topSchools };
  }, [records]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No records to export.');
      return;
    }

    const headers = [
      'Record ID',
      'Date & Time',
      'Strategic Location',
      'School',
      'Full Name',
      'Phone Number',
      'WhatsApp',
      'Class / Category',
      'Home Address',
      'Notes',
      'Recorded By',
    ];

    const csvRows = [
      headers.join(','),
      ...filteredRecords.map((r) =>
        [
          `"${r.id || ''}"`,
          `"${r.timestamp || ''}"`,
          `"${r.location || ''}"`,
          `"${(r.school || '').replace(/"/g, '""')}"`,
          `"${(r.fullName || '').replace(/"/g, '""')}"`,
          `"${r.phone || ''}"`,
          `"${r.isWhatsApp ? 'Yes' : 'No'}"`,
          `"${(r.classCategory || '').replace(/"/g, '""')}"`,
          `"${(r.homeAddress || '').replace(/"/g, '""')}"`,
          `"${(r.notes || '').replace(/"/g, '""')}"`,
          `"${(r.recordedBy || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cornerstone_2026_${selectedLocation}_Records_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#111411] text-[#EBE6DF] pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A2B87D] mb-1">
              <span>📊</span> Cornerstone 2026 Live Records
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Outreach Contacts & Tabled Directory
            </h1>
            <p className="text-xs text-gray-400">
              Synced with Google Sheets. Last refreshed: {lastRefreshed || 'Just now'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchRecords}
              disabled={loading}
              className="bg-[#1A211A] hover:bg-[#232D23] text-gray-200 border border-white/10 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-[#2D3820] hover:bg-[#384628] text-[#D8E6C4] border border-[#6B7F4C]/40 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <span>📥</span> Export CSV / Excel
            </button>
            <Link
              href="/cornerstone"
              className="bg-[#6B7F4C] hover:bg-[#7D9459] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#6B7F4C]/20"
            >
              <span>➕</span> Open Form
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#181D18] border border-white/10 rounded-2xl p-4">
            <div className="text-xs text-gray-400 mb-1">Total Contacts</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats.total}</div>
            <div className="text-[11px] text-[#A2B87D] mt-1">Recorded to sheet</div>
          </div>
          <div className="bg-[#181D18] border border-white/10 rounded-2xl p-4">
            <div className="text-xs text-gray-400 mb-1">On WhatsApp</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
              {stats.whatsappCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              {stats.total > 0 ? `${Math.round((stats.whatsappCount / stats.total) * 100)}% reachability` : '0%'}
            </div>
          </div>
          <div className="bg-[#181D18] border border-white/10 rounded-2xl p-4">
            <div className="text-xs text-gray-400 mb-1">Active Locations</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-300">
              {stats.groupCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">Zones reporting</div>
          </div>
          <div className="bg-[#181D18] border border-white/10 rounded-2xl p-4">
            <div className="text-xs text-gray-400 mb-1">Top Reached School</div>
            <div className="text-sm font-bold text-white truncate">
              {stats.topSchools[0]?.[0] || 'Pending submissions'}
            </div>
            <div className="text-[11px] text-[#A2B87D] mt-1">
              {stats.topSchools[0] ? `${stats.topSchools[0][1]} contacts` : '0'}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#181D18] border border-white/10 rounded-2xl p-4 space-y-3">
          {/* Location Group Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {LOCATIONS.map((loc) => {
              const isSelected = selectedLocation === loc;
              const count =
                loc === 'ALL'
                  ? records.length
                  : records.filter((r) => r.location?.toUpperCase() === loc).length;

              return (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition border ${
                    isSelected
                      ? 'bg-[#6B7F4C] text-white border-[#8CA563] shadow'
                      : 'bg-[#121612] text-gray-400 border-white/5 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {loc} <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search by name, phone, school, class, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121612] border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-[#6B7F4C]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-white"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Detailed Tabled View */}
        <div className="bg-[#181D18] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📋</span> Showing {filteredRecords.length} of {records.length} Records
              {selectedLocation !== 'ALL' && (
                <span className="text-xs font-normal text-[#A2B87D]">
                  (Filtered by: {selectedLocation})
                </span>
              )}
            </h2>
            {selectedLocation !== 'ALL' && (
              <button
                onClick={() => setSelectedLocation('ALL')}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                Reset to All
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <div className="animate-spin text-2xl">⏳</div>
              <p className="text-sm">Loading records from Google Sheets...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-3">
              <div className="text-3xl">📭</div>
              <p className="text-sm font-medium text-gray-300">
                No records found {selectedLocation !== 'ALL' ? `for ${selectedLocation}` : ''}
              </p>
              <p className="text-xs text-gray-500">
                Share the group form link with field workers to start recording entries.
              </p>
              <Link
                href={`/cornerstone?group=${selectedLocation === 'ALL' ? 'UI' : selectedLocation}`}
                className="inline-flex items-center gap-1.5 text-xs bg-[#6B7F4C] text-white px-4 py-2 rounded-xl font-semibold mt-2 hover:bg-[#7D9459] transition"
              >
                <span>➕</span> Record First Contact for {selectedLocation === 'ALL' ? 'UI' : selectedLocation}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#121612] text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Phone / WhatsApp</th>
                    <th className="py-3 px-4">Strategic Location</th>
                    <th className="py-3 px-4">School</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Home Address</th>
                    <th className="py-3 px-4">Notes & Worker</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRecords.map((r, idx) => {
                    const cleanPhone = (r.phone || '').replace(/\D/g, '');
                    const waLink = cleanPhone.startsWith('0')
                      ? `https://wa.me/234${cleanPhone.slice(1)}`
                      : `https://wa.me/${cleanPhone}`;

                    return (
                      <tr key={r.id || idx} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <strong className="text-white block">{r.fullName}</strong>
                          <span className="text-[10px] text-gray-500 font-mono">{r.id}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-white">{r.phone}</span>
                            {r.isWhatsApp ? (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in WhatsApp"
                                className="inline-flex items-center text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded hover:bg-emerald-900/80 transition"
                              >
                                💬 WhatsApp
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-500">Call only</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#6B7F4C]/25 text-[#A2B87D] border border-[#6B7F4C]/40">
                            {r.location}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-200">{r.school}</td>
                        <td className="py-3 px-4">
                          <span className="text-gray-300 text-[11px]">{r.classCategory}</span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-gray-400" title={r.homeAddress}>
                          {r.homeAddress || '—'}
                        </td>
                        <td className="py-3 px-4 max-w-xs text-gray-400">
                          {r.notes && <div className="text-gray-300">{r.notes}</div>}
                          {r.recordedBy && (
                            <div className="text-[10px] text-gray-500">By: {r.recordedBy}</div>
                          )}
                          {!r.notes && !r.recordedBy && '—'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-500 text-[11px]">
                          {r.timestamp}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Share Group Links Helper */}
        <div className="bg-[#181D18] border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <span>🔗</span> Direct Group Links for Field Workers
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Send each team leader their group&apos;s direct link so their form opens automatically set to their group and schools:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {LOCATIONS.filter((l) => l !== 'ALL').map((loc) => (
              <a
                key={loc}
                href={`/cornerstone?group=${loc}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center p-2 rounded-lg bg-[#121612] hover:bg-[#1A211A] border border-white/5 hover:border-[#6B7F4C]/50 text-xs font-semibold text-gray-300 hover:text-white transition"
              >
                {loc} ↗
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CornerstoneRecordsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111411] text-center text-white pt-20">Loading Cornerstone Records...</div>}>
      <RecordsDashboardContent />
    </Suspense>
  );
}

