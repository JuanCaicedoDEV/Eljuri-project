"use client";

import React, { useEffect, useState } from 'react';
import { useSimulationStore, SessionState } from '../store/useSimulationStore';
import SessionCard from './SessionCard';
import { Button } from '../src/components/ui/button';

export default function SessionMonitor() {
    const { getAllSessions, updateSessionStatus } = useSimulationStore();
    const [sessions, setSessions] = useState<SessionState[]>([]);
    const [filterCampaign, setFilterCampaign] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Auto-refresh sessions every 2 seconds
    useEffect(() => {
        const refreshSessions = () => {
            setSessions(getAllSessions());
        };

        refreshSessions();
        const interval = setInterval(refreshSessions, 2000);
        return () => clearInterval(interval);
    }, [getAllSessions]);

    // Fetch sessions from backend API
    useEffect(() => {
        const fetchBackendSessions = async () => {
            try {
                // Dynamic API Base URL
                const apiBase = typeof window !== 'undefined'
                    ? `${window.location.protocol}//${window.location.hostname}:3008/api`
                    : 'http://localhost:3008/api';

                const response = await fetch(`${apiBase}/sessions`);
                if (response.ok) {
                    const backendSessions = await response.json();
                    // Merge with local sessions (backend is source of truth)
                    // console.log('Backend sessions:', backendSessions);
                    // Update local store with backend truth? 
                    // For now just logging or maybe we should setSessions here?
                    // The original code was just logging. Let's keep it safe.
                }
            } catch (error) {
                console.error('Failed to fetch backend sessions:', error);
            }
        };

        fetchBackendSessions();
        const interval = setInterval(fetchBackendSessions, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleTerminate = async (sessionId: string) => {
        if (confirm('Are you sure you want to terminate this session?')) {
            try {
                const apiBase = typeof window !== 'undefined'
                    ? `${window.location.protocol}//${window.location.hostname}:3008/api`
                    : 'http://localhost:3008/api';

                const response = await fetch(`${apiBase}/sessions/${sessionId}/terminate`, {
                    method: 'POST'
                });
                if (response.ok) {
                    updateSessionStatus(sessionId, 'completed');
                }
            } catch (error) {
                console.error('Failed to terminate session:', error);
            }
        }
    };

    const handleView = (sessionId: string) => {
        // This will be handled by the parent component (Home.tsx) switching to 'multi-viewer'
        window.dispatchEvent(new CustomEvent('open-multi-viewer', { detail: { sessionId } }));
    };

    // Get unique campaigns
    const campaigns = Array.from(new Set(sessions.map(s => s.campaignId)));

    // Filter sessions
    const filteredSessions = sessions.filter(session => {
        const campaignMatch = filterCampaign === 'all' || session.campaignId === filterCampaign;
        const statusMatch = filterStatus === 'all' || session.status === filterStatus;
        return campaignMatch && statusMatch;
    });

    // Calculate statistics
    const stats = {
        total: sessions.length,
        active: sessions.filter(s => s.status === 'active').length,
        idle: sessions.filter(s => s.status === 'idle').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        error: sessions.filter(s => s.status === 'error').length,
        totalCost: sessions.reduce((sum, s) => sum + s.metrics.totalCost, 0)
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Active Sessions</h1>
                            <p className="text-sm text-slate-600 mt-1">Real-time monitoring of all call center sessions</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-sm font-medium text-emerald-700">{stats.active} Active</span>
                            </div>

                            <Button
                                onClick={() => window.dispatchEvent(new CustomEvent('open-multi-viewer'))}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest px-6 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                Command Center
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Statistics */}
                <div className="grid grid-cols-6 gap-4 mb-6">
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                        <div className="text-sm text-slate-600">Total</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
                        <div className="text-2xl font-bold text-emerald-700">{stats.active}</div>
                        <div className="text-sm text-emerald-600">Active</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                        <div className="text-2xl font-bold text-amber-700">{stats.idle}</div>
                        <div className="text-sm text-amber-600">Idle</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                        <div className="text-2xl font-bold text-slate-700">{stats.completed}</div>
                        <div className="text-sm text-slate-600">Completed</div>
                    </div>
                    <div className="bg-rose-50 rounded-lg border border-rose-200 p-4">
                        <div className="text-2xl font-bold text-rose-700">{stats.error}</div>
                        <div className="text-sm text-rose-600">Errors</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-4">
                        <div className="text-2xl font-bold text-indigo-700">${stats.totalCost.toFixed(2)}</div>
                        <div className="text-sm text-indigo-600">Total Cost</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Campaign</label>
                        <select
                            value={filterCampaign}
                            onChange={(e) => setFilterCampaign(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Campaigns</option>
                            {campaigns.map(campaign => (
                                <option key={campaign} value={campaign}>{campaign}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="idle">Idle</option>
                            <option value="completed">Completed</option>
                            <option value="error">Error</option>
                        </select>
                    </div>
                </div>

                {/* Sessions Grid */}
                {filteredSessions.length === 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                        <div className="text-slate-400 mb-2">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <p className="text-slate-600 font-medium">No sessions found</p>
                        <p className="text-sm text-slate-500 mt-1">
                            {filterCampaign !== 'all' || filterStatus !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Sessions will appear here when calls are active'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredSessions.map(session => (
                            <SessionCard
                                key={session.sessionId}
                                session={session}
                                onView={handleView}
                                onTerminate={handleTerminate}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
