// Global app state
let currentUser = null;

// Store sports and teams globally for networking
window.sports = null;
window.teams = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            updateUIForLoggedInUser();
            
            // Load sports data for multi-sport support
            await loadSportsData();
            
            // Check if admin to show admin panel button
            if (currentUser.isAdmin) {
                document.getElementById('adminBtn').style.display = 'block';
                showSection('admin');
            } else {
                showSection('schedule');
            }
        } else {
            showAuthScreen();
        }
    } catch (error) {
        showAuthScreen();
    }
}

// Load sports data from server
async function loadSportsData() {
    const response = await fetch('/api/sports');
    window.sports = await response.json();
}

// Show authentication screen
function showAuthScreen() {
    const container = document.getElementById('contentContainer');
    container.innerHTML = `
        <div class="form-container">
            <div class="tabs">
                <button class="tab-btn active" onclick="showLoginForm()">Login</button>
                <button class="tab-btn" onclick="showRegisterForm()">Register Team</button>
            </div>
            <div id="authFormContainer">
                ${getLoginForm()}
            </div>
        </div>
    `;
    document.getElementById('navLinks').style.display = 'none';
}

// Get login form HTML
function getLoginForm() {
    return `
        <form id="loginForm" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="loginEmail" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="loginPassword" required>
            </div>
            <button type="submit" class="btn-primary">Login</button>
        </form>
    `;
}

// Get register form HTML (updated with sport preferences and skill level)
function getRegisterForm() {
    const sports = window.sports || [
        { id: 1, name: 'Football', icon: '⚽' },
        { id: 2, name: 'Cricket', icon: '🏏' },
        { id: 3, name: 'Basketball', icon: '🏀' }
    ];
    
    return `
        <form id="registerForm" onsubmit="handleRegister(event)">
            <div class="form-group">
                <label>Team Name</label>
                <input type="text" id="regTeamName" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="regEmail" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="regPassword" required>
            </div>
            <div class="form-group">
                <label>Phone (Optional)</label>
                <input type="tel" id="regPhone">
            </div>
            <div class="form-group">
                <label>Location (City)</label>
                <input type="text" id="regLocation" placeholder="e.g., New York">
            </div>
            <div class="form-group">
                <label>Skill Level</label>
                <select id="regSkillLevel">
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate" selected>Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Professional">Professional</option>
                </select>
            </div>
            <div class="form-group">
                <label>Preferred Sports (Hold Ctrl to select multiple)</label>
                <select id="regSportPreferences" multiple size="3">
                    ${sports.map(sport => `
                        <option value="${sport.id}">${sport.icon} ${sport.name}</option>
                    `).join('')}
                </select>
            </div>
            <button type="submit" class="btn-primary">Register Team</button>
        </form>
    `;
}

// Show login form
function showLoginForm() {
    document.getElementById('authFormContainer').innerHTML = getLoginForm();
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// Show register form
function showRegisterForm() {
    document.getElementById('authFormContainer').innerHTML = getRegisterForm();
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.team;
            updateUIForLoggedInUser();
            
            // Load sports data
            await loadSportsData();
            
            if (currentUser.isAdmin) {
                document.getElementById('adminBtn').style.display = 'block';
                showSection('admin');
            } else {
                showSection('schedule');
            }
            showSuccess('Login successful!');
        } else {
            showError(data.error);
        }
    } catch (error) {
        showError('Login failed. Please try again.');
    }
}

// Handle register (updated with new fields)
async function handleRegister(event) {
    event.preventDefault();
    
    const sportSelect = document.getElementById('regSportPreferences');
    const selectedSports = Array.from(sportSelect.selectedOptions).map(opt => parseInt(opt.value));
    
    const teamData = {
        teamName: document.getElementById('regTeamName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        phone: document.getElementById('regPhone').value,
        location: document.getElementById('regLocation').value,
        skillLevel: document.getElementById('regSkillLevel').value,
        sportPreferences: selectedSports.length > 0 ? selectedSports : [1]
    };
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(teamData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Team registered successfully! Please login.');
            showLoginForm();
        } else {
            showError(data.error);
        }
    } catch (error) {
        showError('Registration failed. Please try again.');
    }
}

