import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Radio, 
  MapPin, 
  Plus, 
  Search, 
  Check, 
  X,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';
import { CivicIssue, UrgentAlert, IssueStatus } from '../types';
import toast from 'react-hot-toast';

export const Admin: React.FC = () => {
  const { profile, user } = useAuth();
  const { lang, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'issues' | 'alerts' | 'localities'>('issues');
  const [issues, setIssues] = useState<CivicIssue[]>(() => {
    const saved = localStorage.getItem('onegudalur_local_issues');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  const [newAlert, setNewAlert] = useState({
    title: '',
    titleTa: '',
    description: '',
    descriptionTa: '',
    category: 'WILDLIFE' as 'WILDLIFE' | 'WEATHER' | 'TRAFFIC' | 'CIVIC',
    severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    source: 'Gudalur Forest Division / Municipality'
  });

  const handleUpdateStatus = (issueId: string, newStatus: IssueStatus, officialToken?: string) => {
    const updated = issues.map(iss => {
      if (iss.id === issueId) {
        return {
          ...iss,
          status: newStatus,
          officialGrievanceId: officialToken || iss.officialGrievanceId,
          timeline: [
            ...iss.timeline,
            {
              status: newStatus,
              timestamp: Date.now(),
              actor: profile?.name || 'Administrator',
              note: `Status advanced to ${newStatus}${officialToken ? ` with docket ${officialToken}` : ''}`
            }
          ]
        };
      }
      return iss;
    });
    setIssues(updated);
    localStorage.setItem('onegudalur_local_issues', JSON.stringify(updated));
    toast.success(`Issue status updated to ${newStatus}`);
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlert.title.trim() || !newAlert.description.trim()) return;

    const alertItem: UrgentAlert = {
      id: `ALERT-${Date.now()}`,
      title: newAlert.title.trim(),
      titleTa: newAlert.titleTa.trim() || newAlert.title.trim(),
      description: newAlert.description.trim(),
      descriptionTa: newAlert.descriptionTa.trim() || newAlert.description.trim(),
      category: newAlert.category,
      severity: newAlert.severity,
      source: newAlert.source,
      verificationStatus: 'VERIFIED_OFFICIAL',
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24
    };

    const existingAlerts = JSON.parse(localStorage.getItem('onegudalur_alerts') || '[]');
    existingAlerts.unshift(alertItem);
    localStorage.setItem('onegudalur_alerts', JSON.stringify(existingAlerts));

    toast.success('Emergency civic alert broadcasted!');
    setNewAlert({
      title: '',
      titleTa: '',
      description: '',
      descriptionTa: '',
      category: 'WILDLIFE',
      severity: 'MEDIUM',
      source: 'Gudalur Forest Division / Municipality'
    });
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold mb-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>PLATFORM MODERATION CONSOLE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
            Civic Operations & Verification Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review community issues, assign departmental dockets, and broadcast emergency alerts.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'issues' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Civic Issues ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'alerts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Broadcast Alert
          </button>
          <button
            onClick={() => setActiveTab('localities')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'localities' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Localities Grid
          </button>
        </div>
      </div>

      {/* 1. Civic Issues Moderation Tab */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Active Resident Submissions</h2>
            <span className="text-xs text-slate-400">Total tracked: {issues.length}</span>
          </div>

          {issues.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
              No pending issues recorded. Use the "Report Issue" button on the home page to create test entries.
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {issue.id}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {issue.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-slate-900">{issue.title}</h3>
                      <p className="text-xs text-slate-500">
                        {issue.localityName} • Reported by {issue.reporterName} ({issue.reporterGudalurId})
                      </p>
                    </div>

                    <div className="text-right text-xs text-slate-400">
                      <span>{new Date(issue.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {issue.description}
                  </p>

                  {/* Status Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 font-bold mr-1">Advance Status:</span>
                    <button
                      onClick={() => handleUpdateStatus(issue.id, 'VERIFICATION')}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold"
                    >
                      Mark Verifying
                    </button>
                    <button
                      onClick={() => {
                        const token = prompt('Enter official department grievance token (e.g. TN-MM-2026-8812):');
                        handleUpdateStatus(issue.id, 'ASSIGNED', token || undefined);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold"
                    >
                      Assign Authority & Token
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(issue.id, 'ACTION')}
                      className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 font-bold"
                    >
                      Mark Action in Progress
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(issue.id, 'RESOLVED')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Broadcast Alert Tab */}
      {activeTab === 'alerts' && (
        <div className="max-w-2xl bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Broadcast High-Priority Alert</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Alerts appear on the universal live pulse bar, mobile notifications, and the live dashboard.
            </p>
          </div>

          <form onSubmit={handleCreateAlert} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={newAlert.category}
                  onChange={(e) => setNewAlert({ ...newAlert, category: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs bg-white font-bold"
                >
                  <option value="WILDLIFE">WILDLIFE (Elephant Movement)</option>
                  <option value="WEATHER">WEATHER (Heavy Rain / Fog)</option>
                  <option value="TRAFFIC">TRAFFIC (Ghat Road Closure)</option>
                  <option value="CIVIC">CIVIC (Power Outage / Water Supply)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Severity</label>
                <select
                  value={newAlert.severity}
                  onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs bg-white font-bold"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH (Urgent)</option>
                  <option value="CRITICAL">CRITICAL (Immediate Action)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Title (English) *</label>
              <input
                type="text"
                required
                value={newAlert.title}
                onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                placeholder="e.g. Elephant Herd Active near Thorapalli Bridge"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Title (Tamil)</label>
              <input
                type="text"
                value={newAlert.titleTa}
                onChange={(e) => setNewAlert({ ...newAlert, titleTa: e.target.value })}
                placeholder="e.g. தோரப்பள்ளி பாலம் அருகே காட்டு யானைகள் நடமாட்டம்"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description (English) *</label>
              <textarea
                rows={3}
                required
                value={newAlert.description}
                onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })}
                placeholder="Details of warning, caution instructions for commuters..."
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <Radio size={16} />
              <span>Broadcast Official Alert</span>
            </button>
          </form>
        </div>
      )}

      {/* 3. Localities Grid Tab */}
      {activeTab === 'localities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GUDALUR_LOCALITIES.map((loc) => (
            <div key={loc.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{loc.name}</span>
                <span className="text-emerald-700 font-bold">{loc.nameTa}</span>
              </div>
              <p className="text-slate-500">{loc.administrativeParent} • Ward {loc.wardNumber || 'N/A'}</p>
              <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100">
                <span>{loc.revenueVillage}</span>
                <span className="font-mono font-semibold">PIN: {loc.pincode}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
export default Admin;
