const express = require('express');
const Stripe = require('stripe');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Create payment intent
router.post('/create-payment-intent', verifyToken, async (req, res) => {
    try {
        const { matchId, amount } = req.body;
        
        // Get match details
        const matchDoc = await db.collection('matches').doc(matchId).get();
        
        if (!matchDoc.exists) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        const match = matchDoc.data();
        
        if (match.status === 'confirmed') {
            return res.status(400).json({ error: 'Match already paid' });
        }
        
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency: 'usd',
            metadata: {
                matchId: matchId,
                teamId: req.user.uid
            }
        });
        
        // Update match with payment intent ID
        await db.collection('matches').doc(matchId).update({
            paymentIntentId: paymentIntent.id,
            updatedAt: new Date().toISOString()
        });
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Webhook to handle successful payments
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle payment success
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const matchId = paymentIntent.metadata.matchId;
        
        // Update match status to confirmed
        await db.collection('matches').doc(matchId).update({
            status: 'confirmed',
            paidAt: new Date().toISOString(),
            paymentDetails: {
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                paymentIntentId: paymentIntent.id
            },
            updatedAt: new Date().toISOString()
        });
        
        // Update team stats
        const matchDoc = await db.collection('matches').doc(matchId).get();
        const match = matchDoc.data();
        
        const teamRef = db.collection('teams').doc(match.homeTeamId);
        await teamRef.update({
            totalMatches: admin.firestore.FieldValue.increment(1)
        });
    }
    
    res.json({ received: true });
});

// Verify payment status
router.get('/verify/:matchId', verifyToken, async (req, res) => {
    try {
        const matchDoc = await db.collection('matches').doc(req.params.matchId).get();
        
        if (!matchDoc.exists) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        const match = matchDoc.data();
        
        res.json({
            status: match.status,
            paid: match.status === 'confirmed',
            paymentDetails: match.paymentDetails || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;