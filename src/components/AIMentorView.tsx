import { useEffect, useRef, useState } from 'react';
import {
  Brain,
  ExternalLink,
  Globe,
  MapPin,
  MessageSquare,
  Mic,
  MicOff,
  Pause,
  Play,
  Radio,
  Send,
  Sparkles,
  Square,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MENTOR_STAFF } from '../data/careerData';
import {
  buildLocalStudyToolResponse,
  type StudyToolMode,
} from '../utils/platformEngines';
import type {
  AIVideoLesson,
  CareerRole,
  SkillMatchBreakdown,
  StudyLanguage,
  UserProfile,
} from '../types';
import type { ChatModelId, GroundingSource, ThinkingPreset } from '../utils/aiHelpers';

interface AIMentorViewProps {
  profile: UserProfile;
  targetRole: CareerRole;
  match: SkillMatchBreakdown;
  defaultVideoVoice?: boolean;
  initialSubTab?: string;
}

type StudioTab = 'faculty' | 'study-tools' | 'chatbot' | 'live-voice' | 'search-maps';

const STUDY_TOOL_OPTIONS: Array<{ id: StudyToolMode; label: string }> = [
  { id: 'explain-simple', label: 'Explain Simply' },
  { id: 'examples', label: 'Worked Examples' },
  { id: 'practice-mcq', label: 'Practice MCQs' },
  { id: 'coding-exercise', label: 'Coding Exercise' },
  { id: 'debug-error', label: 'Debug / Explain Code' },
  { id: 'summarize', label: 'Summarize Notes' },
  { id: 'revision-sheet', label: 'Revision Sheet' },
  { id: 'study-plan', label: '7-Day Study Plan' },
  { id: 'weak-subject-check', label: 'Weak Subject Check' },
];

const STUDY_LANGUAGES: StudyLanguage[] = ['English', 'Tamil', 'Malayalam', 'Hindi', 'Spanish'];

