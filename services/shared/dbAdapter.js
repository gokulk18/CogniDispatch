const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Hash password function
function hashPassword(password) {
  return crypto.pbkdf2Sync(password, 'salt_cognidispatch', 1000, 64, 'sha512').toString('hex');
}

// Check if we should use CosmosDB/MongoDB or fallback to mock files
const MONGODB_URI = process.env.MONGODB_URI;
const isMockMode = !MONGODB_URI || 
                   MONGODB_URI.includes('<user>') || 
                   MONGODB_URI.includes('mock') || 
                   MONGODB_URI.trim() === '';

let dbAdapter;

if (isMockMode) {
  console.log('[CogniDispatch DB] ✅ Running in Offline File-Synced Mock Mode');
  
  const usersPath = path.join(__dirname, 'users.json');
  const vendorsPath = path.join(__dirname, 'vendors.json');
  const dispatchesPath = path.join(__dirname, 'dispatches.json');
  
  function readData(filePath) {
    try {
      if (!fs.existsSync(filePath)) return [];
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
  
  const Users = {
    find: () => Promise.resolve(JSON.parse(JSON.stringify(readData(usersPath)))),
    findById: (id) => {
      const users = readData(usersPath);
      const user = users.find(u => u.id === id);
      return Promise.resolve(user ? JSON.parse(JSON.stringify(user)) : null);
    },
    findByEmail: (email) => {
      const users = readData(usersPath);
      const user = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
      return Promise.resolve(user ? JSON.parse(JSON.stringify(user)) : null);
    },
    create: (user) => {
      const users = readData(usersPath);
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
      const users = readData(usersPath);
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
    find: () => {
      const vendorsData = readData(vendorsPath);
      return Promise.resolve(vendorsData.map(vendor => {
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
      }));
    },
    findById: (id) => {
      const vendorsData = readData(vendorsPath);
      const vendor = vendorsData.find(v => v.id === id);
      if (!vendor) return Promise.resolve(null);
      const lat = vendor.lat !== undefined ? Number(vendor.lat) : 8.53633;
      const lng = vendor.lng !== undefined ? Number(vendor.lng) : 76.88329;
      return Promise.resolve(JSON.parse(JSON.stringify({
        ...vendor,
        lat,
        lng,
        location: { type: 'Point', coordinates: [lng, lat] }
      })));
    },
    findByPhone: (phone) => {
      const vendorsData = readData(vendorsPath);
      const vendor = vendorsData.find(v => v.phone === phone);
      if (!vendor) return Promise.resolve(null);
      const lat = vendor.lat !== undefined ? Number(vendor.lat) : 8.53633;
      const lng = vendor.lng !== undefined ? Number(vendor.lng) : 76.88329;
      return Promise.resolve(JSON.parse(JSON.stringify({
        ...vendor,
        lat,
        lng,
        location: { type: 'Point', coordinates: [lng, lat] }
      })));
    },
    create: (vendor) => {
      const vendors = readData(vendorsPath);
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
      const vendors = readData(vendorsPath);
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
    find: () => Promise.resolve(JSON.parse(JSON.stringify(readData(dispatchesPath)))),
    findById: (id) => {
      const dispatches = readData(dispatchesPath);
      const dispatch = dispatches.find(d => d.id === id);
      return Promise.resolve(dispatch ? JSON.parse(JSON.stringify(dispatch)) : null);
    },
    findBySocketId: (socketId) => {
      const dispatches = readData(dispatchesPath);
      const dispatch = dispatches.find(d => d.socketId === socketId);
      return Promise.resolve(dispatch ? JSON.parse(JSON.stringify(dispatch)) : null);
    },
    findActiveByVendorId: (vendorId) => {
      const dispatches = readData(dispatchesPath);
      const active = dispatches.find(d => d.vendorId === vendorId && !['COMPLETED', 'DECLINED', 'CANCELLED'].includes(d.status));
      return Promise.resolve(active ? JSON.parse(JSON.stringify(active)) : null);
    },
    create: (dispatch) => {
      const dispatches = readData(dispatchesPath);
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
      const dispatches = readData(dispatchesPath);
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

  dbAdapter = {
    hashPassword,
    Users,
    Vendors,
    Dispatches
  };

} else {
  console.log('[CogniDispatch DB] 📡 Connecting to CosmosDB / MongoDB...');
  
  const UserSchema = new mongoose.Schema({
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    lat: { type: Number, default: 8.53633 },
    lng: { type: Number, default: 76.88329 },
    balance: { type: Number, default: 0 },
    passwordHash: { type: String, required: true }
  }, { timestamps: true });

  const VendorSchema = new mongoose.Schema({
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    technician: { type: String, default: '' },
    phone: { type: String, unique: true, sparse: true },
    email: { type: String, default: '' },
    category: { type: String, default: 'PLUMBING' },
    address: { type: String, default: '' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [76.88329, 8.53633] }
    },
    lat: { type: Number, default: 8.53633 },
    lng: { type: Number, default: 76.88329 },
    available: { type: Boolean, default: true },
    busy: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    completed_jobs: { type: Number, default: 0 },
    rating: { type: Number, default: 4.5 },
    rating_count: { type: Number, default: 1 },
    passwordHash: { type: String, required: true }
  }, { timestamps: true });
  VendorSchema.index({ location: '2dsphere' });

  const DispatchSchema = new mongoose.Schema({
    id: { type: String, unique: true, index: true },
    socketId: { type: String, default: '' },
    userId: { type: String, default: '' },
    userName: { type: String, default: '' },
    vendorId: { type: String, default: '' },
    vendorName: { type: String, default: '' },
    technicianName: { type: String, default: '' },
    category: { type: String, default: 'PLUMBING' },
    urgency: { type: String, default: 'HIGH' },
    amount: { type: Number, default: 0 },
    status: { type: String, default: 'PENDING' },
    otp: { type: String, default: '' },
    rating: { type: Number, default: null },
    targetLat: { type: Number, default: 0 },
    targetLng: { type: Number, default: 0 },
    vendorLat: { type: Number, default: 0 },
    vendorLng: { type: Number, default: 0 },
    summary: { type: String, default: '' },
    mitigationSteps: { type: [String], default: [] },
    timestamp: { type: Date, default: Date.now }
  }, { timestamps: true });
  DispatchSchema.index({ vendorId: 1, status: 1 });

  const User = mongoose.model('User', UserSchema);
  const Vendor = mongoose.model('Vendor', VendorSchema);
  const Dispatch = mongoose.model('Dispatch', DispatchSchema);

  const isCosmosDB = MONGODB_URI.includes('cosmos.azure.com');
  const mongooseOptions = {
    serverSelectionTimeoutMS: 8000,
  };
  if (isCosmosDB) {
    mongooseOptions.tls = true;
    mongooseOptions.retryWrites = false;
  }

  mongoose.connect(MONGODB_URI, mongooseOptions)
    .then(() => console.log('[CogniDispatch DB] ✅ CosmosDB / MongoDB connected successfully.'))
    .catch(err => {
      console.error('[CogniDispatch DB] ❌ CosmosDB / MongoDB connection failed:', err.message);
      process.exit(1);
    });

  const Users = {
    find: () => User.find().lean(),
    findById: (id) => User.findOne({ id }).lean(),
    findByEmail: (email) => User.findOne({ email: email.toLowerCase() }).lean(),
    create: async (user) => {
      const newUser = new User({
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        balance: 0,
        ...user,
        email: (user.email || '').toLowerCase(),
        passwordHash: hashPassword(user.password || 'password123')
      });
      delete newUser.password;
      const saved = await newUser.save();
      return saved.toObject();
    },
    update: (id, updates) => User.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean()
  };

  const Vendors = {
    find: () => Vendor.find().lean(),
    findById: (id) => Vendor.findOne({ id }).lean(),
    findByPhone: (phone) => Vendor.findOne({ phone }).lean(),
    create: async (vendor) => {
      const lat = vendor.lat !== undefined ? Number(vendor.lat) : 8.53633;
      const lng = vendor.lng !== undefined ? Number(vendor.lng) : 76.88329;
      const newVendor = new Vendor({
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
        passwordHash: hashPassword(vendor.password || 'password123')
      });
      delete newVendor.password;
      const saved = await newVendor.save();
      return saved.toObject();
    },
    update: async (id, updates) => {
      const set = { ...updates };
      if (updates.lat !== undefined || updates.lng !== undefined) {
        const existing = await Vendor.findOne({ id }).lean();
        const newLat = updates.lat !== undefined ? updates.lat : (existing ? existing.lat : 8.53633);
        const newLng = updates.lng !== undefined ? updates.lng : (existing ? existing.lng : 76.88329);
        set.location = { type: 'Point', coordinates: [newLng, newLat] };
      }
      return Vendor.findOneAndUpdate({ id }, { $set: set }, { new: true }).lean();
    }
  };

  const Dispatches = {
    find: () => Dispatch.find().lean(),
    findById: (id) => Dispatch.findOne({ id }).lean(),
    findBySocketId: (socketId) => Dispatch.findOne({ socketId }).lean(),
    findActiveByVendorId: (vendorId) => Dispatch.findOne({
      vendorId,
      status: { $nin: ['COMPLETED', 'DECLINED', 'CANCELLED'] }
    }).lean(),
    create: async (dispatch) => {
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      const newDispatch = new Dispatch({
        id: 'disp_' + Math.random().toString(36).substr(2, 9),
        status: 'PENDING',
        otp: otpCode,
        rating: null,
        timestamp: new Date(),
        ...dispatch
      });
      const saved = await newDispatch.save();
      return saved.toObject();
    },
    update: (id, updates) => Dispatch.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean()
  };

  dbAdapter = {
    hashPassword,
    Users,
    Vendors,
    Dispatches
  };
}

module.exports = dbAdapter;