// Logout
async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    showAuthScreen();
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    const authButtons = document.getElementById('authButtons');
    authButtons.innerHTML = `
        <span class="user-name">⚽ ${currentUser.teamName}</span>
        <button onclick="logout()" class="btn-secondary">Logout</button>
    `;
    document.getElementById('navLinks').style.display = 'flex';
}

// Show different sections (UPDATED with all sections)
async function showSection(section) {
    const container = document.getElementById('contentContainer');
    
    switch(section) {
        case 'schedule':
            container.innerHTML = await getScheduleForm();
            break;
        case 'myMatches':
            container.innerHTML = await getMyMatches();
            break;
        case 'allMatches':
            container.innerHTML = await getAllMatches();
            break;
        case 'network':
            if (typeof showNetworkSection === 'function') {
                await showNetworkSection();
            } else {
                container.innerHTML = '<div class="form-container"><p>Loading networking features...</p></div>';
            }
            break;
        case 'profile':
            container.innerHTML = await getProfile();
            break;
        case 'admin':
            if (currentUser?.isAdmin && typeof showAdminPanel === 'function') {
                await showAdminPanel();
            } else {
                showError('Admin access required');
            }
            break;
    }
}

// Get schedule form (UPDATED with multi-sport support)
async function getScheduleForm() {
    await loadSportsData();
    
    return `
        <div class="form-container">
            <h2>Schedule a New Match</h2>
            
            <div class="form-group">
                <label>Select Sport</label>
                <div class="sports-selector" id="sportSelector">
                    ${window.sports.map(sport => `
                        <div class="sport-card" onclick="selectSport(${sport.id})" data-sport-id="${sport.id}">
                            <div class="sport-icon">${sport.icon}</div>
                            <div class="sport-name">${sport.name}</div>
                            <div class="sport-price">$${sport.pricePerSlot} / ${sport.duration}min</div>
                        </div>
                    `).join('')}
                </div>
                <input type="hidden" id="selectedSportId" required>
            </div>
            
            <form id="scheduleForm">
                <div class="form-group">
                    <label>Opponent Team Name</label>
                    <input type="text" id="opponentName" placeholder="Enter opponent team name" required>
                </div>
                <div class="form-group">
                    <label>Select Time Slot</label>
                    <select id="timeSlot" required>
                        <option value="">First select a sport</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary">Book Match & Pay</button>
            </form>
        </div>
    `;
}

// Select sport function for multi-sport support
window.selectSport = async function(sportId) {
    document.getElementById('selectedSportId').value = sportId;
    
    // Highlight selected sport
    document.querySelectorAll('.sport-card').forEach(card => {
        card.classList.remove('selected');
        if (parseInt(card.dataset.sportId) === sportId) {
            card.classList.add('selected');
        }
    });
    
    // Load available slots for this sport
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`/api/matches/available-slots?date=${today}&sportId=${sportId}`);
    const slots = await response.json();
    
    const timeSlotSelect = document.getElementById('timeSlot');
    if (slots.length === 0) {
        timeSlotSelect.innerHTML = '<option value="">No available slots for this sport today</option>';
    } else {
        timeSlotSelect.innerHTML = '<option value="">Choose a time slot</option>' +
            slots.map(slot => `
                <option value="${slot.start}|${slot.end}">
                    ${slot.displayTime}
                </option>
            `).join('');
    }
};

