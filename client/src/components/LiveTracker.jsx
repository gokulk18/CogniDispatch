import React, { useState } from 'react';
import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';

// Lazy load Leaflet Map component with no SSR to prevent server-side window errors
const LiveTrackerMap = dynamic(() => import('./LiveTrackerMap'), { ssr: false });

export default function LiveTracker({ userCoords, techCoords, vendor, triageResult, etaSeconds }) {
  const [completedSteps, setCompletedSteps] = useState({});

  // Helper to format ETA seconds into MM:SS
  const formatETA = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    if (seconds <= 0) return "ARRIVED";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStepCheck = (index) => {
    setCompletedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const urgency = triageResult?.urgency || 'STANDARD';
  const getUrgencyColor = () => {
    switch (urgency.toUpperCase()) {
      case 'CRITICAL':
        return { border: 'border-red-500/60', text: 'text-red-400', bg: 'bg-red-950/20' };
      case 'HIGH':
        return { border: 'border-warning-amber/60', text: 'text-warning-amber', bg: 'bg-amber-950/20' };
      case 'STANDARD':
      default:
        return { border: 'border-emerald-500/60', text: 'text-emerald-400', bg: 'bg-emerald-950/20' };
    }
  };

  const colors = getUrgencyColor();
  const hazardBadges = triageResult?.hazard_flags || [];

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6 bg-panel-slate/40 border border-slate-800 rounded-xl p-5 md:p-6 shadow-xl backdrop-blur-sm">
      
      {/* LEFT COLUMN: Map Container */}
      <div className="w-full xl:w-7/12 h-[350px] md:h-[450px] rounded-xl overflow-hidden relative">
        <LiveTrackerMap 
          userCoords={userCoords} 
          techCoords={techCoords} 
          vendor={vendor} 
        />
      </div>

      {/* RIGHT COLUMN: Triage info, ETA, checklists */}
      <div className="w-full xl:w-5/12 flex flex-col gap-5 justify-between">
        
        {/* Status Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-command-navy/50 p-4 border border-slate-800/80 rounded-xl gap-4">
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Real-time ETA Dispatch</span>
            <div className="text-3xl font-extrabold font-mono tracking-wider flex items-center gap-2">
              <span className={etaSeconds !== null && etaSeconds < 120 ? "text-emergency-red animate-pulse" : "text-white"}>
                {formatETA(etaSeconds)}
              </span>
              {etaSeconds !== null && etaSeconds < 120 && etaSeconds > 0 && (
                <span className="text-[10px] bg-emergency-red/20 text-emergency-red border border-emergency-red/30 px-2 py-0.5 rounded animate-pulse font-sans font-normal uppercase">
                  PULSING SHORT DISTANCE
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Triage Severity</span>
            <div>
              <span className={`px-3 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider ${colors.text} ${colors.border} ${colors.bg}`}>
                🚨 {urgency}
              </span>
            </div>
          </div>
        </div>

        {/* Hazard Flags */}
        {hazardBadges.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hazard Flags:</span>
            {hazardBadges.map((flag, idx) => (
              <span key={idx} className="bg-red-950/40 text-red-400 border border-red-900/60 rounded px-2 py-0.5 text-[9px] font-semibold tracking-wider font-mono">
                ⚠ {flag}
              </span>
            ))}
          </div>
        )}

        {/* Action Steps Checklist */}
        <div className={`flex flex-col gap-3 p-4 rounded-xl border ${colors.border} bg-command-navy/35 flex-1 max-h-[220px] overflow-y-auto`}>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Critical Actions Checklist
            </h4>
            <p className="text-gray-400 text-[10px] mt-0.5">
              Perform these immediate safety mitigations before the vehicle arrives.
            </p>
          </div>

          <div className="flex flex-col gap-2 mt-1">
            {triageResult?.mitigation_steps?.map((step, idx) => {
              const isChecked = !!completedSteps[idx];
              return (
                <label 
                  key={idx} 
                  className={`flex items-start gap-3 p-2.5 rounded-lg border transition duration-150 cursor-pointer ${
                    isChecked 
                      ? 'bg-slate-900/40 border-slate-800 text-gray-500 line-through' 
                      : 'bg-panel-slate/60 border-slate-800/80 text-gray-200 hover:bg-panel-slate/90'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleStepCheck(idx)}
                    className="mt-1 h-3.5 w-3.5 rounded border-slate-700 bg-command-navy text-accent-cyan focus:ring-accent-cyan cursor-pointer"
                  />
                  <span className="text-xs font-mono select-none leading-relaxed">
                    {idx + 1}. {step}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Technician Card */}
        <div className="bg-gradient-to-r from-slate-900 to-panel-slate p-4 border border-slate-800 rounded-xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shadow-inner">
              🛠️
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-mono tracking-widest">{vendor.category} DISPATCHER</span>
              <span className="text-sm font-bold text-white block leading-tight">{vendor.technician}</span>
              <span className="text-[10px] text-accent-cyan block font-mono mt-0.5">{vendor.name} • ★{vendor.rating}</span>
            </div>
          </div>
          
          <a
            href={`tel:${vendor.phone}`}
            className="flex items-center justify-center h-10 px-4 rounded-lg bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan text-xs font-bold transition duration-150 font-mono tracking-wider uppercase"
          >
            📞 CALL NOW
          </a>
        </div>

      </div>
    </div>
  );
}

LiveTracker.propTypes = {
  userCoords: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }).isRequired,
  techCoords: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
  vendor: PropTypes.object.isRequired,
  triageResult: PropTypes.object.isRequired,
  etaSeconds: PropTypes.number
};
