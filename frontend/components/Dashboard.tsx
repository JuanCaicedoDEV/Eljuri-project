"use client";

import React from 'react';
import { Phone, Activity, Signal, ShieldCheck, Globe, Wifi, Zap, ArrowUpRight, ChevronRight, Layers, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MOCK_LINES = [
    { id: '1', brand: 'ELjuri Primary', phoneNumber: '+1 (555) 012-3456', status: 'ONLINE', load: '12%', region: 'US East' },
    { id: '2', brand: 'ELjuri Support', phoneNumber: '+1 (555) 987-6543', status: 'ONLINE', load: '45%', region: 'EU West' },
    { id: '3', brand: 'ELjuri Sales', phoneNumber: '+1 (555) 246-8135', status: 'BUSY', load: '88%', region: 'US West' },
];

export default function Dashboard({ onSelectLine }: { onSelectLine: (id: string) => void }) {
    return (
        <div className="p-8 md:p-12 space-y-12 max-w-[1600px] mx-auto w-full">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
                <div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 mb-6"
                    >
                        <div className="p-2.5 bg-zinc-950 rounded-xl shadow-xl shadow-zinc-200">
                            <Layers className="text-white" size={16} strokeWidth={1.5} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Telephony Fleet Management</span>
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-6xl font-black text-zinc-950 tracking-tighter italic"
                    >
                        Infrastructure.
                    </motion.h2>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-4"
                >
                    <Card className="border-none shadow-xl shadow-zinc-200/50 bg-white p-6 flex flex-row items-center gap-8 rounded-[2rem]">
                        <div className="text-center">
                            <p className="text-3xl font-black text-zinc-950 tracking-tighter italic">24/24</p>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Nodes Active</p>
                        </div>
                        <div className="w-px h-10 bg-zinc-100" />
                        <div className="text-center">
                            <p className="text-3xl font-black text-emerald-500 tracking-tighter italic">0ms</p>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Jitter Avg</p>
                        </div>
                    </Card>
                </motion.div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {MOCK_LINES.map((line, idx) => (
                    <motion.div
                        key={line.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Card className="group relative overflow-hidden rounded-[3rem] border-zinc-100 shadow-sm hover:shadow-2xl hover:shadow-zinc-200/60 transition-all duration-500 bg-white flex flex-col h-[400px]">
                            <CardHeader className="p-10 pb-6">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="p-4 bg-zinc-50 rounded-[1.5rem] text-zinc-400 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                                        <Phone size={24} strokeWidth={1.5} />
                                    </div>
                                    <Badge variant="outline" className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest border-none ${line.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${line.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                        {line.status}
                                    </Badge>
                                </div>
                                <CardTitle className="text-3xl font-black text-zinc-950 leading-tight tracking-tighter">
                                    {line.brand}
                                </CardTitle>
                                <CardDescription className="text-xs font-mono font-medium text-zinc-400 mt-2">
                                    {line.phoneNumber}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="px-10 flex-1 flex flex-col justify-center">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                        <span>Node Capacity</span>
                                        <span className="text-zinc-950">{line.load}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: line.load }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className={`h-full ${parseInt(line.load) > 80 ? 'bg-amber-500' : 'bg-primary'}`}
                                        />
                                    </div>
                                    <p className="text-[9px] text-zinc-400 font-medium italic">Active in {line.region} gateway</p>
                                </div>
                            </CardContent>

                            <CardFooter className="p-10 pt-8 border-t border-zinc-50 bg-zinc-50/20">
                                <Button
                                    onClick={() => onSelectLine(line.id)}
                                    className="w-full h-14 rounded-2xl bg-zinc-950 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-zinc-950/20 active:scale-95 transition-all group/btn"
                                >
                                    Test Protocol <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="flex justify-center mt-12 mb-4 opacity-40 hover:opacity-100 transition-opacity cursor-default">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                    Developed by Affila Technology
                </p>
            </div>
        </div>
    );
}
