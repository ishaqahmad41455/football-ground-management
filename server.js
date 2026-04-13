const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'football-ground-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// In-memory storage
let teams = [];
let matches = [];
let sports = [
    { id: 1, name: 'Football (Soccer)', icon: '⚽', pricePerSlot: 50, duration: 120 },
    { id: 2, name: 'Cricket', icon: '🏏', pricePerSlot: 60, duration: 180 },
    { id: 3, name: 'Basketball', icon: '🏀', pricePerSlot: 40, duration: 60 },
    { id: 4, name: 'Tennis', icon: '🎾', pricePerSlot: 35, duration: 60 },
    { id: 5, name: 'Badminton', icon: '🏸', pricePerSlot: 25, duration: 60 },
    { id: 6, name: 'Volleyball', icon: '🏐', pricePerSlot: 40, duration: 90 }
];
let playerProfiles = [];
let teamRequests = [];
let messages = [];
let notifications = [];

let nextTeamId = 1;
let nextMatchId = 1;
let nextPlayerId = 1;
let nextRequestId = 1;
let nextMessageId = 1;

// Admin credentials (in production, store securely)
const ADMIN_EMAIL = 'admin@footyground.com';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

// Middleware to check if user is admin
function isAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}

// ============= AUTH ROUTES =============
app.post('/api/auth/register', async (req, res) => {
    try {
        const { teamName, email, password, phone, sportPreferences, skillLevel, location } = req.body;
        
        if (teams.find(t => t.email === email)) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        if (teams.find(t => t.teamName === teamName)) {
            return res.status(400).json({ error: 'Team name already taken' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newTeam = {
            id: nextTeamId++,
            teamName,
            email,
            password: hashedPassword,
            phone: phone || '',
            sportPreferences: sportPreferences || [1],
            skillLevel: skillLevel || 'Intermediate',
            location: location || '',
            createdAt: new Date().toISOString(),
            totalMatches: 0,
            rating: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            isActive: true
        };
        
        teams.push(newTeam);
        
        // Create player profile for networking
        playerProfiles.push({
            id: nextPlayerId++,
            teamId: newTeam.id,
            teamName,
            sportPreferences: newTeam.sportPreferences,
            skillLevel: newTeam.skillLevel,
            location: newTeam.location,
            lookingForMatches: true,
            availability: 'Weekends',
            createdAt: new Date().toISOString()
        });
        
        const { password: _, ...teamWithoutPassword } = newTeam;
        
        res.status(201).json({
            message: 'Team registered successfully',
            team: teamWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check admin login
        if (email === ADMIN_EMAIL && await bcrypt.compare(password, ADMIN_PASSWORD_HASH)) {
            req.session.isAdmin = true;
            return res.json({
                message: 'Admin login successful',
                isAdmin: true,
                team: { id: 'admin', teamName: 'Administrator', email: ADMIN_EMAIL }
            });
        }
        
        const team = teams.find(t => t.email === email);
        
        if (!team) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isValid = await bcrypt.compare(password, team.password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        req.session.userId = team.id;
        
        const { password: _, ...teamWithoutPassword } = team;
        
        res.json({
            message: 'Login successful',
            team: teamWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
    if (req.session.isAdmin) {
        return res.json({ id: 'admin', teamName: 'Administrator', email: ADMIN_EMAIL, isAdmin: true });
    }
    
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const team = teams.find(t => t.id === req.session.userId);
    
    if (!team) {
        return res.status(401).json({ error: 'User not found' });
    }
    
    const { password, ...teamWithoutPassword } = team;
    res.json(teamWithoutPassword);
});

// ============= SPORT ROUTES =============
app.get('/api/sports', (req, res) => {
    res.json(sports);
});

// ============= MATCH ROUTES =============
app.post('/api/matches/book', isAuthenticated, (req, res) => {
    try {
        const { opponentName, startTime, endTime, homeTeamId, homeTeamName, sportId } = req.body;
        
        const sport = sports.find(s => s.id === sportId);
        if (!sport) {
            return res.status(400).json({ error: 'Invalid sport selected' });
        }
        
        // Check if slot is available
        const existingMatch = matches.find(m => 
            m.status !== 'cancelled' &&
            m.sportId === sportId &&
            ((new Date(m.startTime) < new Date(endTime) && new Date(m.endTime) > new Date(startTime)))
        );
        
        if (existingMatch) {
            return res.status(400).json({ error: 'Time slot already booked for this sport' });
        }
        
        const newMatch = {
            id: nextMatchId++,
            homeTeamId,
            homeTeamName,
            opponentName,
            startTime,
            endTime,
            sportId,
            sportName: sport.name,
            sportIcon: sport.icon,
            fee: sport.pricePerSlot,
            status: 'pending_payment',
            createdAt: new Date().toISOString()
        };
        
        matches.push(newMatch);
        
        res.status(201).json({
            message: 'Match booking created',
            matchId: newMatch.id,
            match: newMatch
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/payment/process', isAuthenticated, (req, res) => {
    try {
        const { matchId } = req.body;
        
        const match = matches.find(m => m.id === parseInt(matchId));
        
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        if (match.status === 'confirmed') {
            return res.status(400).json({ error: 'Match already paid' });
        }
        
        match.status = 'confirmed';
        match.paidAt = new Date().toISOString();
        
        const team = teams.find(t => t.id === match.homeTeamId);
        if (team) {
            team.totalMatches++;
        }
        
        // Create notification
        notifications.push({
            id: Date.now(),
            teamId: match.homeTeamId,
            message: `Your ${match.sportName} match against ${match.opponentName} has been confirmed!`,
            read: false,
            createdAt: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: 'Payment successful! Match confirmed.',
            match
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/matches/confirmed', (req, res) => {
    const confirmedMatches = matches.filter(m => m.status === 'confirmed');
    res.json(confirmedMatches);
});

app.get('/api/matches/team/:teamId', isAuthenticated, (req, res) => {
    const teamMatches = matches.filter(m => m.homeTeamId === parseInt(req.params.teamId));
    res.json(teamMatches);
});

app.get('/api/matches/available-slots', (req, res) => {
    const { date, sportId } = req.query;
    const selectedDate = date ? new Date(date) : new Date();
    const sport = sports.find(s => s.id === parseInt(sportId));
    
    if (!sport) {
        return res.status(400).json({ error: 'Invalid sport' });
    }
    
    const slots = [];
    const durationHours = sport.duration / 60;
    const startHour = 8;
    const endHour = 20;
    
    for (let hour = startHour; hour <= endHour - durationHours; hour += durationHours) {
        const startTime = new Date(selectedDate);
        startTime.setHours(hour, 0, 0, 0);
        const endTime = new Date(selectedDate);
        endTime.setHours(hour + durationHours, 0, 0, 0);
        
        const isBooked = matches.some(m => 
            m.status === 'confirmed' &&
            m.sportId === sport.id &&
            new Date(m.startTime).getTime() === startTime.getTime()
        );
        
        if (!isBooked && startTime > new Date()) {
            slots.push({
                start: startTime.toISOString(),
                end: endTime.toISOString(),
                displayTime: `${hour}:00 - ${hour + durationHours}:00`
            });
        }
    }
    
    res.json(slots);
});

// ============= NETWORKING ROUTES =============
app.get('/api/players/search', (req, res) => {
    const { sportId, skillLevel, location } = req.query;
    
    let players = playerProfiles.filter(p => p.lookingForMatches);
    
    if (sportId) {
        players = players.filter(p => p.sportPreferences.includes(parseInt(sportId)));
    }
    
    if (skillLevel) {
        players = players.filter(p => p.skillLevel === skillLevel);
    }
    
    if (location) {
        players = players.filter(p => p.location.toLowerCase().includes(location.toLowerCase()));
    }
    
    // Get team details for each player
    const playersWithDetails = players.map(player => {
        const team = teams.find(t => t.id === player.teamId);
        return {
            ...player,
            teamRating: team?.rating || 0,
            teamWins: team?.wins || 0,
            teamLosses: team?.losses || 0
        };
    });
    
    res.json(playersWithDetails);
});

app.post('/api/requests/send', isAuthenticated, (req, res) => {
    const { toTeamId, message, sportId, proposedDate } = req.body;
    
    const request = {
        id: nextRequestId++,
        fromTeamId: req.session.userId,
        toTeamId,
        message,
        sportId,
        proposedDate,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    teamRequests.push(request);
    
    // Create notification for recipient
    const fromTeam = teams.find(t => t.id === req.session.userId);
    notifications.push({
        id: Date.now(),
        teamId: toTeamId,
        message: `${fromTeam.teamName} wants to play a match with you!`,
        requestId: request.id,
        read: false,
        createdAt: new Date().toISOString()
    });
    
    res.status(201).json(request);
});

app.get('/api/requests/received', isAuthenticated, (req, res) => {
    const received = teamRequests.filter(r => r.toTeamId === req.session.userId && r.status === 'pending');
    res.json(received);
});

app.get('/api/requests/sent', isAuthenticated, (req, res) => {
    const sent = teamRequests.filter(r => r.fromTeamId === req.session.userId);
    res.json(sent);
});

app.post('/api/requests/respond', isAuthenticated, (req, res) => {
    const { requestId, accept } = req.body;
    
    const request = teamRequests.find(r => r.id === parseInt(requestId));
    
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }
    
    request.status = accept ? 'accepted' : 'rejected';
    
    // Create notification for sender
    const respondingTeam = teams.find(t => t.id === req.session.userId);
    notifications.push({
        id: Date.now(),
        teamId: request.fromTeamId,
        message: `${respondingTeam.teamName} ${accept ? 'accepted' : 'declined'} your match request.`,
        read: false,
        createdAt: new Date().toISOString()
    });
    
    res.json({ message: `Request ${accept ? 'accepted' : 'declined'}` });
});

app.get('/api/notifications', isAuthenticated, (req, res) => {
    const userNotifications = notifications.filter(n => n.teamId === req.session.userId);
    res.json(userNotifications);
});

app.post('/api/notifications/mark-read', isAuthenticated, (req, res) => {
    const { notificationId } = req.body;
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
    }
    res.json({ message: 'Notification marked as read' });
});

// ============= ADMIN ROUTES =============
app.get('/api/admin/stats', isAdmin, (req, res) => {
    const stats = {
        totalTeams: teams.length,
        totalMatches: matches.length,
        confirmedMatches: matches.filter(m => m.status === 'confirmed').length,
        totalRevenue: matches.filter(m => m.status === 'confirmed').reduce((sum, m) => sum + m.fee, 0),
        matchesBySport: {},
        activeTeams: teams.filter(t => t.isActive).length,
        pendingRequests: teamRequests.filter(r => r.status === 'pending').length
    };
    
    sports.forEach(sport => {
        stats.matchesBySport[sport.name] = matches.filter(m => m.sportId === sport.id && m.status === 'confirmed').length;
    });
    
    res.json(stats);
});

app.get('/api/admin/teams', isAdmin, (req, res) => {
    const teamsList = teams.map(({ password, ...team }) => team);
    res.json(teamsList);
});

app.get('/api/admin/matches', isAdmin, (req, res) => {
    res.json(matches);
});

app.post('/api/admin/sports/add', isAdmin, (req, res) => {
    const { name, icon, pricePerSlot, duration } = req.body;
    
    const newSport = {
        id: sports.length + 1,
        name,
        icon,
        pricePerSlot,
        duration
    };
    
    sports.push(newSport);
    res.status(201).json(newSport);
});

app.put('/api/admin/sports/:id', isAdmin, (req, res) => {
    const sportId = parseInt(req.params.id);
    const sport = sports.find(s => s.id === sportId);
    
    if (!sport) {
        return res.status(404).json({ error: 'Sport not found' });
    }
    
    Object.assign(sport, req.body);
    res.json(sport);
});

app.delete('/api/admin/sports/:id', isAdmin, (req, res) => {
    const sportId = parseInt(req.params.id);
    const index = sports.findIndex(s => s.id === sportId);
    
    if (index !== -1) {
        sports.splice(index, 1);
        res.json({ message: 'Sport removed' });
    } else {
        res.status(404).json({ error: 'Sport not found' });
    }
});

app.post('/api/admin/teams/:teamId/deactivate', isAdmin, (req, res) => {
    const team = teams.find(t => t.id === parseInt(req.params.teamId));
    
    if (team) {
        team.isActive = false;
        res.json({ message: 'Team deactivated' });
    } else {
        res.status(404).json({ error: 'Team not found' });
    }
});

app.get('/api/admin/revenue', isAdmin, (req, res) => {
    const monthlyRevenue = {};
    
    matches.filter(m => m.status === 'confirmed').forEach(match => {
        const month = new Date(match.paidAt).toISOString().slice(0, 7);
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + match.fee;
    });
    
    res.json({
        total: matches.filter(m => m.status === 'confirmed').reduce((sum, m) => sum + m.fee, 0),
        monthly: monthlyRevenue,
        bySport: sports.map(sport => ({
            sport: sport.name,
            revenue: matches.filter(m => m.sportId === sport.id && m.status === 'confirmed')
                .reduce((sum, m) => sum + m.fee, 0)
        }))
    });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`👑 Admin Login: admin@footyground.com / admin123`);
    console.log(`📝 Regular users: Register a new team to get started`);
});