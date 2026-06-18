import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function LoginPortal() {
  const router = useRouter();
  const [role, setRole] = useState('HOMEOWNER'); // HOMEOWNER, TECHNICIAN, ADMIN
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Check if we came from an Easy Auth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const isEasyAuth = urlParams.get('easyauth') === 'true';

    if (isEasyAuth) {
      setLoading(true);
      fetch('/.auth/me')
        .then((res) => {
          if (!res.ok) throw new Error("Easy Auth session not found");
          return res.json();
        })
        .then((data) => {
          if (data && data[0]) {
            const user = data[0];
            const emailClaim = user.user_claims.find(c => c.typ === "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" || c.typ === "preferred_username");
            const nameClaim = user.user_claims.find(c => c.typ === "name" || c.typ === "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name");
            
            const userEmail = emailClaim ? emailClaim.val : user.user_id;
            const userName = nameClaim ? nameClaim.val : userEmail.split('@')[0];
            
            const session = {
              id: userEmail,
              role: 'ADMIN', // Set to ADMIN for Entra ID logins
              name: userName,
              email: userEmail,
              coords: { lat: 8.53633, lng: 76.88329 }
            };
            
            localStorage.setItem('cogi_session', JSON.stringify(session));
            redirectByRole('ADMIN');
          } else {
            setErrorMsg("Microsoft Entra ID session is empty.");
          }
        })
        .catch((err) => {
          console.error("Easy Auth check failed:", err);
          setErrorMsg("Failed to authenticate with Microsoft Entra ID.");
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    const session = localStorage.getItem('cogi_session');
    if (session) {
      const parsed = JSON.parse(session);
      redirectByRole(parsed.role);
    }
  }, [router.query]);

  const redirectByRole = (userRole) => {
    if (userRole === 'HOMEOWNER') router.push('/homeowner');
    else if (userRole === 'TECHNICIAN') router.push('/technician');
    else if (userRole === 'ADMIN') router.push('/admin');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_IP || 'https://nginx.blacksea-5c2cdd48.japanwest.azurecontainerapps.io';
      const payload = {
        role,
        password,
        ...(role === 'HOMEOWNER' || role === 'ADMIN' ? { email } : { phone })
      };

      const res = await axios.post(`${serverUrl}/api/auth/login`, payload);

      if (res.data && res.data.success) {
        localStorage.setItem('cogi_session', JSON.stringify(res.data.session));
        redirectByRole(res.data.session.role);
      }
    } catch (err) {
      console.error("Login failure:", err);
      setErrorMsg(err.response?.data?.error || "Invalid credentials or server offline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Tactical Command Access — CogniDispatch</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-[#08080a] text-slate-100 flex flex-col items-center justify-center p-4 antialiased relative overflow-hidden">
        
        {/* Futuristic Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Dynamic Role-Based Glow Backdrops */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none transition-all duration-700 ease-in-out opacity-25 ${
          role === 'HOMEOWNER' 
            ? 'bg-purple-500' 
            : role === 'TECHNICIAN' 
              ? 'bg-amber-500' 
              : 'bg-indigo-500'
        }`} />

        {/* Top Branding Link */}
        <div 
          className="absolute top-8 left-8 flex items-center gap-3 cursor-pointer select-none group z-20" 
          onClick={() => router.push('/')}
        >
          <span className="text-2xl transition-transform duration-300 group-hover:scale-115">🚨</span>
          <div>
            <span className="text-md font-extrabold tracking-widest text-white uppercase block leading-none">COGNIDISPATCH</span>
            <span className="text-[8px] text-slate-500 font-mono-data tracking-widest uppercase block mt-1">OPERATIONAL COMMAND LINK</span>
          </div>
        </div>

        {/* Central Tactical Glass Console */}
        <div className="w-full max-w-md bg-[#121215]/85 border border-zinc-800 rounded-[2rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] p-8 backdrop-blur-xl flex flex-col gap-6 animate-fadeIn relative z-10">
          
          <div className="text-center flex flex-col gap-1">
            <span className={`text-[10px] font-mono-data font-bold tracking-widest uppercase transition-colors duration-300 ${
              role === 'HOMEOWNER' 
                ? 'text-purple-400' 
                : role === 'TECHNICIAN' 
                  ? 'text-amber-400' 
                  : 'text-indigo-400'
            }`}>
              {role === 'ADMIN' ? 'SECURE CONSOLE UPLINK' : 'TACTICAL GATEWAY AUTH'}
            </span>
            <h2 className="text-2xl font-extrabold uppercase tracking-wider text-white">
              System Login
            </h2>
            <p className="text-[10px] text-slate-400 font-mono-data leading-relaxed">
              Verify credentials to establish a secure telemetry link.
            </p>
          </div>

          {/* Role selector tabs */}
          <div className="grid grid-cols-3 bg-[#08080a] p-1 border border-zinc-800 rounded-2xl relative">
            {['HOMEOWNER', 'TECHNICIAN', 'ADMIN'].map((tabRole) => {
              const active = role === tabRole;
              let activeStyle = '';
              if (active) {
                if (tabRole === 'HOMEOWNER') activeStyle = 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
                else if (tabRole === 'TECHNICIAN') activeStyle = 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
                else activeStyle = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30';
              }
              return (
                <button
                  key={tabRole}
                  type="button"
                  onClick={() => {
                    setRole(tabRole);
                    setErrorMsg('');
                  }}
                  className={`py-3 rounded-xl text-[9px] font-bold tracking-widest uppercase transition-all duration-300 ${
                    active 
                      ? `${activeStyle} shadow-inner` 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tabRole === 'HOMEOWNER' ? 'Owner' : tabRole === 'TECHNICIAN' ? 'Responder' : 'Admin'}
                </button>
              );
            })}
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            
            {/* Show login inputs for all roles */}
            <>
              {/* Conditional Input based on role */}
              {role === 'HOMEOWNER' || role === 'ADMIN' ? (
                <div className="flex flex-col gap-2">
                  <label className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider font-mono-data">
                    Account Email Address
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-sm text-slate-500">✉️</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={role === 'ADMIN' ? "admin@cognidispatch.com" : "client@cognidispatch.com"}
                      className="w-full rounded-xl bg-[#030611] border border-slate-800 text-white text-xs pl-10 pr-4 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono-data transition"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider font-mono-data">
                    Specialist Phone Identifier
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-sm text-slate-500">📞</span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g., +91 98765 43210"
                      className="w-full rounded-xl bg-[#030611] border border-slate-800 text-white text-xs pl-10 pr-4 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono-data transition"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider font-mono-data">
                  Secure Passcode
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-sm text-slate-500">🔑</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-[#030611] border border-slate-800 text-white text-xs pl-10 pr-4 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono-data transition"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="text-[10px] text-rose-400 bg-rose-950/10 border border-rose-900/30 rounded-xl p-3 font-mono-data leading-relaxed flex gap-2 items-start">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-6 rounded-xl text-white font-extrabold uppercase tracking-widest text-[10px] transition duration-300 disabled:opacity-50 font-mono-data mt-2 shadow-md ${
                  role === 'HOMEOWNER' 
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-950/20' 
                    : role === 'TECHNICIAN'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-950/20'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-950/20'
                }`}
              >
                {loading ? 'Establishing Link...' : 'Connect to Operations'}
              </button>
            </>

            {/* Also show Microsoft SSO option below for Admins in Production */}
            {role === 'ADMIN' && (
              <>
                <div className="flex items-center my-1">
                  <div className="flex-1 border-t border-slate-800/80"></div>
                  <span className="px-3 text-[8px] text-slate-500 font-mono-data uppercase">Azure SSO (Prod Only)</span>
                  <div className="flex-1 border-t border-slate-800/80"></div>
                </div>
                <a
                  href="/.auth/login/aad?post_login_redirect_uri=/login?easyauth=true"
                  className="w-full py-3 px-4 rounded-md text-zinc-700 font-semibold text-xs text-center bg-white hover:bg-zinc-100 border border-zinc-300 transition duration-200 flex items-center justify-center gap-3 shadow-sm"
                  style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" }}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="10.5" height="10.5" fill="#F25022"/>
                    <rect x="12.5" y="0" width="10.5" height="10.5" fill="#7FBA00"/>
                    <rect x="0" y="12.5" width="10.5" height="10.5" fill="#00A1F1"/>
                    <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900"/>
                  </svg>
                  <span>Sign in with Microsoft</span>
                </a>
              </>
            )}
          </form>

          {/* Registration Hook */}
          {role !== 'ADMIN' && (
            <div className="text-center border-t border-slate-800/80 pt-4 text-[10px] text-slate-500 font-mono-data">
              No operational profile?{' '}
              <span 
                onClick={() => router.push('/register')} 
                className={`font-bold cursor-pointer underline decoration-dotted transition-colors ${
                  role === 'HOMEOWNER' ? 'text-emerald-400 hover:text-emerald-350' : 'text-amber-400 hover:text-amber-350'
                }`}
              >
                Create Account
              </span>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
