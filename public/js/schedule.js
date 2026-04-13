// Get schedule form
async function getScheduleForm() {
    const availableSlots = await fetchAvailableSlots();
    
    return `
        <div class="form-container">
            <h2>Schedule a New Match</h2>
            <form id="scheduleForm">
                <div class="form-group">
                    <label>Opponent Team Name</label>
                    <input type="text" id="opponentName" placeholder="Enter opponent team name" required>
                </div>
                <div class="form-group">
                    <label>Select Time Slot</label>
                    <select id="timeSlot" required>
                        <option value="">Choose a time slot</option>
                        ${availableSlots.map(slot => `
                            <option value="${slot.start}|${slot.end}">
                                ${slot.displayTime}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Match Fee</label>
                    <input type="text" value="$50.00" disabled>
                </div>
                <button type="submit" class="btn-primary">Book Match & Pay $50</button>
            </form>
        </div>
    `;
}

// Fetch available time slots
async function fetchAvailableSlots() {
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`/api/matches/available-slots?date=${today}`);
    const slots = await response.json();
    return slots;
}

// Handle schedule form submission
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'scheduleForm') {
        e.preventDefault();
        
        const opponentName = document.getElementById('opponentName').value;
        const timeSlot = document.getElementById('timeSlot').value;
        
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
                    homeTeamName: currentUser.teamName
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

// Get my matches
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
                        📅 ${new Date(match.startTime).toLocaleString()}
                    </div>
                    <div class="match-teams">
                        🏠 ${match.homeTeamName} vs ${match.opponentName}
                    </div>
                    <div>⏱️ Duration: 2 hours</div>
                    <div>💰 Fee: $${match.fee}</div>
                    <div class="status-badge ${match.status}">
                        ${match.status === 'confirmed' ? '✅ Confirmed & Paid' : '⏳ Pending Payment'}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Get all matches
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
                        📅 ${new Date(match.startTime).toLocaleString()}
                    </div>
                    <div class="match-teams">
                        🏠 ${match.homeTeamName} vs ${match.opponentName}
                    </div>
                    <div>⏱️ Duration: 2 hours</div>
                    <div class="status-badge confirmed">✅ Confirmed</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Get team profile
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
                <label>⚽ Total Matches</label>
                <input type="text" value="${profile.totalMatches || 0}" disabled>
            </div>
            <div class="form-group">
                <label>📅 Member Since</label>
                <input type="text" value="${new Date(profile.createdAt).toLocaleDateString()}" disabled>
            </div>
        </div>
    `;
}