// Admin Dashboard Functions
let adminStats = null;

async function showAdminPanel() {
    if (!currentUser || !currentUser.isAdmin) {
        showError('Admin access required');
        return;
    }
    
    const container = document.getElementById('contentContainer');
    container.innerHTML = '<div class="spinner"></div>';
    
    await loadAdminStats();
    
    container.innerHTML = `
        <h2>👑 Admin Dashboard</h2>
        
        <div class="admin-stats">
            <div class="stat-card">
                <div class="stat-number">${adminStats.totalTeams}</div>
                <div class="stat-label">Total Teams</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${adminStats.totalMatches}</div>
                <div class="stat-label">Total Matches</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$${adminStats.totalRevenue}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${adminStats.pendingRequests}</div>
                <div class="stat-label">Pending Requests</div>
            </div>
        </div>
        
        <div class="tabs">
            <button class="tab-btn active" onclick="showAdminTab('sports')">🏆 Manage Sports</button>
            <button class="tab-btn" onclick="showAdminTab('teams')">👥 Manage Teams</button>
            <button class="tab-btn" onclick="showAdminTab('matches')">⚽ Match History</button>
            <button class="tab-btn" onclick="showAdminTab('revenue')">💰 Revenue Report</button>
        </div>
        
        <div id="adminTabContent">
            ${getSportsManagementHTML()}
        </div>
    `;
}

async function loadAdminStats() {
    const response = await fetch('/api/admin/stats');
    adminStats = await response.json();
}

function showAdminTab(tab) {
    const content = document.getElementById('adminTabContent');
    
    switch(tab) {
        case 'sports':
            content.innerHTML = getSportsManagementHTML();
            break;
        case 'teams':
            loadTeamsManagement();
            break;
        case 'matches':
            loadMatchesHistory();
            break;
        case 'revenue':
            loadRevenueReport();
            break;
    }
    
    // Update active tab styling
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function getSportsManagementHTML() {
    return `
        <div style="margin-top: 2rem;">
            <h3>Add New Sport</h3>
            <form id="addSportForm" onsubmit="addNewSport(event)">
                <div class="flex-row">
                    <div class="form-group">
                        <label>Sport Name</label>
                        <input type="text" id="sportName" required>
                    </div>
                    <div class="form-group">
                        <label>Icon (emoji)</label>
                        <input type="text" id="sportIcon" placeholder="⚽" required>
                    </div>
                    <div class="form-group">
                        <label>Price per Slot ($)</label>
                        <input type="number" id="sportPrice" required>
                    </div>
                    <div class="form-group">
                        <label>Duration (minutes)</label>
                        <input type="number" id="sportDuration" required>
                    </div>
                </div>
                <button type="submit" class="btn-primary">Add Sport</button>
            </form>
        </div>
        
        <div style="margin-top: 2rem;">
            <h3>Existing Sports</h3>
            <div class="sports-selector" id="existingSports">
                ${window.sports ? window.sports.map(sport => `
                    <div class="sport-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <div class="sport-icon">${sport.icon}</div>
                        <div class="sport-name">${sport.name}</div>
                        <div class="sport-price">$${sport.pricePerSlot} / ${sport.duration}min</div>
                        <button onclick="editSport(${sport.id})" style="margin-top: 0.5rem;" class="btn-secondary">Edit</button>
                        <button onclick="deleteSport(${sport.id})" style="margin-top: 0.5rem; margin-left: 0.5rem;" class="btn-danger">Delete</button>
                    </div>
                `).join('') : ''}
            </div>
        </div>
    `;
}

async function addNewSport(event) {
    event.preventDefault();
    
    const sportData = {
        name: document.getElementById('sportName').value,
        icon: document.getElementById('sportIcon').value,
        pricePerSlot: parseInt(document.getElementById('sportPrice').value),
        duration: parseInt(document.getElementById('sportDuration').value)
    };
    
    const response = await fetch('/api/admin/sports/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sportData)
    });
    
    if (response.ok) {
        showSuccess('Sport added successfully!');
        showAdminPanel();
    } else {
        showError('Failed to add sport');
    }
}

async function loadTeamsManagement() {
    const response = await fetch('/api/admin/teams');
    const teams = await response.json();
    
    const content = document.getElementById('adminTabContent');
    content.innerHTML = `
        <div class="admin-table">
            <h3>All Teams</h3>
            <table>
                <thead>
                    <tr><th>Team Name</th><th>Email</th><th>Matches</th><th>Rating</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                    ${teams.map(team => `
                        <tr>
                            <td>${team.teamName}</td>
                            <td>${team.email}</td>
                            <td>${team.totalMatches}</td>
                            <td>${team.rating || 0}</td>
                            <td>${team.isActive ? '✅ Active' : '❌ Inactive'}</td>
                            <td>
                                <button onclick="deactivateTeam(${team.id})" class="btn-danger">Deactivate</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function loadMatchesHistory() {
    const response = await fetch('/api/admin/matches');
    const matches = await response.json();
    
    const content = document.getElementById('adminTabContent');
    content.innerHTML = `
        <div class="admin-table">
            <h3>All Matches</h3>
            <table>
                <thead>
                    <tr><th>Sport</th><th>Home Team</th><th>Opponent</th><th>Date</th><th>Fee</th><th>Status</th></tr>
                </thead>
                <tbody>
                    ${matches.map(match => `
                        <tr>
                            <td>${match.sportIcon || '⚽'} ${match.sportName}</td>
                            <td>${match.homeTeamName}</td>
                            <td>${match.opponentName}</td>
                            <td>${new Date(match.startTime).toLocaleDateString()}</td>
                            <td>$${match.fee}</td>
                            <td>${match.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function loadRevenueReport() {
    const response = await fetch('/api/admin/revenue');
    const revenue = await response.json();
    
    const content = document.getElementById('adminTabContent');
    content.innerHTML = `
        <div class="admin-stats" style="margin-top: 2rem;">
            <div class="stat-card">
                <div class="stat-number">$${revenue.total}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
        </div>
        
        <h3>Revenue by Sport</h3>
        <div class="sports-selector">
            ${revenue.bySport.map(sport => `
                <div class="sport-card">
                    <div class="stat-number">$${sport.revenue}</div>
                    <div class="stat-label">${sport.sport}</div>
                </div>
            `).join('')}
        </div>
        
        <h3>Monthly Revenue</h3>
        <div class="admin-table">
            <table>
                <thead><tr><th>Month</th><th>Revenue</th></tr></thead>
                <tbody>
                    ${Object.entries(revenue.monthly).map(([month, amount]) => `
                        <tr><td>${month}</td><td>$${amount}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function deactivateTeam(teamId) {
    if (confirm('Are you sure you want to deactivate this team?')) {
        const response = await fetch(`/api/admin/teams/${teamId}/deactivate`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showSuccess('Team deactivated');
            loadTeamsManagement();
        }
    }
}

async function editSport(sportId) {
    // Implement edit functionality
    showSuccess('Edit functionality coming soon');
}

async function deleteSport(sportId) {
    if (confirm('Are you sure you want to delete this sport?')) {
        const response = await fetch(`/api/admin/sports/${sportId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSuccess('Sport deleted');
            showAdminPanel();
        }
    }
}