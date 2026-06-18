const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const paymentController = require('./controllers/paymentController');

const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json());

app.get('/api/payments/health', (req, res) => res.json({ status: "online", service: "payment-service" }));

// Mount routes at /api/payments
app.use('/api/payments', paymentController);

const PORT = process.env.PORT || 5006;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Payment Service listening on port ${PORT}`);
});
