const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Create match booking
router.post('/book', verifyToken, async (req, res) => {
    try {
        const { opponentName, startTime, endTime, homeTeamId, homeTeamName } = req.body;
        
        // Check if slot is available
        const existingMatches = await db.collection('matches')
            .where('startTime', '<', endTime)
            .where('endTime', '>', startTime)
            .where('status', 'in', ['confirmed', 'pending_payment'])
            .get();
        
        if (!existingMatches.empty) {
            return res.status(400).json({ error: 'Time slot already booked' });
        }
        
        // Create match booking
        const matchData = {
            homeTeamId: homeTeamId,
            homeTeamName: homeTeamName,
            opponentName: opponentName,
            startTime: startTime,
            endTime: endTime,
            fee: 50,
            status: 'pending_payment',
            paymentIntentId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const matchRef = await db.collection('matches').add(matchData);
        
        res.status(201).json({
            message: 'Match booking created',
            matchId: matchRef.id,
            match: matchData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all confirmed matches
router.get('/confirmed', async (req, res) => {
    try {
        const matchesSnapshot = await db.collection('matches')
            .where('status', '==', 'confirmed')
            .orderBy('startTime', 'asc')
            .get();
        
        const matches = [];
        matchesSnapshot.forEach(doc => {
            matches.push({ id: doc.id, ...doc.data() });
        });
        
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get team matches
router.get('/team/:teamId', verifyToken, async (req, res) => {
    try {
        const matchesSnapshot = await db.collection('matches')
            .where('homeTeamId', '==', req.params.teamId)
            .orderBy('startTime', 'desc')
            .get();
        
        const matches = [];
        matchesSnapshot.forEach(doc => {
            matches.push({ id: doc.id, ...doc.data() });
        });
        
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update match status
router.patch('/:matchId/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        
        await db.collection('matches').doc(req.params.matchId).update({
            status: status,
            updatedAt: new Date().toISOString()
        });
        
        res.json({ message: 'Match status updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available time slots
router.get('/available-slots', async (req, res) => {
    try {
        const { date } = req.query;
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const bookedMatches = await db.collection('matches')
            .where('startTime', '>=', startOfDay.toISOString())
            .where('startTime', '<=', endOfDay.toISOString())
            .where('status', 'in', ['confirmed', 'pending_payment'])
            .get();
        
        const bookedSlots = [];
        bookedMatches.forEach(doc => {
            const match = doc.data();
            bookedSlots.push({
                start: match.startTime,
                end: match.endTime
            });
        });
        
        // Generate available slots (2-hour intervals from 8 AM to 10 PM)
        const availableSlots = [];
        for (let hour = 8; hour <= 20; hour += 2) {
            const slotStart = new Date(date);
            slotStart.setHours(hour, 0, 0, 0);
            const slotEnd = new Date(date);
            slotEnd.setHours(hour + 2, 0, 0, 0);
            
            const isBooked = bookedSlots.some(slot => {
                const bookedStart = new Date(slot.start);
                const bookedEnd = new Date(slot.end);
                return (slotStart < bookedEnd && slotEnd > bookedStart);
            });
            
            if (!isBooked && slotStart > new Date()) {
                availableSlots.push({
                    start: slotStart.toISOString(),
                    end: slotEnd.toISOString(),
                    displayTime: `${hour}:00 - ${hour + 2}:00`
                });
            }
        }
        
        res.json(availableSlots);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;