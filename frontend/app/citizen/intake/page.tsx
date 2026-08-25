'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, Play, RefreshCw, CheckCircle2, ChevronRight, ArrowRight, Activity, MapPin, Clock, AlertTriangle, ShieldCheck, Globe, Upload, Sparkles, Camera } from 'lucide-react';
import api from '@/lib/api';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/i18n';

type Stage = 'welcome' | 'record' | 'camera' | 'processing' | 'transcription' | 'extraction' | 'clarification' | 'confirm' | 'success';

const CATEGORY_INFO: Record<string, { icon: string; color: string; name: string }> = {
  WATER: { icon: '💧', color: 'text-[var(--nk-cat-water)]', name: 'Water Supply' },
  ROADS: { icon: '🛣️', color: 'text-[var(--nk-cat-roads)]', name: 'Roads & Infra' },
  ELECTRICITY: { icon: '⚡', color: 'text-[var(--nk-cat-electricity)]', name: 'Electricity' },
  SANITATION: { icon: '🚿', color: 'text-[var(--nk-cat-sanitation)]', name: 'Sanitation' },
  GOVERNMENT_SERVICES: { icon: '🏛️', color: 'text-[var(--nk-cat-gov)]', name: 'Government Services' },
};

export default function IntakePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('welcome');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');
  const [selectedLang, setSelectedLang] = useState(DEFAULT_LANGUAGE);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  
  // API State
  const [result, setResult] = useState<any>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [exactAddress, setExactAddress] = useState<string | null>(null);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [cameraReturnStage, setCameraReturnStage] = useState<'welcome' | 'confirm'>('welcome');
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [currentClarificationIndex, setCurrentClarificationIndex] = useState(0);
  const [createdGrievances, setCreatedGrievances] = useState<any[]>([]);
  const [matchedSchemes, setMatchedSchemes] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const liveTranscriptRef = useRef<string>('');
  const finalizedTranscriptRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Timer Effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  useEffect(() => {
    if (stage === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage]);

  // Auto-detect citizen IP address and network-located coordinates on load
  useEffect(() => {
    const detectIpAndLocation = async () => {
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        if (ipData.ip) {
          setIpAddress(ipData.ip);
        }
        if (ipData.latitude && ipData.longitude) {
          setLocation({ lat: ipData.latitude, lng: ipData.longitude });
          const parts = [ipData.city, ipData.region, ipData.country_name].filter(Boolean);
          const ipLocStr = `${parts.join(', ')} (IP: ${ipData.ip})`;
          setExactAddress(ipLocStr);
        }
      } catch (err) {
        console.warn('IP location detection notice:', err);
      }

      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
              const data = await res.json();
              if (data.display_name) {
                setExactAddress(data.display_name);
              }
            } catch {}
          },
          () => {},
          { timeout: 5000, enableHighAccuracy: true }
        );
      }
    };

    detectIpAndLocation();
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── Voice Recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);
      setLiveTranscript('');
      
      // Start fetching GPS location in the background without blocking the microphone
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (err) => {
            setLocation({ lat: 13.0827, lng: 80.2707 });
          },
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
        );
      } else {
        setLocation({ lat: 13.0827, lng: 80.2707 });
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MEDIA_UNSUPPORTED');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      }).catch(async (primaryErr) => {
        console.warn("Primary getUserMedia with constraints failed, trying fallback...", primaryErr);
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      });

      let selectedMimeType: string | undefined = undefined;
      if (typeof MediaRecorder !== 'undefined') {
        const candidateTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/ogg',
          'audio/wav'
        ];
        for (const type of candidateTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            break;
          }
        }
      }

      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      liveTranscriptRef.current = '';
      finalizedTranscriptRef.current = '';

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        // Auto-start camera after voice recording stops
        startCamera('welcome');
      };

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = selectedLang.bcp47;
          
          recognition.onresult = (event: any) => {
            let finalized = '';
            let interim = '';
            for (let i = 0; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalized += transcript + ' ';
              } else {
                interim += transcript;
              }
            }
            finalizedTranscriptRef.current = finalized.trim();
            const full = (finalized + interim).trim();
            if (full) {
              liveTranscriptRef.current = full;
              setLiveTranscript(full);
            }
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition non-fatal error:', event.error);
          };

          recognition.onend = () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              try { recognition.start(); } catch (e) {}
            }
          };

          try {
            recognition.start();
            recognitionRef.current = recognition;
          } catch (recStartErr) {
            console.warn('SpeechRecognition failed to start (non-fatal):', recStartErr);
          }
        } catch (e) { 
          console.warn('Speech recognition setup error (non-fatal):', e); 
        }
      }

      mediaRecorder.start(250);
      setIsRecording(true);
      setStage('record');
    } catch (err: any) {
      console.error("Detailed microphone recording error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access blocked. Please check the 🔒 lock icon in the address bar to Allow Microphone, or check Windows Privacy Settings > Microphone.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone hardware detected on this device. Please connect a microphone or type your issue below.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Microphone is in use by another application (e.g. Teams, Discord, Zoom) or disabled in Windows Sound settings.');
      } else if (err.message === 'MEDIA_UNSUPPORTED' || (typeof window !== 'undefined' && !window.isSecureContext)) {
        setError('Microphone recording requires a secure origin. Please open http://localhost:3000 directly in your browser.');
      } else {
        setError(`Microphone error (${err.name || 'Unknown'}: ${err.message || 'Access failed'}). Please check your microphone settings or type your issue below.`);
      }
    }
  };

  const startCamera = async (targetStage: 'welcome' | 'confirm' = 'welcome') => {
    setCameraReturnStage(targetStage);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      }).catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
      streamRef.current = stream;
      setStage('camera');
    } catch (err: any) {
      setError('Camera access denied or unavailable. Please ensure camera permissions are enabled.');
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    const returnStage = cameraReturnStage;
    stopCameraFlow();

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `live_proof_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPhotoFile(file);
      setPhotoUrl(URL.createObjectURL(file));
      
      // If photo was taken from confirmation stage, return directly to confirm stage
      if (returnStage === 'confirm') {
        setStage('confirm');
        return;
      }

      setStage('processing');
      setError('');
      try {
        if (audioBlob) {
          await processAudio(audioBlob, liveTranscriptRef.current);
        } else {
          const data = await api.analyzeImage(file, selectedLang.code, location?.lat, location?.lng);
          setResult(data);
          setStage('transcription');
        }
      } catch (err: any) {
        setError(err.message || 'Processing failed');
        setStage('welcome');
      }
    }, 'image/jpeg', 0.85);
  };

  const stopCameraFlow = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (stage === 'camera') {
      setStage(cameraReturnStage);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setStage('processing');
    processAudio(file);
  };

  const handleSelectSample = (sampleText: string) => {
    setTextInput(sampleText);
    setStage('processing');
    setError('');
    api.analyzeText(sampleText, selectedLang.code)
      .then(data => {
        setResult(data);
        setStage('transcription');
      })
      .catch(err => {
        setError(err.message || 'Processing failed');
        setStage('welcome');
      });
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current && audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // ─── Processing ─────────────────────────────────────────────────────────────
  const processAudio = async (blob: Blob, fallbackSpeechText?: string) => {
    setError('');
    try {
      let data;
      // If the browser captured live speech text, prefer it for faster/more reliable processing
      if (fallbackSpeechText && fallbackSpeechText.trim().length > 0) {
        data = await api.analyzeVoice(blob, fallbackSpeechText, selectedLang.code);
      } else {
        // No browser speech recognition text available - send audio only
        data = await api.analyzeVoice(blob, undefined, selectedLang.code);
      }
      setResult(data);
      setStage('transcription');
    } catch (err: any) {
      // If audio analysis fails but we have speech text, try text-only as last resort
      if (fallbackSpeechText && fallbackSpeechText.trim().length > 0) {
        try {
          const data = await api.analyzeText(fallbackSpeechText, selectedLang.code);
          setResult(data);
          setStage('transcription');
          return;
        } catch {}
      }
      setError(err.message || 'Processing failed. Please try again.');
      setStage('welcome');
    }
  };

  const processText = async () => {
    if (!textInput.trim()) return;
    setStage('processing');
    setError('');
    try {
      const data = await api.analyzeText(textInput, selectedLang.code);
      setResult(data);
      setStage('transcription');
    } catch (err: any) {
      setError(err.message || 'Processing failed');
      setStage('welcome');
    }
  };

  // ─── Clarification ──────────────────────────────────────────────────────────
  const handleNextClarification = () => {
    const questions = result?.clarification?.fields || [];
    if (currentClarificationIndex < questions.length - 1) {
      setCurrentClarificationIndex(i => i + 1);
    } else {
      // Apply answers
      if (result?.extraction) {
        Object.entries(clarificationAnswers).forEach(([field, value]) => {
          if (value) result.extraction[field] = value;
        });
      }
      setStage('confirm');
    }
  };

  // ─── Submission ─────────────────────────────────────────────────────────────
  const submitGrievance = async () => {
    if (!photoFile && !photoUrl) {
      setError('A live camera photo proof is mandatory. Please open the camera and take a live photo before submitting.');
      return;
    }
    setStage('processing');
    try {
      // Determine issues to submit
      const issues = result?.multi_issues && result.multi_issues.length > 1
        ? result.multi_issues
        : [result?.extraction];
      
      const created: any[] = [];
      for (const issue of issues) {
        const data = await api.createGrievance({
          transcript: result?.transcript?.text || textInput,
          normalized_text: result?.transcript?.normalized_text || textInput,
          extraction: issue,
          confidence: result?.confidence,
          latitude: location?.lat,
          longitude: location?.lng,
        });
        
        // Upload photo evidence if available
        if (photoFile) {
          try {
            await api.uploadEvidence(data.grievance_id, photoFile, 'PHOTO', location?.lat, location?.lng);
          } catch (uploadErr) {
            console.error('Failed to upload photo evidence:', uploadErr);
          }
        }
        
        created.push(data);
      }
      setCreatedGrievances(created);

      // Auto-fetch matched schemes for primary category
      const primaryCategory = created[0]?.category;
      if (primaryCategory) {
        try {
          const schemeResult = await api.matchSchemes(undefined, primaryCategory);
          setMatchedSchemes(schemeResult.matched_schemes || []);
        } catch { /* non-critical */ }
      }

      setStage('success');

      if ('speechSynthesis' in window) {
        const count = created.length;
        const ids = created.map(g => g.grievance_id).join(', ');
        const msg = new SpeechSynthesisUtterance(
          count > 1
            ? `${count} grievances successfully registered. Tracking numbers: ${ids}.`
            : `Grievance successfully registered with tracking number ${ids}.`
        );
        msg.lang = 'en-IN';
        msg.rate = 0.95;
        speechSynthesis.speak(msg);
      }
    } catch (err: any) {
      setError(err.message || 'Submission failed');
      setStage('confirm');
    }
  };

  return (
    <div className="min-h-screen nk-bg flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎙️</span>
          <h1 className="text-lg font-bold text-[var(--nk-earth-brown)]">Our voice</h1>
        </div>
        <button onClick={() => router.push('/')} className="text-sm font-semibold text-[var(--nk-text-muted)] hover:text-[var(--nk-text)]">
          ✕ Cancel
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-2xl mx-auto">
        
        {/* Global Error Banner */}
        {error && (
          <div className="w-full mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}
        {/* ─── WELCOME ─────────────────────────────────────────────────────────── */}
        {stage === 'welcome' && (
          <div className="text-center w-full fade-in-up">
            <h2 className={`text-display text-[var(--nk-earth-brown)] mb-2 ${selectedLang.fontClass}`}>{selectedLang.greeting}</h2>
            <p className="text-xl text-[var(--nk-text-secondary)] mb-12">{selectedLang.ui.howCanWeHelp}</p>

            <div className="flex justify-center gap-4 mb-12 flex-wrap max-w-md mx-auto">
               {SUPPORTED_LANGUAGES.map(lang => (
                 <button
                   key={lang.code}
                   onClick={() => setSelectedLang(lang)}
                   className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${
                     selectedLang.code === lang.code
                       ? 'bg-[var(--nk-golden-beige)] text-white'
                       : 'border border-[var(--nk-glass-border)] text-[var(--nk-text-muted)] hover:border-[var(--nk-golden-beige)]'
                   }`}
                 >
                   {lang.name}
                 </button>
               ))}
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="flex justify-center w-full">
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={startRecording}
                    className="mic-btn w-24 h-24 shadow-2xl pulse-glow flex items-center justify-center"
                    title="Click to start voice recording"
                  >
                    <Mic className="w-8 h-8" />
                  </button>
                  <p className="text-sm font-bold text-[var(--nk-text-secondary)]">{selectedLang.ui.tapToSpeak}</p>
                </div>
              </div>
            </div>

            {/* Quick Demo Samples */}
            <div className="mt-10 text-left w-full">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Test Samples (Click to test AI directly):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSelectSample("No drinking water supply on our street for 3 days, please fix it immediately.")}
                  className="text-xs bg-white/70 hover:bg-white text-[var(--nk-deep-charcoal)] border border-[var(--nk-glass-border)] px-3 py-1.5 rounded-lg shadow-sm text-left transition-all hover:border-[var(--nk-golden-beige)]"
                >
                  💧 Drinking Water Issue (Water)
                </button>
                <button
                  onClick={() => handleSelectSample("There is a large pothole at the main road junction causing accidents.")}
                  className="text-xs bg-white/70 hover:bg-white text-[var(--nk-deep-charcoal)] border border-[var(--nk-glass-border)] px-3 py-1.5 rounded-lg shadow-sm text-left transition-all hover:border-[var(--nk-golden-beige)]"
                >
                  🛣️ Road Pothole (Roads)
                </button>
                <button
                  onClick={() => handleSelectSample("Frequent power cuts in our area and street lights are not working.")}
                  className="text-xs bg-white/70 hover:bg-white text-[var(--nk-deep-charcoal)] border border-[var(--nk-glass-border)] px-3 py-1.5 rounded-lg shadow-sm text-left transition-all hover:border-[var(--nk-golden-beige)]"
                >
                  ⚡ Power Outage / Street Light (Power)
                </button>
              </div>
            </div>
            
            <div className="mt-8 text-left w-full glass-card p-6">
              <p className="text-sm font-bold text-[var(--nk-earth-brown)] mb-3">{selectedLang.ui.orTypeYourIssue}</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={textInput} 
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') processText(); }}
                  className={`input-field flex-1 ${selectedLang.code === 'ur' ? 'rtl-input font-urdu' : selectedLang.fontClass}`}
                  placeholder={selectedLang.placeholder}
                />
                <button onClick={processText} disabled={!textInput.trim()} className="btn-primary py-2 px-4">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── RECORDING ───────────────────────────────────────────────────────── */}
        {stage === 'record' && (
          <div className="text-center w-full scale-in flex flex-col items-center">
             <div className="mb-6 h-20 flex items-end justify-center gap-2">
               {[...Array(14)].map((_, i) => (
                 <div key={i} className="w-2 bg-[var(--nk-golden-beige)] rounded-t-md wave-bar" style={{ animationDelay: `${i * 0.08}s`, height: `${Math.random() * 60 + 20}px` }} />
               ))}
             </div>
             
             <p className="text-4xl font-light tabular-nums text-[var(--nk-earth-brown)] mb-4">{formatTime(recordingTime)}</p>

             {/* Live Speech Recognition Box */}
             <div className="w-full max-w-xl mb-8 p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-[var(--nk-golden-beige)]/40 shadow-xl text-left">
               <div className="flex items-center justify-between mb-2 border-b border-stone-200/60 pb-2">
                 <div className="flex items-center gap-2">
                   <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                   <p className="text-xs font-bold text-[var(--nk-earth-brown)] uppercase tracking-wider">
                     {liveTranscript ? selectedLang.ui.liveSpeechCaptured : selectedLang.ui.listeningMessage}
                   </p>
                 </div>
                 <span className="text-xs text-[var(--nk-text-muted)] font-semibold">{selectedLang.bcp47} AI</span>
               </div>
               <p className={`text-lg ${selectedLang.fontClass} text-[var(--nk-deep-charcoal)] min-h-[64px] leading-relaxed ${selectedLang.code === 'ur' ? 'text-right dir-rtl' : ''}`}>
                 {liveTranscript || (
                   <span className="text-[var(--nk-text-muted)] italic font-normal">
                     Speak clearly into the microphone
                   </span>
                 )}
               </p>
             </div>
             
             <button
                onClick={stopRecording}
                className="mic-btn w-20 h-20 mx-auto recording shadow-2xl flex items-center justify-center"
              >
                <Square className="w-7 h-7 fill-white" />
              </button>
              <p className="text-xs font-bold text-[var(--nk-text-muted)] mt-3">Tap to stop & analyze</p>
          </div>
        )}

        {/* ─── CAMERA ──────────────────────────────────────────────────────────── */}
        {stage === 'camera' && (
          <div className="text-center w-full scale-in flex flex-col items-center">
             <h2 className="text-2xl font-bold text-[var(--nk-earth-brown)] mb-4">Capture Live Photo</h2>
             
             <div className="w-full max-w-md bg-black rounded-2xl overflow-hidden shadow-2xl mb-6 relative">
               <video 
                 ref={videoRef} 
                 autoPlay 
                 playsInline 
                 className="w-full h-[400px] object-cover"
               />
               <div className="absolute inset-0 border-4 border-dashed border-white/50 m-8 rounded-xl pointer-events-none" />
             </div>
             
             <div className="flex gap-4">
               <button
                  onClick={stopCameraFlow}
                  className="btn-secondary px-6"
               >
                 Cancel
               </button>
               <button
                  onClick={capturePhoto}
                  className="mic-btn w-16 h-16 rounded-full bg-[var(--nk-earth-brown)] border-4 border-[var(--nk-golden-beige)] shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
               >
                 <Camera className="w-6 h-6 text-white fill-white" />
               </button>
             </div>
          </div>
        )}

        {/* ─── PROCESSING ──────────────────────────────────────────────────────── */}
        {stage === 'processing' && (
          <div className="text-center fade-in-up flex flex-col items-center">
            <div className="processing-ring w-16 h-16 border-4 mb-8 pulse-glow"></div>
            <h2 className="text-2xl font-bold text-[var(--nk-earth-brown)] mb-3">AI is analyzing...</h2>
            <div className="space-y-2 text-sm text-[var(--nk-text-muted)] font-semibold stagger-reveal">
              <p>🎙️ Converting speech to text</p>
              <p>🧠 Extracting entities</p>
              <p>🛡️ Validating rules</p>
            </div>
          </div>
        )}

        {/* ─── TRANSCRIPTION ───────────────────────────────────────────────────── */}
        {stage === 'transcription' && result && (
          <div className="w-full fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="w-6 h-6 text-[var(--nk-success)]" />
              <h2 className="text-xl font-bold text-[var(--nk-earth-brown)]">{selectedLang.ui.weHeardYou}</h2>
            </div>
            
            <div className="glass-card p-6 mb-8 relative border-2 border-[var(--nk-golden-beige)]/30">
              <label className="block text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-2">
                Captured Speech Transcript (Edit if needed):
              </label>
              <textarea
                value={result.transcript?.text || textInput || liveTranscript}
                onChange={(e) => {
                  const val = e.target.value;
                  setResult((prev: any) => ({
                    ...prev,
                    transcript: { ...(prev?.transcript || {}), text: val, normalized_text: val }
                  }));
                }}
                className={`w-full text-xl ${selectedLang.fontClass} text-[var(--nk-deep-charcoal)] leading-relaxed bg-white/80 border border-stone-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[var(--nk-golden-beige)] shadow-inner ${selectedLang.code === 'ur' ? 'rtl-input' : ''}`}
                rows={3}
              />
              
              {audioUrl && (
                <button onClick={togglePlayback} className="mt-3 flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow border border-[var(--nk-glass-border)] text-xs font-bold text-[var(--nk-earth-brown)] hover:scale-105 transition-transform">
                   {isPlaying ? <Square className="w-4 h-4 fill-current text-red-500" /> : <Play className="w-4 h-4 fill-current text-green-600" />}
                   <span>{isPlaying ? 'Pause Audio' : 'Play Recorded Voice'}</span>
                </button>
              )}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={async () => {
                  const currentText = result.transcript?.text || textInput || liveTranscript;
                  if (currentText && currentText !== result.transcript?.text) {
                    try {
                      setStage('processing');
                      const reAnalyzed = await api.analyzeText(currentText, selectedLang.code);
                      setResult(reAnalyzed);
                      setStage('extraction');
                    } catch {
                      setStage('extraction');
                    }
                  } else {
                    setStage('extraction');
                  }
                }} 
                className="btn-primary flex-1 py-4 text-lg font-bold"
              >
                Continue →
              </button>
              <button onClick={() => { setStage('welcome'); setTextInput(''); setLiveTranscript(''); }} className="btn-secondary px-6" title="Re-record">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ─── AI EXTRACTION (Staggered Reveal) ────────────────────────────────── */}
        {stage === 'extraction' && result && (
          <div className="w-full">
            <h2 className="text-xl font-bold text-[var(--nk-earth-brown)] mb-6">AI Understanding</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-8 stagger-reveal">
               {result.extraction?.category && (
                 <div className="glass-card p-5 border-l-4 border-[var(--nk-cat-water)]">
                   <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-2">Category</p>
                   <div className="flex items-center gap-2">
                     <span className="text-2xl">{CATEGORY_INFO[result.extraction.category]?.icon}</span>
                     <span className="text-lg font-bold text-[var(--nk-earth-brown)]">{CATEGORY_INFO[result.extraction.category]?.name || result.extraction.category}</span>
                   </div>
                 </div>
               )}
               {result.extraction?.issue && (
                 <div className="glass-card p-5 border-l-4 border-[var(--nk-golden-beige)]">
                   <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-2">Issue</p>
                   <p className="text-[var(--nk-deep-charcoal)] font-semibold line-clamp-2">{result.extraction.issue}</p>
                 </div>
               )}
               {result.extraction?.location_name && (
                 <div className="glass-card p-5 border-l-4 border-[var(--nk-earth-brown)]">
                   <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-2">Location</p>
                   <div className="flex items-center gap-2">
                     <MapPin className="w-4 h-4 text-[var(--nk-earth-brown)]" />
                     <p className="text-[var(--nk-deep-charcoal)] font-semibold">{result.extraction.location_name}</p>
                   </div>
                 </div>
               )}
               {result.extraction?.duration_days != null && (
                 <div className="glass-card p-5 border-l-4 border-[var(--nk-warning)]">
                   <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-2">Duration</p>
                   <div className="flex items-center gap-2">
                     <Clock className="w-4 h-4 text-[var(--nk-warning)]" />
                     <p className="text-[var(--nk-deep-charcoal)] font-semibold">{result.extraction.duration_days} Days</p>
                   </div>
                 </div>
               )}
            </div>

            {result.clarification_needed ? (
              <div className="glass-card p-6 border-[var(--nk-warning)]/30 bg-orange-50/50 fade-in-up" style={{ animationDelay: '0.6s' }}>
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--nk-warning)]/20 flex items-center justify-center flex-shrink-0">
                     <AlertTriangle className="w-6 h-6 text-[var(--nk-warning)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--nk-earth-brown)]">Missing Information</h4>
                    <p className="text-sm text-[var(--nk-text-secondary)]">We need a few more details to route this correctly.</p>
                  </div>
                </div>
                <button onClick={() => setStage('clarification')} className="btn-primary w-full mt-6 py-4">Provide Details</button>
              </div>
            ) : (
              <>
                {/* Multi-issue alert */}
                {result.multi_issues && result.multi_issues.length > 1 && (
                  <div className="glass-card p-6 border-l-4 border-[var(--nk-info)] mb-4 fade-in-up" style={{ animationDelay: '0.5s' }}>
                    <h4 className="font-bold text-[var(--nk-info)] mb-3">🔀 AI Detected {result.multi_issues.length} Separate Issues</h4>
                    <p className="text-sm text-[var(--nk-text-secondary)] mb-4">Your input mentions multiple problems. Each will be filed as a separate grievance and routed to the correct department.</p>
                    <div className="space-y-2">
                      {result.multi_issues.map((issue: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-[var(--nk-glass-border)]">
                          <span className="text-xl">{CATEGORY_INFO[issue.category]?.icon || '📋'}</span>
                          <div>
                            <p className="text-sm font-bold text-[var(--nk-deep-charcoal)]">{CATEGORY_INFO[issue.category]?.name || issue.category}</p>
                            <p className="text-xs text-[var(--nk-text-muted)]">{issue.issue}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => setStage('confirm')} className="btn-primary w-full py-4 text-lg fade-in-up" style={{ animationDelay: '0.6s' }}>
                  {selectedLang.ui.continueBtn} →
                </button>
              </>
            )}
          </div>
        )}

        {/* ─── ONE-AT-A-TIME CLARIFICATION ─────────────────────────────────────── */}
        {stage === 'clarification' && result?.clarification?.fields && (
          <div className="w-full max-w-lg mx-auto scale-in">
             <div className="flex justify-between items-center mb-8">
               <span className="text-sm font-bold text-[var(--nk-text-muted)]">Question {currentClarificationIndex + 1} of {result.clarification.fields.length}</span>
               <div className="flex gap-1">
                 {result.clarification.fields.map((_: any, idx: number) => (
                   <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentClarificationIndex ? 'bg-[var(--nk-golden-beige)] w-6' : 'bg-[var(--nk-glass-border)]'} transition-all`} />
                 ))}
               </div>
             </div>

             {(() => {
                const field = result.clarification.fields[currentClarificationIndex];
                return (
                  <div className="glass-card p-8 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--nk-golden-beige)] to-[var(--nk-earth-brown)]"></div>
                    <h3 className={`text-2xl font-bold ${selectedLang.fontClass} text-[var(--nk-deep-charcoal)] mb-2 leading-snug ${selectedLang.code === 'ur' ? 'text-right dir-rtl' : ''}`}>{selectedLang.code === 'en' ? field.question_en : field.question_ta}</h3>
                    {selectedLang.code !== 'en' && <p className={`text-sm text-[var(--nk-text-muted)] mb-8 ${selectedLang.code === 'ur' ? 'text-right dir-rtl' : ''}`}>{field.question_en}</p>}
                    
                    {field.options ? (
                      <div className="flex flex-col gap-3">
                        {field.options.map((opt: string) => (
                          <button
                            key={opt}
                            onClick={() => {
                              setClarificationAnswers(prev => ({ ...prev, [field.field]: opt }));
                              setTimeout(handleNextClarification, 300);
                            }}
                            className={`text-left px-6 py-4 rounded-xl border border-[var(--nk-glass-border)] bg-[var(--nk-white)]/50 hover:bg-[var(--nk-bg-surface)] hover:border-[var(--nk-golden-beige)] transition-all font-semibold ${selectedLang.fontClass} text-[var(--nk-text)] ${selectedLang.code === 'ur' ? 'text-right dir-rtl' : ''}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={clarificationAnswers[field.field] || ''}
                          onChange={(e) => setClarificationAnswers(prev => ({ ...prev, [field.field]: e.target.value }))}
                          placeholder="Type here..."
                          className="input-field flex-1 text-lg py-4"
                          autoFocus
                        />
                        <button onClick={handleNextClarification} disabled={!clarificationAnswers[field.field]} className="btn-primary px-6">
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </div>
                );
             })()}
             
             <button onClick={handleNextClarification} className="w-full text-center text-sm font-semibold text-[var(--nk-text-muted)] hover:text-[var(--nk-text)]">
                Skip this question
             </button>
          </div>
        )}

        {/* ─── PREMIUM CONFIRMATION ────────────────────────────────────────────── */}
        {stage === 'confirm' && result && (
          <div className="w-full fade-in-up">
            <h2 className="text-3xl font-bold text-[var(--nk-deep-charcoal)] mb-8 text-center">Ready to Submit</h2>
            
            <div className="glass-card p-1 rounded-2xl mb-8 bg-gradient-to-b from-[var(--nk-golden-beige)] to-[var(--nk-earth-brown)]">
               <div className="bg-[var(--nk-bg-deep)] rounded-xl p-6">
                 <div className="flex justify-between items-start mb-6 border-b border-[var(--nk-glass-border)] pb-6">
                   <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-full bg-[var(--nk-sand)] flex items-center justify-center">
                       <ShieldCheck className="w-6 h-6 text-[var(--nk-earth-brown)]" />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-[var(--nk-text-muted)] uppercase tracking-wider">Department</p>
                       <p className="text-lg font-bold text-[var(--nk-deep-charcoal)]">TWAD Board</p>
                     </div>
                   </div>
                   <span className="badge-high">HIGH PRIORITY</span>
                 </div>
                 
                 <div className="space-y-4">
                   <div className="grid grid-cols-3 gap-4">
                     <div className="col-span-1 text-sm font-bold text-[var(--nk-text-muted)]">Issue</div>
                     <div className="col-span-2 text-sm font-semibold text-[var(--nk-deep-charcoal)]">
                        {result.extraction?.issue}
                        {result.extraction?.issue_ta && selectedLang.code !== 'en' && <p className={`${selectedLang.fontClass} mt-1 text-[var(--nk-text-secondary)]`}>{result.extraction.issue_ta}</p>}
                     </div>
                   </div>
                   <div className="grid grid-cols-3 gap-4">
                     <div className="col-span-1 text-sm font-bold text-[var(--nk-text-muted)]">Duration</div>
                     <div className="col-span-2 text-sm font-semibold text-[var(--nk-deep-charcoal)]">
                        {clarificationAnswers.duration_days || result.extraction?.duration_days ? `${clarificationAnswers.duration_days || result.extraction?.duration_days} days` : 'Not specified'}
                     </div>
                   </div>
                   <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1 text-sm font-bold text-[var(--nk-text-muted)]">Location & IP</div>
                      <div className="col-span-2 text-sm font-semibold text-[var(--nk-deep-charcoal)]">
                         <div>{exactAddress || clarificationAnswers.location_name || result.extraction?.location_name || 'Detected via Network'}</div>
                         <div className="flex flex-wrap gap-2 mt-1.5">
                           {ipAddress && (
                             <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                               🌐 IP: {ipAddress}
                             </span>
                           )}
                           {location && (
                             <span className="text-[11px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                               <MapPin className="w-3 h-3" />
                               {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                             </span>
                           )}
                         </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1 text-sm font-bold text-[var(--nk-text-muted)]">Attached</div>
                      <div className="col-span-2 flex flex-wrap gap-2">
                        {audioUrl && <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-[var(--nk-sand)] rounded-md text-[var(--nk-earth-brown)]"><Mic className="w-3 h-3"/> Voice</span>}
                        {photoUrl && <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-emerald-100 rounded-md text-emerald-800">📸 Live Photo</span>}
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-[var(--nk-sand)] rounded-md text-[var(--nk-earth-brown)]"><Activity className="w-3 h-3"/> AI Analysis</span>
                      </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* ─── LIVE CAMERA PROOF MODULE (NO FILE UPLOAD) ──────────── */}
            <div className="glass-card p-6 mb-8 text-left border-2 border-[var(--nk-gov-teal)]/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--nk-deep-charcoal)] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[var(--nk-gov-teal)]" />
                  Live Camera Proof (Mandatory)
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  🔴 LIVE CAMERA ONLY
                </span>
              </div>
              
              {!photoUrl ? (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--nk-glass-border)] rounded-2xl bg-white/50 text-center hover:bg-white transition-all">
                  <div className="w-16 h-16 rounded-full bg-[var(--nk-gov-teal)]/10 flex items-center justify-center mb-4 pulse-glow">
                    <Camera className="w-8 h-8 text-[var(--nk-gov-teal)]" />
                  </div>
                  <h4 className="text-base font-bold text-[var(--nk-deep-charcoal)] mb-1">
                    Capture Live Photo of Issue
                  </h4>
                  <p className="text-xs text-[var(--nk-text-muted)] max-w-sm mb-6 leading-relaxed">
                    Gallery and file uploads are disabled to maintain genuine evidence. Please take a live photo of the problem area right now.
                  </p>
                  <button 
                    type="button"
                    onClick={() => startCamera('confirm')}
                    className="btn-primary py-3 px-8 text-sm flex items-center gap-2 shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                    Open Camera & Take Live Photo
                  </button>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-[var(--nk-glass-border)] bg-slate-900/5 p-4 flex flex-col items-center">
                  <div className="relative w-full flex justify-center bg-black/10 rounded-xl overflow-hidden">
                    <img src={photoUrl} alt="Live proof preview" className="max-h-60 rounded-xl object-contain shadow-md" />
                    <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md text-white text-xs font-mono px-3 py-1 rounded-full flex items-center gap-2 border border-white/20">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>VERIFIED LIVE CAPTURE</span>
                    </div>
                  </div>
                  
                  <div className="w-full mt-4 flex items-center justify-between pt-3 border-t border-[var(--nk-glass-border)]">
                    <div className="text-xs text-[var(--nk-text-muted)] flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-[var(--nk-success)]" />
                      <span>Live proof attached & verified</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => startCamera('confirm')}
                      className="text-xs font-bold text-[var(--nk-golden-beige)] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retake Live Photo
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={submitGrievance} className="btn-primary w-full py-5 text-xl flex justify-center items-center gap-2 shadow-2xl">
              <CheckCircle2 className="w-6 h-6" />
              File Official Grievance
            </button>
            {error && <p className="mt-4 text-sm text-[var(--nk-critical)] text-center font-bold">{error}</p>}
          </div>
        )}

        {/* ─── SUCCESS ─────────────────────────────────────────────────────────── */}
        {stage === 'success' && createdGrievances.length > 0 && (
          <div className="text-center w-full scale-in">
             <div className="w-24 h-24 mx-auto rounded-full bg-[var(--nk-success)]/10 flex items-center justify-center mb-8 pulse-glow">
                <CheckCircle2 className="w-12 h-12 text-[var(--nk-success)]" />
             </div>
             <h2 className="text-display text-[var(--nk-deep-charcoal)] mb-2">Success.</h2>
             <p className="text-xl text-[var(--nk-text-secondary)] mb-12">
               {createdGrievances.length > 1
                 ? `${createdGrievances.length} grievances have been successfully submitted.`
                 : 'Your grievance has been successfully submitted.'}
             </p>

             {/* Grievance ID Cards */}
             <div className={`mb-8 ${createdGrievances.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto' : ''}`}>
               {createdGrievances.map((g, idx) => (
                 <div key={g.grievance_id} className="glass-card p-6 border border-[var(--nk-success)]/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--nk-success)]/10 rounded-bl-full"></div>
                    {createdGrievances.length > 1 && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{CATEGORY_INFO[g.category]?.icon || '📋'}</span>
                        <span className="text-xs font-bold text-[var(--nk-text-muted)]">{CATEGORY_INFO[g.category]?.name || g.category}</span>
                      </div>
                    )}
                    <p className="text-xs font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-1">Case Tracking Number</p>
                    <p className="text-2xl font-black text-[var(--nk-success)] tracking-tight font-mono">{g.grievance_id}</p>
                    <button onClick={() => router.push(`/citizen/track?id=${g.grievance_id}`)} className="mt-3 text-sm font-bold text-[var(--nk-golden-beige)] hover:text-[var(--nk-earth-brown)] transition-colors">
                      Track Status →
                    </button>
                 </div>
               ))}
             </div>

              {/* Verified Location & Citizen IP Proof Card */}
              <div className="glass-card p-5 mb-8 max-w-lg mx-auto text-left border-l-4 border-[var(--nk-gov-teal)] fade-in-up">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-[var(--nk-gov-teal)]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--nk-gov-teal)]">
                    Verified Location & Citizen IP Evidence
                  </h4>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--nk-text-muted)] uppercase tracking-wider mb-0.5">Located Area</p>
                    <p className="text-sm font-bold text-[var(--nk-deep-charcoal)]">
                      {exactAddress || (location ? `Coordinates (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` : 'Network Location Verified')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ipAddress && (
                      <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-md border border-[var(--nk-glass-border)] text-emerald-700 flex items-center gap-1 shadow-sm">
                        🌐 Citizen IP: {ipAddress}
                      </span>
                    )}
                    {location && (
                      <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-md border border-[var(--nk-glass-border)] text-blue-700 flex items-center gap-1 shadow-sm">
                        📍 GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </span>
                    )}
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md flex items-center gap-1">
                      📸 Live Camera Photo Verified
                    </span>
                  </div>
                </div>
              </div>

             {/* Matched Government Schemes */}
             {matchedSchemes.length > 0 && (
               <div className="glass-card p-6 text-left mb-8 max-w-lg mx-auto border-l-4 border-[var(--nk-cat-gov)] fade-in-up" style={{ animationDelay: '0.3s' }}>
                 <h3 className="text-sm font-bold text-[var(--nk-cat-gov)] uppercase tracking-wider mb-4 flex items-center gap-2">
                   🏛️ Related Government Schemes for You
                 </h3>
                 <div className="space-y-3">
                   {matchedSchemes.slice(0, 5).map((scheme: any) => (
                     <div key={scheme.scheme_id || scheme.id || scheme.name} className="p-4 rounded-lg bg-white/60 border border-[var(--nk-glass-border)]">
                       <p className="text-sm font-bold text-[var(--nk-deep-charcoal)]">{scheme.name}</p>
                       {scheme.name_ta && selectedLang.code !== 'en' && <p className={`text-sm ${selectedLang.fontClass} text-[var(--nk-text-secondary)]`}>{scheme.name_ta}</p>}
                       {scheme.benefits && <p className="text-xs text-[var(--nk-success)] mt-1">💰 {scheme.benefits}</p>}
                       {scheme.benefits_ta && selectedLang.code !== 'en' && <p className={`text-xs ${selectedLang.fontClass} text-[var(--nk-text-muted)]`}>💰 {scheme.benefits_ta}</p>}
                     </div>
                   ))}
                 </div>
                 <p className="text-[10px] text-[var(--nk-text-muted)] mt-3 italic">
                   These are preliminary matching suggestions. Official eligibility will be verified by the respective authority.
                 </p>
                 <button onClick={() => router.push('/citizen/schemes')} className="mt-3 text-sm font-bold text-[var(--nk-golden-beige)] hover:text-[var(--nk-earth-brown)] transition-colors">
                   Explore All Schemes →
                 </button>
               </div>
             )}

             <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => router.push(`/citizen/track?id=${createdGrievances[0].grievance_id}`)} className="btn-primary px-8">Track Live Status</button>
                <button onClick={() => { setStage('welcome'); setResult(null); setCreatedGrievances([]); setMatchedSchemes([]); setTextInput(''); setClarificationAnswers({}); }} className="btn-secondary px-8">File Another</button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
