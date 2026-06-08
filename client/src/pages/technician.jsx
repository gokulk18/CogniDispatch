import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';
import { io } from 'socket.io-client';
import dynamic from 'next/dynamic';

// Lazy load map with no SSR to prevent Next.js server-side window errors
const LiveTrackerMap = dynamic(() => import('../components/LiveTrackerMap'), { ssr: false });

export default function TechnicianDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [available, setAvailable] = useState(false);
  const [activeJob, setActiveJob] = useState(null); 
  const [techPhase, setTechPhase] = useState('IDLE'); // IDLE, INCOMING, EN_ROUTE, ARRIVED, WAITING_PAYMENT, COMPLETED

  const [userCoords, setUserCoords] = useState(null);
  const [techCoords, setTechCoords] = useState(null);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);

  const [socket, setSocket] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Uber-like Acceptance Offer Countdown
  const [countdown, setCountdown] = useState(30);
  const [countdownActive, setCountdownActive] = useState(false);

  // OTP Verification States
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [showOtpGate, setShowOtpGate] = useState(false);

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_IP || 'http://localhost:5000';
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_IP || serverUrl;

  // 1. Session Verification & Profile Fetch
  useEffect(() => {
    const saved = localStorage.getItem('cogi_session');
    if (!saved) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(saved);
    if (parsed.role !== 'TECHNICIAN') {
      router.push('/login');
      return;
    }
    setSession(parsed);
    fetchProfile(parsed.id);
  }, []);

  const fetchProfile = async (id) => {
    try {
      const res = await axios.get(`${serverUrl}/api/vendors/profile/${id}`);
      if (res.data && res.data.success) {
        setProfile(res.data.profile);
        setAvailable(res.data.profile.available);
        setTechCoords({ lat: res.data.profile.lat, lng: res.data.profile.lng });
      }
    } catch (err) {
      console.error("Profile fetch failed:", err);
    }
  };

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
      });

    const socketInstance = io(socketUrl, {
      reconnectionAttempts: 5,
      timeout: 10000
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log("Technician socket registered:", socketInstance.id);
      socketInstance.emit('join-room', `room_v_${session.id}`);
      checkActiveJob(session.id, socketInstance);
    });

    socketInstance.on('connect_error', (err) => {
      console.error("Socket error:", err);
    });

    // Alert for incoming emergency dispatch requests (Uber-like Offer popup)
    socketInstance.on('new-job-request', (data) => {
      console.log("New emergency dispatch offer received:", data.dispatch);
      setActiveJob(data.dispatch);
      setTechPhase('INCOMING');
      setCountdown(30);
      setCountdownActive(true);
    });

    // Real-time location updates
    socketInstance.on('tech-location-update', (data) => {
      setTechCoords({ lat: data.lat, lng: data.lng });
      setEtaSeconds(data.eta);
      setDistanceMeters(data.distanceMeters);
    });

    // Handle auto-arrival
    socketInstance.on('tech-arrived', () => {
      setTechPhase('ARRIVED');
      setEtaSeconds(0);
      setDistanceMeters(0);
    });

    // Homeowner completed payment checkout
    socketInstance.on('job-completed-success', (data) => {
      setTechPhase('COMPLETED');
      setCountdownActive(false);
      fetchProfile(session.id);
    });

    // Uber-style OTP verification verified
    socketInstance.on('otp-verified', (data) => {
      console.log("[CogniDispatch Telemetry] Secure handoff OTP verified!");
      setTechPhase('ARRIVED');
      setShowOtpGate(false);
      setOtpInput('');
      setOtpError('');
      setOtpVerifying(false);
    });

    // Uber-style OTP verification rejected
    socketInstance.on('otp-error', (data) => {
      console.error("[CogniDispatch Telemetry] OTP verification error:", data.error);
      setOtpError(data.error || "Invalid verification code.");
      setOtpVerifying(false);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [session, serverUrl]);

  // Uber-like Offer Countdown Timer
  useEffect(() => {
    let timer;
    if (countdownActive && countdown > 0 && techPhase === 'INCOMING') {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0 && countdownActive && techPhase === 'INCOMING') {
      handleDeclineJob();
    }
    return () => clearInterval(timer);
  }, [countdown, countdownActive, techPhase]);

  const checkActiveJob = async (vendorId, socketInstance) => {
    try {
      const res = await axios.get(`${serverUrl}/api/vendors/active-job/${vendorId}`);
      if (res.data && res.data.hasJob) {
        const job = res.data.dispatch;
        setActiveJob(job);
        setUserCoords({ lat: job.targetLat, lng: job.targetLng });
        setTechCoords({ lat: job.vendorLat, lng: job.vendorLng });
        
        if (job.status === 'PENDING_ACCEPTANCE') {
          setTechPhase('INCOMING');
          setCountdown(30);
          setCountdownActive(true);
        } else if (job.status === 'EN_ROUTE') {
          setTechPhase('EN_ROUTE');
          // Rejoin/re-accept to join room and ensure server-side tracking is active
          socketInstance.emit('accept-job', { dispatchId: job.id, vendorId });
        } else {
          let mappedPhase = 'IDLE';
          if (job.status === 'ARRIVED') {
            mappedPhase = 'ARRIVED';
          } else if (job.status === 'PENDING_PAYMENT') {
            mappedPhase = 'WAITING_PAYMENT';
          }
          setTechPhase(mappedPhase);
          socketInstance.emit('join-room', `room_disp_${job.id}`);
        }
      }
    } catch (err) {
      console.error("Active job query failed:", err);
    }
  };

  const handleAvailabilityToggle = async () => {
    if (techPhase !== 'IDLE') return; 
    const nextState = !available;
    setAvailable(nextState);

    try {
      await axios.put(`${serverUrl}/api/admin/vendors/${session.id}`, {
        available: nextState
      });
    } catch (err) {
      console.error("Availability push failed:", err);
    }
  };

  // Accept Dispatch Offer (Transitions to en-route, Locks busy: true)
  const handleAcceptJob = () => {
    if (!activeJob) return;
    setCountdownActive(false);
    setTechPhase('EN_ROUTE');
    setUserCoords({ lat: activeJob.targetLat, lng: activeJob.targetLng });
    
    if (socket) {
      socket.emit('accept-job', {
        dispatchId: activeJob.id,
        vendorId: session.id
      });
    }
  };

  // Decline Job Offer (Releases busy: false)
  const handleDeclineJob = () => {
    setCountdownActive(false);
    if (socket && activeJob) {
      socket.emit('decline-job', {
        dispatchId: activeJob.id,
        vendorId: session.id
      });
    }
    setActiveJob(null);
    setTechPhase('IDLE');
  };

  // Signal Arrival manually (Triggers secure OTP entry gate popup)
  const handleMarkArrived = () => {
    if (!activeJob) return;
    setOtpError('');
    setOtpInput('');
    setShowOtpGate(true); // Open the secure verification panel!
  };

  // Verify OTP handler
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (!activeJob || !otpInput.trim()) return;
    setOtpVerifying(true);
    setOtpError('');

    if (socket) {
      socket.emit('verify-otp', {
        dispatchId: activeJob.id,
        otp: otpInput.trim()
      });
    }
  };

  // Mitigation complete, trigger Razorpay Invoice on Homeowner
  const handleCompleteMitigation = () => {
    if (!activeJob) return;
    setTechPhase('WAITING_PAYMENT');

    if (socket) {
      socket.emit('technician-complete-mitigation', {
        dispatchId: activeJob.id
      });
    }
  };

  const handleResetDashboard = () => {
    setActiveJob(null);
    setTechPhase('IDLE');
    setUserCoords(null);
    setEtaSeconds(null);
    setDistanceMeters(null);
    setOtpInput('');
    setOtpError('');
    setOtpVerifying(false);
    setShowOtpGate(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('cogi_session');
    router.push('/');
  };

  if (!session || !profile) {
    return (
      <div className="min-h-screen bg-[#080706] flex items-center justify-center font-mono text-xs text-warning-amber">
        Authenticating Responder Specialist credentials...
      </div>
    );
  }

  const formatETA = (sec) => {
    if (sec === null || sec === undefined) return "--:--";
    if (sec <= 0) return "ARRIVED";
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Head>
        <title>Responder Hub — CogniDispatch</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* THEME COMBO: OBSIDIAN BLACK & HIGH-VOLTAGE AMBER */}
      <div className="min-h-screen bg-[#080706] text-slate-100 flex flex-col antialiased selection:bg-amber-950 selection:text-warning-amber">
        
        {/* HEADER */}
        <header className="border-b border-amber-950/60 bg-panel-slate/30 backdrop-blur-md px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-lg">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-2xl animate-pulse">🛠️</span>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-widest text-white flex items-center gap-2">
                COGIDISPATCH
              </h1>
              <p className="text-[10px] text-warning-amber font-bold uppercase tracking-wider hidden sm:block">
                Responder Operations Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 font-mono text-[9px] bg-slate-950 border border-amber-950 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-500 font-bold">RESPONDER:</span>
              <span className="text-warning-amber font-bold uppercase">{profile.technician}</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[9px] bg-slate-950 border border-amber-950 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-500 font-bold">RATING:</span>
              <span className="text-warning-amber font-bold">★ {profile.rating.toFixed(2)}</span>
            </div>

            <button 
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 text-[9px] font-bold tracking-widest uppercase rounded transition font-mono"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          
          {/* STATS OVERVIEW SECTION */}
          {techPhase === 'IDLE' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
              
              {/* Earnings Card */}
              <div className="bg-panel-slate/60 border border-amber-950/30 rounded-2xl p-6 shadow-xl flex flex-col gap-3 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-warning-amber/5 -mr-4 -mt-4 blur-xl" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">Responders Balance</span>
                <span className="text-3xl font-black text-warning-amber font-mono">₹{profile.balance.toLocaleString('en-IN')}</span>
                <p className="text-[10px] text-slate-400 italic font-mono">Accumulated payouts (80% share via Razorpay)</p>
              </div>

              {/* Jobs Completed Card */}
              <div className="bg-panel-slate/60 border border-amber-950/30 rounded-2xl p-6 shadow-xl flex flex-col gap-3 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-amber-500/5 -mr-4 -mt-4 blur-xl" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">Completed Operations</span>
                <span className="text-3xl font-black text-white font-mono">{profile.completed_jobs} Jobs</span>
                <p className="text-[10px] text-slate-400 italic">Total structural/mechanical triage completions</p>
              </div>

              {/* Status Operations Card */}
              <div className="bg-panel-slate/60 border border-amber-950/30 rounded-2xl p-6 shadow-xl flex flex-col gap-3 justify-between backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-warning-amber/5 -mr-4 -mt-4 blur-xl" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block mb-1">Active Duty Availability</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase border inline-block ${
                    available 
                      ? 'bg-amber-950 text-warning-amber border-amber-900/60 animate-pulse' 
                      : 'bg-slate-950 text-slate-500 border-slate-900'
                  }`}>
                    {available ? '🟢 Dispatch Available' : '🔴 Standby'}
                  </span>
                </div>
                
                <button
                  onClick={handleAvailabilityToggle}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition ${
                    available 
                      ? 'bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30' 
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md border border-amber-700/30'
                  }`}
                >
                  {available ? 'Deactivate Dispatch' : 'Go On Duty (Available)'}
                </button>
              </div>

            </div>
          )}

          {/* WAITING FOR DISPATCH RADAR */}
          {techPhase === 'IDLE' && (
            <div className="flex-1 min-h-[350px] flex flex-col items-center justify-center bg-panel-slate/20 border border-amber-950/20 rounded-2xl p-8 text-center gap-4 max-w-xl mx-auto w-full animate-fadeIn relative">
              <div className="absolute top-4 right-4 flex items-center gap-1.5 font-mono text-[9px] bg-slate-950 border border-slate-900 rounded px-2.5 py-1">
                <span className={`h-2.5 w-2.5 rounded-full ${available ? 'bg-warning-amber animate-pulse' : 'bg-slate-700'}`} />
                <span className="text-slate-400 font-bold uppercase">{available ? 'Receiving Dispatches' : 'Standby Mode'}</span>
              </div>
              <div className="text-4xl animate-bounce">📡</div>
              <h2 className="text-xl font-bold uppercase tracking-wider text-white">
                {available ? 'Waiting for Dispatch Requests...' : 'Responders Operations Inactive'}
              </h2>
              <p className="text-slate-400 text-xs font-mono max-w-sm leading-relaxed">
                {available 
                  ? 'CogniDispatch geodetic server is active. Once an emergency match maps to your coordinates, your console will ring.' 
                  : 'Toggle your status to "Available" above to register onto the active CogniDispatch geodetic array.'}
              </p>
            </div>
          )}

          {/* INCOMING EMERGENCY JOB REQUEST (Uber-like Acceptance Panel with 30s Countdown Ring) */}
          {techPhase === 'INCOMING' && activeJob && (
            <div className="max-w-lg w-full mx-auto my-auto flex flex-col bg-slate-900 border border-amber-500/50 p-6 md:p-8 rounded-2xl text-center shadow-2xl items-center gap-6 animate-pulse-ring relative overflow-hidden">
              
              {/* Countdown ring */}
              <div className="absolute top-4 right-4 h-12 w-12 rounded-full border-2 border-warning-amber/20 flex items-center justify-center font-mono font-bold text-warning-amber text-xs animate-pulse">
                {countdown}s
              </div>

              <div className="h-16 w-16 bg-amber-500/15 rounded-full border border-amber-500/30 flex items-center justify-center text-4xl animate-bounce">
                🚨
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-wider text-warning-amber uppercase animate-pulse">
                  DISPATCH OFFER RECEIVED!
                </h2>
                <p className="text-slate-300 text-xs mt-2 font-mono">
                  Incoming triage job assigned: {activeJob.category}
                </p>
              </div>

              <div className="w-full bg-[#030303] p-4 border border-amber-950/30 rounded-lg text-left font-mono text-[10px] flex flex-col gap-2">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-500 uppercase">Customer Address</span>
                  <span className="text-white font-bold">{activeJob.userName} • {activeJob.address || 'Trivandrum'}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-800 pb-1.5">
                  <span className="text-slate-500 uppercase">AI Triage Description</span>
                  <span className="text-white font-semibold italic">"{activeJob.summary}"</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-550 uppercase font-bold text-red-400">Severity Level</span>
                  <span className="text-red-400 font-bold uppercase">🚨 {activeJob.urgency}</span>
                </div>
                <div className="flex justify-between text-warning-amber font-bold text-xs pt-1">
                  <span>YOUR EARNINGS (80% PAYOUT)</span>
                  <span>₹{Math.round(activeJob.amount * 0.8).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <button
                  onClick={handleDeclineJob}
                  className="flex-1 py-3.5 bg-slate-850 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition"
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptJob}
                  className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition shadow-lg shadow-amber-950/40"
                >
                  Accept Dispatch Offer
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE DISPATCH tracking & navigation screen */}
          {(techPhase === 'EN_ROUTE' || techPhase === 'ARRIVED' || techPhase === 'WAITING_PAYMENT') && activeJob && userCoords && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              
              {/* Alert status header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl gap-4">
                <div>
                  <span className="bg-amber-500/20 border border-amber-500/40 text-warning-amber text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider animate-pulse">
                    ⚡ active response route
                  </span>
                  <h3 className="text-white font-bold text-base mt-1">
                    Emergency response lock coordinates: {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}
                  </h3>
                </div>
                
                {techPhase === 'EN_ROUTE' && (
                  <button
                    onClick={handleMarkArrived}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow transition"
                  >
                    ✔️ Signal Arrival / Secure Area
                  </button>
                )}

                {techPhase === 'ARRIVED' && (
                  <button
                    onClick={handleCompleteMitigation}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-700 to-amber-500 hover:from-amber-650 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow transition"
                  >
                    💳 Mitigation Complete & Request Payout
                  </button>
                )}

                {techPhase === 'WAITING_PAYMENT' && (
                  <div className="px-4 py-2 bg-amber-950/20 text-warning-amber border border-amber-900/30 text-xs font-mono rounded-lg animate-pulse font-bold uppercase">
                    ⏳ Awaiting Razorpay Authorization...
                  </div>
                )}
              </div>

              {/* Grid map + checklist details */}
              <div className="w-full flex flex-col xl:flex-row gap-6 bg-panel-slate/40 border border-amber-950/20 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
                
                {/* Map */}
                <div className="w-full xl:w-7/12 h-[350px] md:h-[450px] rounded-xl overflow-hidden relative">
                  <LiveTrackerMap
                    userCoords={userCoords}
                    techCoords={techCoords}
                    vendor={activeJob}
                  />
                </div>

                {/* Job Info and Mitigations checklist */}
                <div className="w-full xl:w-5/12 flex flex-col justify-between gap-5">
                  
                  {/* Stats metrics */}
                  <div className="grid grid-cols-2 gap-4 bg-[#030303] border border-amber-950/35 p-4 rounded-xl text-left font-mono">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase">Dynamic ETA</span>
                      <span className="text-xl font-bold text-white block mt-0.5">
                        {techPhase === 'EN_ROUTE' ? formatETA(etaSeconds) : 'ARRIVED'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase">Distance Left</span>
                      <span className="text-xl font-bold text-warning-amber block mt-0.5">
                        {techPhase === 'EN_ROUTE' && distanceMeters !== null ? `${(distanceMeters / 1000).toFixed(2)} km` : '0.00 km'}
                      </span>
                    </div>
                  </div>

                  {/* Customer information */}
                  <div className="bg-[#030303] border border-amber-950/35 p-4 rounded-xl flex flex-col gap-2 font-mono text-[10px]">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                      Homeowner Report Summary
                    </h4>
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-slate-500">NAME</span>
                      <span className="text-white font-bold">{activeJob.userName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-slate-500">specialty category</span>
                      <span className="text-warning-amber font-bold">{activeJob.category}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500">incident summary</span>
                      <span className="text-white italic">"{activeJob.summary}"</span>
                    </div>
                  </div>

                  {/* Mitigation check steps */}
                  <div className="bg-[#030303] border border-amber-950/35 p-4 rounded-xl flex flex-col gap-2 flex-1 max-h-[160px] overflow-y-auto">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">
                      Requested mitigation steps checklist
                    </span>
                    <div className="flex flex-col gap-1.5 mt-1 font-mono text-[9px] text-slate-300">
                      {activeJob.mitigationSteps.map((step, idx) => (
                        <div key={idx} className="flex gap-2 items-start bg-slate-950/20 p-2 border border-slate-900 rounded-lg leading-relaxed">
                          <span className="text-warning-amber font-bold">{idx + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* COMPLETED OPERATION CONGRATS SCREEN */}
          {techPhase === 'COMPLETED' && activeJob && (
            <div className="max-w-md w-full mx-auto my-auto flex flex-col bg-slate-900 border border-emerald-500/50 p-6 md:p-8 rounded-2xl text-center shadow-2xl items-center gap-6 animate-fadeIn">
              
              <div className="h-16 w-16 bg-emerald-500/15 rounded-full border border-emerald-500/30 flex items-center justify-center text-4xl">
                💰
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-wider text-emerald-400 uppercase">
                  PAYMENT DEPOSITED!
                </h2>
                <p className="text-slate-350 text-xs mt-2 font-mono">
                  Emergency operation concluded. The 80% fee payout has been processed successfully.
                </p>
              </div>

              <div className="w-full bg-[#030303] p-4 border border-slate-800 rounded-lg text-left font-mono text-[10px] flex flex-col gap-2">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-500 uppercase">Recipient Unit</span>
                  <span className="text-white font-bold">{session.agencyName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-500 uppercase">Transaction ID</span>
                  <span className="text-white font-bold">pay_RZP_{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold text-xs pt-1 border-t border-slate-800">
                  <span>DISPATCH PAYOUT DEPOSITED</span>
                  <span>₹{Math.round(activeJob.amount * 0.8).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                onClick={handleResetDashboard}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition shadow-md"
              >
                🔄 Resume Duty (Available)
              </button>
            </div>
          )}

        {/* SECURE HANDOFF OTP VERIFICATION MODAL OVERLAY */}
        {showOtpGate && activeJob && (
          <div className="fixed inset-0 bg-[#030201]/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn font-mono-data">
            <div className="w-full max-w-sm bg-[#080706] border border-amber-500/40 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative animate-pulse-ring">
              
              <button
                onClick={() => setShowOtpGate(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-350 transition text-sm font-bold uppercase font-sans border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>

              <div className="text-center flex flex-col gap-1.5">
                <span className="text-[9px] text-warning-amber font-bold tracking-widest uppercase">SECURE ARRIVAL HANDOFF</span>
                <h3 className="text-xl font-extrabold uppercase tracking-wider text-white">
                  Enter Arrival OTP
                </h3>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  Request the 4-digit verification code displayed on the homeowner's screen to unlock operations.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 text-center">
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full tracking-[1.5em] text-center rounded-xl bg-[#030201] border border-amber-950/60 text-warning-amber text-xl font-black py-4 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition placeholder-slate-800"
                  />
                </div>

                {otpError && (
                  <div className="text-[10px] text-rose-400 bg-rose-950/15 border border-rose-900/30 rounded-xl p-3 leading-relaxed flex gap-2 items-start font-sans">
                    <span>⚠️</span>
                    <span>{otpError}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOtpGate(false)}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-wider transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={otpVerifying || otpInput.length < 4}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold uppercase tracking-wider text-[10px] rounded-xl transition shadow-lg shadow-amber-950/20"
                  >
                    {otpVerifying ? 'Verifying...' : 'Submit OTP'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </main>

      </div>
    </>
  );
}
