import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Sub-component to handle map panning when tech coordinates change
function ChangeMapCenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.lat && coords.lng) {
      map.setView([coords.lat, coords.lng], map.getZoom());
    }
  }, [coords, map]);
  return null;
}

export default function LiveTrackerMap({ userCoords, techCoords, vendor }) {
  // Safe default fallback center
  const centerLat = userCoords?.lat || 40.7128;
  const centerLng = userCoords?.lng || -74.0060;

  // Custom User Marker Icon (Blue pulse circle)
  const userIcon = typeof window !== 'undefined' ? L.divIcon({
    className: 'custom-leaflet-user-icon',
    html: `
      <div class="relative flex items-center justify-center h-8 w-8">
        <div class="absolute h-5 w-5 rounded-full bg-blue-500 opacity-40 animate-ping"></div>
        <div class="h-3.5 w-3.5 rounded-full bg-blue-600 border border-white shadow-md"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  }) : null;

  // Custom Technician Marker Icon (Red dispatch glowing dot)
  const techIcon = typeof window !== 'undefined' ? L.divIcon({
    className: 'custom-leaflet-tech-icon',
    html: `
      <div class="relative flex items-center justify-center h-10 w-10">
        <div class="absolute h-8 w-8 rounded-full bg-emergency-red opacity-30 animate-ping"></div>
        <div class="absolute h-6 w-6 rounded-full bg-emergency-red/20 animate-pulse-ring"></div>
        <div class="h-4.5 w-4.5 rounded-full bg-emergency-red border border-white shadow-lg flex items-center justify-center">
          <span class="text-[8px] text-white font-bold">🚑</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  }) : null;

  return (
    <div className="w-full h-full relative border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-command-navy">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          subdomains="abcd"
        />

        {userCoords && userIcon && (
          <Marker position={[userCoords.lat, userCoords.lng]} icon={userIcon}>
            <Popup>
              <div className="text-xs font-mono font-bold text-slate-800">
                🚨 EMERGENCY LOCATION<br/>
                Lat: {userCoords.lat.toFixed(5)}<br/>
                Lng: {userCoords.lng.toFixed(5)}
              </div>
            </Popup>
          </Marker>
        )}

        {techCoords && techIcon && (
          <Marker position={[techCoords.lat, techCoords.lng]} icon={techIcon}>
            <Popup>
              <div className="text-xs font-mono font-bold text-slate-800">
                ⚡ EN ROUTE: {vendor.technician}<br/>
                Agency: {vendor.name}<br/>
                Lat: {techCoords.lat.toFixed(5)}<br/>
                Lng: {techCoords.lng.toFixed(5)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Change center of map to track vehicle in movement */}
        {techCoords && <ChangeMapCenter coords={techCoords} />}
      </MapContainer>
    </div>
  );
}

LiveTrackerMap.propTypes = {
  userCoords: PropTypes.shape({ lat: PropTypes.number.isRequired, lng: PropTypes.number.isRequired }).isRequired,
  techCoords: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
  vendor: PropTypes.object.isRequired
};
