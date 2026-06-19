const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const vendorController = require('./controllers/vendorController');

const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json());

app.get('/api/vendors/health', (req, res) => res.json({ status: "online", service: "vendor-service" }));
app.use('/api/vendors', vendorController);

const PORT = process.env.PORT || 5002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vendor Service listening on port ${PORT}`);
});

// Trigger rebuild for semantic tag update