function downsampleTo16kPcmBase64(float32: Float32Array, inputSampleRate: number): string {
  const ratio = inputSampleRate / 16000;
  const targetLen = Math.max(1, Math.floor(float32.length / ratio));
  const pcm = new Int16Array(targetLen);
  for (let i = 0; i < targetLen; i++) {
    const sample = Math.max(-1, Math.min(1, float32[Math.floor(i * ratio)] || 0));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function AIMentorView({
  profile,
  targetRole,
  match,
  defaultVideoVoice = false,
  initialSubTab,
}: AIMentorViewProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>(
    initialSubTab === 'chatbot' ||
      initialSubTab === 'study-tools' ||
      initialSubTab === 'live-voice' ||
      initialSubTab === 'search-maps' ||
      initialSubTab === 'faculty'
      ? initialSubTab
      : 'faculty',
  );

  const [selectedMentorId, setSelectedMentorId] = useState(MENTOR_STAFF[0].id);
  const selectedMentor =
    MENTOR_STAFF.find((m) => m.id === selectedMentorId) ?? MENTOR_STAFF[0];
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: MENTOR_STAFF[0].greeting },
  ]);

  // AI Study Assistant Toolkit state
  const [studyMode, setStudyMode] = useState<StudyToolMode>('explain-simple');
  const [studyLanguage, setStudyLanguage] = useState<StudyLanguage>(
    profile.preferredStudyLanguage || 'English',
  );
  const [studyInput, setStudyInput] = useState(
    match.missingSkillNames[0] || targetRole.requiredSkills[0]?.name || 'React State & Closures',
  );
  const [studyOutput, setStudyOutput] = useState('');
  const [studyLoading, setStudyLoading] = useState(false);

  useEffect(() => {
    if (
      initialSubTab === 'chatbot' ||
      initialSubTab === 'study-tools' ||
      initialSubTab === 'live-voice' ||
      initialSubTab === 'search-maps' ||
      initialSubTab === 'faculty'
    ) {
      setActiveTab(initialSubTab);
      return;
    }
    const matchedMentor = MENTOR_STAFF.find((m) => m.id === initialSubTab);
    if (matchedMentor) {
      setActiveTab('faculty');
      setSelectedMentorId(matchedMentor.id);
      setMessages([{ role: 'assistant', text: matchedMentor.greeting }]);
    }
  }, [initialSubTab]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [videoTopic, setVideoTopic] = useState(
    match.missingSkillNames[0] || targetRole.requiredSkills[0]?.name || 'React',
  );
  const [videoLesson, setVideoLesson] = useState<AIVideoLesson | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(defaultVideoVoice);

  // Tab 2: Multi-Model Gemini Interactions Chatbot
  const [botModel, setBotModel] = useState<ChatModelId>('gemini-4-hydrogen');
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingPreset>('medium');
  const [interactionId, setInteractionId] = useState<string | undefined>(undefined);
  const [botHistory, setBotHistory] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; thought?: string; modelUsed?: string }>
  >([
    {
      role: 'assistant',
      text: `Ready to coach you toward ${targetRole.title}. Switch between Gemini 4 Hydrogen (deep reasoning) or Gemini 3.1 Flash Lite (fast minimal thinking).`,
      modelUsed: 'gemini-4-hydrogen',
    },
  ]);
  const [botInput, setBotInput] = useState('');
  const [botLoading, setBotLoading] = useState(false);

  // Tab 3: Live Voice WebSocket & Audio Transcriber
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState('Not connected. Start Live Voice Tutor to open bidirectional 16kHz/24kHz audio.');
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [liveTextInput, setLiveTextInput] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [transcribeResult, setTranscribeResult] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Tab 4: Search & Maps Grounded Advisor
  const [groundQuery, setGroundQuery] = useState(
    `Top skills & hiring teams for ${targetRole.title} in Bengaluru & San Francisco`,
  );
  const [useSearchTool, setUseSearchTool] = useState(true);
  const [useMapsTool, setUseMapsTool] = useState(true);
  const [groundLoading, setGroundLoading] = useState(false);
  const [groundAnswer, setGroundAnswer] = useState('');
  const [groundSources, setGroundSources] = useState<GroundingSource[]>([]);

  // Cleanup WebSocket & Audio on unmount
  useEffect(() => {
    return () => {
      stopLiveVoice();
    };
  }, []);

  // Auto-advance scenes while playing
  useEffect(() => {
    if (!isPlayingVideo || !videoLesson) return;
    const timer = setInterval(() => {
      setActiveSceneIndex((prev) => {
        if (prev + 1 >= videoLesson.scenes.length) {
          setIsPlayingVideo(false);
          return prev;
        }
        return prev + 1;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [isPlayingVideo, videoLesson]);

  // Speak current scene narration if voice is toggled on
  useEffect(() => {
    if (!isPlayingVideo || !voiceEnabled || !videoLesson) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const scene = videoLesson.scenes[activeSceneIndex];
    if (!scene) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(scene.narration);
    utter.rate = 1.02;
    window.speechSynthesis.speak(utter);
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [activeSceneIndex, isPlayingVideo, voiceEnabled, videoLesson]);

  const handleSelectMentor = (id: string) => {
    setSelectedMentorId(id);
    const m = MENTOR_STAFF.find((item) => item.id === id) ?? MENTOR_STAFF[0];
    setMessages([{ role: 'assistant', text: m.greeting }]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || isSending) return;
    const nextHistory = [...messages, { role: 'user' as const, text: trimmed }];
    setMessages(nextHistory);
    setChatInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/ai/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: selectedMentor.id,
          message: trimmed,
          profile,
          history: nextHistory,
        }),
      });
      const data = (await res.json()) as { reply?: string };
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            data.reply ||
            `Focus next on ${match.missingSkillNames[0] || 'your capstone project'} to raise your ${targetRole.title} readiness.`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Let's strengthen ${match.missingSkillNames[0] || 'your core architecture'} first—open a guided video lesson or take a quick diagnostic check.`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateVideo = async (topicOverride?: string) => {
    const topicToUse = (topicOverride || videoTopic).trim();
    if (!topicToUse || isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    setIsPlayingVideo(false);
    setActiveSceneIndex(0);

    try {
      const res = await fetch('/api/ai/video-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToUse,
          mentorId: selectedMentor.id,
          targetRoleTitle: targetRole.title,
        }),
      });
      const lesson = (await res.json()) as AIVideoLesson;
      setVideoLesson(lesson);
      setIsPlayingVideo(true);
    } catch {
      // Handled gracefully
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleBotSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = botInput.trim();
    if (!trimmed || botLoading) return;
    setBotHistory((prev) => [...prev, { role: 'user', text: trimmed }]);
    setBotInput('');
    setBotLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          model: botModel,
          thinkingLevel,
          previousInteractionId: interactionId,
          profile,
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        thoughtSummary?: string;
        interactionId?: string;
        modelUsed?: string;
        error?: string;
      };
      if (!res.ok) {
        setBotHistory((prev) => [
          ...prev,
          { role: 'assistant', text: data.error || 'Chat request failed.' },
        ]);
      } else {
        if (data.interactionId) setInteractionId(data.interactionId);
        setBotHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.reply || '',
            thought: data.thoughtSummary,
            modelUsed: data.modelUsed,
          },
        ]);
      }
    } catch {
      setBotHistory((prev) => [
        ...prev,
        { role: 'assistant', text: 'Network error reaching AI tutor.' },
      ]);
    } finally {
      setBotLoading(false);
    }
  };

  const enqueue24kPcmPlayback = (base64Pcm: string) => {
    if (!playCtxRef.current) {
      playCtxRef.current = new AudioContext({ sampleRate: 24000 });
      nextPlayTimeRef.current = playCtxRef.current.currentTime;
    }
    const ctx = playCtxRef.current;
    const raw = atob(base64Pcm);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    src.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
  };

  const stopLiveVoice = () => {
    try {
      wsRef.current?.close();
    } catch {
      // Ignore
    }
    wsRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    micCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;
    playCtxRef.current?.close().catch(() => {});
    playCtxRef.current = null;
    setLiveConnected(false);
  };

  const startLiveVoice = async () => {
    if (liveConnected) {
      stopLiveVoice();
      setLiveStatus('Live Voice Tutor session ended.');
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live`);
    wsRef.current = ws;

    ws.onopen = async () => {
      setLiveConnected(true);
      setLiveStatus('Connecting microphone & Gemini 3.8 Live session...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const ctx = new AudioContext();
        micCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const proc = ctx.createScriptProcessor(4096, 1, 1);
        proc.onaudioprocess = (ev) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const samples = ev.inputBuffer.getChannelData(0);
          const b64 = downsampleTo16kPcmBase64(samples, ctx.sampleRate);
          ws.send(JSON.stringify({ type: 'audio', data: b64 }));
        };
        source.connect(proc);
        proc.connect(ctx.destination);
      } catch {
        setLiveStatus('Connected via text channel (microphone unavailable or permission denied).');
      }
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          type?: string;
          message?: string;
          text?: string;
          data?: string;
        };
        if (msg.type === 'status' && msg.message) setLiveStatus(msg.message);
        if (msg.type === 'text' && msg.text) {
          setLiveLogs((prev) => [...prev.slice(-12), `AI Tutor: ${msg.text}`]);
        }
        if (msg.type === 'audio' && msg.data) {
          enqueue24kPcmPlayback(msg.data);
        }
        if (msg.type === 'error' && msg.message) {
          setLiveStatus(`Live Voice notice: ${msg.message}`);
        }
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onclose = () => {
      setLiveConnected(false);
    };
  };

  const sendLiveTextTurn = (e: React.FormEvent) => {
    e.preventDefault();
    const txt = liveTextInput.trim();
    if (!txt || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setLiveLogs((prev) => [...prev.slice(-12), `You: ${txt}`]);
    wsRef.current.send(JSON.stringify({ type: 'text', text: txt }));
    setLiveTextInput('');
  };

  const toggleClipRecording = async () => {
    if (isRecordingClip && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingClip(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = String(reader.result || '');
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
          if (!base64) return;
          setTranscribing(true);
          try {
            const res = await fetch('/api/ai/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64, mimeType: blob.type || 'audio/webm' }),
            });
            const data = (await res.json()) as { transcript?: string; error?: string };
            setTranscribeResult(data.transcript || data.error || 'No transcript returned.');
          } finally {
            setTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingClip(true);
    } catch {
      setTranscribeResult('Microphone access is unavailable in this browser context.');
    }
  };

  const handleGroundedSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groundQuery.trim() || groundLoading) return;
    setGroundLoading(true);
    try {
      const res = await fetch('/api/ai/grounded-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: groundQuery,
          useSearch: useSearchTool,
          useMaps: useMapsTool,
        }),
      });
      const data = (await res.json()) as {
        text?: string;
        sources?: GroundingSource[];
        error?: string;
      };
      setGroundAnswer(data.text || data.error || '');
      setGroundSources(data.sources || []);
    } catch {
      setGroundAnswer('Unable to reach grounded advisor right now.');
    } finally {
      setGroundLoading(false);
    }
  };

  const handleRunStudyTool = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudyLoading(true);
    try {
      const res = await fetch('/api/ai/study-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: studyMode,
          topicOrCode: studyInput,
          language: studyLanguage,
          profile,
          targetRoleTitle: targetRole.title,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { output?: string };
        setStudyOutput(
          data.output ||
            buildLocalStudyToolResponse({
              mode: studyMode,
              topicOrCode: studyInput,
              language: studyLanguage,
              profile,
              targetRoleTitle: targetRole.title,
            }),
        );
      } else {
        setStudyOutput(
          buildLocalStudyToolResponse({
            mode: studyMode,
            topicOrCode: studyInput,
            language: studyLanguage,
            profile,
            targetRoleTitle: targetRole.title,
          }),
        );
      }
    } catch {
      setStudyOutput(
        buildLocalStudyToolResponse({
          mode: studyMode,
          topicOrCode: studyInput,
          language: studyLanguage,
          profile,
          targetRoleTitle: targetRole.title,
        }),
      );
    } finally {
      setStudyLoading(false);
    }
  };

  const speakStudyResult = () => {
    if (!studyOutput || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(studyOutput));
  };

  const currentScene = videoLesson?.scenes[activeSceneIndex];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1E3A5F]/60 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] dark:text-white">
            AI Mentor Studio & Multimodal Coaching
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Consult AI Staff Teachers, generate interactive video lessons, switch Gemini reasoning depths, speak with Live Voice Tutor, or query Search & Maps career intelligence.
          </p>
        </div>
      </div>

      {/* Multimodal Studio Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60">
        {(
          [
            { id: 'faculty', label: 'AI Faculty & Video Studio', Icon: Video },
            { id: 'study-tools', label: 'AI Study Assistant', Icon: Sparkles },
            { id: 'chatbot', label: 'Multi-Model Chatbot', Icon: Brain },
            { id: 'live-voice', label: 'Live Voice & Transcribe', Icon: Radio },
            { id: 'search-maps', label: 'Search & Maps Advisor', Icon: Globe },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === id
                ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2545] dark:hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB: AI Study Assistant Toolkit */}
      {activeTab === 'study-tools' && (
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                AI-Powered Learning &amp; Debugging Assistant
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simplify complex concepts, generate practice MCQs &amp; coding drills, debug errors, summarize notes, and plan study weeks in 5 languages.
              </p>
            </div>
            <select
              value={studyLanguage}
              onChange={(e) => setStudyLanguage(e.target.value as StudyLanguage)}
              aria-label="Study assistant language"
              className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white"
            >
              {STUDY_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  Language: {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STUDY_TOOL_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStudyMode(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  studyMode === opt.id
                    ? 'bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                    : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3A5F]/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleRunStudyTool} className="space-y-3">
            <textarea
              rows={3}
              value={studyInput}
              onChange={(e) => setStudyInput(e.target.value)}
              placeholder="Enter a concept, paste code/stacktrace to debug, or leave blank for personalized weak-subject review..."
              aria-label="Study topic or code snippet"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] p-3 text-xs text-slate-900 dark:text-white"
            />
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="submit"
                disabled={studyLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{studyLoading ? 'Generating...' : 'Run AI Study Assistant'}</span>
              </button>
              {studyOutput && (
                <button
                  type="button"
                  onClick={speakStudyResult}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Read Aloud (Voice Assistant)</span>
                </button>
              )}
            </div>
          </form>

          {studyOutput && (
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
              {studyOutput}
            </div>
          )}
        </section>
      )}

      {/* TAB 1: Faculty & Interactive Video Studio */}
      {activeTab === 'faculty' && (
        <div className="space-y-8">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MENTOR_STAFF.map((mentor) => {
              const active = mentor.id === selectedMentor.id;
              return (
                <button
                  key={mentor.id}
                  type="button"
                  onClick={() => handleSelectMentor(mentor.id)}
                  className={`text-left rounded-2xl border p-4 transition-colors flex flex-col justify-between ${
                    active
                      ? 'border-[#0B2545] dark:border-[#1D4ED8] bg-[#0B2545]/5 dark:bg-[#1D4ED8]/15'
                      : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] hover:border-slate-300 dark:hover:border-[#1E3A5F]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={mentor.avatarUrl}
                      alt={mentor.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-[#1E3A5F]/70"
                    />
                    <div>
                      <p className="font-display text-base font-bold text-[#0B2545] dark:text-white">
                        {mentor.name}
                      </p>
                      <p className="text-xs font-medium text-emerald-700 dark:text-amber-400">
                        {mentor.role}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {mentor.bio}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {mentor.specialty}
                  </p>
                </button>
              );
            })}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5 flex flex-col h-[540px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1E3A5F]/60">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#0B2545] dark:text-emerald-400" />
                  <h2 className="font-display text-base font-bold text-[#0B2545] dark:text-white">
                    1-on-1 with {selectedMentor.name}
                  </h2>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Goal: {targetRole.title}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-3.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'ml-8 bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                        : 'mr-6 bg-[#F4F7FB] dark:bg-[#05070B] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#1E3A5F]/60'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-200 dark:border-[#1E3A5F]/60 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Ask ${selectedMentor.name} for guidance...`}
                  aria-label="Message AI Mentor"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={isSending}
                  aria-label="Send message to AI Mentor"
                  className="px-3.5 py-2 rounded-lg bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </section>

            <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <h2 className="font-display text-base font-bold text-[#0B2545] dark:text-white">
                      AI Video Lesson Studio
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Goal-accurate visual scenes + live code walkthrough + optional voice narration
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVoiceEnabled((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200"
                >
                  {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={videoTopic}
                  onChange={(e) => setVideoTopic(e.target.value)}
                  placeholder="Topic (e.g., React Hooks, Node.js APIs, SQL Joins)"
                  aria-label="AI video lesson topic"
                  className="flex-1 min-w-[200px] rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleGenerateVideo()}
                  disabled={isGeneratingVideo}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] disabled:opacity-60 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingVideo ? 'Generating Video...' : 'Generate AI Video'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400 mr-1">Recommended topics:</span>
                {(match.missingSkillNames.length > 0
                  ? match.missingSkillNames
                  : targetRole.requiredSkills.map((s) => s.name).slice(0, 4)
                ).map((sk) => (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => {
                      setVideoTopic(sk);
                      handleGenerateVideo(sk);
                    }}
                    className="px-2.5 py-1 rounded-md bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 font-medium"
                  >
                    {sk}
                  </button>
                ))}
              </div>

              {videoLesson && currentScene ? (
                <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#05070B] text-white">
                  <div className="p-5 sm:p-6 min-h-[290px] flex flex-col justify-between bg-gradient-to-br from-[#05070B] via-[#0A1628] to-[#0F213E]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-mono text-amber-400">
                        Scene {currentScene.sceneNumber} / {videoLesson.scenes.length} · {videoLesson.mentorName}
                      </span>
                      <span className="text-[11px] text-slate-300">{currentScene.visualDiagramTitle}</span>
                    </div>

                    <div className="my-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-6 space-y-2">
                        <h3 className="font-display text-lg font-bold text-white">{currentScene.title}</h3>
                        <p className="text-xs text-slate-200 leading-relaxed">{currentScene.narration}</p>
                        <p className="text-[11px] font-medium text-emerald-300 pt-1">
                          Takeaway: {currentScene.keyTakeaway}
                        </p>
                      </div>

                      <pre className="md:col-span-6 rounded-lg bg-black/70 border border-white/10 p-3.5 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                        <code>{currentScene.codeSnippet}</code>
                      </pre>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setIsPlayingVideo((p) => !p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1D4ED8] hover:bg-[#2563EB] text-xs font-semibold text-white"
                      >
                        {isPlayingVideo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlayingVideo ? 'Pause' : 'Play'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {videoLesson.scenes.map((sc, idx) => (
                          <button
                            key={sc.sceneNumber}
                            type="button"
                            onClick={() => setActiveSceneIndex(idx)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                              idx === activeSceneIndex
                                ? 'bg-amber-400 text-slate-950 font-bold'
                                : 'bg-white/10 text-slate-300 hover:bg-white/20'
                            }`}
                          >
                            S{sc.sceneNumber}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] p-10 text-center space-y-3">
                  <Video className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Select a skill topic and click <strong>Generate AI Video</strong>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Your selected AI Staff Teacher will assemble a 4-scene animated technical briefing tailored specifically to {targetRole.title}.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: Multi-Model Gemini Interactions Chatbot */}
      {activeTab === 'chatbot' && (
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#1E3A5F]/60">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                Multi-Model Career & Code Tutor (Interactions API)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Maintains stateful multi-turn reasoning history across turns.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={botModel}
                onChange={(e) => {
                  const m = e.target.value as ChatModelId;
                  setBotModel(m);
                  if (m === 'gemini-4-hydrogen' && thinkingLevel === 'minimal') {
                    setThinkingLevel('low');
                  }
                }}
                aria-label="Select Gemini chat model"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white"
              >
                <option value="gemini-4-hydrogen">Gemini 4 Hydrogen (Reasoning)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast)</option>
              </select>

              <select
                value={thinkingLevel}
                onChange={(e) => setThinkingLevel(e.target.value as ThinkingPreset)}
                aria-label="Select reasoning depth"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white"
              >
                {botModel === 'gemini-3.1-flash-lite' && <option value="minimal">Minimal Thinking</option>}
                <option value="low">Low Thinking</option>
                <option value="medium">Medium Thinking</option>
                <option value="high">High Thinking</option>
                {botModel === 'gemini-4-hydrogen' && <option value="xhigh">Extra-High Thinking</option>}
              </select>
            </div>
          </div>

          <div className="h-[360px] overflow-y-auto space-y-3 pr-1">
            {botHistory.map((item, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 text-xs leading-relaxed ${
                  item.role === 'user'
                    ? 'ml-12 bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                    : 'mr-8 bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60 text-slate-800 dark:text-slate-200 space-y-2'
                }`}
              >
                <p className="whitespace-pre-line">{item.text}</p>
                {item.thought && (
                  <details className="pt-2 border-t border-slate-200 dark:border-[#1E3A5F]/60 text-[11px] text-slate-500 dark:text-slate-400">
                    <summary className="cursor-pointer font-medium">Reasoning Trace ({item.modelUsed})</summary>
                    <p className="mt-1 whitespace-pre-line">{item.thought}</p>
                  </details>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleBotSend} className="flex gap-2 pt-3 border-t border-slate-200 dark:border-[#1E3A5F]/60">
            <input
              type="text"
              value={botInput}
              onChange={(e) => setBotInput(e.target.value)}
              placeholder={`Ask about ${match.missingSkillNames[0] || targetRole.title}, system design, or debugging...`}
              aria-label="Multi-model chatbot prompt"
              className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={botLoading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{botLoading ? 'Thinking...' : 'Ask Tutor'}</span>
            </button>
          </form>
        </section>
      )}

      {/* TAB 3: Live Voice WebSocket & Audio Transcription */}
      {activeTab === 'live-voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                  Gemini 3.8 Live Voice Tutor
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time bidirectional 16kHz PCM audio stream over WebSocket (`/ws/live`).
                </p>
              </div>
              <button
                type="button"
                onClick={startLiveVoice}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors ${
                  liveConnected ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-700 hover:bg-emerald-800 dark:bg-[#1D4ED8]'
                }`}
              >
                {liveConnected ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{liveConnected ? 'End Live Session' : 'Start Live Voice'}</span>
              </button>
            </div>

            <div className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60 p-3.5 text-xs text-slate-700 dark:text-slate-300">
              {liveStatus}
            </div>

            <div className="h-44 overflow-y-auto rounded-xl bg-[#05070B] text-slate-200 p-3.5 font-mono text-xs space-y-1.5">
              {liveLogs.length === 0 ? (
                <p className="text-slate-500">Live session transcript & audio events appear here...</p>
              ) : (
                liveLogs.map((line, i) => <p key={i}>{line}</p>)
              )}
            </div>

            <form onSubmit={sendLiveTextTurn} className="flex gap-2">
              <input
                type="text"
                value={liveTextInput}
                onChange={(e) => setLiveTextInput(e.target.value)}
                disabled={!liveConnected}
                placeholder="Or send a text turn while connected..."
                className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!liveConnected}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] dark:bg-[#1D4ED8] text-white disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                Speech-to-Notes Transcriber (`gemini-3.5-transcribe`)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Record a quick verbal explanation or mock interview pitch and transcribe it automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleClipRecording}
              disabled={transcribing}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white ${
                isRecordingClip ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#0B2545] hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]'
              }`}
            >
              {isRecordingClip ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>
                {isRecordingClip
                  ? 'Stop & Transcribe Recording'
                  : transcribing
                    ? 'Transcribing Audio...'
                    : 'Record Practice Answer'}
              </span>
            </button>

            <div className="min-h-[180px] rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {transcribeResult || 'Your transcribed pitch and 1-sentence technical summary will appear here.'}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: Search & Maps Grounded Advisor */}
      {activeTab === 'search-maps' && (
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Search & Maps Grounded Career Advisor
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Combines Google Search & Google Maps tools on Gemini 4 Hydrogen for live hiring insights and verifiable links.
            </p>
          </div>

          <form onSubmit={handleGroundedSearch} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={groundQuery}
                onChange={(e) => setGroundQuery(e.target.value)}
                aria-label="Grounded career query"
                className="flex-1 min-w-[240px] rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={groundLoading}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] disabled:opacity-60"
              >
                {groundLoading ? 'Grounding...' : 'Search Live Sources'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSearchTool}
                  onChange={(e) => setUseSearchTool(e.target.checked)}
                  className="accent-[#0B2545] dark:accent-[#1D4ED8]"
                />
                <Globe className="w-3.5 h-3.5" />
                <span>Google Search Grounding</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useMapsTool}
                  onChange={(e) => setUseMapsTool(e.target.checked)}
                  className="accent-[#0B2545] dark:accent-[#1D4ED8]"
                />
                <MapPin className="w-3.5 h-3.5" />
                <span>Google Maps Location Grounding</span>
              </label>
            </div>
          </form>

          {groundAnswer && (
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-5 space-y-3">
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {groundAnswer}
              </p>
              {groundSources.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-[#1E3A5F]/60 flex flex-wrap gap-2">
                  {groundSources.map((src) => (
                    <a
                      key={src.url}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0F213E] border border-slate-200 dark:border-[#1E3A5F]/60 text-[#0B2545] dark:text-amber-300 hover:underline"
                    >
                      <span>{src.title}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
