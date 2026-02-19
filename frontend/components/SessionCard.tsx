"use client";

import React from 'react';
import { SessionState } from '../store/useSimulationStore';

interface SessionCardProps {
    session: SessionState;
    onView: (sessionId: string) => void;
    onTerminate: (sessionId: string) => void;
}

export default function SessionCard({ session, onView, onTerminate }: SessionCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500';
            case 'idle': return 'bg-amber-500';
            case 'completed': return 'bg-slate-400';
            case 'error': return 'bg-rose-500';
            default: return 'bg-gray-400';
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'idle': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'completed': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'error': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const formatDuration = (startTime: string) => {
        const start = new Date(startTime).getTime();
        const now = Date.now();
        const duration = Math.floor((now - start) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatCost = (cost: number) => {
        return `$${cost.toFixed(4)}`;
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Status Bar */}
            <div className={`h-1 ${getStatusColor(session.status)}`}></div>

            {/* Card Content */}
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeColor(session.status)}`}>
                                {session.status}
                            </span>
                            {session.status === 'active' && (
                                <span className="flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                            )}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                            {session.sessionId}
                        </h3>
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Campaign:</span>
                        <span className="font-medium text-slate-900 truncate ml-2">{session.campaignId}</span>
                    </div>

                    {session.phoneNumber && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Phone:</span>
                            <span className="font-medium text-slate-900">{session.phoneNumber}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Duration:</span>
                        <span className="font-mono font-medium text-slate-900">{formatDuration(session.startTime)}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Messages:</span>
                        <span className="font-medium text-slate-900">{session.messages.length}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Cost:</span>
                        <span className={`font-mono font-medium ${session.metrics.profitabilityStatus === 'PROFITABLE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCost(session.metrics.totalCost)}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button
                        onClick={() => onView(session.sessionId)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                    >
                        View
                    </button>
                    {(session.status === 'active' || session.status === 'idle') && (
                        <button
                            onClick={() => onTerminate(session.sessionId)}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                        >
                            Terminate
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