// Get my matches (UPDATED with sport info)
async function getMyMatches() {
    const response = await fetch(`/api/matches/team/${currentUser.id}`);
    const matches = await response.json();
    
    if (matches.length === 0) {
        return '<div class="form-container"><p>No matches scheduled yet. <button onclick="showSection(\'schedule\')" class="btn-primary">Book your first match</button></p></div>';
    }
    
    return `
        <h2>My Matches</h2>
        <div class="matches-grid">
            ${matches.map(match => `
                <div class="match-card ${match.status}">
                    <div class="match-time">
                        ${match.sportIcon || '⚽'} ${match.sportName} | 📅 ${new Date(match.startTime).toLocaleString()}
                    </div>
                    <div class="match-teams">
                        🏠 ${match.homeTeamName} vs ${match.opponentName}
                    </div>
                    <div>⏱️ Duration: ${match.sportName === 'Cricket' ? '3 hours' : '2 hours'}</div>
                    <div>💰 Fee: $${match.fee}</div>
                    <div class="status-badge ${match.status}">
                        ${match.status === 'confirmed' ? '✅ Confirmed & Paid' : '⏳ Pending Payment'}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Get all matches (UPDATED with sport info)
async function getAllMatches() {
    const response = await fetch('/api/matches/confirmed');
    const matches = await response.json();
    
    if (matches.length === 0) {
        return '<div class="form-container"><p>No confirmed matches yet. Be the first to book!</p></div>';
    }
    
    return `
        <h2>All Confirmed Matches</h2>
        <div class="matches-grid">
            ${matches.map(match => `
                <div class="match-card confirmed">
                    <div class="match-time">
                        ${match.sportIcon || '⚽'} ${match.sportName} | 📅 ${new Date(match.startTime).toLocaleString()}
                    </div>
                    <div class="match-teams">
                        🏠 ${match.homeTeamName} vs ${match.opponentName}
                    </div>
                    <div>⏱️ Duration: ${match.sportName === 'Cricket' ? '3 hours' : '2 hours'}</div>
                    <div class="status-badge confirmed">✅ Confirmed</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Get team profile (UPDATED)
async function getProfile() {
    const response = await fetch(`/api/auth/profile/${currentUser.id}`);
    const profile = await response.json();
    
    return `
        <div class="form-container">
            <h2>Team Profile</h2>
            <div class="form-group">
                <label>🏆 Team Name</label>
                <input type="text" value="${profile.teamName}" disabled>
            </div>
            <div class="form-group">
                <label>📧 Email</label>
                <input type="email" value="${profile.email}" disabled>
            </div>
            <div class="form-group">
                <label>📞 Phone</label>
                <input type="tel" value="${profile.phone || 'Not provided'}" disabled>
            </div>
            <div class="form-group">
                <label>📍 Location</label>
                <input type="text" value="${profile.location || 'Not provided'}" disabled>
            </div>
            <div class="form-group">
                <label>⭐ Skill Level</label>
                <input type="text" value="${profile.skillLevel || 'Intermediate'}" disabled>
            </div>
            <div class="form-group">
                <label>⚽ Total Matches</label>
                <input type="text" value="${profile.totalMatches || 0}" disabled>
            </div>
            <div class="form-group">
                <label>🏆 Wins/Losses</label>
                <input type="text" value="${profile.wins || 0}W - ${profile.losses || 0}L - ${profile.draws || 0}D" disabled>
            </div>
            <div class="form-group">
                <label>📅 Member Since</label>
                <input type="text" value="${new Date(profile.createdAt).toLocaleDateString()}" disabled>
            </div>
        </div>
    `;
}

// Handle schedule form submission
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'scheduleForm') {
        e.preventDefault();
        
        const sportId = parseInt(document.getElementById('selectedSportId').value);
        const opponentName = document.getElementById('opponentName').value;
        const timeSlot = document.getElementById('timeSlot').value;
        
        if (!sportId) {
            showError('Please select a sport');
            return;
        }
        
        if (!timeSlot) {
            showError('Please select a time slot');
            return;
        }
        
        const [startTime, endTime] = timeSlot.split('|');
        
        try {
            const response = await fetch('/api/matches/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    opponentName,
                    startTime,
                    endTime,
                    homeTeamId: currentUser.id,
                    homeTeamName: currentUser.teamName,
                    sportId: sportId
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Process payment
                const paymentResponse = await fetch('/api/payment/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matchId: data.matchId })
                });
                
                const paymentData = await paymentResponse.json();
                
                if (paymentResponse.ok) {
                    showSuccess('✅ Match booked and paid successfully!');
                    setTimeout(() => showSection('myMatches'), 2000);
                } else {
                    showError('Payment failed. Please try again.');
                }
            } else {
                showError(data.error);
            }
        } catch (error) {
            showError('Failed to book match');
        }
    }
});

// Helper functions
function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-error';
    alert.textContent = message;
    const container = document.getElementById('contentContainer');
    container.insertBefore(alert, container.firstChild);
    setTimeout(() => alert.remove(), 3000);
}

function showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.textContent = message;
    const container = document.getElementById('contentContainer');
    container.insertBefore(alert, container.firstChild);
    setTimeout(() => alert.remove(), 3000);
}