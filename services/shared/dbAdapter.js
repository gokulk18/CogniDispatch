const mongoose = require('mongoose');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────
// Password hashing (unchanged — same algorithm as before)
// ─────────────────────────────────────────────────────
function hashPassword(password) {
  return crypto.pbkdf2Sync(password, 'salt_cognidispatch', 1000, 64, 'sha512').toString('hex');
}

// ─────────────────────────────────────────────────────
// Mongoose Schemas
// ─────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  id:           { type: String, unique: true, index: true },
  name:         { type: String, required: true },
  email:        { type: String, unique: true, lowercase: true, index: true },
  phone:        { type: String, default: '' },
  address:      { type: String, default: '' },
  lat:          { type: Number, default: 8.53633 },
  lng:          { type: Number, default: 76.88329 },
  balance:      { type: Number, default: 0 },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

const VendorSchema = new mongoose.Schema({
  id:             { type: String, unique: true, index: true },
  name:           { type: String, required: true },
  technician:     { type: String, default: '' },
  phone:          { type: String, unique: true, sparse: true },
  email:          { type: String, default: '' },
  category:       { type: String, default: 'PLUMBING' },
  address:        { type: String, default: '' },
  // GeoJSON for native $geoNear distance queries
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [76.88329, 8.53633] } // [lng, lat]
  },
  lat:            { type: Number, default: 8.53633 },
  lng:            { type: Number, default: 76.88329 },
  available:      { type: Boolean, default: true },
  busy:           { type: Boolean, default: false },
  balance:        { type: Number, default: 0 },
  completed_jobs: { type: Number, default: 0 },
  rating:         { type: Number, default: 4.5 },
  rating_count:   { type: Number, default: 1 },
  passwordHash:   { type: String, required: true }
}, { timestamps: true });

// 2dsphere index enables native geospatial queries
VendorSchema.index({ location: '2dsphere' });

const DispatchSchema = new mongoose.Schema({
  id:              { type: String, unique: true, index: true },
  socketId:        { type: String, default: '' },
  userId:          { type: String, default: '' },
  userName:        { type: String, default: '' },
  vendorId:        { type: String, default: '' },
  vendorName:      { type: String, default: '' },
  technicianName:  { type: String, default: '' },
  category:        { type: String, default: 'PLUMBING' },
  urgency:         { type: String, default: 'HIGH' },
  amount:          { type: Number, default: 0 },
  status:          { type: String, default: 'PENDING' },
  otp:             { type: String, default: '' },
  rating:          { type: Number, default: null },
  targetLat:       { type: Number, default: 0 },
  targetLng:       { type: Number, default: 0 },
  vendorLat:       { type: Number, default: 0 },
  vendorLng:       { type: Number, default: 0 },
  summary:         { type: String, default: '' },
  mitigationSteps: { type: [String], default: [] },
  timestamp:       { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index for fast active-job-by-vendor lookups
DispatchSchema.index({ vendorId: 1, status: 1 });

// ─────────────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────────────
const User     = mongoose.model('User',     UserSchema);
const Vendor   = mongoose.model('Vendor',   VendorSchema);
const Dispatch = mongoose.model('Dispatch', DispatchSchema);

// ─────────────────────────────────────────────────────
// MongoDB Connection
// ─────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cognidispatch';

const isCosmosDB = MONGODB_URI.includes('cosmos.azure.com');

const mongooseOptions = {
  serverSelectionTimeoutMS: 8000,
};

if (isCosmosDB) {
  mongooseOptions.tls = true;
  mongooseOptions.retryWrites = false;
}

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => console.log('[CogniDispatch DB] ✅ MongoDB connected:', MONGODB_URI.split('@').pop()))
  .catch(err => {
    console.error('[CogniDispatch DB] ❌ MongoDB connection failed:', err.stack);
    process.exit(1);
  });

// ─────────────────────────────────────────────────────
// DB Adapter — same method signatures as before (now async)
// ─────────────────────────────────────────────────────
const dbAdapter = {
  hashPassword,

  // ── USERS ──────────────────────────────────────────
  Users: {
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

    update: (id, updates) =>
      User.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean()
  },

  // ── VENDORS ────────────────────────────────────────
  Vendors: {
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
      // Keep GeoJSON location field in sync when lat/lng are updated
      const set = { ...updates };
      if (updates.lat !== undefined || updates.lng !== undefined) {
        const existing = await Vendor.findOne({ id }).lean();
        const newLat = updates.lat !== undefined ? updates.lat : (existing ? existing.lat : 8.53633);
        const newLng = updates.lng !== undefined ? updates.lng : (existing ? existing.lng : 76.88329);
        set.location = { type: 'Point', coordinates: [newLng, newLat] };
      }
      return Vendor.findOneAndUpdate({ id }, { $set: set }, { new: true }).lean();
    }
  },

  // ── DISPATCHES ─────────────────────────────────────
  Dispatches: {
    find: () => Dispatch.find().lean(),

    findById: (id) => Dispatch.findOne({ id }).lean(),

    findBySocketId: (socketId) => Dispatch.findOne({ socketId }).lean(),

    findActiveByVendorId: (vendorId) =>
      Dispatch.findOne({
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

    update: (id, updates) =>
      Dispatch.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean()
  }
};

module.exports = dbAdapter;
