require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');

const dbAdapter = require('cognidispatch-shared').dbAdapter;

const app = express();
const httpServer = http.createServer(app);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json());

app.get('/api/dispatches/health', (req, res) => res.json({ status: "online", service: "dispatch-service" }));

// Single Dispatch Query Endpoint
app.get('/api/dispatches/:id', async (req, res) => {
  try {
    const dispatch = await dbAdapter.Dispatches.findById(req.params.id);
    if (!dispatch) {
      return res.status(404).json({ error: "Dispatch record not found." });
    }
    res.json({ success: true, dispatch });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dispatch record", detail: err.message });
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const activeDispatches = new Map();

function clearDispatchInterval(dispatchId) {
  if (activeDispatches.has(dispatchId)) {
    const active = activeDispatches.get(dispatchId);
    clearInterval(active.intervalId);
    activeDispatches.delete(dispatchId);
    console.log(`[CogniDispatch Telemetry] Active interval cleared for dispatch: ${dispatchId}`);
  }
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; 
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lng2 - lng1);

  const a = Math.pow(Math.sin(deltaPhi / 2), 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.pow(Math.sin(deltaLambda / 2), 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`[Socket ${socket.id}] Joined Room: ${roomId}`);
  });

  socket.on('start-tracking', async (payload) => {
    const { 
      targetLat, targetLng, vendorLat, vendorLng,
      userId, userName, vendorId, vendorName, technicianName,
      category, urgency, amount, summary, mitigationSteps 
    } = payload;

    if (targetLat === undefined || targetLng === undefined || vendorLat === undefined || vendorLng === undefined) {
      console.error(`[Socket ${socket.id}] Invalid start-tracking payload`, payload);
      return;
    }

    let techLat = Number(vendorLat);
    let techLng = Number(vendorLng);
    const destLat = Number(targetLat);
    const destLng = Number(targetLng);

    const newDispatch = await dbAdapter.Dispatches.create({
      socketId: socket.id,
      userId: userId || 'u_guest',
      userName: userName || 'Guest Owner',
      vendorId: vendorId || 'v_guest',
      vendorName: vendorName || 'Emergency Support Agency',
      technicianName: technicianName || 'Carlos Mendes',
      category: category || 'PLUMBING',
      urgency: urgency || 'HIGH',
      amount: amount || 3000,
      targetLat: destLat,
      targetLng: destLng,
      vendorLat: techLat,
      vendorLng: techLng,
      summary: summary || 'AI Triage Securement route initialized.',
      mitigationSteps: mitigationSteps || [],
      status: 'PENDING_ACCEPTANCE'
    });

    const dispatchId = newDispatch.id;

    socket.join(`room_disp_${dispatchId}`);
    socket.emit('dispatch-created', { dispatchId, otp: newDispatch.otp });

    if (vendorId) {
      console.log(`[CogniDispatch Telemetry] Alerting Technician Room: room_v_${vendorId} for dispatch: ${dispatchId}`);
      io.to(`room_v_${vendorId}`).emit('new-job-request', {
        dispatch: newDispatch
      });
    }

    console.log(`[Socket ${socket.id}] Dispatch ${dispatchId} pending acceptance by technician ${vendorId}`);
  });

  socket.on('accept-job', async (payload) => {
    const { dispatchId, vendorId } = payload;
    
    const dispatch = await dbAdapter.Dispatches.findById(dispatchId);
    if (!dispatch) {
      console.error(`[CogniDispatch Telemetry] Failed to accept job: Dispatch ${dispatchId} not found`);
      return;
    }

    await dbAdapter.Dispatches.update(dispatchId, { status: 'EN_ROUTE' });
    await dbAdapter.Vendors.update(vendorId, { busy: true });

    socket.join(`room_disp_${dispatchId}`);
    io.to(`room_disp_${dispatchId}`).emit('job-accepted', { dispatchId, vendorId });

    clearDispatchInterval(dispatchId);

    let techLat = Number(dispatch.vendorLat);
    let techLng = Number(dispatch.vendorLng);
    const destLat = Number(dispatch.targetLat);
    const destLng = Number(dispatch.targetLng);

    const intervalId = setInterval(async () => {
      if (!activeDispatches.has(dispatchId)) {
        clearInterval(intervalId);
        return;
      }

      const active = activeDispatches.get(dispatchId);
      const stepFactor = 0.08 + Math.random() * 0.07;
      
      const latDiff = destLat - active.techLat;
      const lngDiff = destLng - active.techLng;

      const jitterLat = (Math.random() - 0.5) * 0.0002;
      const jitterLng = (Math.random() - 0.5) * 0.0002;

      active.techLat += latDiff * stepFactor + jitterLat;
      active.techLng += lngDiff * stepFactor + jitterLng;

      const distance = haversineDistance(active.techLat, active.techLng, destLat, destLng);
      const etaSeconds = distance < 50 ? 0 : Math.round(distance / 15);

      dbAdapter.Dispatches.update(dispatchId, {
        vendorLat: parseFloat(active.techLat.toFixed(6)),
        vendorLng: parseFloat(active.techLng.toFixed(6))
      }).catch(err => console.error('[Telemetry] Coord update failed:', err.message));

      io.to(`room_disp_${dispatchId}`).emit('tech-location-update', {
        dispatchId,
        lat: parseFloat(active.techLat.toFixed(6)),
        lng: parseFloat(active.techLng.toFixed(6)),
        distanceMeters: parseFloat(distance.toFixed(1)),
        eta: etaSeconds
      });

      if (distance < 50) {
        console.log(`[CogniDispatch Telemetry] Technician arrived for dispatch ${dispatchId}!`);
        
        await dbAdapter.Dispatches.update(dispatchId, { status: 'ARRIVED' });
        io.to(`room_disp_${dispatchId}`).emit('tech-arrived', { dispatchId });

        clearInterval(active.intervalId);
        activeDispatches.delete(dispatchId);
      }
    }, 3000);

    activeDispatches.set(dispatchId, {
      dispatchId,
      techLat,
      techLng,
      targetLat: destLat,
      targetLng: destLng,
      intervalId
    });

    console.log(`[CogniDispatch Telemetry] Active en-route drive initialized for dispatch ${dispatchId} by technician ${vendorId}`);
  });

  socket.on('decline-job', async (payload) => {
    const { dispatchId, vendorId } = payload;
    console.log(`[CogniDispatch Telemetry] Technician ${vendorId} declined dispatch ${dispatchId}`);
    
    await dbAdapter.Vendors.update(vendorId, { busy: false });
    await dbAdapter.Dispatches.update(dispatchId, { status: 'DECLINED' });

    clearDispatchInterval(dispatchId);
    io.to(`room_disp_${dispatchId}`).emit('job-declined', { dispatchId });
  });

  socket.on('verify-otp', async (payload) => {
    const { dispatchId, otp } = payload;
    console.log(`[CogniDispatch Telemetry] Technician submitted OTP verification for dispatch ${dispatchId}`);

    const dispatch = await dbAdapter.Dispatches.findById(dispatchId);
    if (!dispatch) {
      socket.emit('otp-error', { error: "Dispatch record not found." });
      return;
    }

    if (dispatch.otp === otp.trim()) {
      console.log(`[CogniDispatch Telemetry] OTP verification SUCCESS for dispatch ${dispatchId}`);
      
      await dbAdapter.Dispatches.update(dispatchId, { status: 'ARRIVED' });
      
      io.to(`room_disp_${dispatchId}`).emit('otp-verified', { dispatchId });
      io.to(`room_disp_${dispatchId}`).emit('tech-arrived', { dispatchId });

      clearDispatchInterval(dispatchId);
    } else {
      console.warn(`[CogniDispatch Telemetry] OTP FAILED for dispatch ${dispatchId}: expected ${dispatch.otp}, received ${otp}`);
      socket.emit('otp-error', { error: "Invalid verification code. Please confirm with the homeowner." });
    }
  });

  socket.on('technician-mark-arrived', async (payload) => {
    const { dispatchId } = payload;
    console.log(`[CogniDispatch Telemetry] Technician manual arrival override for dispatch ${dispatchId}`);
    
    await dbAdapter.Dispatches.update(dispatchId, { status: 'ARRIVED' });
    io.to(`room_disp_${dispatchId}`).emit('tech-arrived', { dispatchId });

    clearDispatchInterval(dispatchId);
  });

  socket.on('technician-complete-mitigation', async (payload) => {
    const { dispatchId } = payload;
    console.log(`[CogniDispatch Telemetry] Technician complete-mitigation for dispatch ${dispatchId}`);
    
    await dbAdapter.Dispatches.update(dispatchId, { status: 'PENDING_PAYMENT' });
    io.to(`room_disp_${dispatchId}`).emit('trigger-razorpay-invoice', { dispatchId });
  });

  socket.on('payment-authorized-success', (payload) => {
    const { dispatchId, rating } = payload;
    console.log(`[CogniDispatch Telemetry] Homeowner completed checkout payment for dispatch ${dispatchId}`);
    
    io.to(`room_disp_${dispatchId}`).emit('job-completed-success', { dispatchId, rating });
  });

  socket.on('stop-tracking', async (payload) => {
    const dispatchId = payload?.dispatchId;
    if (dispatchId) {
      clearDispatchInterval(dispatchId);
    } else {
      const dispatch = await dbAdapter.Dispatches.findBySocketId(socket.id);
      if (dispatch) clearDispatchInterval(dispatch.id);
    }
    console.log(`[Socket ${socket.id}] Tracking stopped manually`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5005;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Dispatch Service listening on port ${PORT}`);
});
