import React, { useState } from 'react';
import PropTypes from 'prop-types';

export default function ManualGrid({ onManualDispatch, onLocation, onFallback, disabled }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [isSimulationLocation, setIsSimulationLocation] = useState(false);

  const categories = [
    {
      id: 'PLUMBING',
      name: 'Plumbing Emergency',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
      colorClass: 'border-blue-500 text-blue-400 bg-blue-950/20 hover:bg-blue-950/40',
      activeColorClass: 'ring-2 ring-blue-500 border-blue-500 bg-blue-950/50 text-blue-300'
    },
    {
      id: 'ELECTRICAL',
      name: 'Electrical Hazard',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      colorClass: 'border-yellow-500 text-yellow-400 bg-yellow-950/20 hover:bg-yellow-950/40',
      activeColorClass: 'ring-2 ring-yellow-500 border-yellow-500 bg-yellow-950/50 text-yellow-300'
    },
    {
      id: 'HVAC',
      name: 'HVAC System Failure',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ),
      colorClass: 'border-cyan-500 text-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40',
      activeColorClass: 'ring-2 ring-cyan-500 border-cyan-500 bg-cyan-950/50 text-cyan-300'
    },
    {
      id: 'STRUCTURAL',
      name: 'Structural Breach',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      colorClass: 'border-orange-500 text-orange-400 bg-orange-950/20 hover:bg-orange-950/40',
      activeColorClass: 'ring-2 ring-orange-500 border-orange-500 bg-orange-950/50 text-orange-300'
    }
  ];

  const handleCategoryClick = (catId) => {
    if (disabled) return;
    setSelectedCategory(catId);
    setFetchingLocation(true);
    setIsSimulationLocation(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFetchingLocation(false);
        const userLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCoords(userLoc);
        onLocation(userLoc);
      },
      (error) => {
        console.warn("Geolocation failed or denied in manual grid. Defaulting to NYC coordinates.", error);
        setFetchingLocation(false);
        setIsSimulationLocation(true);
        const fallbackCoords = { lat: 40.7128, lng: -74.0060 }; // NYC Center where mock vendors reside
        setCoords(fallbackCoords);
        onLocation(fallbackCoords);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleDispatch = () => {
    if (disabled || !selectedCategory || !description.trim() || !coords) return;
    onManualDispatch({
      category: selectedCategory,
      description: description.trim(),
      coords
    });
  };

  return (
    <div className="w-full flex flex-col gap-5 bg-panel-slate/60 border border-slate-800 rounded-xl p-5 md:p-6 backdrop-blur-sm">
      <div>
        <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-wider">
          Manual Backup Dispatch
        </h3>
        <p className="text-gray-400 text-xs">
          Select the emergency service type and provide incident details below.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              disabled={disabled}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all duration-200 gap-2 h-32 ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              } ${isActive ? cat.activeColorClass : cat.colorClass}`}
            >
              {cat.icon}
              <span className="text-xs font-semibold uppercase tracking-wider">{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Location Badge */}
      {fetchingLocation && (
        <div className="flex items-center gap-2 text-warning-amber text-xs font-mono bg-warning-amber/10 p-2 rounded-lg border border-warning-amber/20 justify-center animate-pulse">
          <span>📡 Resolving high-accuracy GPS coordinates...</span>
        </div>
      )}

      {coords && !fetchingLocation && (
        <div className={`flex items-center gap-2 text-xs font-mono p-2 rounded-lg justify-center border ${
          isSimulationLocation 
            ? 'text-indigo-400 bg-indigo-950/20 border-indigo-900/50' 
            : 'text-emerald-400 bg-emerald-950/20 border-emerald-900/50'
        }`}>
          <span>
            {isSimulationLocation 
              ? `⚠️ SIMULATION COORDS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (Geolocation Denied)`
              : `✔️ GPS LOCK: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
            }
          </span>
        </div>
      )}

      {/* Details Form */}
      {selectedCategory && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div>
            <label className="block text-gray-300 text-xs uppercase tracking-wider mb-2 font-semibold">
              Emergency Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={disabled}
              placeholder="Describe the incident (e.g. 'Water is gushing from under the kitchen sink, flooring is buckling')"
              className="w-full rounded-lg bg-command-navy border border-slate-800 text-white placeholder-gray-500 text-sm p-3 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 font-mono disabled:opacity-50 resize-none"
            />
          </div>

          <button
            onClick={handleDispatch}
            disabled={disabled || !description.trim() || !coords || fetchingLocation}
            className={`w-full py-3.5 px-6 rounded-lg font-bold transition duration-200 uppercase tracking-widest text-sm shadow-md ${
              !description.trim() || !coords || fetchingLocation
                ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed shadow-none'
                : 'bg-emergency-red hover:bg-red-600 text-white shadow-red-950/30'
            }`}
          >
            🚨 Request Dispatch Now
          </button>
        </div>
      )}
    </div>
  );
}

ManualGrid.propTypes = {
  onManualDispatch: PropTypes.func.isRequired,
  onLocation: PropTypes.func.isRequired,
  onFallback: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};
