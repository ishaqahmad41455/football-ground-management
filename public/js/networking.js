// Networking Functions
let availablePlayers = [];
let receivedRequests = [];
let sentRequests = [];

async function showNetworkSection() {
    const container = document.getElementById('contentContainer');
    container.innerHTML = `
        <h2>🤝 Find Opponents & Connect</h2>
        
        <div class="tabs">
            <button class="tab-btn active" onclick="showNetworkTab('find')">🔍 Find Teams</button>
            <button class="tab-btn" onclick="showNetworkTab('requests')">📨 Match Requests</button>
            <button class="tab-btn" onclick="showNetworkTab('notifications')">🔔 Notifications</button>
        </div>
        
        <div id="networkTabContent">
            ${await getFindTeamsHTML()}
        </div>
    `;
}

async function getFindTeamsHTML() {
    // Get sports for filter
    const sportsResponse = await fetch('/api/sports');
    const sports = await sportsResponse.json();
    
    return `
        <div class="form-container" style="margin-bottom: 2rem;">
            <h3>Filter Teams</h3>
            <div class="flex-row">
                <div class="form-group">
                    <label>Sport</label>
                    <select id="filterSport" onchange="searchPlayers()">
                        <option value="">All Sports</option>
                        ${sports.map(sport => `
                            <option value="${sport.id}">${sport.icon} ${sport.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Skill Level</label>
                    <select id="filterSkill" onchange="searchPlayers()">
                        <option value="">All Levels</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Professional">Professional</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="filterLocation" placeholder="Enter location" onkeyup="searchPlayers()">
                </div>
            </div>
            <button onclick="searchPlayers()" class="btn-primary">Search Teams</button>
        </div>
        
        <div id="playersList">
            <div class="spinner"></div>
        </div>
    `;
}

async function searchPlayers() {
    const sportId = document.getElementById('filterSport')?.value;
    const skillLevel = document.getElementById('filterSkill')?.value;
    const location = document.getElementById('filterLocation')?.value;
    
    let url = '/api/players/search?';
    if (sportId) url += `sportId=${sportId}&`;
    if (skillLevel) url += `skillLevel=${skillLevel}&`;
    if (location) url += `location=${location}`;
    
    const response = await fetch(url);
    const players = await response.json();
    
    const playersList = document.getElementById('playersList');
    
    if (players.length === 0) {
        playersList.innerHTML = '<div class="form-container"><p>No teams found matching your criteria.</p></div>';
        return;
    }
    
    playersList.innerHTML = `
        <h3>Found Teams (${players.length})</h3>
        ${players.map(player => `
            <div class="player-card">
                <div class="player-info">
                    <h3>⚽ ${player.teamName}</h3>
                    <div class="player-stats">
                        <span>⭐ Rating: ${player.teamRating || 0}</span>
                        <span>🏆 Wins: ${player.teamWins || 0}</span>
                        <span>📉 Losses: ${player.teamLosses || 0}</span>
                    </div>
                    <div>
                        <span class="skill-badge skill-${player.skillLevel}">${player.skillLevel}</span>
                        <span>📍 ${player.location || 'Location not specified'}</span>
                    </div>
                    <div>🎯 Looking for: ${player.sportPreferences.map(id => {
                        const sport = window.sports?.find(s => s.id === id);
                        return sport ? `${sport.icon} ${sport.name}` : '';
                    }).join(', ')}</div>
                </div>
                <div>
                    <button onclick="sendMatchRequest(${player.teamId})" class="btn-primary">
                        📨 Send Match Request
                    </button>
                </div>
            </div>
        `).join('')}
    `;
}

async function sendMatchRequest(toTeamId) {
    const sportsResponse = await fetch('/api/sports');
    const sports = await sportsResponse.json();
    
    // Show modal to select sport and propose date
    const modalHTML = `
        <div id="requestModal" class="modal" style="display: block;">
            <div class="modal-content">
                <span class="close" onclick="closeModal()">&times;</span>
                <h3>Send Match Request</h3>
                <div class="form-group">
                    <label>Select Sport</label>
                    <select id="requestSport">
                        ${sports.map(sport => `
                            <option value="${sport.id}">${sport.icon} ${sport.name} ($${sport.pricePerSlot})</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Proposed Date</label>
                    <input type="datetime-local" id="proposedDate">
                </div>
                <div class="form-group">
                    <label>Message (Optional)</label>
                    <textarea id="requestMessage" rows="3" placeholder="Hi! Would you like to play a match with us?"></textarea>
                </div>
                <button onclick="submitMatchRequest(${toTeamId})" class="btn-primary">Send Request</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeModal() {
    const modal = document.getElementById('requestModal');
    if (modal) modal.remove();
}

async function submitMatchRequest(toTeamId) {
    const sportId = parseInt(document.getElementById('requestSport').value);
    const proposedDate = document.getElementById('proposedDate').value;
    const message = document.getElementById('requestMessage').value;
    
    const response = await fetch('/api/requests/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toTeamId, sportId, proposedDate, message })
    });
    
    if (response.ok) {
        showSuccess('Match request sent successfully!');
        closeModal();
        showNetworkTab('requests');
    } else {
        showError('Failed to send request');
    }
}

async function showNetworkTab(tab) {
    const content = document.getElementById('networkTabContent');
    
    switch(tab) {
        case 'find':
            content.innerHTML = await getFindTeamsHTML();
            await searchPlayers();
            break;
        case 'requests':
            await showRequestsPanel();
            break;
        case 'notifications':
            await showNotifications();
            break;
    }
}

async function showRequestsPanel() {
    // Fetch received requests
    const receivedResponse = await fetch('/api/requests/received');
    const sentResponse = await fetch('/api/requests/sent');
    
    const received = await receivedResponse.json();
    const sent = await sentResponse.json();
    
    const sportsResponse = await fetch('/api/sports');
    const sports = await sportsResponse.json();
    
    const content = document.getElementById('networkTabContent');
    content.innerHTML = `
        <div class="requests-panel">
            <div>
                <h3>📥 Received Requests (${received.length})</h3>
                ${received.length === 0 ? '<p>No pending requests</p>' : 
                    received.map(req => {
                        const fromTeam = teams?.find(t => t.id === req.fromTeamId);
                        const sport = sports.find(s => s.id === req.sportId);
                        return `
                            <div class="request-card">
                                <p><strong>${fromTeam?.teamName || 'Unknown Team'}</strong> wants to play!</p>
                                <p>🏆 Sport: ${sport?.icon || '⚽'} ${sport?.name || 'Unknown'}</p>
                                <p>📅 Proposed: ${new Date(req.proposedDate).toLocaleString()}</p>
                                <p>💬 Message: ${req.message || 'No message'}</p>
                                <div class="request-actions">
                                    <button onclick="respondToRequest(${req.id}, true)" class="btn-accept">✅ Accept</button>
                                    <button onclick="respondToRequest(${req.id}, false)" class="btn-reject">❌ Decline</button>
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
            <div>
                <h3>📤 Sent Requests (${sent.length})</h3>
                ${sent.length === 0 ? '<p>No sent requests</p>' :
                    sent.map(req => `
                        <div class="request-card">
                            <p>To: Team #${req.toTeamId}</p>
                            <p>Status: ${req.status === 'pending' ? '⏳ Pending' : req.status === 'accepted' ? '✅ Accepted' : '❌ Declined'}</p>
                            <p>Sent: ${new Date(req.createdAt).toLocaleDateString()}</p>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
}

async function respondToRequest(requestId, accept) {
    const response = await fetch('/api/requests/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, accept })
    });
    
    if (response.ok) {
        showSuccess(accept ? 'Request accepted!' : 'Request declined');
        showNetworkTab('requests');
    }
}

async function showNotifications() {
    const response = await fetch('/api/notifications');
    const notifications = await response.json();
    
    const content = document.getElementById('networkTabContent');
    content.innerHTML = `
        <div class="form-container">
            <h3>🔔 Notifications (${notifications.filter(n => !n.read).length} unread)</h3>
            ${notifications.length === 0 ? '<p>No notifications</p>' :
                notifications.map(notif => `
                    <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="markNotificationRead(${notif.id})">
                        <p>${notif.message}</p>
                        <small>${new Date(notif.createdAt).toLocaleString()}</small>
                    </div>
                `).join('')
            }
        </div>
    `;
}

async function markNotificationRead(notificationId) {
    await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
    });
    showNotifications();
}