import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function RegisterPortal() {
  const router = useRouter();
  const [role, setRole] = useState('HOMEOWNER'); // HOMEOWNER, TECHNICIAN
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('PLUMBING'); // Only for responders
  
  // Geolocation
  const [lat, setLat] = useState(8.53633);
  const [lng, setLng] = useState(76.88329);
  const [gpsLock, setGpsLock] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Attempt GPS lock on mount
  useEffect(() => {
    handleGpsLock();
  }, []);

  const handleGpsLock = () => {
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setGpsLock(true);
        setFetchingGps(false);
      },
      (err) => {
        console.warn("Geolocation failed on signup, defaulting to Trivandrum:", err);
        setLat(8.53633);
        setLng(76.88329);
        setGpsLock(false);
        setFetchingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_IP || '';
      const payload = {
        role,
        email,
        phone,
        password,
        name,
        address,
        lat,
        lng,
        ...(role === 'TECHNICIAN' && { category })
      };

      const res = await axios.post(`${serverUrl}/api/auth/register`, payload);

      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message);
        localStorage.setItem('cogi_session', JSON.stringify(res.data.session));
        setTimeout(() => {
          if (role === 'HOMEOWNER') router.push('/homeowner');
          else router.push('/technician');
        }, 1500);
      }
    } catch (err) {
      console.error("Signup failure:", err);
      setErrorMsg(err.response?.data?.error || "Registration rejected. Please verify details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>System Deployment — CogniDispatch</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-[#08080a] text-slate-100 flex flex-col items-center justify-center p-4 antialiased relative overflow-hidden py-12">
        
        {/* Futuristic Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Dynamic Role-Based Glow Backdrops */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none transition-all duration-700 ease-in-out opacity-25 ${
          role === 'HOMEOWNER' 
            ? 'bg-purple-500' 
            : 'bg-amber-500'
        }`} />        {/* Top Branding Link */}
        <div 
          className="relative sm:absolute mb-8 sm:mb-0 top-0 sm:top-8 left-0 sm:left-8 flex items-center gap-3 cursor-pointer select-none group z-20" 
          onClick={() => router.push('/')}
        >
          <span className="text-2xl transition-transform duration-300 group-hover:scale-115">🚨</span>
          <div>
            <span className="text-md font-extrabold tracking-widest text-white uppercase block leading-none">COGNIDISPATCH</span>
            <span className="text-[8px] text-slate-500 font-mono-data tracking-widest uppercase block mt-1">OPERATIONAL COMMAND LINK</span>
          </div>
        </div>

        {/* Tactical Glass Console wrapper */}
        <div className="w-full max-w-md bg-[#121215]/85 border border-zinc-800 rounded-[2rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] p-8 backdrop-blur-xl flex flex-col gap-6 animate-fadeIn relative z-10">
          
          <div className="text-center flex flex-col gap-1">
            <span className={`text-[10px] font-mono-data font-bold tracking-widest uppercase transition-colors duration-300 ${
              role === 'HOMEOWNER' ? 'text-purple-400' : 'text-amber-400'
            }`}>
              SYSTEM PROVISIONING
            </span>
            <h2 className="text-2xl font-extrabold uppercase tracking-wider text-white">
              Create Profile
            </h2>
            <p className="text-[10px] text-slate-400 font-mono-data leading-relaxed">
              Register onto the active CogniDispatch emergency command grid.
            </p>
          </div>

          {/* Role selector tabs */}
          <div className="grid grid-cols-2 bg-[#08080a] p-1 border border-zinc-800 rounded-2xl relative">
            {['HOMEOWNER', 'TECHNICIAN'].map((tabRole) => {
              const active = role === tabRole;
              let activeStyle = '';
              if (active) {
                if (tabRole === 'HOMEOWNER') activeStyle = 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
                else activeStyle = 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
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
                  {tabRole === 'HOMEOWNER' ? (
                    <>
                      <span className="hidden sm:inline">Owner Account</span>
                      <span className="sm:hidden">Owner</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Responder Specialist</span>
                      <span className="sm:hidden">Responder</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-2">
              <label className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider font-mono-data">
                Full Name / Agency Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arun Nair"
                className="w-full rounded-xl bg-[#030611] border border-slate-800 text-white text-xs px-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono-data transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-2">
                <label className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider font-mono-data">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arun@example.com"
                  className="w-full rounded-xl bg-[#030611] border border-slate-800 text-white text-xs px-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono-data transition"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider font-mono-data">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl bg-[#030611] border border-slate-800 text-white text-xs px-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono-data transition"
                />
              </div>
            </div>

            {role === 'TECHNICIAN' && (
              <div className="flex flex-col gap-2">
                <label className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider font-mono-data">
                  Specialty Service Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-[#030611] border border-slate-800 text-white text-xs px-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono-data transition"
                >
                  <option value="PLUMBING">PLUMBING EMERGENCY</option>
                  <option value="ELECTRICAL">ELECTRICAL HAZARD</option>
                  <option value="HVAC">HVAC SYSTEM FAILURE</option>
                  <option value="STRUCTURAL">STRUCTURAL BREACH</option>
                </select>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider font-mono-data">
                Contact Address
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Pattom, Trivandrum, Kerala"
                className="w-full rounded-xl bg-[#08080a] border border-zinc-850 text-white text-xs px-4 py-3.5 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-mono-data transition"
              />
            </div>

            {/* GPS Lock Info */}
            <div className="bg-[#08080a] p-3 rounded-2xl border border-zinc-800 flex justify-between items-center text-[9px] font-mono-data">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Signup Coordinates</span>
                {fetchingGps ? (
                  <span className="text-amber-400 animate-pulse">Resolving location...</span>
                ) : gpsLock ? (
                  <span className="text-emerald-400 font-bold">✔️ Locked: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                ) : (
                  <span className="text-purple-400 font-bold">⚠️ Local Simulation Coords Active</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleGpsLock}
                disabled={fetchingGps}
                className="px-3 py-2 bg-[#121215] hover:bg-zinc-900 border border-zinc-800 rounded-lg text-[8px] text-white tracking-widest font-bold uppercase disabled:opacity-50 transition"
              >
                🔄 Refresh
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider font-mono-data">
                Secure Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl bg-[#08080a] border border-zinc-850 text-white text-xs px-4 py-3.5 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 font-mono-data transition"
              />
            </div>

            {errorMsg && (
              <div className="text-[10px] text-rose-400 bg-rose-950/10 border border-rose-900/30 rounded-xl p-3 font-mono-data leading-relaxed flex gap-2 items-start">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="text-[10px] text-purple-400 bg-purple-950/10 border border-purple-900/30 rounded-xl p-3 font-mono-data leading-relaxed flex gap-2 items-start animate-pulse">
                <span>🎉</span>
                <span>{successMsg} Redirecting...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-6 rounded-xl text-white font-extrabold uppercase tracking-widest text-[10px] transition duration-300 disabled:opacity-50 font-mono-data mt-2 shadow-md ${
                role === 'HOMEOWNER' 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-450 shadow-purple-950/20' 
                  : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-950/20'
              }`}
            >
              {loading ? 'Provisioning Profile...' : 'Deploy Operational Profile'}
            </button>
          </form>

          <div className="text-center border-t border-slate-800/80 pt-4 text-[10px] text-slate-500 font-mono-data">
            Already registered?{' '}
            <span 
              onClick={() => router.push('/login')} 
              className={`font-bold cursor-pointer underline decoration-dotted transition-colors ${
                role === 'HOMEOWNER' ? 'text-purple-400 hover:text-purple-350' : 'text-amber-400 hover:text-amber-350'
              }`}
            >
              Sign In
            </span>
          </div>

        </div>
      </div>
    </>
  );
}


