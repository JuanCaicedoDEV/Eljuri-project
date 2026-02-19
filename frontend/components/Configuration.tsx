"use client";

import React from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { Settings, Save, Terminal, FileText } from 'lucide-react';

export default function Configuration() {
    const { systemPrompt, expectedOutput, setSystemPrompt, setExpectedOutput } = useSimulationStore();

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <header className="mb-10 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Settings className="text-gray-400" />
                        Agent Configuration
                    </h2>
                    <p className="text-gray-500 mt-2">Fine-tune the behavior and expectations of the ELjuri AI</p>
                </div>
                <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors">
                    <Save size={18} /> Save Changes
                </button>
            </header>

            <div className="grid grid-cols-1 gap-8">
                {/* System Prompt */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-4">
                        <Terminal size={18} className="text-blue-600" />
                        System Prompt
                    </label>
                    <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className="w-full h-48 p-4 bg-gray-50 rounded-2xl border border-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Enter the system instructions..."
                    ></textarea>
                    <p className="mt-2 text-xs text-gray-400">This prompt defines the core identity and rules for the AI Agent.</p>
                </div>

                {/* Expected Output Fields */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <label className="flex items-center gap-2 font-bold text-gray-700 mb-4">
                        <FileText size={18} className="text-purple-600" />
                        Expected Output Fields
                    </label>
                    <div className="space-y-4">
                        <div>
                            <span className="text-xs font-bold text-gray-400 uppercase mb-1 block">Context Definition</span>
                            <textarea
                                value={expectedOutput}
                                onChange={(e) => setExpectedOutput(e.target.value)}
                                className="w-full h-32 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="What should the agent collect? (e.g., Name, Intent, Sentiment)"
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 text-sm">
                                + Add output field
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 text-sm">
                                + Configure validation rules
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
