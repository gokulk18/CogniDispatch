import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function WelcomeLanding() {
  const router = useRouter();

  // Route to portal if already authenticated
  useEffect(() => {
    const session = localStorage.getItem('cogi_session');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.role === 'HOMEOWNER') router.push('/homeowner');
      else if (parsed.role === 'TECHNICIAN') router.push('/technician');
      else if (parsed.role === 'ADMIN') router.push('/admin');
    }
  }, []);

  return (
    <>
      <Head>
        <title>CogniDispatch — AI Emergency Triage & Command Center</title>
        <meta name="description" content="State of the art real-time coordinate-telemetry emergency dispatch platform." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚨</text></svg>" />
      </Head>

      <div className="min-h-screen bg-command-navy text-slate-100 flex flex-col justify-between antialiased relative overflow-hidden">
        
        {/* Decorative Glowing Orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-indigo-950/20 blur-3xl" />

        {/* HEADER */}
        <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900/80 z-10 relative">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-pulse">🚨</span>
            <div>
              <h1 className="text-xl font-black tracking-widest text-white uppercase">COGNIDISPATCH</h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono-data font-bold mt-0.5">Tactical Response Telemetry</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-950/45 hover:bg-slate-950 text-[10px] font-bold tracking-widest uppercase rounded-lg transition"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-4 py-2 bg-gradient-to-r from-indigo-700 to-indigo-650 hover:from-indigo-600 text-white text-[10px] font-bold tracking-widest uppercase rounded-lg shadow transition"
            >
              Register
            </button>
          </div>
        </header>

        {/* HERO SECTION */}
        <main className="flex-1 flex flex-col justify-center max-w-5xl w-full mx-auto px-6 py-12 md:py-20 z-10 relative gap-12 md:gap-16 animate-fadeIn">
          
          <div className="text-center flex flex-col gap-4">
            <div className="inline-flex mx-auto items-center gap-2 bg-indigo-950/30 border border-indigo-900/50 rounded-full px-4 py-1.5 text-[9px] font-bold tracking-widest text-indigo-400 uppercase font-mono-data animate-pulse">
              <span>⚡ INTELLIGENT AI EMERGENCY OPERATIONS CENTRE</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black uppercase text-white tracking-wide leading-none max-w-4xl mx-auto">
              Real-Time Emergency <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-650">Dispatch & Triage</span>
            </h2>
            
            <p className="text-slate-450 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Experience the future of emergency securement coordination. Voice-wave triage, mathematical geodetic contractor matching, live GPS tracking, and secure platform integration unified under a central command console.
            </p>
          </div>

          {/* THREE CORE PORTALS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Homeowner Card */}
            <div 
              onClick={() => router.push('/login')}
              className="bg-panel-slate/40 hover:bg-panel-slate/75 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-indigo-950/20 group animate-fadeIn"
            >
              <div className="flex flex-col gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300">
                  🏠
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider group-hover:text-indigo-400 transition">
                    Homeowner Hub
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
                    Describe your mechanical or electrical hazard. Receive an instant triage assessment, checklist mitigation steps, and launch high-accuracy GPS tracking.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-indigo-400 tracking-wider font-mono-data uppercase mt-6 group-hover:underline flex items-center gap-1">
                Enter Console ➔
              </span>
            </div>

            {/* 2. Technician Card */}
            <div 
              onClick={() => router.push('/login')}
              className="bg-panel-slate/40 hover:bg-panel-slate/75 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-emerald-950/20 group animate-fadeIn"
            >
              <div className="flex flex-col gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300">
                  🛠️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider group-hover:text-emerald-400 transition">
                    Technician Hub
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
                    Set your status as available. Accept emergency dispatches in real-time, trace homeowner directions on the map, and coordinate arrival signals.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 tracking-wider font-mono-data uppercase mt-6 group-hover:underline flex items-center gap-1">
                Responders Hub ➔
              </span>
            </div>

            {/* 3. Admin Card */}
            <div 
              onClick={() => router.push('/login')}
              className="bg-panel-slate/40 hover:bg-panel-slate/75 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-cyan-950/20 group animate-fadeIn"
            >
              <div className="flex flex-col gap-4">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300">
                  📊
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider group-hover:text-cyan-400 transition">
                    Admin Console
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
                    Monitor operational statistics and telemetry logs. Trace active routes, view available responders, and deploy new responder units directly.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-cyan-450 tracking-wider font-mono-data uppercase mt-6 group-hover:underline flex items-center gap-1">
                Command Panel ➔
              </span>
            </div>

          </div>

        </main>

        {/* FOOTER */}
        <footer className="border-t border-slate-900 bg-slate-950/40 py-6 px-6 z-10 relative">
          <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-500 font-mono-data gap-3">
            <span>CogniDispatch © 2026. All rights reserved.</span>
            <div className="flex gap-4">
              <span>Latency: &lt;10ms</span>
              <span>Encryption: AES-256-GCM</span>
              <span>Secure Telemetry Panel</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
