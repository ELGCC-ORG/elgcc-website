'use client';

import { useState, useEffect } from 'react';
import { Registration, Attendee } from '@/lib/tos2026/types';
import { formatPrice } from '@/lib/tos2026/pricing';
import '../tos2026.css';

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Reconciliation states
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [reconcilingAll, setReconcilingAll] = useState(false);
  const [reconcileAllStatus, setReconcileAllStatus] = useState<string>('');

  const handleReconcile = async (regId: string, action: 'verify_flutterwave' | 'force_paid') => {
    setReconcilingId(regId);
    setFeedback(null);
    try {
      const res = await fetch('/api/tos2026/register/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, registrationId: regId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ id: regId, success: true, message: data.message || 'Updated successfully.' });
        setRegistrations(prev =>
          prev.map(r => r.registrationId === regId ? { ...r, paymentStatus: 'paid' } : r)
        );
      } else {
        setFeedback({ id: regId, success: false, message: data.error || 'Failed to reconcile.' });
      }
    } catch (err: any) {
      setFeedback({ id: regId, success: false, message: err.message || 'An error occurred.' });
    } finally {
      setReconcilingId(null);
    }
  };

  const handleReconcileAllPending = async () => {
    const pendingRegs = registrations.filter(r => r.paymentStatus === 'pending');
    if (pendingRegs.length === 0) {
      alert('No pending registrations to reconcile.');
      return;
    }

    if (!confirm(`Are you sure you want to verify all ${pendingRegs.length} pending registrations against Flutterwave?`)) {
      return;
    }

    setReconcilingAll(true);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < pendingRegs.length; i++) {
      const reg = pendingRegs[i];
      setReconcileAllStatus(`Verifying ${reg.registrationId} (${i + 1}/${pendingRegs.length})...`);
      try {
        const res = await fetch('/api/tos2026/register/reconcile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password, registrationId: reg.registrationId, action: 'verify_flutterwave' }),
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
          setRegistrations(prev =>
            prev.map(r => r.registrationId === reg.registrationId ? { ...r, paymentStatus: 'paid' } : r)
          );
        } else {
          failedCount++;
        }
      } catch (err) {
        failedCount++;
      }
    }

    setReconcileAllStatus(`Completed! ${successCount} marked paid, ${failedCount} unchanged.`);
    setTimeout(() => {
      setReconcileAllStatus('');
      setReconcilingAll(false);
    }, 5000);
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tos2026/register?password=${password}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid password');
      }

      setRegistrations(data.registrations || []);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tos2026/register?password=${password}`);
      const data = await res.json();
      if (data.success) {
        setRegistrations(data.registrations || []);
      }
    } catch (err) {
      console.error('Failed to refresh data', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (registrations.length === 0) return;

    const headers = [
      'Registration ID',
      'Coordinator Name',
      'Coordinator Phone',
      'Coordinator Email',
      'Church',
      'Attendee Name',
      'Gender',
      'Category',
      'Attendee Phone',
      'Attendee Email',
      'Region',
      'Local Church',
      'Medical Conditions',
      'Total Paid (Registration)',
      'Payment Status',
      'Registration Date'
    ].join(',');

    const rows = registrations.flatMap(reg => 
      reg.attendees.map(att => [
        reg.registrationId,
        `"${reg.coordinator.fullName}"`,
        `"${reg.coordinator.phoneNumber}"`,
        `"${reg.coordinator.emailAddress}"`,
        `"${reg.coordinator.churchName}"`,
        `"${att.fullName}"`,
        att.gender,
        att.category,
        `"${att.phoneNumber}"`,
        `"${att.emailAddress}"`,
        `"${att.region}"`,
        `"${att.localChurch}"`,
        `"${att.medicalConditions}"`,
        reg.totalAmount,
        reg.paymentStatus,
        new Date(reg.registeredAt).toLocaleString()
      ].join(','))
    ).join('\n');

    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tos2026_registrations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F1A0A] via-[#1A1A1A] to-[#0A0A0A] flex items-center justify-center pt-28 pb-16 p-4">
        <div className="tos-admin-card rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-4xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-white/50 text-sm">Enter password to view TOS 2026 registrations</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="tos-admin-input w-full text-center tracking-widest"
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="tos-btn-primary w-full"
            >
              {loading ? 'Verifying...' : 'Access Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filter registrations
  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = 
      reg.coordinator.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.coordinator.churchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.registrationId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || reg.paymentStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());

  // Calculate stats based on filtered list
  const totalRegistrations = filteredRegistrations.length;
  const totalAttendees = filteredRegistrations.reduce((sum, reg) => sum + reg.attendees.length, 0);
  const totalRevenue = filteredRegistrations.reduce((sum, reg) => sum + reg.totalAmount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1A0A] via-[#1A1A1A] to-[#0A0A0A] pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-[#D4A843]">🔥</span> TOS 2026 Admin
            </h1>
            <p className="text-white/50 mt-1">Manage registrations and payments</p>
          </div>
          <div className="flex items-center gap-3">
            {registrations.some(r => r.paymentStatus === 'pending') && (
              <button 
                onClick={handleReconcileAllPending} 
                disabled={reconcilingAll || loading}
                className="tos-btn-secondary py-2 text-sm bg-yellow-600/10 hover:bg-yellow-600/20 border-yellow-500/30 text-yellow-400 disabled:opacity-50 flex items-center gap-1.5"
              >
                {reconcilingAll ? (
                  <span className="w-3.5 h-3.5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>⚡</span>
                )}
                {reconcilingAll ? 'Reconciling...' : 'Reconcile All Pending'}
              </button>
            )}
            <button onClick={fetchRegistrations} className="tos-btn-secondary py-2 text-sm bg-transparent hover:bg-white/5 border-white/20 text-white/80">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button onClick={exportToCSV} className="tos-btn-primary py-2 text-sm w-auto px-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {reconcileAllStatus && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 p-4 rounded-xl text-sm flex items-center gap-2">
            <span className="animate-pulse">🔄</span> {reconcileAllStatus}
          </div>
        )}

 
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="tos-admin-card rounded-2xl p-6 border-l-4 border-l-[#60A5FA]">
            <p className="text-white/50 text-sm font-medium mb-1">Total Groups</p>
            <p className="text-3xl font-bold text-white">{totalRegistrations}</p>
          </div>
          <div className="tos-admin-card rounded-2xl p-6 border-l-4 border-l-[#A78BFA]">
            <p className="text-white/50 text-sm font-medium mb-1">Total Attendees</p>
            <p className="text-3xl font-bold text-white">{totalAttendees}</p>
          </div>
          <div className="tos-admin-card rounded-2xl p-6 border-l-4 border-l-[#D4A843]">
            <p className="text-white/50 text-sm font-medium mb-1">Total Expected Revenue</p>
            <p className="text-3xl font-bold text-[#D4A843]">{formatPrice(totalRevenue)}</p>
          </div>
        </div>
 
        {/* Filters */}
        <div className="tos-admin-card rounded-2xl p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, church, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tos-admin-input w-full"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="tos-admin-input tos-admin-select w-full"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Registrations List */}
        <div className="space-y-4">
          {filteredRegistrations.length === 0 ? (
            <div className="tos-admin-card rounded-2xl p-12 text-center">
              <p className="text-white/40">No registrations found.</p>
            </div>
          ) : (
            filteredRegistrations.map((reg) => (
              <div key={reg.registrationId} className="tos-admin-card rounded-2xl p-5 md:p-6 overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm text-[#D4A843] bg-[#D4A843]/10 px-2 py-0.5 rounded">
                        {reg.registrationId}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        reg.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' :
                        reg.paymentStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {reg.paymentStatus.toUpperCase()}
                      </span>
                      <span className="text-white/40 text-xs">
                        {new Date(reg.registeredAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {reg.coordinator.fullName} <span className="text-white/40 font-normal">({reg.coordinator.churchName})</span>
                    </h3>
                    <p className="text-sm text-white/60">
                      {reg.coordinator.phoneNumber} • {reg.coordinator.emailAddress}
                    </p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-sm text-white/50 mb-1">{reg.attendees.length} Attendees</p>
                    <p className="text-2xl font-bold text-white">{formatPrice(reg.totalAmount)}</p>
                  </div>
                </div>

                {reg.paymentStatus === 'pending' && (
                  <div className="mb-4 bg-white/5 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/5">
                    <div>
                      <p className="text-xs text-white/70 font-medium">Reconcile Payment: Has this registrant paid?</p>
                      {feedback && feedback.id === reg.registrationId && (
                        <p className={`text-xs mt-1 font-semibold ${feedback.success ? 'text-green-400' : 'text-red-400'}`}>
                          {feedback.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReconcile(reg.registrationId, 'verify_flutterwave')}
                        disabled={reconcilingId !== null || reconcilingAll}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 disabled:opacity-50 flex items-center gap-1.5 transition-all"
                      >
                        {reconcilingId === reg.registrationId ? (
                          <>
                            <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <span>🔍</span>
                            <span>Verify (Flutterwave)</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to FORCE mark ${reg.registrationId} as paid? This does not query Flutterwave but will update Google Sheets and send confirmation emails.`)) {
                            handleReconcile(reg.registrationId, 'force_paid');
                          }
                        }}
                        disabled={reconcilingId !== null || reconcilingAll}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-zinc-700/50 hover:bg-zinc-600/50 border border-white/10 text-white/80 disabled:opacity-50 transition-all"
                      >
                        Force Mark Paid
                      </button>
                    </div>
                  </div>
                )}


                {/* Attendees List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-white/70">
                    <thead className="text-xs text-white/40 uppercase bg-white/5">
                      <tr>
                        <th className="px-4 py-2 rounded-tl-lg">Name</th>
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2">Gender</th>
                        <th className="px-4 py-2">Phone</th>
                        <th className="px-4 py-2 rounded-tr-lg">Local Church</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reg.attendees.map((att, i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0">
                          <td className="px-4 py-3 font-medium text-white">{att.fullName}</td>
                          <td className="px-4 py-3">
                            <span className="bg-white/10 px-2 py-1 rounded text-xs capitalize">
                              {att.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">{att.gender}</td>
                          <td className="px-4 py-3">{att.phoneNumber}</td>
                          <td className="px-4 py-3">{att.localChurch}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
