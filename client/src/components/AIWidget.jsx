import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

export default function AIWidget({ onTranscription, onFallback, disabled }) {
  const [internalState, setInternalState] = useState('IDLE'); // IDLE, FETCHING_TOKEN, READY, LISTENING, PROCESSING, ERROR
  const [speechToken, setSpeechToken] = useState(null);
  const [speechRegion, setSpeechRegion] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [demoText, setDemoText] = useState('');

  const isDemoMode = speechToken === 'mock_speech_token';

  // Fetch the speech token on mount
  useEffect(() => {
    let active = true;
    const fetchToken = async () => {
      setInternalState('FETCHING_TOKEN');
      try {
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_IP;
        if (!serverUrl) {
          throw new Error("NEXT_PUBLIC_SERVER_IP is not defined in the environment.");
        }
        
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
          // Don't call fallback immediately on mount token error to allow manual route if needed,
          // but logging it keeps it clear.
        }
      }
    };

    fetchToken();
    return () => {
      active = false;
    };
  }, []);

  const handleMicClick = async () => {
    if (disabled || internalState === 'LISTENING' || internalState === 'PROCESSING') return;

    if (isDemoMode) {
      setErrorMessage("Azure Speech keys are missing. Standard microphone input is disabled. Please use the simulated input box below.");
      return;
    }

    setInternalState('LISTENING');
    setTranscript('');
    setErrorMessage('');

    let recognizer;

    try {
      // 1. Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Load SDK dynamically to prevent Next.js SSR error
      const SpeechSDK = await import('microsoft-cognitiveservices-speech-sdk');

      // Use stored speechToken or retrieve it dynamically if expired/missing
      let currentToken = speechToken;
      let currentRegion = speechRegion;

      if (!currentToken) {
        setInternalState('FETCHING_TOKEN');
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_IP;
        const tokenRes = await axios.get(`${serverUrl}/api/ai/speech-token`);
        currentToken = tokenRes.data.token;
        currentRegion = tokenRes.data.region;
        setSpeechToken(currentToken);
        setSpeechRegion(currentRegion);
      }

      setInternalState('LISTENING');

      // 2. Create SpeechConfig
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(currentToken, currentRegion);
      
      // 3. Set recognition language
      speechConfig.speechRecognitionLanguage = 'en-US';

      // 4. Create AudioConfig
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

      // 5. Create SpeechRecognizer
      recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      // 6. Call recognizeOnceAsync
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
          console.error("Recognizer error callback:", err);
          handleRecognitionFailure(err.message || "Speech SDK error occurred.");
          if (recognizer) recognizer.close();
        }
      );

    } catch (err) {
      console.error("Mic initialization failed:", err);
      handleRecognitionFailure(err.message || "Failed to initialize microphone.");
      if (recognizer) recognizer.close();
    }
  };

  const handleRecognitionFailure = (reason) => {
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setErrorMessage(reason);
    setInternalState('ERROR');

    // Trigger fallback system if speech fails twice and we aren't in offline demo mode
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

  // Status indicators configuration
  const getStatusBadge = () => {
    switch (internalState) {
      case 'FETCHING_TOKEN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800 animate-pulse">AUTHORIZING SPEECH SDK...</span>;
      case 'READY':
        return isDemoMode ? (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-400 border border-indigo-900">OFFLINE DEMO MODE ACTIVE</span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-900">SYSTEM SECURED & READY</span>
        );
      case 'LISTENING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-900 animate-pulse">🔴 TRANSMITTING AUDIO...</span>;
      case 'PROCESSING':
        return isDemoMode ? (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-900 animate-pulse">🤖 SIMULATING TRIAGE ASSESSMENT...</span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-900 animate-pulse">🤖 ANALYZING SPEECH WITH GPT-4o...</span>
        );
      case 'ERROR':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-900">⚠️ COMMS ERROR (ATTEMPT {attempts}/2)</span>;
      case 'IDLE':
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-950 text-slate-400 border border-slate-900">INITIALIZING DISPATCH PIPELINE</span>;
    }
  };

  return (
    <div className="w-full bg-panel-slate border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col items-center text-center backdrop-blur-sm gap-5">
      <div>
        <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-wider">
          AI Voice Dispatcher
        </h3>
        <p className="text-gray-400 text-xs px-4">
          Click the mic and describe your home emergency. Our AI will analyze the risk, suggest immediate actions, and dispatch the closest tech.
        </p>
      </div>

      {/* Pulsing button container */}
      <div className="relative flex items-center justify-center my-4">
        {internalState === 'LISTENING' && (
          <div className="absolute inset-0 rounded-full bg-emergency-red/20 animate-ping-slow scale-150" />
        )}
        
        <button
          onClick={handleMicClick}
          disabled={disabled || internalState === 'FETCHING_TOKEN' || internalState === 'PROCESSING'}
          className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 shadow-lg ${
            disabled
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : internalState === 'LISTENING'
              ? 'bg-emergency-red text-white animate-pulse-ring'
              : isDemoMode
              ? 'bg-gradient-to-tr from-indigo-950 to-indigo-700 hover:from-indigo-900 hover:to-indigo-600 text-indigo-300 hover:scale-105 border border-indigo-500/30'
              : 'bg-gradient-to-tr from-red-950 to-red-600 hover:from-red-900 hover:to-red-500 text-white hover:scale-105 border border-red-500/30'
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

      {/* State Info */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-center">{getStatusBadge()}</div>

        {errorMessage && (
          <p className="text-xs text-warning-amber bg-warning-amber/5 border border-warning-amber/10 rounded-lg p-2 font-mono">
            {errorMessage}
          </p>
        )}

        {transcript && (
          <div className="mt-2 text-left bg-command-navy/55 border border-slate-800/80 rounded-lg p-4 font-mono text-sm leading-relaxed max-h-32 overflow-y-auto">
            <span className="text-accent-cyan font-semibold block mb-1">TRANSCRIBED IN REAL-TIME:</span>
            <span className="text-white">"{transcript}"</span>
          </div>
        )}

        {/* Beautiful Demo input simulator */}
        {isDemoMode && (
          <form onSubmit={handleDemoSubmit} className="mt-4 flex flex-col gap-2 text-left animate-fadeIn border-t border-slate-800/80 pt-4">
            <label className="block text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-mono">
              💬 SIMULATED VOICE SPEECH INPUT:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={demoText}
                onChange={(e) => setDemoText(e.target.value)}
                disabled={disabled || internalState === 'PROCESSING'}
                placeholder="Type emergency text (e.g. 'pipe burst and flooding')"
                className="flex-1 rounded-lg bg-command-navy border border-slate-800 text-white placeholder-gray-500 text-xs p-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={disabled || !demoText.trim() || internalState === 'PROCESSING'}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg font-mono uppercase tracking-wider disabled:opacity-50 transition"
              >
                Send
              </button>
            </div>
            <p className="text-[10px] text-gray-500 font-sans italic mt-1 leading-normal">
              Type keywords like "spark", "leak", "furnace", or "wall" to trigger respective categories!
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

AIWidget.propTypes = {
  onTranscription: PropTypes.func.isRequired,
  onFallback: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};
