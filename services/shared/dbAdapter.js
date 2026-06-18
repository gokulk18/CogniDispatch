const path = require('path');
const crypto = require('crypto');

// Load initial seed data from JSON files in the shared module
const usersData = require('./users.json');
const vendorsData = require('./vendors.json');
const dispatchesData = require('./dispatches.json');

// Initialize in-memory state arrays
const users = [...usersData];
const vendors = vendorsData.map(vendor => {
  const lat = vendor.lat !== undefined ? Number(vendor.lat) : 8.53633;
  const lng = vendor.lng !== undefined ? Number(vendor.lng) : 76.88329;
  return {
    ...vendor,
    lat,
    lng,
    location: { type: 'Point', coordinates: [lng, lat] },
    available: vendor.available !== undefined ? vendor.available : true,
    busy: vendor.busy !== undefined ? vendor.busy : false,
    balance: vendor.balance !== undefined ? Number(vendor.balance) : 0,
    completed_jobs: vendor.completed_jobs !== undefined ? Number(vendor.completed_jobs) : 0,
    rating: vendor.rating !== undefined ? Number(vendor.rating) : 4.5,
    rating_count: vendor.rating_count !== undefined ? Number(vendor.rating_count) : 1
  };
});
const dispatches = [...dispatchesData];

console.log('[CogniDispatch DB] ✅ Running in Offline In-Memory Mock Mode (No MongoDB Server required)');

// ─────────────────────────────────────────────────────
// Password hashing (replicated from original dbAdapter)
// ─────────────────────────────────────────────────────
function hashPassword(password) {
  return crypto.pbkdf2Sync(password, 'salt_cognidispatch', 1000, 64, 'sha512').toString('hex');
}

// ─────────────────────────────────────────────────────
// In-Memory DB Adapter Mock Collections
// ─────────────────────────────────────────────────────

const Users = {
  find: () => Promise.resolve(JSON.parse(JSON.stringify(users))),

  findById: (id) => {
    const user = users.find(u => u.id === id);
    return Promise.resolve(user ? JSON.parse(JSON.stringify(user)) : null);
  },

  findByEmail: (email) => {
    const user = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    return Promise.resolve(user ? JSON.parse(JSON.stringify(user)) : null);
  },

  create: (user) => {
    const newUser = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      balance: 0,
      lat: user.lat !== undefined ? Number(user.lat) : 8.53633,
      lng: user.lng !== undefined ? Number(user.lng) : 76.88329,
      ...user,
      email: (user.email || '').toLowerCase(),
      passwordHash: hashPassword(user.password || 'password123'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    delete newUser.password;
    users.push(newUser);
    return Promise.resolve(JSON.parse(JSON.stringify(newUser)));
  },

  update: (id, updates) => {
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return Promise.resolve(JSON.parse(JSON.stringify(users[idx])));
    }
    return Promise.resolve(null);
  }
};

const Vendors = {
  find: () => Promise.resolve(JSON.parse(JSON.stringify(vendors))),

  findById: (id) => {
    const vendor = vendors.find(v => v.id === id);
    return Promise.resolve(vendor ? JSON.parse(JSON.stringify(vendor)) : null);
  },

  findByPhone: (phone) => {
    const vendor = vendors.find(v => v.phone === phone);
    return Promise.resolve(vendor ? JSON.parse(JSON.stringify(vendor)) : null);
  },

  create: (vendor) => {
    const lat = vendor.lat !== undefined ? Number(vendor.lat) : 8.53633;
    const lng = vendor.lng !== undefined ? Number(vendor.lng) : 76.88329;
    const newVendor = {
      id: 'v_' + Math.random().toString(36).substr(2, 9),
      available: true,
      busy: false,
      balance: 0,
      completed_jobs: 0,
      rating_count: 1,
      rating: 4.5,
      ...vendor,
      lat,
      lng,
      location: { type: 'Point', coordinates: [lng, lat] },
      passwordHash: hashPassword(vendor.password || 'password123'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    delete newVendor.password;
    vendors.push(newVendor);
    return Promise.resolve(JSON.parse(JSON.stringify(newVendor)));
  },

  update: (id, updates) => {
    const idx = vendors.findIndex(v => v.id === id);
    if (idx !== -1) {
      const existing = vendors[idx];
      const set = { ...updates };
      if (updates.lat !== undefined || updates.lng !== undefined) {
        const newLat = updates.lat !== undefined ? Number(updates.lat) : existing.lat;
        const newLng = updates.lng !== undefined ? Number(updates.lng) : existing.lng;
        set.lat = newLat;
        set.lng = newLng;
        set.location = { type: 'Point', coordinates: [newLng, newLat] };
      }
      vendors[idx] = {
        ...existing,
        ...set,
        updatedAt: new Date().toISOString()
      };
      return Promise.resolve(JSON.parse(JSON.stringify(vendors[idx])));
    }
    return Promise.resolve(null);
  }
};

const Dispatches = {
  find: () => Promise.resolve(JSON.parse(JSON.stringify(dispatches))),

  findById: (id) => {
    const dispatch = dispatches.find(d => d.id === id);
    return Promise.resolve(dispatch ? JSON.parse(JSON.stringify(dispatch)) : null);
  },

  findBySocketId: (socketId) => {
    const dispatch = dispatches.find(d => d.socketId === socketId);
    return Promise.resolve(dispatch ? JSON.parse(JSON.stringify(dispatch)) : null);
  },

  findActiveByVendorId: (vendorId) => {
    const active = dispatches.find(d => d.vendorId === vendorId && !['COMPLETED', 'DECLINED', 'CANCELLED'].includes(d.status));
    return Promise.resolve(active ? JSON.parse(JSON.stringify(active)) : null);
  },

  create: (dispatch) => {
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const newDispatch = {
      id: 'disp_' + Math.random().toString(36).substr(2, 9),
      status: 'PENDING',
      otp: otpCode,
      rating: null,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...dispatch
    };
    dispatches.push(newDispatch);
    return Promise.resolve(JSON.parse(JSON.stringify(newDispatch)));
  },

  update: (id, updates) => {
    const idx = dispatches.findIndex(d => d.id === id);
    if (idx !== -1) {
      dispatches[idx] = {
        ...dispatches[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return Promise.resolve(JSON.parse(JSON.stringify(dispatches[idx])));
    }
    return Promise.resolve(null);
  }
};

const dbAdapter = {
  hashPassword,
  Users,
  Vendors,
  Dispatches
};

module.exports = dbAdapter;
