'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { aiApi, supportApi, ChatMessage } from '@/lib/api';
import { loadVapi, VapiInstance } from '@/lib/vapi';
import { cn } from '@/lib/utils';

type Panel = 'none' | 'chat' | 'voice';
type VoiceStatus = 'idle' | 'loading' | 'connecting' | 'active' | 'error';

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm the FlowBoard assistant. Ask me to plan work, break a task into subtasks, or summarize your board.",
};

export function AssistantDock() {
  const pathname = usePathname();
  const boardId = pathname?.match(/^\/boards\/([^/]+)/)?.[1];

  const [panel, setPanel] = useState<Panel>('none');

  /* ── Ask AI chat ── */
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ── Voice support ── */
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const vapiRef = useRef<VapiInstance | null>(null);

  // Board toolbar / icon rail opens the chat; the sidebar Help Center opens voice.
  useEffect(() => {
    const askHandler = () => { stopCall(); setPanel('chat'); };
    const helpHandler = () => setPanel('voice');
    window.addEventListener('flowboard:ask-ai', askHandler);
    window.addEventListener('flowboard:help', helpHandler);
    return () => {
      window.removeEventListener('flowboard:ask-ai', askHandler);
      window.removeEventListener('flowboard:help', helpHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (panel === 'chat' && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, panel, sending]);

  // Tear down any live call on unmount.
  useEffect(() => () => {
    try { vapiRef.current?.stop(); vapiRef.current?.removeAllListeners(); } catch { /* ignore */ }
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    setChatError(null);
    try {
      const res = await aiApi.chat(next.filter((m) => m !== GREETING), boardId);
      setMessages([...next, { role: 'assistant', content: res.data.reply }]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'The assistant is unavailable right now.');
    } finally {
      setSending(false);
    }
  };

  const startCall = async () => {
    setVoiceStatus('loading');
    setVoiceError(null);
    setTranscript('');
    try {
      const cfg = (await supportApi.config()).data;
      if (!cfg.enabled || !cfg.publicKey) {
        setVoiceStatus('error');
        setVoiceError('Voice support is not configured on the server yet.');
        return;
      }
      const vapi = await loadVapi(cfg.publicKey);
      vapiRef.current = vapi;
      vapi.on('call-start', () => setVoiceStatus('active'));
      vapi.on('call-end', () => { setVoiceStatus('idle'); setSpeaking(false); });
      vapi.on('speech-start', () => setSpeaking(true));
      vapi.on('speech-end', () => setSpeaking(false));
      vapi.on('error', () => { setVoiceStatus('error'); setVoiceError('The voice service reported an error. Please try again.'); });
      vapi.on('message', (payload) => {
        const m = payload as { type?: string; transcriptType?: string; role?: string; transcript?: string };
        if (m?.type === 'transcript' && m.transcriptType === 'final' && m.transcript) {
          setTranscript(`${m.role === 'user' ? 'You' : 'Agent'}: ${m.transcript}`);
        }
      });
      setVoiceStatus('connecting');
      await vapi.start(cfg.assistantId || cfg.assistant);
    } catch {
      setVoiceStatus('error');
      setVoiceError('Could not start the call. Please allow microphone access and try again.');
    }
  };

  const stopCall = () => {
    try { vapiRef.current?.stop(); } catch { /* ignore */ }
    setVoiceStatus('idle');
    setSpeaking(false);
  };

  const toggleMute = () => {
    const v = vapiRef.current;
    if (!v) return;
    const nextMuted = !muted;
    try { v.setMuted(nextMuted); setMuted(nextMuted); } catch { /* ignore */ }
  };

  const openChat = () => { stopCall(); setPanel(panel === 'chat' ? 'none' : 'chat'); };
  const openVoice = () => { setPanel(panel === 'voice' ? 'none' : 'voice'); };
  const closePanel = () => { if (panel === 'voice') stopCall(); setPanel('none'); };

  const callActive = voiceStatus === 'active' || voiceStatus === 'connecting';

  return (
    <>
      {/* ── Ask AI chat panel ── */}
      {panel === 'chat' && (
        <div className="fixed bottom-24 right-5 z-[80] w-[min(370px,calc(100vw-2.5rem))] max-h-[70vh] flex flex-col bg-surface border border-outline rounded-2xl shadow-elevated overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline bg-surface">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              </span>
              <div>
                <p className="text-[13px] font-semibold text-on-surface leading-tight">Ask AI</p>
                <p className="text-[10px] text-on-surface-variant leading-tight">{boardId ? 'Aware of this board' : 'Powered by Gemini'}</p>
              </div>
            </div>
            <button onClick={closePanel} className="p-1 rounded-lg hover:bg-surface-variant text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] whitespace-pre-wrap break-words',
                  m.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-surface-variant text-on-surface rounded-bl-sm'
                )}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-surface-variant rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            {chatError && <p className="text-[11.5px] text-danger px-1">{chatError}</p>}
          </div>

          <div className="p-2.5 border-t border-outline">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                placeholder="Ask anything about your work…"
                className="flex-1 resize-none max-h-24 rounded-xl border border-outline bg-background px-3 py-2 text-[12.5px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary custom-scrollbar"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="shrink-0 w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Voice support panel ── */}
      {panel === 'voice' && (
        <div className="fixed bottom-24 right-5 z-[80] w-[min(320px,calc(100vw-2.5rem))] bg-surface border border-outline rounded-2xl shadow-elevated overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-success/10 text-success flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">support_agent</span>
              </span>
              <p className="text-[13px] font-semibold text-on-surface">Help &amp; Support</p>
            </div>
            <button onClick={closePanel} className="p-1 rounded-lg hover:bg-surface-variant text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="p-5 flex flex-col items-center text-center">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors',
              callActive ? 'bg-success/15' : 'bg-surface-variant',
              speaking && 'ring-4 ring-success/30'
            )}>
              <span className={cn('material-symbols-outlined text-[30px]', callActive ? 'text-success' : 'text-on-surface-variant')}>
                {callActive ? 'graphic_eq' : 'mic'}
              </span>
            </div>

            <p className="text-[13px] font-medium text-on-surface">
              {voiceStatus === 'idle' && 'Talk to our voice assistant'}
              {voiceStatus === 'loading' && 'Preparing…'}
              {voiceStatus === 'connecting' && 'Connecting…'}
              {voiceStatus === 'active' && (speaking ? 'Assistant is speaking…' : 'Listening…')}
              {voiceStatus === 'error' && 'Voice unavailable'}
            </p>
            <p className="text-[11.5px] text-on-surface-variant mt-1 min-h-[16px]">
              {voiceError ?? (voiceStatus === 'active' ? (transcript || 'Ask about any FlowBoard feature.') : 'A real-time voice agent for how-to questions.')}
            </p>

            <div className="flex items-center gap-2 mt-4">
              {!callActive ? (
                <button
                  onClick={startCall}
                  disabled={voiceStatus === 'loading'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-success text-white text-[13px] font-medium hover:bg-success/90 disabled:opacity-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  {voiceStatus === 'error' ? 'Try again' : 'Start call'}
                </button>
              ) : (
                <>
                  <button onClick={toggleMute} className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-outline text-[13px] text-on-surface hover:bg-surface-variant transition-colors">
                    <span className="material-symbols-outlined text-[16px]">{muted ? 'mic_off' : 'mic'}</span>
                    {muted ? 'Unmute' : 'Mute'}
                  </button>
                  <button onClick={stopCall} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-danger text-white text-[13px] font-medium hover:bg-danger/90 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">call_end</span>
                    End
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating launchers ── */}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-2.5">
        <button
          onClick={openVoice}
          title="Help & Support (voice)"
          className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center shadow-elevated border transition-colors',
            panel === 'voice' ? 'bg-success text-white border-success' : 'bg-surface text-on-surface border-outline hover:bg-surface-variant'
          )}
        >
          <span className="material-symbols-outlined text-[20px]">support_agent</span>
        </button>
        <button
          onClick={openChat}
          title="Ask AI"
          className={cn(
            'flex items-center gap-2 h-12 px-4 rounded-full shadow-elevated font-medium text-[13px] transition-colors',
            panel === 'chat' ? 'bg-primary/90 text-white' : 'bg-primary text-white hover:bg-primary/90'
          )}
        >
          <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          Ask AI
        </button>
      </div>
    </>
  );
}
