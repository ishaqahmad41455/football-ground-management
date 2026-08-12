const db = require('./db');

const ACTIVE_BOOKING_STATUSES = ['reserved', 'invited', 'accepted', 'confirmed'];

function notify(teamId, type, message) {
  const { data, nextId, persist } = db;
  data.notifications.push({
    id: nextId('notifications'),
    teamId,
    type,
    message,
    read: false,
    createdAt: Date.now(),
  });
  persist();
}

function audit(userEmail, action, meta) {
  const { data, nextId, persist } = db;
  data.auditLogs.push({
    id: nextId('auditLogs'),
    user: userEmail || 'system',
    action,
    meta: meta || {},
    createdAt: Date.now(),
  });
  persist();
}

// Auto-expire reserved bookings whose 10-minute hold has passed.
// Called defensively at the start of any read/write path that touches bookings.
function releaseExpiredBookings() {
  const { data, persist } = db;
  const now = Date.now();
  let changed = false;
  for (const booking of data.bookings) {
    if (booking.status === 'reserved' && booking.expiresAt && booking.expiresAt < now) {
      booking.status = 'expired';
      changed = true;
      const match = data.matches.find((m) => m.bookingId === booking.id);
      if (match && match.status === 'awaiting_payment') {
        match.status = 'cancelled';
      }
    }
    // Payment window: awaiting_payment matches expire 30 min after acceptance
    if (booking.status === 'accepted' && booking.paymentExpiresAt && booking.paymentExpiresAt < now) {
      booking.status = 'expired';
      changed = true;
      const match = data.matches.find((m) => m.bookingId === booking.id);
      if (match) match.status = 'cancelled';
    }
  }
  if (changed) persist();
}

function isSlotTaken(venueId, date, time, excludeBookingId) {
  const { data } = db;
  return data.bookings.some(
    (b) =>
      b.venueId === venueId &&
      b.date === date &&
      b.time === time &&
      ACTIVE_BOOKING_STATUSES.includes(b.status) &&
      b.id !== excludeBookingId
  );
}

function generateSlots(venue) {
  const [openH, openM] = venue.openingTime.split(':').map(Number);
  const [closeH, closeM] = venue.closingTime.split(':').map(Number);
  const slots = [];
  let cursor = openH * 60 + openM;
  const end = closeH * 60 + closeM;
  while (cursor + venue.slotDurationMinutes <= end) {
    const h = Math.floor(cursor / 60);
    const m = cursor % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    cursor += venue.slotDurationMinutes + (venue.breakMinutes || 0);
  }
  return slots;
}

function computeTeamStats(teamId) {
  const { data } = db;
  const matches = data.matches.filter(
    (m) => (m.teamAId === teamId || m.teamBId === teamId) && m.status === 'completed'
  );
  let wins = 0,
    losses = 0,
    draws = 0,
    scoreFor = 0,
    scoreAgainst = 0;
  for (const m of matches) {
    if (!m.result) continue;
    const isA = m.teamAId === teamId;
    const mine = isA ? m.result.scoreA : m.result.scoreB;
    const theirs = isA ? m.result.scoreB : m.result.scoreA;
    scoreFor += mine || 0;
    scoreAgainst += theirs || 0;
    if (mine > theirs) wins++;
    else if (mine < theirs) losses++;
    else draws++;
  }
  const played = matches.length;
  const points = wins * 3 + draws * 1;
  return {
    played,
    wins,
    losses,
    draws,
    winPercentage: played ? Math.round((wins / played) * 100) : 0,
    scoreFor,
    scoreAgainst,
    points,
  };
}

function computeRankings(sportId) {
  const { data } = db;
  const teams = data.teams.filter((t) => t.sportId === sportId && t.status !== 'blocked');
  const rows = teams.map((t) => ({ team: t, stats: computeTeamStats(t.id) }));
  rows.sort((a, b) => {
    if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
    const gdA = a.stats.scoreFor - a.stats.scoreAgainst;
    const gdB = b.stats.scoreFor - b.stats.scoreAgainst;
    return gdB - gdA;
  });
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

function publicTeam(team) {
  if (!team) return null;
  const { data } = db;
  const players = data.players.filter((p) => p.teamId === team.id);
  return { ...team, players, stats: computeTeamStats(team.id) };
}

module.exports = {
  notify,
  audit,
  releaseExpiredBookings,
  isSlotTaken,
  generateSlots,
  computeTeamStats,
  computeRankings,
  publicTeam,
  ACTIVE_BOOKING_STATUSES,
};
