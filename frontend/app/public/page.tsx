"use client";

import React, { useState } from 'react';
import CampaignsList from '../../components/CampaignsList';
import CampaignWorkspace from '../../components/CampaignWorkspace';
import VoiceInteraction from '../../components/VoiceInteraction.public';
import PhoneNumbersManager from '../../components/PhoneNumbersManager';
import SessionMonitor from '../../components/SessionMonitor';
import MultiSessionViewer from '../../components/MultiSessionViewer';
import { useSimulationStore } from '../../store/useSimulationStore';

type ViewStatus = 'browsing-campaigns' | 'workspace' | 'testing' | 'phone-numbers' | 'session-monitor' | 'multi-viewer';

export default function Home() {
    const [view, setView] = useState<ViewStatus>('browsing-campaigns');
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const { clearFlowData } = useSimulationStore();

    React.useEffect(() => {
        setMounted(true);

        const handleOpenViewer = (e: any) => {
            setView('multi-viewer');
        };

        window.addEventListener('open-multi-viewer', handleOpenViewer);
        return () => window.removeEventListener('open-multi-viewer', handleOpenViewer);
    }, []);

    if (!mounted) return null;

    const handleCreateCampaign = () => {
        clearFlowData();
        setActiveCampaignId(`new-${Date.now()}`);
        setView('workspace');
    };

    const handleSelectCampaign = (id: string) => {
        setActiveCampaignId(id);
        setView('workspace');
    };

    const handleBackToLanding = () => {
        setView('browsing-campaigns');
        setActiveCampaignId(null);
    };

    const handleStartTest = (sessionId: string) => {
        setActiveSessionId(sessionId);
        setView('testing');
    };

    const handleCloseTest = () => {
        setView('workspace');
        setActiveSessionId(null);
    };

    return (
        <div className="min-h-screen">
            {/* Navigation Bar */}
            {view !== 'testing' && (
                <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex items-center gap-6 h-14">
                            <button
                                onClick={() => setView('browsing-campaigns')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'browsing-campaigns' || view === 'workspace'
                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Campaigns
                            </button>
                            <button
                                onClick={() => setView('phone-numbers')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'phone-numbers'
                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Phone Numbers
                            </button>
                            <button
                                onClick={() => setView('session-monitor')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'session-monitor'
                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Active Sessions
                            </button>
                        </div>
                    </div>
                </nav>
            )}

            {/* Views */}
            {view === 'browsing-campaigns' && (
                <CampaignsList onSelect={handleSelectCampaign} onCreate={handleCreateCampaign} />
            )}

            {view === 'workspace' && activeCampaignId && (
                <CampaignWorkspace
                    campaignId={activeCampaignId}
                    onBack={handleBackToLanding}
                    onTest={handleStartTest}
                />
            )}

            {view === 'testing' && activeCampaignId && activeSessionId && (
                <VoiceInteraction
                    sessionId={activeSessionId}
                    onClose={handleCloseTest}
                />
            )}

            {view === 'phone-numbers' && (
                <PhoneNumbersManager />
            )}

            {view === 'session-monitor' && (
                <SessionMonitor />
            )}

            {view === 'multi-viewer' && (
                <MultiSessionViewer onClose={() => setView('session-monitor')} />
            )}
        </div>
    );
}
