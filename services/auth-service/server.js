const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authController = require('./controllers/authController');

const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json());

// Health check for VMSS / App Gateway probes
app.get('/api/auth/health', (req, res) => res.json({ status: "online", service: "auth-service" }));

app.use('/api/auth', authController);

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth Service listening on port ${PORT}`);
});
