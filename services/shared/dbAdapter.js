const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const usersPath = path.join(__dirname, 'users.json');
const vendorsPath = path.join(__dirname, 'vendors.json');
const dispatchesPath = path.join(__dirname, 'dispatches.json');

function readData(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading data from ${filePath}:`, err);
    return [];
  }
}

function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing data to ${filePath}:`, err);
  }
}

function readUsers() {
  return readData(usersPath);
}

function readVendors() {
  const vendorsData = readData(vendorsPath);
  return vendorsData.map(vendor => {
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
}

function readDispatches() {
  return readData(dispatchesPath);
}

console.log('[CogniDispatch DB] ✅ Running in Offline File-Synced Mock Mode');

// ─────────────────────────────────────────────────────
// Password hashing (replicated from original dbAdapter)
// ─────────────────────────────────────────────────────
function hashPassword(password) {
  return crypto.pbkdf2Sync(password, 'salt_cognidispatch', 1000, 64, 'sha512').toString('hex');
}

// ─────────────────────────────────────────────────────
// In-Memory DB Adapter Mock Collections (File-Backed)
// ─────────────────────────────────────────────────────

const Users = {
  find: () => Promise.resolve(JSON.parse(JSON.stringify(readUsers()))),

  findById: (id) => {
    const users = readUsers();
    const user = users.find(u => u.id === id);
    return Promise.resolve(user ? JSON.parse(JSON.stringify(user)) : null);
  },

  findByEmail: (email) => {
    const users = readUsers();
    const user = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    return Promise.resolve(user ? JSON.parse(JSON.stringify(user)) : null);
  },

  create: (user) => {
    const users = readUsers();
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
    writeData(usersPath, users);
    return Promise.resolve(JSON.parse(JSON.stringify(newUser)));
  },

  update: (id, updates) => {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      writeData(usersPath, users);
      return Promise.resolve(JSON.parse(JSON.stringify(users[idx])));
    }
    return Promise.resolve(null);
  }
};

const Vendors = {
  find: () => Promise.resolve(JSON.parse(JSON.stringify(readVendors()))),

  findById: (id) => {
    const vendors = readVendors();
    const vendor = vendors.find(v => v.id === id);
    return Promise.resolve(vendor ? JSON.parse(JSON.stringify(vendor)) : null);
  },

  findByPhone: (phone) => {
    const vendors = readVendors();
    const vendor = vendors.find(v => v.phone === phone);
    return Promise.resolve(vendor ? JSON.parse(JSON.stringify(vendor)) : null);
  },

  create: (vendor) => {
    const vendors = readVendors();
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
    writeData(vendorsPath, vendors);
    return Promise.resolve(JSON.parse(JSON.stringify(newVendor)));
  },

  update: (id, updates) => {
    const vendors = readVendors();
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
      writeData(vendorsPath, vendors);
      return Promise.resolve(JSON.parse(JSON.stringify(vendors[idx])));
    }
    return Promise.resolve(null);
  }
};

const Dispatches = {
  find: () => Promise.resolve(JSON.parse(JSON.stringify(readDispatches()))),

  findById: (id) => {
    const dispatches = readDispatches();
    const dispatch = dispatches.find(d => d.id === id);
    return Promise.resolve(dispatch ? JSON.parse(JSON.stringify(dispatch)) : null);
  },

  findBySocketId: (socketId) => {
    const dispatches = readDispatches();
    const dispatch = dispatches.find(d => d.socketId === socketId);
    return Promise.resolve(dispatch ? JSON.parse(JSON.stringify(dispatch)) : null);
  },

  findActiveByVendorId: (vendorId) => {
    const dispatches = readDispatches();
    const active = dispatches.find(d => d.vendorId === vendorId && !['COMPLETED', 'DECLINED', 'CANCELLED'].includes(d.status));
    return Promise.resolve(active ? JSON.parse(JSON.stringify(active)) : null);
  },

  create: (dispatch) => {
    const dispatches = readDispatches();
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
    writeData(dispatchesPath, dispatches);
    return Promise.resolve(JSON.parse(JSON.stringify(newDispatch)));
  },

  update: (id, updates) => {
    const dispatches = readDispatches();
    const idx = dispatches.findIndex(d => d.id === id);
    if (idx !== -1) {
      dispatches[idx] = {
        ...dispatches[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      writeData(dispatchesPath, dispatches);
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

