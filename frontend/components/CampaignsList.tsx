"use client";

import React from 'react';
import { Plus, Briefcase, ArrowUpRight, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useSimulationStore } from '../store/useSimulationStore';
import { CAMPAIGN_CONFIGS } from '../store/campaignConfigs';

export default function CampaignsList({ onSelect, onCreate }: { onSelect: (id: string) => void, onCreate: () => void }) {
    const { getSessionsByCampaign } = useSimulationStore();

    return (
        <div className="min-h-screen bg-white px-8 md:px-16 py-16 md:py-24 max-w-[1800px] mx-auto w-full">
            {/* ... Header remains همان ... */}
            {/* Immersive Header */}
            <header className="mb-20 flex flex-col lg:flex-row lg:items-end justify-between gap-12">
                <div className="max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 mb-6"
                    >
                        <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-black uppercase tracking-widest text-[10px] px-3 py-1">
                            Enterprise Voice Terminal
                        </Badge>
                        <div className="w-8 h-[1px] bg-zinc-100" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">v1.2.0</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="hero-text text-zinc-950 mb-10 italic"
                    >
                        Command <br /> Your Outreach.
                    </motion.h1>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap items-center gap-4"
                    >
                        <Button
                            size="lg"
                            onClick={onCreate}
                            className="rounded-2xl h-14 px-8 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/10 active:scale-95 group"
                        >
                            <Plus className="mr-2 w-4 h-4 group-hover:rotate-90 transition-transform" strokeWidth={2} />
                            New Campaign
                        </Button>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" strokeWidth={1.5} />
                                <Input
                                    placeholder="Search bridges..."
                                    className="h-14 w-64 pl-12 rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-primary/10"
                                />
                            </div>
                            <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-zinc-100 hover:bg-zinc-50">
                                <Filter size={18} strokeWidth={1.5} />
                            </Button>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="hidden xl:block"
                >
                    <Card className="border-none shadow-2xl shadow-zinc-200/50 rounded-[2.5rem] bg-zinc-50/50 backdrop-blur-sm p-8 flex items-center gap-10">
                        <div className="flex flex-col">
                            <p className="text-5xl font-black text-zinc-950 tracking-tighter">5.2k</p>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Global Minutes</p>
                        </div>
                        <div className="w-px h-12 bg-zinc-200" />
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-zinc-100 flex items-center justify-center overflow-hidden">
                                    <div className="w-full h-full bg-gradient-to-br from-zinc-200 to-zinc-400 opacity-50" />
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            </header>

            {/* Campaign Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                {CAMPAIGN_CONFIGS.map((campaign, idx) => (
                    <motion.div
                        key={campaign.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * idx }}
                    >
                        <Card
                            onClick={() => onSelect(campaign.id)}
                            className="group relative overflow-hidden h-[420px] rounded-[3rem] border-zinc-100 shadow-sm hover:shadow-2xl hover:shadow-zinc-200/60 transition-all duration-500 cursor-pointer flex flex-col bg-white"
                        >
                            <div className="absolute top-10 right-10 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1">
                                <ArrowUpRight className="text-primary" size={24} strokeWidth={1.5} />
                            </div>

                            <CardHeader className="p-10 pb-6">
                                <div className="p-4 bg-zinc-50 rounded-[1.5rem] w-fit mb-8 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                                    <Briefcase size={24} strokeWidth={1.5} />
                                </div>
                                <CardTitle className="text-3xl font-black text-zinc-950 leading-tight tracking-tighter">
                                    {campaign.name.split(' ').map((word, i) => (
                                        <span key={i} className={i === 0 ? '' : 'opacity-40 italic'}> {word}</span>
                                    ))}
                                </CardTitle>
                                <CardDescription className="text-xs font-medium text-zinc-400 leading-relaxed mt-2 line-clamp-2">
                                    {campaign.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="px-10 flex-1">
                                <Badge variant="outline" className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest border-none ${campaign.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${campaign.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
                                    {campaign.status}
                                </Badge>
                            </CardContent>

                            <CardFooter className="p-10 pt-8 border-t border-zinc-50 bg-zinc-50/20 grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Active Channels</p>
                                    <p className="text-2xl font-black text-zinc-950 tracking-tight">{getSessionsByCampaign(campaign.id).length}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Historical</p>
                                    <p className="text-2xl font-black text-zinc-950 tracking-tight">{(campaign.calls / 1000).toFixed(1)}k</p>
                                </div>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}

                {/* Create New Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (CAMPAIGN_CONFIGS.length + 1) }}
                    className="h-full"
                >
                    <div className="h-[420px] border-2 border-dashed border-zinc-100 rounded-[3rem] p-10 flex flex-col items-center justify-center gap-6 hover:bg-zinc-50 transition-all duration-500 cursor-pointer group">
                        <div className="w-16 h-16 bg-white rounded-full shadow-lg border border-zinc-50 flex items-center justify-center group-hover:scale-110 group-hover:shadow-primary/10 transition-all duration-500">
                            <Plus size={32} className="text-zinc-300 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-600 transition-colors">Initialize New Bridge</p>
                            <p className="text-[10px] text-zinc-300 mt-2 font-medium">Outbound / Inbound Protocol</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
