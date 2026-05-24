import React from 'react';
import PropTypes from 'prop-types';

export default function FallbackModal({ visible, reason, onRetry }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-xl border border-emergency-red bg-panel-slate p-6 md:p-8 shadow-2xl text-center animate-pulse-ring">
        
        {/* Warning Icon Header */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emergency-red/10 text-emergency-red mb-6 animate-pulse">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white tracking-wider mb-2">
          SYSTEM FALLBACK TRIGGERED
        </h2>
        
        <p className="text-gray-400 text-sm mb-6 bg-command-navy/50 p-3 rounded-lg border border-slate-800 text-left font-mono">
          <span className="text-emergency-red font-semibold">Reason:</span> {reason || "Unknown critical failure."}
        </p>

        <p className="text-gray-300 text-sm mb-6">
          Automated services are currently interrupted. Please contact emergency services or dispatch operators directly.
        </p>

        {/* Emergency Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <a
            href="tel:911"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-emergency-red hover:bg-red-600 text-white font-bold py-4 px-6 transition duration-200 uppercase text-lg shadow-lg shadow-red-950/50"
          >
            📞 CALL 911 — Life Emergency
          </a>
          <a
            href="tel:18005551234"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 transition duration-200 border border-slate-700 text-sm"
          >
            📞 Emergency Plumbing Hotline
          </a>
          <a
            href="tel:18005555678"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 transition duration-200 border border-slate-700 text-sm"
          >
            📞 Emergency Electrician Hotline
          </a>
        </div>

        {/* Reconnect Option */}
        <button
          onClick={onRetry}
          className="w-full py-2.5 px-4 rounded-lg bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 text-xs font-mono transition duration-150 uppercase tracking-widest font-semibold"
        >
          🔄 Attempt System Reconnection
        </button>

      </div>
    </div>
  );
}

FallbackModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  reason: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired
};
