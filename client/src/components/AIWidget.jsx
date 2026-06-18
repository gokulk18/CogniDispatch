import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

export default function AIWidget({ onTranscription, onVisionTriage, onFallback, disabled, onClose, triageResult, tabs = ['SPEECH', 'VISION', 'VIDEO'] }) {
  // Tabs: 'SPEECH', 'VISION', or 'VIDEO'
  const [activeTab, setActiveTab] = useState(tabs[0] || 'SPEECH');

  // Voice States
  const [internalState, setInternalState] = useState('IDLE'); // IDLE, FETCHING_TOKEN, READY, LISTENING, PROCESSING, ERROR
  const [speechToken, setSpeechToken] = useState(null);
  const [speechRegion, setSpeechRegion] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [demoText, setDemoText] = useState('');

  // Vision States
  const [selectedImage, setSelectedImage] = useState(null); // Local preview URL
  const [base64Image, setBase64Image] = useState(null); // Base64 content
  const [simulateVisionType, setSimulateVisionType] = useState('PLUMBING');
  const [visionTriageResult, setVisionTriageResult] = useState(null);
  const [isVisionAnalyzing, setIsVisionAnalyzing] = useState(false);
  const [visionErrorMessage, setVisionErrorMessage] = useState('');

  // Live Video Assist States & Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videoStream, setVideoStream] = useState(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [videoFeedback, setVideoFeedback] = useState('Camera is off. Click "Start Live Assist" to enable video-guided triage.');
  const [videoMitigations, setVideoMitigations] = useState([]);
  const [videoTranscript, setVideoTranscript] = useState('');
  const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [videoErrorMessage, setVideoErrorMessage] = useState('');

  // Tracking spoken messages to avoid overlaps or loops
  const lastSpokenTextRef = useRef('');
  const lastTriageSummaryRef = useRef('');
  const activeSynthesizerRef = useRef(null);

  const isDemoMode = speechToken === 'mock_speech_token';

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_IP || '';
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_IP || serverUrl;

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (activeSynthesizerRef.current) {
        try {
          activeSynthesizerRef.current.close();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  // Speech Synthesis (TTS) Helper
  const speakText = async (text) => {
    if (!text || text.trim() === '') return;

    // Check if we are running in Offline Demo Mode (no real speech credentials)
    if (isDemoMode) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel(); // Stop any ongoing speech
          const utterance = new SpeechSynthesisUtterance(text);
          const voices = window.speechSynthesis.getVoices();
          const enVoice = voices.find(v => v.lang.startsWith('en')) || null;
          if (enVoice) {
            utterance.voice = enVoice;
          }
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error("Browser native speech synthesis failed:", err);
        }
      }
      return;
    }

    // Live Azure Speech Synthesis (TTS)
    try {
      const SpeechSDK = await import('microsoft-cognitiveservices-speech-sdk');
      let currentToken = speechToken;
      let currentRegion = speechRegion;

      if (!currentToken) {
        const tokenRes = await axios.get(`${serverUrl}/api/ai/speech-token`);
        currentToken = tokenRes.data.token;
        currentRegion = tokenRes.data.region;
        setSpeechToken(currentToken);
        setSpeechRegion(currentRegion);
      }

      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(currentToken, currentRegion);
      speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural"; // Premium neural voice
      
      // Close previous synthesizer if active
      if (activeSynthesizerRef.current) {
        try {
          activeSynthesizerRef.current.close();
        } catch (e) {}
      }

      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);
      activeSynthesizerRef.current = synthesizer;
      
      synthesizer.speakTextAsync(
        text,
        (result) => {
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            console.log("[Azure Speech synthesis] Completed successfully.");
          } else {
            console.warn("[Azure Speech synthesis] Synthesis issue:", result.errorDetails);
          }
          synthesizer.close();
          if (activeSynthesizerRef.current === synthesizer) {
            activeSynthesizerRef.current = null;
          }
        },
        (err) => {
          console.error("[Azure Speech synthesis] Failed:", err);
          synthesizer.close();
          if (activeSynthesizerRef.current === synthesizer) {
            activeSynthesizerRef.current = null;
          }
        }
      );
    } catch (err) {
      console.error("Failed to load Azure Speech SDK for synthesis:", err);
      // Fallback to Web Speech API
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Speak live video feedback when it changes
  useEffect(() => {
    const isPlaceholderText = 
      videoFeedback === 'Camera is off. Click "Start Live Assist" to enable video-guided triage.' ||
      videoFeedback === 'Live video feed active. Describe your emergency in the input box below to begin.' ||
      videoFeedback === 'Initializing camera feed...';

    if (isVideoActive && videoFeedback && !isPlaceholderText && videoFeedback !== lastSpokenTextRef.current) {
      speakText(videoFeedback);
      lastSpokenTextRef.current = videoFeedback;
    }
  }, [videoFeedback, isVideoActive]);

  // Speak voice transcription triage result summary when it changes
  useEffect(() => {
    if (triageResult && triageResult.summary && triageResult.summary !== lastTriageSummaryRef.current) {
      speakText(triageResult.summary);
      lastTriageSummaryRef.current = triageResult.summary;
    }
  }, [triageResult]);

  // Fetch the speech token on mount
  useEffect(() => {
    let active = true;
    const fetchToken = async () => {
      setInternalState('FETCHING_TOKEN');
      try {
        const response = await axios.get(`${serverUrl}/api/ai/speech-token`);
        if (active) {
          const { token, region } = response.data;
          setSpeechToken(token);
          setSpeechRegion(region);
          setInternalState('READY');
        }
      } catch (err) {
        if (active) {
          console.error("Token fetch failure:", err);
          setInternalState('ERROR');
          setErrorMessage("Failed to acquire speech service authorization.");
        }
      }
    };

    fetchToken();
    return () => {
      active = false;
    };
  }, []);

  // Mic Click Handlers
  const handleMicClick = async () => {
    if (disabled || internalState === 'LISTENING' || internalState === 'PROCESSING') return;

    if (isDemoMode) {
      setErrorMessage("Azure Speech credentials missing. Speech input disabled. Use the simulation box below.");
      return;
    }

    setInternalState('LISTENING');
    setTranscript('');
    setErrorMessage('');

    let recognizer;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const SpeechSDK = await import('microsoft-cognitiveservices-speech-sdk');

      let currentToken = speechToken;
      let currentRegion = speechRegion;

      if (!currentToken) {
        setInternalState('FETCHING_TOKEN');
        const tokenRes = await axios.get(`${serverUrl}/api/ai/speech-token`);
        currentToken = tokenRes.data.token;
        currentRegion = tokenRes.data.region;
        setSpeechToken(currentToken);
        setSpeechRegion(currentRegion);
      }

      setInternalState('LISTENING');

      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(currentToken, currentRegion);
      speechConfig.speechRecognitionLanguage = 'en-US';
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognizeOnceAsync(
        (result) => {
          if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            const text = result.text;
            setTranscript(text);
            setInternalState('PROCESSING');
            onTranscription(text);
          } else {
            console.warn("Speech recognition issue, reason code:", result.reason);
            handleRecognitionFailure("Speech not recognized. Please speak clearly.");
          }
          if (recognizer) recognizer.close();
        },
        (err) => {
          console.error("Recognizer error:", err);
          handleRecognitionFailure(err.message || "Speech SDK error occurred.");
          if (recognizer) recognizer.close();
        }
      );

    } catch (err) {
      console.error("Mic init failed:", err);
      handleRecognitionFailure(err.message || "Failed to initialize microphone.");
      if (recognizer) recognizer.close();
    }
  };

  const handleRecognitionFailure = (reason) => {
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setErrorMessage(reason);
    setInternalState('ERROR');

    if (nextAttempts >= 2 && !isDemoMode) {
      onFallback(`Speech recognition failed twice. Last error: ${reason}`);
    }
  };

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    if (!demoText.trim() || disabled) return;
    setTranscript(demoText);
    setInternalState('PROCESSING');
    onTranscription(demoText);
  };

  // Image Upload Handlers
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setVisionErrorMessage("Image exceeds 5MB size limit.");
      return;
    }

    setVisionErrorMessage('');
    setVisionTriageResult(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result); // preview data URL
      setBase64Image(reader.result); // base64 value
    };
    reader.readAsDataURL(file);
  };

  const handleVisionAnalyze = async () => {
    if (!base64Image || isVisionAnalyzing) return;

    setIsVisionAnalyzing(true);
    setVisionErrorMessage('');

    try {
      const res = await axios.post(`${serverUrl}/api/ai/vision/analyze`, {
        image: base64Image,
        simulateType: simulateVisionType
      });

      if (res.data && res.data.success) {
        setVisionTriageResult(res.data.triage);
        if (res.data.triage && res.data.triage.summary) {
          speakText(res.data.triage.summary);
        }
      } else {
        throw new Error("Invalid response format from vision AI.");
      }
    } catch (err) {
      console.error("Vision triage failed:", err);
      setVisionErrorMessage(err.response?.data?.error || err.message || "Failed to analyze damage photo.");
    } finally {
      setIsVisionAnalyzing(false);
    }
  };

  const handleVisionReset = () => {
    setSelectedImage(null);
    setBase64Image(null);
    setVisionTriageResult(null);
    setVisionErrorMessage('');
  };

  const handleConfirmVisionDispatch = () => {
    if (!visionTriageResult) return;
    if (onVisionTriage) {
      onVisionTriage(visionTriageResult);
    } else {
      onTranscription(visionTriageResult.summary);
    }
  };

  // Live Video Assist Handlers
  const startVideoAssist = async () => {
    setVideoErrorMessage('');
    setVideoFeedback('Initializing camera feed...');
    setVideoCompleted(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: 'environment' },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setVideoStream(stream);
      setIsVideoActive(true);
      setVideoFeedback('Live video feed active. Describe your emergency in the input box below to begin.');
    } catch (err) {
      console.error("Camera access failed:", err);
      setVideoErrorMessage("Camera permission denied or camera device not found.");
      setVideoFeedback("Failed to access camera.");
    }
  };

  const stopVideoAssist = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    setVideoStream(null);
    setIsVideoActive(false);
    setVideoFeedback('Camera is off. Click "Start Live Assist" to enable video-guided triage.');
  };

  // Auto clean up camera on unmount or tab switch
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  // Periodic Frame Dispatch Loop
  useEffect(() => {
    if (!isVideoActive || !videoStream || videoCompleted) return;

    const intervalId = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 360;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL('image/jpeg', 0.6);

      setIsVideoAnalyzing(true);
      try {
        const res = await axios.post(`${serverUrl}/api/ai/live-assist`, {
          image: base64,
          transcript: videoTranscript
        });

        if (res.data && res.data.success) {
          setVideoFeedback(res.data.feedback);
          setVideoMitigations(res.data.mitigations);
          if (res.data.completed) {
            setVideoCompleted(true);
            stopVideoAssist();
          }
        }
      } catch (err) {
        console.error("Live assist frame analysis failed:", err);
      } finally {
        setIsVideoAnalyzing(false);
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [isVideoActive, videoStream, videoTranscript, videoCompleted]);

  // Status indicators configuration
  const getStatusBadge = () => {
    switch (internalState) {
      case 'FETCHING_TOKEN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/45 text-purple-400 border border-purple-900 animate-pulse">AUTHORIZING SPEECH SDK...</span>;
      case 'READY':
        return isDemoMode ? (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/20 text-purple-400 border border-purple-900/60">OFFLINE DEMO MODE ACTIVE</span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/20 text-emerald-400 border border-emerald-900/40">SYSTEM SECURED & READY</span>
        );
      case 'LISTENING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/50 text-rose-400 border border-rose-900/60 animate-pulse">🔴 TRANSMITTING AUDIO...</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/50 text-purple-400 border border-purple-900/60 animate-pulse">🤖 RUNNING TRIAGE ASSESSMENT...</span>;
      case 'ERROR':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/30 text-amber-400 border border-amber-900/40">⚠️ COMMS ERROR (ATTEMPT {attempts}/2)</span>;
      case 'IDLE':
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800">INITIALIZING DISPATCH PIPELINE</span>;
    }
  };

  return (
    <div className="w-full bg-[#121215] border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col gap-6 backdrop-blur-sm relative">
      {/* Standalone Title Bar (if only 1 tab & onClose provided) */}
      {tabs.length <= 1 && onClose && (
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase flex items-center gap-1.5 font-mono">
            {tabs[0] === 'VIDEO' ? '📹 AI LIVE VIDEO ASSIST' : 'CogniDispatch AI'}
          </span>
          <button
            onClick={onClose}
            className="text-[10px] text-zinc-500 hover:text-rose-450 font-bold uppercase font-mono transition"
          >
            ✕ Close
          </button>
        </div>
      )}

      {/* Widget Tabs Header */}
      {tabs.length > 1 && (
        <div className="flex border-b border-zinc-800 pb-0.5 gap-2 items-center">
          {tabs.includes('SPEECH') && (
            <button
              onClick={() => setActiveTab('SPEECH')}
              className={`flex-1 pb-3 text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all border-b-2 ${
                activeTab === 'SPEECH'
                  ? 'border-purple-500 text-white font-black'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              🎤 Speak
            </button>
          )}
          {tabs.includes('VISION') && (
            <button
              onClick={() => setActiveTab('VISION')}
              className={`flex-1 pb-3 text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all border-b-2 ${
                activeTab === 'VISION'
                  ? 'border-purple-500 text-white font-black'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              📷 Scan
            </button>
          )}
          {tabs.includes('VIDEO') && (
            <button
              onClick={() => setActiveTab('VIDEO')}
              className={`flex-1 pb-3 text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all border-b-2 ${
                activeTab === 'VIDEO'
                  ? 'border-purple-500 text-white font-black'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              📹 Live Assist
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="pb-3 text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all border-b-2 border-transparent text-rose-500 hover:text-rose-400 pl-1"
            >
              ✕ Close
            </button>
          )}
        </div>
      )}

      {/* TAB 1: SPEECH DISPATCH */}
      {activeTab === 'SPEECH' && (
        <div className="flex flex-col items-center text-center gap-5 animate-fadeIn">
          <div>
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-wider">
              AI Voice Dispatcher
            </h3>
            <p className="text-zinc-400 text-xs px-4">
              Describe your emergency. Our AI will analyze category and hazard flags, prescribe pre-arrival steps, and dispatch responders.
            </p>
          </div>

          <div className="relative flex items-center justify-center my-2">
            {internalState === 'LISTENING' && (
              <div className="absolute inset-0 rounded-full bg-rose-500/10 animate-ping-slow scale-150" />
            )}
            
            <button
              onClick={handleMicClick}
              disabled={disabled || internalState === 'FETCHING_TOKEN' || internalState === 'PROCESSING'}
              className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 shadow-lg ${
                disabled
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
                  : internalState === 'LISTENING'
                  ? 'bg-rose-500 text-white animate-pulse-ring'
                  : 'bg-gradient-to-tr from-purple-950 to-purple-700 hover:from-purple-900 hover:to-purple-600 text-purple-200 hover:scale-105 border border-purple-500/30'
              }`}
            >
              {isDemoMode ? (
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-center">{getStatusBadge()}</div>

            {errorMessage && (
              <p className="text-xs text-orange-400 bg-orange-500/5 border border-orange-500/10 rounded-lg p-2 font-mono">
                {errorMessage}
              </p>
            )}

            {transcript && (
              <div className="mt-2 text-left bg-zinc-950/60 border border-zinc-800 rounded-lg p-4 font-mono text-sm leading-relaxed max-h-32 overflow-y-auto">
                <span className="text-purple-400 font-semibold block mb-1">TRANSCRIBED IN REAL-TIME:</span>
                <span className="text-white">"{transcript}"</span>
              </div>
            )}

            {isDemoMode && (
              <form onSubmit={handleDemoSubmit} className="mt-4 flex flex-col gap-2 text-left border-t border-zinc-800/80 pt-4">
                <label className="block text-[10px] text-purple-400 font-bold uppercase tracking-wider font-mono">
                  💬 SIMULATED VOICE SPEECH INPUT:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={demoText}
                    onChange={(e) => setDemoText(e.target.value)}
                    disabled={disabled || internalState === 'PROCESSING'}
                    placeholder="Type emergency text (e.g. 'pipe burst and flooding')"
                    className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs p-2.5 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-mono disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={disabled || !demoText.trim() || internalState === 'PROCESSING'}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg font-mono uppercase tracking-wider disabled:opacity-50 transition"
                  >
                    Send
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 font-sans italic mt-1 leading-normal">
                  Type keywords like "spark", "leak", "furnace", or "wall" to trigger mock categories!
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VISION DISASTER ANALYSIS */}
      {activeTab === 'VISION' && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-wider">
              Multimodal Vision Evaluator
            </h3>
            <p className="text-zinc-400 text-xs px-2">
              Upload or snap a photo of the damage. Our computer vision engine locates failure spots, scores hazard severity, and outlines safety zones.
            </p>
          </div>

          {visionErrorMessage && (
            <p className="text-xs text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 font-mono text-center">
              ⚠️ {visionErrorMessage}
            </p>
          )}

          {!selectedImage && !isVisionAnalyzing && (
            <div className="flex flex-col gap-4">
              <label
                htmlFor="vision-image-upload"
                className="w-full h-40 border-2 border-dashed border-zinc-800 hover:border-purple-500/60 bg-zinc-950/20 hover:bg-zinc-950/45 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-2.5 p-4 text-center group"
              >
                <div className="h-10 w-10 rounded-full bg-zinc-900 group-hover:bg-purple-950/30 flex items-center justify-center text-zinc-500 group-hover:text-purple-400 transition-colors">
                  📷
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-300 block mb-0.5">Click to browse or drop emergency photo</span>
                  <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-mono">PNG, JPG, WEBP (Max 5MB)</span>
                </div>
                <input
                  id="vision-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              <div className="bg-zinc-950/40 border border-zinc-800 p-4 rounded-xl flex flex-col gap-2 font-mono">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">⚙️ Simulation Case Config (For Mock Triage)</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {['PLUMBING', 'ELECTRICAL', 'HVAC', 'STRUCTURAL'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSimulateVisionType(type)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        simulateVisionType === type
                          ? 'bg-purple-950/50 border-purple-500 text-purple-300 font-black'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isVisionAnalyzing && (
            <div className="w-full py-12 flex flex-col items-center justify-center gap-4 border border-zinc-800 rounded-xl bg-zinc-950/10">
              <div className="text-3xl animate-spin text-purple-400">🌀</div>
              <div className="text-center font-mono">
                <span className="text-xs font-bold text-white uppercase block animate-pulse">Running Multimodal OCR & Vision Analysis...</span>
                <span className="text-[10px] text-zinc-500 block uppercase mt-1">Detecting boundaries & severity scores</span>
              </div>
            </div>
          )}

          {selectedImage && !visionTriageResult && !isVisionAnalyzing && (
            <div className="flex flex-col gap-4 items-center">
              <div className="relative w-full max-w-sm rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 shadow-inner flex items-center justify-center">
                <img src={selectedImage} alt="Emergency Intake" className="max-h-60 object-contain w-full" />
              </div>

              <div className="bg-zinc-950/40 border border-zinc-800 p-3 rounded-xl flex flex-col gap-2 font-mono w-full text-left">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">⚙️ Target Assessment Template</span>
                <div className="grid grid-cols-4 gap-1.5 mt-0.5">
                  {['PLUMBING', 'ELECTRICAL', 'HVAC', 'STRUCTURAL'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSimulateVisionType(type)}
                      className={`py-1 rounded text-[8px] font-bold tracking-wider border transition-all ${
                        simulateVisionType === type
                          ? 'bg-purple-950/50 border-purple-500 text-purple-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <button
                  onClick={handleVisionReset}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-wider rounded-xl transition"
                >
                  Discard
                </button>
                <button
                  onClick={handleVisionAnalyze}
                  className="flex-[2] py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  🔍 Analyze Damage
                </button>
              </div>
            </div>
          )}

          {selectedImage && visionTriageResult && !isVisionAnalyzing && (
            <div className="flex flex-col gap-5">
              <div className="relative w-full max-w-sm mx-auto rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 shadow-lg select-none">
                <img src={selectedImage} alt="Emergency Triage Overlay" className="w-full h-auto object-contain block" />
                
                {visionTriageResult.bounding_boxes?.map((box, idx) => {
                  const [ymin, xmin, ymax, xmax] = box.box_2d;
                  return (
                    <div
                      key={idx}
                      style={{
                        top: `${ymin}%`,
                        left: `${xmin}%`,
                        width: `${xmax - xmin}%`,
                        height: `${ymax - ymin}%`,
                        borderColor: box.color || '#ef4444'
                      }}
                      className="absolute border-2 border-solid rounded shadow-lg animate-pulse"
                    >
                      <span
                        style={{ backgroundColor: box.color || '#ef4444' }}
                        className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider font-mono whitespace-nowrap shadow-md"
                      >
                        🚨 {box.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3.5 font-mono text-[10px] text-left">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <div className="flex flex-col">
                    <span className="text-zinc-500 uppercase tracking-widest font-bold">incident category</span>
                    <span className="text-white text-xs font-black uppercase mt-0.5">{visionTriageResult.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 uppercase tracking-widest font-bold block">urgency</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold inline-block mt-0.5 ${
                      visionTriageResult.urgency === 'CRITICAL'
                        ? 'bg-rose-950/40 text-rose-400 border border-rose-900/40'
                        : visionTriageResult.urgency === 'HIGH'
                        ? 'bg-orange-950/40 text-orange-400 border border-orange-900/40'
                        : 'bg-blue-950/40 text-blue-400 border border-blue-900/40'
                    }`}>
                      {visionTriageResult.urgency}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-zinc-500 uppercase tracking-widest font-bold">visual severity index</span>
                    <span className="text-purple-400 font-bold text-xs">{visionTriageResult.severity}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${visionTriageResult.severity}%` }}
                      className="h-full bg-gradient-to-r from-purple-500 to-rose-500 transition-all duration-500"
                    />
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-2.5 rounded-lg text-zinc-300 font-sans text-xs leading-normal">
                  <span className="font-mono text-[9px] text-purple-400 font-bold block uppercase tracking-wider mb-1">AI VISUAL DIAGNOSIS:</span>
                  "{visionTriageResult.summary}"
                </div>

                {visionTriageResult.hazard_flags?.length > 0 && (
                  <div>
                    <span className="text-zinc-500 uppercase tracking-widest font-bold block mb-1">active hazard indicators</span>
                    <div className="flex flex-wrap gap-1.5">
                      {visionTriageResult.hazard_flags.map((flag) => (
                        <span key={flag} className="px-2 py-0.5 bg-rose-950/20 text-rose-400 border border-rose-900/30 rounded text-[9px] font-bold uppercase">
                          ⚠️ {flag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">immediate safety actions</span>
                  <ul className="flex flex-col gap-1 text-zinc-300 font-sans text-xs list-decimal pl-4 leading-relaxed font-sans">
                    {visionTriageResult.mitigation_steps?.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleVisionReset}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-wider rounded-xl transition font-mono"
                >
                  Retake / Reset
                </button>
                <button
                  onClick={handleConfirmVisionDispatch}
                  className="flex-[2] py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition font-mono flex items-center justify-center gap-1.5"
                >
                  ⚡ Confirm & Dispatch
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE VIDEO ASSIST */}
      {activeTab === 'VIDEO' && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-wider">
              Live Video Assistant
            </h3>
            <p className="text-zinc-400 text-xs px-2">
              Share your camera feed of the incident. Our AI agent will identify the damage and provide live, step-by-step guidance to help you isolate it.
            </p>
          </div>

          {videoErrorMessage && (
            <p className="text-xs text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 font-mono text-center">
              ⚠️ {videoErrorMessage}
            </p>
          )}

          {/* Video Feed Window */}
          <div className="w-full relative aspect-video border border-zinc-800 rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoActive ? 'block' : 'hidden'}`}
            />
            {!isVideoActive && (
              <div className="flex flex-col items-center gap-3 text-zinc-500 p-4 text-center">
                <span className="text-4xl animate-pulse">📹</span>
                <button
                  type="button"
                  onClick={startVideoAssist}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg font-mono"
                >
                  Start Live Assist
                </button>
              </div>
            )}

            {/* Hidden Canvas for Frame Capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Floating Live Indicator */}
            {isVideoActive && (
              <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/70 border border-zinc-800 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400 shadow-md">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>Live Feed Active</span>
              </div>
            )}

            {/* Loading Overlay */}
            {isVideoAnalyzing && (
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center">
                <div className="bg-zinc-950/90 border border-zinc-800 p-3 rounded-lg flex items-center gap-2.5 text-[9px] text-purple-400 font-mono uppercase tracking-wider shadow-lg">
                  <span className="h-3 w-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                  <span>AI Scanning Frame...</span>
                </div>
              </div>
            )}
          </div>

          {/* Feedback Textbox */}
          <div className="bg-zinc-950/40 border border-zinc-800 p-4 rounded-xl flex flex-col gap-2.5 text-left font-mono">
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">📢 AI Guidance</span>
            <p className="text-zinc-200 text-xs leading-relaxed font-sans bg-zinc-950/50 border border-zinc-900 p-3 rounded-lg">
              {videoFeedback}
            </p>
          </div>

          {/* Mitigations Checklist */}
          {videoMitigations.length > 0 && (
            <div className="bg-zinc-950/40 border border-zinc-800 p-4 rounded-xl flex flex-col gap-2.5 text-left font-mono">
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">📋 Action Checklist</span>
              <div className="flex flex-col gap-2">
                {videoMitigations.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-zinc-900/40 border border-zinc-800/80 p-2.5 rounded-lg text-zinc-300 text-xs font-mono">
                    <span className="text-purple-400 font-bold">#{idx + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active input text box */}
          {isVideoActive && (
            <div className="flex flex-col gap-2 text-left">
              <label htmlFor="video-prompt-input" className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider">Describe symptoms / respond to AI:</label>
              <div className="flex gap-2">
                <input
                  id="video-prompt-input"
                  type="text"
                  value={videoTranscript}
                  onChange={(e) => setVideoTranscript(e.target.value)}
                  placeholder="e.g. 'I turned the main pipe valve off now' or 'Water is spraying...'"
                  className="flex-1 px-3 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={stopVideoAssist}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-zinc-850 rounded-lg text-xs font-bold uppercase tracking-wider transition-all font-mono"
                >
                  Stop
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

AIWidget.propTypes = {
  onTranscription: PropTypes.func.isRequired,
  onVisionTriage: PropTypes.func,
  onFallback: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  onClose: PropTypes.func,
  triageResult: PropTypes.object
};
