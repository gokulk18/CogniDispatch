import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function AdminConsoleDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  // Stats Metrics
  const [metrics, setMetrics] = useState({
    activeDispatches: 0,
    completedDispatchesCount: 0,
    platformCommissions: 0,
    totalAvailableVendors: 0,
    totalVendorsCount: 0,
    categoryDistribution: { PLUMBING: 0, ELECTRICAL: 0, HVAC: 0, STRUCTURAL: 0 }
  });

  const [vendors, setVendors] = useState([]);
  const [dispatches, setDispatches] = useState([]);

  // Form State to Add Responders
  const [vendorName, setVendorName] = useState('');
  const [techName, setTechName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('PLUMBING');
  const [password, setPassword] = useState('password123');
  const [address, setAddress] = useState('Trivandrum, India');
  const [lat, setLat] = useState(8.53633);
  const [lng, setLng] = useState(76.88329);

  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_IP || 'http://localhost:5000';

  // 1. Session Verification
  useEffect(() => {
    const saved = localStorage.getItem('cogi_session');
    if (!saved) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(saved);
    if (parsed.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    setSession(parsed);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const metricsRes = await axios.get(`${serverUrl}/api/admin/metrics`);
      if (metricsRes.data.success) {
        setMetrics(metricsRes.data.metrics);
      }

      const vendorsRes = await axios.get(`${serverUrl}/api/admin/vendors`);
      if (vendorsRes.data.success) {
        setVendors(vendorsRes.data.vendors);
      }

      const dispRes = await axios.get(`${serverUrl}/api/admin/dispatches`);
      if (dispRes.data.success) {
        setDispatches(dispRes.data.dispatches);
      }
    } catch (err) {
      console.error("Admin data query failure:", err);
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    setLoadingForm(true);
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        name: vendorName + ' Emergency Support',
        technician: techName,
        phone,
        email,
        category,
        password,
        address,
        lat: Number(lat),
        lng: Number(lng)
      };

      const res = await axios.post(`${serverUrl}/api/admin/vendors`, payload);

      if (res.data.success) {
        setFormSuccess(res.data.message);
        
        // Reset Form
        setVendorName('');
        setTechName('');
        setPhone('');
        setEmail('');
        setPassword('password123');
        setAddress('Trivandrum, India');
        setLat(8.53633);
        setLng(76.88329);

        // Re-query data
        fetchData();
      }
    } catch (err) {
      console.error("Vendor injection failure:", err);
      setFormError(err.response?.data?.error || "Failed to register new technician unit.");
    } finally {
      setLoadingForm(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cogi_session');
    router.push('/');
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0e111a] flex items-center justify-center font-mono text-xs text-cyan-400">
        Authenticating Secure Administrative Gateway...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Panel — CogniDispatch</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* THEME COMBO: SPACE CADET GRAY & ELECTRIC CYAN */}
      <div className="min-h-screen bg-[#0e111a] text-slate-100 flex flex-col antialiased selection:bg-cyan-950 selection:text-cyan-400">
        
        {/* HEADER */}
        <header className="border-b border-cyan-950 bg-panel-slate/40 backdrop-blur-md px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-lg">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-2xl animate-pulse">📊</span>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-widest text-white flex items-center gap-2">
                COGIDISPATCH
              </h1>
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider hidden sm:block">
                Administrative Central Command Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 font-mono text-[9px] bg-slate-950 border border-cyan-950 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-500 font-bold">OPERATOR:</span>
              <span className="text-cyan-400 font-bold uppercase">{session.name}</span>
            </div>

            <button 
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 text-[9px] font-bold tracking-widest uppercase rounded transition font-mono"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto flex flex-col gap-6 animate-fadeIn">
          
          {/* STATS OVERVIEW GRIDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Total platform commissions */}
            <div className="bg-panel-slate/60 border border-cyan-950/30 rounded-2xl p-6 shadow-xl flex flex-col gap-2 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-cyan-500/5 -mr-4 -mt-4 blur-xl" />
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">RescuHome Commissions (20%)</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">₹{metrics.platformCommissions.toLocaleString('en-IN')}</span>
              <p className="text-[9px] text-slate-400 italic">Net platform revenues collected</p>
            </div>

            {/* Active dispatches count */}
            <div className="bg-panel-slate/60 border border-cyan-950/30 rounded-2xl p-6 shadow-xl flex flex-col gap-2 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-indigo-500/5 -mr-4 -mt-4 blur-xl" />
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">Active Dispatches</span>
              <span className="text-2xl font-black text-indigo-400 font-mono">{metrics.activeDispatches} Units</span>
              <p className="text-[9px] text-slate-400 italic">Responders en-route or arrived</p>
            </div>

            {/* Total available vendors */}
            <div className="bg-panel-slate/60 border border-cyan-950/30 rounded-2xl p-6 shadow-xl flex flex-col gap-2 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-cyan-500/5 -mr-4 -mt-4 blur-xl" />
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">Available Responders</span>
              <span className="text-2xl font-black text-white font-mono">
                {metrics.totalAvailableVendors} / {metrics.totalVendorsCount}
              </span>
              <p className="text-[9px] text-slate-400 italic">Specialist responders on active duty</p>
            </div>

            {/* Completed operations */}
            <div className="bg-panel-slate/60 border border-cyan-950/30 rounded-2xl p-6 shadow-xl flex flex-col gap-2 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-indigo-500/5 -mr-4 -mt-4 blur-xl" />
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">Concluded Operations</span>
              <span className="text-2xl font-black text-white font-mono">{metrics.completedDispatchesCount} Jobs</span>
              <p className="text-[9px] text-slate-400 italic">Total payments processed successfully</p>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* LEFT COLUMNS: Vendors Table Grid (2/3 width) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="bg-panel-slate/60 border border-cyan-950/30 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Responder Unit Registry
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Live telemetry parameters of specialists mapped in CogniDispatch.
                  </p>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left font-mono text-[10px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-widest">
                        <th className="pb-3 pr-2">SPECIALIST</th>
                        <th className="pb-3 pr-2">CATEGORY</th>
                        <th className="pb-3 pr-2 text-center">STATUS</th>
                        <th className="pb-3 pr-2 text-center">JOBS</th>
                        <th className="pb-3 pr-2 text-center">RATING</th>
                        <th className="pb-3 pr-2 text-right">EARNINGS (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map((v) => (
                        <tr key={v.id} className="border-b border-slate-800/80 hover:bg-slate-900/30 transition duration-150">
                          <td className="py-3.5 pr-2">
                            <span className="text-white font-bold block">{v.technician}</span>
                            <span className="text-[9px] text-slate-500 block">{v.phone}</span>
                          </td>
                          <td className="py-3.5 pr-2">
                            <span className="bg-slate-950 border border-cyan-950 text-slate-350 px-2 py-0.5 rounded text-[8px] font-bold">
                              {v.category}
                            </span>
                          </td>
                          <td className="py-3.5 pr-2 text-center">
                            {v.busy ? (
                              <span className="text-indigo-400 animate-pulse font-bold">⚡ BUSY</span>
                            ) : v.available ? (
                              <span className="text-cyan-400 font-bold">🟢 AVAILABLE</span>
                            ) : (
                              <span className="text-slate-650">🔴 OFFLINE</span>
                            )}
                          </td>
                          <td className="py-3.5 pr-2 text-center text-white">{v.completed_jobs}</td>
                          <td className="py-3.5 pr-2 text-center text-warning-amber font-bold">★{v.rating.toFixed(1)}</td>
                          <td className="py-3.5 pr-2 text-right text-cyan-400 font-bold">₹{v.balance.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Active dispatches logging */}
              <div className="bg-panel-slate/60 border border-cyan-950/30 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Operational Dispatch Logging
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Past and current active telemetry operation lines.
                  </p>
                </div>

                <div className="overflow-x-auto w-full max-h-[220px] overflow-y-auto">
                  <table className="w-full text-left font-mono text-[9px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-550 font-bold uppercase tracking-widest">
                        <th className="pb-2.5 pr-2">DISPATCH ID</th>
                        <th className="pb-2.5 pr-2">HOMEOWNER</th>
                        <th className="pb-2.5 pr-2">RESPONDER UNIT</th>
                        <th className="pb-2.5 pr-2">urgency</th>
                        <th className="pb-2.5 pr-2 text-center">STATUS</th>
                        <th className="pb-2.5 pr-2 text-right">FEE (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatches.map((d) => (
                        <tr key={d.id} className="border-b border-slate-800/80">
                          <td className="py-3 pr-2 text-slate-500">{d.id}</td>
                          <td className="py-3 pr-2 text-white font-semibold">{d.userName}</td>
                          <td className="py-3 pr-2">{d.vendorName}</td>
                          <td className="py-3 pr-2">
                            <span className={`font-bold ${d.urgency === 'CRITICAL' ? 'text-red-400' : 'text-slate-300'}`}>
                              {d.urgency}
                            </span>
                          </td>
                          <td className="py-3 pr-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                              d.status === 'COMPLETED' 
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60' 
                                : 'bg-cyan-955 text-cyan-400 border border-cyan-900/60 animate-pulse'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="py-3 pr-2 text-right font-bold text-white">₹{d.amount}</td>
                        </tr>
                      ))}
                      {dispatches.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-6 text-center text-slate-500 font-mono">
                            No dispatch history logged in the central command.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN: Add Responder Form (1/3 width) */}
            <div className="bg-panel-slate/60 border border-cyan-950/30 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col gap-4 font-mono">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Register Responder Unit
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Deploy a new emergency responder specialist into the telemetry array.
                </p>
              </div>

              <form onSubmit={handleAddVendor} className="flex flex-col gap-4">
                
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Agency Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. Apex Plumbing"
                    className="w-full rounded-xl bg-command-navy border border-slate-800 text-white text-xs p-3 focus:outline-none focus:border-cyan-650 focus:ring-1 focus:ring-cyan-650"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Technician Specialist Name
                  </label>
                  <input
                    type="text"
                    required
                    value={techName}
                    onChange={(e) => setTechName(e.target.value)}
                    placeholder="e.g. Carlos Mendes"
                    className="w-full rounded-xl bg-command-navy border border-slate-800 text-white text-xs p-3 focus:outline-none focus:border-cyan-650 focus:ring-1 focus:ring-cyan-650"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91-888-0101"
                      className="w-full rounded-xl bg-command-navy border border-slate-800 text-white text-xs p-3 focus:outline-none focus:border-cyan-650 focus:ring-1 focus:ring-cyan-650"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                      Specialty Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl bg-command-navy border border-slate-800 text-white text-xs p-3 focus:outline-none focus:border-cyan-650 focus:ring-1 focus:ring-cyan-650"
                    >
                      <option value="PLUMBING">PLUMBING</option>
                      <option value="ELECTRICAL">ELECTRICAL</option>
                      <option value="HVAC">HVAC</option>
                      <option value="STRUCTURAL">STRUCTURAL</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Responders Base Address
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Pattom, Thiruvananthapuram, Kerala"
                    className="w-full rounded-xl bg-command-navy border border-slate-800 text-white text-xs p-3 focus:outline-none focus:border-cyan-650 focus:ring-1 focus:ring-cyan-650"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                      Anchor Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="8.53633"
                      className="w-full rounded-xl bg-command-navy border border-slate-800 text-white text-xs p-3 focus:outline-none focus:border-cyan-650 focus:ring-1 focus:ring-cyan-650"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                      Anchor Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="76.88329"
                      className="w-full rounded-xl bg-command-navy border border-slate-800 text-white text-xs p-3 focus:outline-none focus:border-cyan-650 focus:ring-1 focus:ring-cyan-650"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Technician Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password123"
                    className="w-full rounded-xl bg-command-navy border border-slate-800 text-white text-xs p-3 focus:outline-none focus:border-cyan-650 focus:ring-1 focus:ring-cyan-650"
                  />
                </div>

                {formError && (
                  <p className="text-[9px] text-red-400 bg-red-950/15 border border-red-900/40 rounded p-2">
                    ⚠️ {formError}
                  </p>
                )}

                {formSuccess && (
                  <p className="text-[9px] text-emerald-400 bg-emerald-950/15 border border-emerald-900/40 rounded p-2">
                    🎉 {formSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loadingForm}
                  className="w-full py-3.5 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg transition disabled:opacity-50 mt-1"
                >
                  {loadingForm ? 'Deploying unit...' : 'Deploy Specialist Unit'}
                </button>

              </form>
            </div>

          </div>

        </main>

      </div>
    </>
  );
}
