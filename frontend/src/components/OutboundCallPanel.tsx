'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3008';

const VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];

interface ActiveCall {
  callSid: string;
  sessionId: string;
  campaignId: string;
  to: string;
  startedAt: string;
  status: string;
}

interface TranscriptLine {
  role: 'agent' | 'user';
  text: string;
}

export default function OutboundCallPanel() {
  const [fromNumbers, setFromNumbers] = useState<string[]>([]);
  const [fromNumber, setFromNumber] = useState('');
  const [toNumber, setToNumber] = useState('');
  const [campaignId, setCampaignId] = useState('manual');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [voiceName, setVoiceName] = useState('Kore');
  const [status, setStatus] = useState<'idle' | 'calling' | 'active' | 'error'>('idle');
  const [callSid, setCallSid] = useState<string | null>(null);
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Load available from-numbers on mount
  useEffect(() => {
    fetch(`${BACKEND}/api/calls/from-numbers`)
      .then(r => r.json())
      .then((data: { number: string }[]) => {
        const nums = data.map(d => d.number);
        setFromNumbers(nums);
        if (nums.length > 0) setFromNumber(nums[0]);
      })
      .catch(() => {});
  }, []);

  // Poll active calls every 3s
  useEffect(() => {
    const poll = () => {
      fetch(`${BACKEND}/api/calls`)
        .then(r => r.json())
        .then((data: ActiveCall[]) => setActiveCalls(data))
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  async function handleCall() {
    if (!toNumber.trim()) return;
    setErrorMsg('');
    setStatus('calling');
    setTranscript([]);

    try {
      const res = await fetch(`${BACKEND}/api/calls/outbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toNumber.trim(),
          campaignId,
          systemInstruction,
          voiceName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error desconocido');

      setCallSid(data.callSid);
      setStatus('active');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  async function handleHangUp() {
    if (!callSid) return;
    await fetch(`${BACKEND}/api/calls/${callSid}/end`, { method: 'POST' });
    setStatus('idle');
    setCallSid(null);
  }

  async function hangUpCall(sid: string) {
    await fetch(`${BACKEND}/api/calls/${sid}/end`, { method: 'POST' });
  }

  const isActive = status === 'active' || status === 'calling';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Llamadas salientes</h1>
          <p className="text-zinc-400 text-sm mt-1">Inicia una llamada real vía Twilio + Gemini Live</p>
        </div>

        {/* Call form */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base text-zinc-200">Nueva llamada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* From / To row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Número de salida</Label>
                {fromNumbers.length > 1 ? (
                  <select
                    value={fromNumber}
                    onChange={e => setFromNumber(e.target.value)}
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  >
                    {fromNumbers.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex h-9 items-center rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-300 font-mono">
                    {fromNumber || 'No configurado'}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="to" className="text-zinc-400 text-xs">Número destino</Label>
                <Input
                  id="to"
                  placeholder="+573001234567"
                  value={toNumber}
                  onChange={e => setToNumber(e.target.value)}
                  disabled={isActive}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 font-mono"
                />
              </div>
            </div>

            {/* Campaign + Voice row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="campaign" className="text-zinc-400 text-xs">Campaña</Label>
                <Input
                  id="campaign"
                  placeholder="manual"
                  value={campaignId}
                  onChange={e => setCampaignId(e.target.value)}
                  disabled={isActive}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Voz (Gemini)</Label>
                <select
                  value={voiceName}
                  onChange={e => setVoiceName(e.target.value)}
                  disabled={isActive}
                  className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
                >
                  {VOICES.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* System instruction */}
            <div className="space-y-1.5">
              <Label htmlFor="instruction" className="text-zinc-400 text-xs">Instrucción del sistema (opcional)</Label>
              <Textarea
                id="instruction"
                placeholder="Eres un agente de ventas amable..."
                value={systemInstruction}
                onChange={e => setSystemInstruction(e.target.value)}
                disabled={isActive}
                rows={3}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 resize-none"
              />
            </div>

            {/* Error */}
            {errorMsg && (
              <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
                {errorMsg}
              </p>
            )}

            {/* CTA */}
            <div className="flex items-center gap-3">
              {!isActive ? (
                <Button
                  onClick={handleCall}
                  disabled={!toNumber.trim() || !fromNumber}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.49 11.49 0 00.57 3.57 1 1 0 01-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  Llamar
                </Button>
              ) : (
                <Button
                  onClick={handleHangUp}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.49 11.49 0 00.57 3.57 1 1 0 01-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  Colgar
                </Button>
              )}

              {status === 'calling' && (
                <span className="text-zinc-400 text-sm animate-pulse">Marcando...</span>
              )}
              {status === 'active' && callSid && (
                <span className="text-green-400 text-sm font-mono">En llamada · {callSid.slice(0, 12)}…</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        {transcript.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base text-zinc-200">Transcripción</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={transcriptRef} className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {transcript.map((line, i) => (
                  <div key={i} className={`flex gap-2 text-sm ${line.role === 'agent' ? 'text-blue-300' : 'text-zinc-200'}`}>
                    <span className="shrink-0 font-semibold w-14">
                      {line.role === 'agent' ? 'Agente' : 'Usuario'}
                    </span>
                    <span>{line.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active calls */}
        {activeCalls.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base text-zinc-200">
                Llamadas activas
                <Badge className="ml-2 bg-green-700 text-green-100">{activeCalls.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeCalls.map(call => (
                <div key={call.callSid} className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-mono text-zinc-200">{call.to}</p>
                    <p className="text-xs text-zinc-500">{call.callSid.slice(0, 18)}… · {call.campaignId}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => hangUpCall(call.callSid)}
                  >
                    Colgar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
