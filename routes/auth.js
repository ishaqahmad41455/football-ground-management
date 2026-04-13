const express = require('express');
const { db, auth } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Register team
router.post('/register', async (req, res) => {
    try {
        const { teamName, email, password, phone, address } = req.body;
        
        // Check if team exists
        const existingTeam = await db.collection('teams').where('email', '==', email).get();
        if (!existingTeam.empty) {
            return res.status(400).json({ error: 'Team already exists' });
        }
        
        // Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: teamName
        });
        
        // Hash password for additional security
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Store team data in Firestore
        const teamData = {
            uid: userRecord.uid,
            teamName: teamName,
            email: email,
            password: hashedPassword,
            phone: phone || '',
            address: address || '',
            balance: 0,
            createdAt: new Date().toISOString(),
            totalMatches: 0,
            wins: 0,
            losses: 0
        };
        
        await db.collection('teams').doc(userRecord.uid).set(teamData);
        
        res.status(201).json({
            message: 'Team registered successfully',
            uid: userRecord.uid,
            teamName: teamName
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login team
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const teamSnapshot = await db.collection('teams').where('email', '==', email).get();
        
        if (teamSnapshot.empty) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const teamDoc = teamSnapshot.docs[0];
        const team = teamDoc.data();
        
        const isValid = await bcrypt.compare(password, team.password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate custom token
        const customToken = await auth.createCustomToken(team.uid);
        
        res.json({
            message: 'Login successful',
            token: customToken,
            team: {
                uid: team.uid,
                teamName: team.teamName,
                email: team.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get team profile
router.get('/profile/:uid', async (req, res) => {
    try {
        const teamDoc = await db.collection('teams').doc(req.params.uid).get();
        
        if (!teamDoc.exists) {
            return res.status(404).json({ error: 'Team not found' });
        }
        
        const team = teamDoc.data();
        delete team.password;
        
        res.json(team);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;