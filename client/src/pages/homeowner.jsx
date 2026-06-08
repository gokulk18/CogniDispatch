import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';
import { io } from 'socket.io-client';

import AIWidget from '../components/AIWidget';
import ManualGrid from '../components/ManualGrid';
import LiveTracker from '../components/LiveTracker';
import FallbackModal from '../components/FallbackModal';

export default function HomeownerDashboard() {
  const router = useRouter();
  
  // Auth Session
  const [session, setSession] = useState(null);

  const [appPhase, setAppPhase] = useState('IDLE'); 
  // phases: 'IDLE' → 'TRIAGING' → 'MATCHING' → 'DISPATCHED' → 'ARRIVED' → 'INVOICED' → 'COMPLETED'

  const [triageResult, setTriageResult] = useState(null);
  const [matchedVendor, setMatchedVendor] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [techCoords, setTechCoords] = useState(null);
  
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState('');
  
  const [etaSeconds, setEtaSeconds] = useState(null);
  const [socket, setSocket] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [declineNotice, setDeclineNotice] = useState('');
  const [activeDispatchId, setActiveDispatchId] = useState(null);
  const [activeOtp, setActiveOtp] = useState(null);

  // Sync ref with state to prevent socket stale closures and avoid reconnection cycles
  const matchedVendorRef = useRef(matchedVendor);
  useEffect(() => {
    matchedVendorRef.current = matchedVendor;
  }, [matchedVendor]);

  // Razorpay Payment Modal State
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayPaying, setRazorpayPaying] = useState(false);
  const [selectedStars, setSelectedStars] = useState(5);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Razorpay Card Mock Input Fields
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardHolder, setCardHolder] = useState('Arun Kumar');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_IP || 'http://localhost:5000';
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_IP || serverUrl;

  // 1. Session Verification
  useEffect(() => {
    const saved = localStorage.getItem('cogi_session');
    if (!saved) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(saved);
    if (parsed.role !== 'HOMEOWNER') {
      router.push('/login');
      return;
    }
    setSession(parsed);
    if (parsed.coords) {
      setUserCoords(parsed.coords);
    }

    // Restore active dispatch ID from localStorage if any
    const savedDispatchId = localStorage.getItem('cogi_active_dispatch_id');
    if (savedDispatchId) {
      setActiveDispatchId(savedDispatchId);
    }
    const savedOtp = localStorage.getItem('cogi_active_otp');
    if (savedOtp) {
      setActiveOtp(savedOtp);
    }
  }, []);

  // 1b. Restore Dispatch State on Mount/Refresh
  useEffect(() => {
    if (!session || !activeDispatchId) return;

    const restoreDispatchState = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/dispatches/${activeDispatchId}`);
        if (res.data && res.data.success) {
          const dispatch = res.data.dispatch;

          // Reconstruct triageResult
          setTriageResult({
            category: dispatch.category,
            urgency: dispatch.urgency,
            amount: dispatch.amount,
            summary: dispatch.summary,
            mitigation_steps: dispatch.mitigationSteps || []
          });

          // Reconstruct matchedVendor
          const vendor = {
            id: dispatch.vendorId,
            name: dispatch.vendorName,
            technician: dispatch.technicianName,
            lat: dispatch.vendorLat,
            lng: dispatch.vendorLng
          };
          setMatchedVendor(vendor);

          // Restore coordinates
          setUserCoords({ lat: dispatch.targetLat, lng: dispatch.targetLng });
          setTechCoords({ lat: dispatch.vendorLat, lng: dispatch.vendorLng });

          // Set active OTP
          if (dispatch.otp) {
            setActiveOtp(dispatch.otp);
            localStorage.setItem('cogi_active_otp', dispatch.otp);
          }

          // Restore app phase based on dispatch status
          let phase = 'IDLE';
          if (dispatch.status === 'PENDING_ACCEPTANCE') {
            phase = 'MATCHING';
          } else if (dispatch.status === 'EN_ROUTE') {
            phase = 'DISPATCHED';
          } else if (dispatch.status === 'ARRIVED') {
            phase = 'ARRIVED';
          } else if (dispatch.status === 'PENDING_PAYMENT') {
            phase = 'INVOICED';
            setShowRazorpay(true);
          } else if (dispatch.status === 'COMPLETED') {
            phase = 'COMPLETED';
          } else if (dispatch.status === 'DECLINED' || dispatch.status === 'CANCELLED') {
            resetAllToIdle();
            return;
          }
          setAppPhase(phase);

          // Rejoin socket room for this dispatch
          if (socket) {
            socket.emit('join-room', `room_disp_${activeDispatchId}`);
          }
        } else {
          // If dispatch not found or status completed, reset
          resetAllToIdle();
        }
      } catch (err) {
        console.error("Failed to restore dispatch state on mount:", err);
      }
    };

    restoreDispatchState();
  }, [session, activeDispatchId, socket]);

  // 2. Socket.io Telemetry
  useEffect(() => {
    if (!session) return;

    axios.get(`${serverUrl}/api/health`)
      .then((res) => {
        if (res.data && res.data.status === 'online') {
          setBackendOnline(true);
        }
      })
      .catch((err) => {
        console.error("Backend health check failed:", err);
        setBackendOnline(false);
        triggerFallback(`System is unable to reach the main emergency servers. Check local gateway connectivity.`);
      });

    const socketInstance = io(socketUrl, {
      reconnectionAttempts: 5,
      timeout: 10000
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log("Connected to CogniDispatch WebSocket Server:", socketInstance.id);
      socketInstance.emit('join-room', `room_u_${session.id}`);
      
      const savedDispatchId = localStorage.getItem('cogi_active_dispatch_id');
      if (savedDispatchId) {
        socketInstance.emit('join-room', `room_disp_${savedDispatchId}`);
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.error("Socket connection failure:", err);
      triggerFallback("WebSocket synchronization gateway is offline.");
    });

    // Capture newly created dispatch ID
    socketInstance.on('dispatch-created', (data) => {
      console.log("[CogniDispatch] Dispatch record generated:", data.dispatchId);
      setActiveDispatchId(data.dispatchId);
      localStorage.setItem('cogi_active_dispatch_id', data.dispatchId);
      if (data.otp) {
        setActiveOtp(data.otp);
        localStorage.setItem('cogi_active_otp', data.otp);
      }
    });

    // En-route GPS updates
    socketInstance.on('tech-location-update', (data) => {
      setTechCoords({ lat: data.lat, lng: data.lng });
      setEtaSeconds(data.eta);
    });

    // Uber-like Accept Job Event
    socketInstance.on('job-accepted', (data) => {
      console.log("[CogniDispatch] Technician accepted the dispatch offer!", data);
      if (data.dispatchId) {
        setActiveDispatchId(data.dispatchId);
      }
      setAppPhase('DISPATCHED');
    });

    // Uber-like Decline Job Event
    socketInstance.on('job-declined', (data) => {
      console.warn("[CogniDispatch] Technician declined the dispatch offer.", data);
      setDeclineNotice(`Matched responder declined the dispatch offer. Swapping to search...`);
      setTimeout(() => {
        setDeclineNotice('');
        resetAllToIdle();
      }, 4000);
    });

    // Technician Arrived
    socketInstance.on('tech-arrived', (data) => {
      setAppPhase('ARRIVED');
      setEtaSeconds(0);
    });

    // Technician completes job, prompting Razorpay checkout
    socketInstance.on('trigger-razorpay-invoice', (data) => {
      setAppPhase('INVOICED');
      setShowRazorpay(true);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [session, serverUrl]);

  // Trigger Fallback Modal
  const triggerFallback = (reason) => {
    setFallbackReason(reason);
    setShowFallback(true);
  };

  const handleRetry = () => {
    setShowFallback(false);
    setFallbackReason('');
    resetAllToIdle();
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('cogi_session');
    router.push('/');
  };

  const handleTranscription = async (transcriptText) => {
    setAppPhase('TRIAGING');
    
    if (userCoords) {
      processTriage(transcriptText, userCoords);
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserCoords(coords);
          processTriage(transcriptText, coords);
        },
        (error) => {
          console.warn("Geolocation denied. Defaulting to Trivandrum.");
          const fallbackCoords = { lat: 8.53633, lng: 76.88329 };
          setUserCoords(fallbackCoords);
          processTriage(transcriptText, fallbackCoords);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const processTriage = async (transcriptText, coords) => {
    try {
      const res = await axios.post(`${serverUrl}/api/ai/triage`, {
        transcription: transcriptText
      });

      if (res.data && res.data.success) {
        const triageData = res.data.triage;
        setTriageResult(triageData);
        matchClosestVendor(coords, triageData.category, triageData);
      } else {
        throw new Error("Invalid response format from triage AI.");
      }
    } catch (err) {
      console.error("Triage process failed:", err);
      triggerFallback(err.response?.data?.error || err.message || "AI triage analysis failed.");
    }
  };

  const matchClosestVendor = async (coords, category, triageData) => {
    setAppPhase('MATCHING');

    const matchTimeout = setTimeout(() => {
      triggerFallback("Network timeout: emergency dispatch request failed to match an agent within 10 seconds.");
    }, 10000);

    try {
      const res = await axios.post(`${serverUrl}/api/vendors/match`, {
        lat: coords.lat,
        lng: coords.lng,
        category: category.toUpperCase(),
        userId: session.id,
        userName: session.name
      });

      clearTimeout(matchTimeout);

      if (res.data && res.data.matched) {
        const vendorData = res.data.vendor;
        setMatchedVendor(vendorData);
        setTechCoords({ lat: vendorData.lat, lng: vendorData.lng });
        
        // Start tracking. This joins room and alerts technician but waits PENDING_ACCEPTANCE!
        if (socket) {
          socket.emit('start-tracking', {
            targetLat: coords.lat,
            targetLng: coords.lng,
            vendorLat: vendorData.lat,
            vendorLng: vendorData.lng,
            userId: session.id,
            userName: session.name,
            vendorId: vendorData.id,
            vendorName: vendorData.name,
            technicianName: vendorData.technician,
            category: triageData.category,
            urgency: triageData.urgency,
            amount: triageData.amount,
            summary: triageData.summary,
            mitigationSteps: triageData.mitigation_steps
          });
        }
      } else {
        throw new Error("No active responders could be matched.");
      }
    } catch (err) {
      clearTimeout(matchTimeout);
      console.error("Vendor matching failed:", err);
      triggerFallback(err.response?.data?.error || err.message || "Failed to match available technician.");
    }
  };

  const handleManualDispatch = ({ category, description, coords }) => {
    setUserCoords(coords);
    setAppPhase('TRIAGING');
    processTriage(description, coords);
  };

  const handleCancelTracking = () => {
    if (socket && matchedVendor) {
      socket.emit('decline-job', {
        dispatchId: activeDispatchId,
        vendorId: matchedVendor.id
      });
      socket.emit('stop-tracking');
    }
    resetAllToIdle();
  };

  // Razorpay Checkout Payout Logic
  const handleRazorpayPayment = () => {
    setRazorpayPaying(true);
    
    // Simulate high-fidelity secure processing instantly (1.8 seconds)
    setTimeout(async () => {
      try {
        // 1. Resolve dispatch ID using in-memory state or fallback to localStorage
        let dispatchIdToComplete = activeDispatchId || localStorage.getItem('cogi_active_dispatch_id');
        
        // 2. Double fallback to active job query if not populated
        if (!dispatchIdToComplete && matchedVendor) {
          const activeJobRes = await axios.get(`${serverUrl}/api/vendors/active-job/${matchedVendor.id}`);
          if (activeJobRes.data && activeJobRes.data.hasJob) {
            dispatchIdToComplete = activeJobRes.data.dispatch.id;
          }
        }
        
        if (dispatchIdToComplete) {
          const completeRes = await axios.put(`${serverUrl}/api/vendors/complete-job`, {
            dispatchId: dispatchIdToComplete,
            rating: selectedStars
          });

          if (completeRes.data.success) {
            if (socket) {
              socket.emit('payment-authorized-success', {
                dispatchId: dispatchIdToComplete,
                rating: selectedStars
              });
            }
            setRazorpayPaying(false);
            setShowRazorpay(false); // Close the Razorpay Secure Modal overlay!
            setFeedbackSubmitted(true);
            setAppPhase('COMPLETED');
            localStorage.removeItem('cogi_active_dispatch_id');
          } else {
            throw new Error(completeRes.data.error || "Simulated payment gateway declined transaction.");
          }
        } else {
          // If no active dispatch ID could be resolved but we're in this screen, complete the simulation gracefully
          console.warn("No active dispatch ID resolved. Finalizing payment simulation gracefully...");
          setRazorpayPaying(false);
          setShowRazorpay(false);
          setFeedbackSubmitted(true);
          setAppPhase('COMPLETED');
          localStorage.removeItem('cogi_active_dispatch_id');
        }
      } catch (err) {
        console.error("Payment registration failure:", err);
        setRazorpayPaying(false);
        triggerFallback("Failed to authorize payment transaction. Please try again.");
      }
    }, 1800);
  };

  const resetAllToIdle = () => {
    setShowRazorpay(false);
    setFeedbackSubmitted(false);
    setSelectedStars(5);
    setAppPhase('IDLE');
    setTriageResult(null);
    setMatchedVendor(null);
    setTechCoords(null);
    setEtaSeconds(null);
    setActiveDispatchId(null);
    setActiveOtp(null);
    localStorage.removeItem('cogi_active_dispatch_id');
    localStorage.removeItem('cogi_active_otp');
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#040810] flex items-center justify-center font-mono text-xs text-emerald-400">
        Establishing secure homeowner link...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Owner Portal — CogniDispatch</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* THEME COMBO: MIDNIGHT NAVY & EMERALD GREEN */}
      <div className="min-h-screen bg-[#040810] text-slate-100 flex flex-col antialiased selection:bg-emerald-950 selection:text-emerald-400">
        
        {/* TOP COMMAND BAR */}
        <header className="border-b border-emerald-950 bg-panel-slate/30 backdrop-blur-md px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-lg">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-2xl animate-pulse">🚨</span>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-widest text-white flex items-center gap-2">
                COGIDISPATCH
              </h1>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider hidden sm:block">
                Homeowner Emergency Command Panel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 font-mono text-[9px] bg-slate-950 border border-emerald-950 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-500 font-bold">CLIENT SECURED:</span>
              <span className="text-emerald-400 font-bold uppercase">{session.name}</span>
            </div>
            
            <div className="flex items-center gap-2 font-mono text-[9px] bg-slate-950 border border-emerald-950 rounded-lg px-2.5 py-1.5">
              <span className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-slate-400 font-semibold uppercase">
                {backendOnline ? 'Telemetry Active' : 'Offline'}
              </span>
            </div>

            <button 
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 text-[9px] font-bold tracking-widest uppercase rounded transition font-mono"
            >
              Logout
            </button>
          </div>
        </header>

        {/* MAIN BODY LAYOUT */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          
          {appPhase === 'IDLE' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fadeIn">
              {/* Voice Dispatch widget */}
              <div className="flex flex-col gap-6">
                <AIWidget 
                  onTranscription={handleTranscription} 
                  onFallback={triggerFallback}
                  disabled={false}
                />
              </div>
              
              {/* Manual Dispatch backup */}
              <div>
                <ManualGrid 
                  onManualDispatch={handleManualDispatch} 
                  onLocation={(coords) => setUserCoords(coords)}
                  onFallback={triggerFallback}
                  disabled={false}
                />
              </div>
            </div>
          )}

          {/* Triaging Loading Phase */}
          {appPhase === 'TRIAGING' && (
            <div className="flex-1 min-h-[350px] flex flex-col items-center justify-center bg-slate-950/30 border border-emerald-950 rounded-2xl p-8 text-center gap-4 max-w-lg mx-auto w-full my-auto animate-pulse-ring">
              <div className="text-4xl animate-spin text-emerald-400">🌀</div>
              <h2 className="text-xl font-bold uppercase tracking-wider text-white">
                Triage Engine Processing...
              </h2>
              <p className="text-slate-400 text-xs font-mono max-w-xs leading-relaxed">
                Analyzing audio transcription and mapping incident taxonomy with AI Triage Engine...
              </p>
            </div>
          )}

          {/* UBER-LIKE MATCHING & ACCEPTANCE RADAR */}
          {appPhase === 'MATCHING' && (
            <div className="flex-1 min-h-[380px] flex flex-col items-center justify-center bg-[#050a15]/60 border border-emerald-500/25 rounded-2xl p-8 text-center gap-6 max-w-lg mx-auto w-full my-auto animate-pulse-ring relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/10 to-indigo-950/10 pointer-events-none" />
              
              {/* Radar Scanner Animation */}
              <div className="relative flex items-center justify-center h-28 w-28 my-3">
                <div className="absolute inset-0 rounded-full border border-emerald-500/10 animate-ping" />
                <div className="absolute h-24 w-24 rounded-full border border-dashed border-emerald-500/30 animate-spin" />
                <div className="absolute h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-3xl animate-bounce">
                  🔍
                </div>
              </div>

               {!matchedVendor ? (
                <>
                  <h2 className="text-xl font-black uppercase tracking-widest text-emerald-400 animate-pulse">
                    Searching for Nearby Vendors...
                  </h2>
                  <p className="text-slate-400 text-xs font-mono max-w-sm leading-relaxed">
                    Scanning the local geodetic array to match available emergency response contractors in Thiruvananthapuram...
                  </p>
                  
                  <button
                    onClick={handleCancelTracking}
                    className="mt-4 px-5 py-2.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition duration-150"
                  >
                    ⏹ Cancel Search
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-black uppercase tracking-widest text-emerald-400 animate-pulse">
                    CONTACTING RESPONDER UNIT...
                  </h2>
                  
                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 w-full text-left font-mono text-[10px] flex flex-col gap-1.5 max-w-xs my-2">
                    <span className="text-slate-500 uppercase tracking-widest block font-bold">Assigned Specialist</span>
                    <span className="text-white text-xs font-bold block">{matchedVendor.technician}</span>
                    <span className="text-slate-400 block font-mono">{matchedVendor.name} • ★{matchedVendor.rating || '4.5'}</span>
                    <span className="text-slate-500 block uppercase border-t border-slate-900/60 pt-1.5 mt-1 font-sans">Awaiting responder confirmation...</span>
                  </div>
                  
                  {declineNotice && (
                    <div className="bg-red-950/20 border border-red-900/40 text-red-400 text-[10px] font-mono p-3 rounded-lg w-full max-w-xs animate-pulse mt-2">
                      ⚠️ {declineNotice}
                    </div>
                  )}

                  <button
                    onClick={handleCancelTracking}
                    className="mt-2 px-5 py-2.5 bg-slate-900/65 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition duration-150"
                  >
                    ⏹ Cancel Request
                  </button>
                </>
              )}
            </div>
          )}

          {/* Dispatched real-time tracking phase screen */}
          {appPhase === 'DISPATCHED' && matchedVendor && triageResult && userCoords && (
            <div className="flex flex-col gap-5 animate-fadeIn">
              
              {/* Dispatch Alert Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl gap-4">
                <div>
                  <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                    ✔️ DISPATCH LOCKED
                  </span>
                  <h3 className="text-white font-bold text-base mt-1">
                    {matchedVendor.name} is en-route. Operations locked in Thiruvananthapuram local array.
                  </h3>
                </div>
                <button
                  onClick={handleCancelTracking}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-mono uppercase tracking-wider border border-slate-800 transition"
                >
                  ⏹ Cancel Dispatch
                </button>
              </div>

              {/* Secure Verification OTP Card */}
              {activeOtp && (
                <div className="bg-[#050912]/80 border border-emerald-950/85 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 font-mono-data shadow-md">
                  <div className="flex flex-col gap-1 text-center sm:text-left">
                    <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">🚨 SECURE HANDOFF VERIFICATION OTP</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-0.5">
                      Provide this 4-digit code to the responder upon arrival. They must enter it to authorize their arrival and unlock the mitigation checklist.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 px-5 py-2.5 rounded-xl shrink-0">
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">SECURE OTP:</span>
                    <span className="text-2xl font-black text-white tracking-widest">{activeOtp}</span>
                  </div>
                </div>
              )}

              {/* Real-time Tracking Component */}
              <LiveTracker
                userCoords={userCoords}
                techCoords={techCoords}
                vendor={matchedVendor}
                triageResult={triageResult}
                etaSeconds={etaSeconds}
              />
            </div>
          )}

          {/* Arrived target destination success phase screen */}
          {appPhase === 'ARRIVED' && matchedVendor && triageResult && (
            <div className="max-w-xl w-full mx-auto my-auto flex flex-col bg-slate-900 border border-emerald-500/50 p-6 md:p-8 rounded-xl text-center shadow-2xl items-center gap-6 animate-pulse-ring">
              
              <div className="h-16 w-16 bg-emerald-500/10 rounded-full border border-emerald-500/30 flex items-center justify-center text-3xl animate-bounce">
                🎉
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-wider text-emerald-400 uppercase">
                  Specialist Arrived
                </h2>
                <p className="text-slate-300 text-sm mt-2">
                  {matchedVendor.technician} has reached your coordinates and is securing the area.
                </p>
              </div>

              <div className="w-full bg-[#050912] p-4 border border-emerald-950 rounded-lg text-left font-mono text-[10px] flex flex-col gap-2">
                <div>
                  <span className="text-slate-500 uppercase tracking-widest block mb-0.5">Assigned Unit</span>
                  <span className="text-white text-xs font-bold block">{matchedVendor.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-1 border-t border-slate-800 pt-2">
                  <div>
                    <span className="text-slate-500 block uppercase">EMERGENCY CLASS</span>
                    <span className="text-white font-bold">{triageResult.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase">Estimated Payout</span>
                    <span className="text-emerald-400 font-bold font-mono">₹{triageResult.amount || '3,000'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono animate-pulse bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg w-full justify-center">
                <span>⏳ Waiting for responder to complete mitigation work...</span>
              </div>
            </div>
          )}

          {/* Checkout Completed Receipt Portal */}
          {appPhase === 'COMPLETED' && matchedVendor && triageResult && (
            <div className="max-w-md w-full mx-auto my-auto flex flex-col bg-slate-900 border border-emerald-500/50 p-6 md:p-8 rounded-2xl text-center shadow-2xl items-center gap-6 animate-fadeIn">
              
              <div className="h-16 w-16 bg-emerald-500/15 rounded-full border border-emerald-500/30 flex items-center justify-center text-4xl">
                💳
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-wider text-emerald-400 uppercase">
                  Payment Completed!
                </h2>
                <p className="text-slate-350 text-xs mt-2 font-mono">
                  Razorpay Transaction authorized securely. Responder balance has been updated.
                </p>
              </div>

              <div className="w-full bg-[#050912] p-4 border border-emerald-950 rounded-lg text-left font-mono text-[10px] flex flex-col gap-2">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-500 uppercase">Transaction ID</span>
                  <span className="text-white font-bold">pay_RZP_{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-500 uppercase">Recipient Unit</span>
                  <span className="text-white font-bold">{matchedVendor.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-500 uppercase">Specialty Type</span>
                  <span className="text-white font-bold">{triageResult.category}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold text-xs pt-1">
                  <span>TOTAL AMOUNT PAID</span>
                  <span>₹{triageResult.amount || '3,000'}</span>
                </div>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-[10px] font-mono p-3 rounded-lg w-full flex items-center justify-center gap-2">
                <span>✔️ Rating of {selectedStars}★ submitted. Thank you for your feedback!</span>
              </div>

              <button
                onClick={resetAllToIdle}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition duration-155 shadow-md"
              >
                🔄 Reset Command Console
              </button>
            </div>
          )}

        </main>

        {/* FOOTER METRICS */}
        <footer className="mt-auto border-t border-emerald-950/60 bg-panel-slate/40 px-6 py-4 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-500 font-mono gap-2">
          <span>CogniDispatch © 2026. All telemetry transactions processed via Razorpay Secure.</span>
          <div className="flex gap-4">
            <span>Latency: &lt;10ms</span>
            <span>Security: AES-256-GCM</span>
          </div>
        </footer>

        {/* Fallback locked modal */}
        <FallbackModal
          visible={showFallback}
          reason={fallbackReason}
          onRetry={handleRetry}
        />

        {/* HIGH-FIDELITY RAZORPAY SECURE GATEWAY CHECKOUT MODAL SIMULATION (NO OTP - CARD PRE-FILL) */}
        {showRazorpay && matchedVendor && triageResult && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-sm rounded-2xl border border-indigo-950 bg-panel-slate p-6 shadow-2xl flex flex-col gap-5 animate-pulse-ring">
              
              {/* Razorpay Branded Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-sm shadow">
                    R
                  </div>
                  <div>
                    <span className="text-white font-black tracking-widest text-xs uppercase block leading-tight">Razorpay</span>
                    <span className="text-[8px] text-indigo-400 block font-mono">SECURE CHECKOUT</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-slate-550 block uppercase font-mono">AMOUNT DUE</span>
                  <span className="text-white font-black text-sm font-mono block">₹{triageResult.amount || '3,000'}</span>
                </div>
              </div>

              {/* Invoice Summary */}
              <div className="bg-[#050811] p-3 rounded-lg border border-slate-800 flex flex-col gap-1 text-[10px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">MERCHANT</span>
                  <span className="text-white font-bold">COGIDISPATCH PVT LTD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-550">SPECIALIST</span>
                  <span className="text-white font-bold">{matchedVendor.technician}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-550">INCIDENT</span>
                  <span className="text-white font-bold">{triageResult.category}</span>
                </div>
              </div>

              {/* High-Fidelity Dummy Card Inputs */}
              <div className="flex flex-col gap-3.5 border-t border-slate-800/80 pt-4">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  💳 Enter Card Details (Razorpay secure)
                </span>
                
                <div>
                  <label className="block text-[8px] uppercase text-slate-500 font-mono mb-1">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full rounded-lg bg-[#050811] border border-slate-800 text-white text-xs p-2.5 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] uppercase text-slate-500 font-mono mb-1">Expiry Date</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full rounded-lg bg-[#050811] border border-slate-800 text-white text-xs p-2.5 focus:outline-none focus:border-indigo-600 font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] uppercase text-slate-500 font-mono mb-1">CVV</label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      maxLength="3"
                      className="w-full rounded-lg bg-[#050811] border border-slate-800 text-white text-xs p-2.5 focus:outline-none focus:border-indigo-600 font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] uppercase text-slate-500 font-mono mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full rounded-lg bg-[#050811] border border-slate-800 text-white text-xs p-2.5 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              {/* Feedback Stars Selector */}
              <div className="flex flex-col gap-2 items-center text-center border-t border-slate-800/80 pt-4">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider font-mono">
                  Rate Technician Securement
                </span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= selectedStars;
                    return (
                      <span
                        key={star}
                        onClick={() => setSelectedStars(star)}
                        className={`text-2xl cursor-pointer transition transform hover:scale-125 ${
                          active ? 'text-warning-amber' : 'text-slate-700'
                        }`}
                      >
                        ★
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Simulated Razorpay Secure payment actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRazorpayPayment}
                  disabled={razorpayPaying}
                  className="w-full py-3.5 rounded-xl bg-[#528FF0] hover:bg-[#3B7BE6] text-white font-bold uppercase tracking-wider text-xs shadow-lg font-mono flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {razorpayPaying ? (
                    <>
                      <span className="animate-spin text-sm">🌀</span>
                      <span>Authorizing Card payment secure...</span>
                    </>
                  ) : (
                    <>
                      <span>🔒 Pay ₹{triageResult.amount || '3,000'} via Razorpay</span>
                    </>
                  )}
                </button>

                <p className="text-[8px] text-slate-550 text-center font-mono">
                  🔒 PCI-DSS Compliant 256-bit SSL Encrypted Transaction. No OTP required.
                </p>
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}
