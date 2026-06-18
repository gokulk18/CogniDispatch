const express = require('express');
const dbAdapter = require('cognidispatch-shared').dbAdapter;
const router = express.Router();

// POST /api/payments/checkout
router.post('/checkout', async (req, res) => {
  const { dispatchId, rating, cardNumber, cardHolder, cardExpiry, cardCvv } = req.body;

  if (!dispatchId) {
    return res.status(400).json({ error: "dispatchId is required." });
  }

  // Basic validation to simulate card authorization
  if (!cardNumber || !cardExpiry || !cardCvv) {
    return res.status(400).json({ error: "Missing required card details (number, expiry, cvv)." });
  }

  try {
    // 1. Fetch dispatch
    const dispatch = await dbAdapter.Dispatches.findById(dispatchId);
    if (!dispatch) {
      return res.status(404).json({ error: "Dispatch record not found." });
    }

    if (dispatch.status === 'COMPLETED') {
      return res.status(400).json({ error: "This dispatch call has already been paid and completed." });
    }

    // 2. Fetch associated technician/vendor
    const techId = dispatch.vendorId;
    const vendor = await dbAdapter.Vendors.findById(techId);
    if (!vendor) {
      return res.status(404).json({ error: "Associated responder unit not found." });
    }

    // 3. Perform financial calculations & updates
    const numericRating    = rating ? Number(rating) : 5;
    const totalAmount      = dispatch.amount || 0;
    const vendorPayout     = Math.round(totalAmount * 0.8); // 80% payout
    const newCompletedCount = (vendor.completed_jobs || 0) + 1;
    const newRatingCount    = (vendor.rating_count || 1) + 1;
    const newAvgRating      = parseFloat((((vendor.rating || 4.5) * (newRatingCount - 1) + numericRating) / newRatingCount).toFixed(2));
    const newBalance        = (vendor.balance || 0) + vendorPayout;

    // 4. Update vendor details (reset busy state, record average rating, credit balance)
    await dbAdapter.Vendors.update(techId, {
      busy: false,
      completed_jobs: newCompletedCount,
      rating_count: newRatingCount,
      rating: newAvgRating,
      balance: newBalance
    });

    // 5. Update dispatch details to COMPLETED with user rating
    const updatedDispatch = await dbAdapter.Dispatches.update(dispatchId, {
      status: 'COMPLETED',
      rating: numericRating
    });

    console.log(`[Payment Service] Simulated charge for card ending in ${cardNumber.slice(-4)} authorized. Dispatch ${dispatchId} completed.`);

    return res.json({
      success: true,
      message: "Razorpay transaction authorized securely! Payout completed successfully via Payment Service.",
      payoutAmount: vendorPayout,
      dispatch: updatedDispatch
    });

  } catch (err) {
    console.error("Payment checkout process failed:", err);
    return res.status(500).json({ error: "Payment Service failed to complete billing loop", detail: err.message });
  }
});

module.exports = router;
