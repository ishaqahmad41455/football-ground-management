const express = require('express');
const cors = require('cors');
const db = require('./db');
const { hashPassword, comparePassword, signToken, requireAuth, requireRole } = require('./auth');
const {
  notify,
  audit,
  releaseExpiredBookings,
  isSlotTaken,
  generateSlots,
  computeTeamStats,
  computeRankings,
  publicTeam,
  venuesOwnedBy,
  ownsVenue,
  publicVenueSummary,
  ACTIVE_BOOKING_STATUSES,
} = require('./helpers');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const RESERVATION_MINUTES = 10;
const PAYMENT_WINDOW_MINUTES = 30;
const INVITE_WINDOW_MINUTES = 30; // time to send an invite after paying the ground fee

function err(res, code, message) {
  return res.status(code).json({ error: message });
}

function getTeamOr404(res, id) {
  const team = db.data.teams.find((t) => t.id === Number(id));
  if (!team) {
    err(res, 404, 'Team not found.');
    return null;
  }
  return team;
}

// Loads a venue and 403s unless req.user (a ground_owner) owns it, or is admin.
function getOwnedVenueOr403(req, res, venueId) {
  const venue = db.data.venues.find((v) => v.id === Number(venueId));
  if (!venue) {
    err(res, 404, 'Ground not found.');
    return null;
  }
  if (req.user.role !== 'admin' && venue.ownerId !== req.user.id) {
    err(res, 403, 'You do not manage this ground.');
    return null;
  }
  return venue;
}

// ---------- AUTH ----------

app.post('/api/auth/register', (req, res) => {
  const body = req.body || {};
  const { team, players, account } = body;
  if (!team || !account || !account.email || !account.password) {
    return err(res, 400, 'Missing required registration fields.');
  }
  if (!team.venueId) {
    return err(res, 400, 'Please select the futsal ground you want to register your team under.');
  }
  if (account.password !== account.confirmPassword) {
    return err(res, 400, 'Passwords do not match.');
  }
  if (db.data.users.some((u) => u.email.toLowerCase() === account.email.toLowerCase())) {
    return err(res, 409, 'An account with this email already exists.');
  }
  const sport = db.data.sports.find((s) => s.id === Number(team.sportId));
  if (!sport) return err(res, 400, 'Please select a valid sport.');

  const venue = db.data.venues.find((v) => v.id === Number(team.venueId));
  if (!venue) return err(res, 400, 'Please select a valid ground.');
  if (!venue.sportIds.includes(sport.id)) {
    return err(res, 400, 'The selected ground does not support this sport.');
  }

  const squadLimit = sport.squadLimit;
  const incomingPlayers = Array.isArray(players) ? players.slice(0, squadLimit) : [];

  // Prevent duplicate players (by name + jersey number within the same team)
  const seen = new Set();
  for (const p of incomingPlayers) {
    const key = `${(p.name || '').trim().toLowerCase()}-${p.jerseyNumber}`;
    if (seen.has(key)) return err(res, 400, `Duplicate player detected: ${p.name} (#${p.jerseyNumber}).`);
    seen.add(key);
  }

  const newTeam = {
    id: db.nextId('teams'),
    name: team.name,
    sportId: sport.id,
    venueId: venue.id,
    logo: team.logo || null,
    description: team.description || '',
    city: team.city || '',
    area: team.area || '',
    homeGround: venue.name,
    captainName: team.captainName || '',
    captainPhone: team.captainPhone || '',
    captainEmail: team.captainEmail || account.email,
    social: team.social || {},
    preferredFormat: team.preferredFormat || '',
    // Pending until the ground owner (or a super admin) approves it.
    status: 'pending',
    verified: false,
    rating: 0,
    createdAt: Date.now(),
  };
  db.data.teams.push(newTeam);

  incomingPlayers.forEach((p, idx) => {
    db.data.players.push({
      id: db.nextId('players'),
      teamId: newTeam.id,
      name: p.name,
      photo: p.photo || null,
      jerseyNumber: p.jerseyNumber || idx + 1,
      position: p.position || '',
      dob: p.dob || '',
      phone: p.phone || '',
      status: 'active',
      isCaptain: idx === 0,
    });
  });

  const user = {
    id: db.nextId('users'),
    email: account.email,
    passwordHash: hashPassword(account.password),
    role: 'team',
    teamId: newTeam.id,
    name: team.captainName || account.email,
    createdAt: Date.now(),
  };
  db.data.users.push(user);
  db.persist();
  audit(user.email, 'team_registered', { teamId: newTeam.id, venueId: venue.id });

  if (venue.ownerId) {
    notify(venue.ownerId, 'team_registered', `${newTeam.name} registered under ${venue.name} and is awaiting your approval.`);
  }

  const token = signToken(user);
  res.status(201).json({ token, team: publicTeam(newTeam), role: 'team' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.data.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || !comparePassword(password || '', user.passwordHash)) {
    return err(res, 401, 'Invalid email or password.');
  }
  const token = signToken(user);
  audit(user.email, 'login', { role: user.role });
  const team = user.teamId ? publicTeam(db.data.teams.find((t) => t.id === user.teamId)) : null;
  const venues = user.role === 'ground_owner' ? venuesOwnedBy(user.id) : undefined;
  res.json({ token, role: user.role, team, name: user.name, venues });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.data.users.find((u) => u.id === req.user.id);
  if (!user) return err(res, 404, 'User not found.');
  const team = user.teamId ? publicTeam(db.data.teams.find((t) => t.id === user.teamId)) : null;
  const venues = user.role === 'ground_owner' ? venuesOwnedBy(user.id) : undefined;
  res.json({ role: user.role, team, name: user.name, email: user.email, venues });
});

// ---------- SPORTS ----------

app.get('/api/sports', (req, res) => res.json(db.data.sports));

app.post('/api/sports', requireAuth, requireRole('admin'), (req, res) => {
  const { name, icon, squadLimit, startingPlayers, matchDurationMinutes, description } = req.body || {};
  if (!name) return err(res, 400, 'Sport name is required.');
  const sport = {
    id: db.nextId('sports'),
    key: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    icon: icon || '🏆',
    squadLimit: squadLimit || 11,
    startingPlayers: startingPlayers || 11,
    matchDurationMinutes: matchDurationMinutes || 60,
    description: description || '',
  };
  db.data.sports.push(sport);
  db.persist();
  res.status(201).json(sport);
});

app.patch('/api/sports/:id', requireAuth, requireRole('admin'), (req, res) => {
  const sport = db.data.sports.find((s) => s.id === Number(req.params.id));
  if (!sport) return err(res, 404, 'Sport not found.');
  Object.assign(sport, req.body || {});
  db.persist();
  res.json(sport);
});

// ---------- VENUES (grounds) ----------

app.get('/api/venues', (req, res) => {
  const { sportId, city } = req.query;
  let list = db.data.venues;
  if (sportId) list = list.filter((v) => v.sportIds.includes(Number(sportId)));
  if (city) list = list.filter((v) => v.city.toLowerCase() === String(city).toLowerCase());
  res.json(list);
});

// Super Admin: create a new ground, optionally assigning an existing ground owner.
app.post('/api/venues', requireAuth, requireRole('admin'), (req, res) => {
  const v = req.body || {};
  if (!v.name || !v.sportIds || !v.openingTime || !v.closingTime) {
    return err(res, 400, 'Name, sports, opening and closing times are required.');
  }
  if (v.ownerId) {
    const owner = db.data.users.find((u) => u.id === Number(v.ownerId) && u.role === 'ground_owner');
    if (!owner) return err(res, 400, 'Invalid ground owner.');
  }
  const venue = {
    id: db.nextId('venues'),
    status: 'active',
    ownerId: v.ownerId ? Number(v.ownerId) : null,
    slotDurationMinutes: 90,
    breakMinutes: 15,
    pricePerSlot: 3000,
    weekendPricePerSlot: 3000,
    capacity: 20,
    images: [],
    ...v,
  };
  db.data.venues.push(venue);
  db.persist();
  audit(req.user.email, 'venue_created', { venueId: venue.id, ownerId: venue.ownerId });
  res.status(201).json(venue);
});

app.patch('/api/venues/:id', requireAuth, requireRole('admin'), (req, res) => {
  const venue = db.data.venues.find((v) => v.id === Number(req.params.id));
  if (!venue) return err(res, 404, 'Venue not found.');
  Object.assign(venue, req.body || {});
  db.persist();
  res.json(venue);
});

// ---------- SLOTS ----------

app.get('/api/slots', (req, res) => {
  releaseExpiredBookings();
  const { venueId, date } = req.query;
  if (!venueId || !date) return err(res, 400, 'venueId and date are required.');
  const venue = db.data.venues.find((v) => v.id === Number(venueId));
  if (!venue) return err(res, 404, 'Venue not found.');
  const allSlots = generateSlots(venue);
  const day = new Date(date).getDay();
  const isWeekend = day === 0 || day === 6;
  const price = isWeekend ? venue.weekendPricePerSlot : venue.pricePerSlot;
  const slots = allSlots.map((time) => ({
    time,
    price,
    status: isSlotTaken(venue.id, date, time) ? 'booked' : 'available',
  }));
  res.json({ venue, date, slots });
});

// ---------- BOOKINGS ----------

app.get('/api/bookings/mine', requireAuth, requireRole('team'), (req, res) => {
  releaseExpiredBookings();
  const mine = db.data.bookings.filter((b) => b.teamId === req.user.teamId || b.opponentTeamId === req.user.teamId);
  res.json(mine);
});

app.post('/api/bookings', requireAuth, requireRole('team'), (req, res) => {
  releaseExpiredBookings();
  const { venueId, sportId, date, time, matchType } = req.body || {};
  if (!venueId || !sportId || !date || !time) return err(res, 400, 'venueId, sportId, date and time are required.');

  const venue = db.data.venues.find((v) => v.id === Number(venueId));
  if (!venue) return err(res, 404, 'Venue not found.');
  if (!venue.sportIds.includes(Number(sportId))) return err(res, 400, 'This venue does not support the selected sport.');

  // ---- Atomic check-and-reserve (single synchronous block: no await between
  // the availability check and the insert, so this cannot race). ----
  if (isSlotTaken(venue.id, date, time)) {
    return err(res, 409, 'Sorry, this slot has just been booked by another team.');
  }
  const booking = {
    id: db.nextId('bookings'),
    venueId: venue.id,
    sportId: Number(sportId),
    date,
    time,
    teamId: req.user.teamId,
    opponentTeamId: null,
    matchType: matchType || 'Friendly Match',
    status: 'reserved',
    expiresAt: Date.now() + RESERVATION_MINUTES * 60 * 1000,
    createdAt: Date.now(),
  };
  db.data.bookings.push(booking);
  db.persist();
  res.status(201).json(booking);
});

// -----------------------------------------new_feature--------------------------------
app.post('/api/bookings/:id/pay', requireAuth, requireRole('team'), (req, res) => {
  releaseExpiredBookings();
  const booking = db.data.bookings.find((b) => b.id === Number(req.params.id));
  if (!booking) return err(res, 404, 'Booking not found.');
  if (booking.teamId !== req.user.teamId) return err(res, 403, 'This booking does not belong to your team.');
  if (booking.status !== 'reserved') return err(res, 400, 'This booking is not awaiting payment (it may have expired or already been paid).');

  const venue = db.data.venues.find((v) => v.id === booking.venueId);
  const day = new Date(booking.date).getDay();
  const isWeekend = day === 0 || day === 6;
  const amount = isWeekend ? venue.weekendPricePerSlot : venue.pricePerSlot;
  const { method, phone } = req.body || {};

  const payment = {
    id: db.nextId('payments'),
    bookingId: booking.id,
    matchId: null,
    teamId: booking.teamId,
    venueId: venue.id,
    amount,
    status: 'paid',
    method: method || 'easypaisa',
    phone: phone || null,
    createdAt: Date.now(),
    paidAt: Date.now(),
  };
  db.data.payments.push(payment);

  booking.status = 'paid';
  booking.expiresAt = Date.now() + INVITE_WINDOW_MINUTES * 60 * 1000;
  db.persist();

  const team = db.data.teams.find((t) => t.id === booking.teamId);
  if (venue.ownerId) {
    notify(venue.ownerId, 'payment_success', `💳 ${team?.name} paid PKR ${amount.toLocaleString()} for a slot at ${venue.name}.`);
  }

  res.status(201).json({ booking, payment });
});


// app.post('/api/bookings/:id/cancel', requireAuth, requireRole('team'), (req, res) => {
//   const booking = db.data.bookings.find((b) => b.id === Number(req.params.id));
//   if (!booking) return err(res, 404, 'Booking not found.');
//   if (booking.teamId !== req.user.teamId) return err(res, 403, 'You cannot cancel a booking that is not yours.');
//   booking.status = 'cancelled';
//   db.persist();
//   res.json(booking);
// });
app.post('/api/bookings/:id/cancel', requireAuth, requireRole('team'), (req, res) => {
  const booking = db.data.bookings.find((b) => b.id === Number(req.params.id));
  if (!booking) return err(res, 404, 'Booking not found.');
  if (booking.teamId !== req.user.teamId) return err(res, 403, 'You cannot cancel a booking that is not yours.');
  booking.status = 'cancelled';
  const payment = db.data.payments.find((p) => p.bookingId === booking.id && p.status === 'paid');
  if (payment) payment.status = 'refunded';
  db.persist();
  res.json(booking);
});



app.post('/api/bookings/:id/invite', requireAuth, requireRole('team'), (req, res) => {
  releaseExpiredBookings();
  const booking = db.data.bookings.find((b) => b.id === Number(req.params.id));
  if (!booking) return err(res, 404, 'Booking not found.');
  if (booking.teamId !== req.user.teamId) return err(res, 403, 'You cannot invite for a booking that is not yours.');
  // if (booking.status !== 'reserved') return err(res, 400, 'This booking is no longer available for invitations (it may have expired).');
  if (booking.status !== 'paid') return err(res, 400, 'Please pay the ground fee before inviting an opponent.');


  const { opponentTeamId, message } = req.body || {};
  const opponent = getTeamOr404(res, opponentTeamId);
  if (!opponent) return;
  if (opponent.id === booking.teamId) return err(res, 400, 'You cannot invite your own team.');
  if (opponent.sportId !== booking.sportId) return err(res, 400, 'The invited team does not play this sport.');

  booking.opponentTeamId = opponent.id;
  booking.status = 'invited';
  const invitation = {
    id: db.nextId('invitations'),
    bookingId: booking.id,
    fromTeamId: booking.teamId,
    toTeamId: opponent.id,
    status: 'pending',
    message: message || '',
    createdAt: Date.now(),
  };
  db.data.invitations.push(invitation);
  db.persist();

  const fromTeam = db.data.teams.find((t) => t.id === booking.teamId);
  const sportIcon = (db.data.sports.find((s) => s.id === booking.sportId) || {}).icon || '🏆';
  notify(opponent.id, 'invitation', `${sportIcon} ${fromTeam.name} has challenged your team.`);

  res.status(201).json(invitation);
});

// ---------- INVITATIONS ----------

app.get('/api/invitations/mine', requireAuth, requireRole('team'), (req, res) => {
  const mine = db.data.invitations.filter((i) => i.toTeamId === req.user.teamId || i.fromTeamId === req.user.teamId);
  res.json(mine);
});

// app.post('/api/invitations/:id/accept', requireAuth, requireRole('team'), (req, res) => {
//   releaseExpiredBookings();
//   const invitation = db.data.invitations.find((i) => i.id === Number(req.params.id));
//   if (!invitation) return err(res, 404, 'Invitation not found.');
//   if (invitation.toTeamId !== req.user.teamId) return err(res, 403, 'This invitation was not sent to your team.');
//   if (invitation.status !== 'pending') return err(res, 400, 'This invitation has already been responded to.');

//   const booking = db.data.bookings.find((b) => b.id === invitation.bookingId);
//   if (!booking || booking.status !== 'invited') return err(res, 400, 'This booking is no longer available.');

//   invitation.status = 'accepted';
//   booking.status = 'accepted';
//   booking.paymentExpiresAt = Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000;

//   const venue = db.data.venues.find((v) => v.id === booking.venueId);
//   const match = {
//     id: db.nextId('matches'),
//     bookingId: booking.id,
//     teamAId: booking.teamId,
//     teamBId: booking.opponentTeamId,
//     sportId: booking.sportId,
//     venueId: booking.venueId,
//     date: booking.date,
//     time: booking.time,
//     matchType: booking.matchType,
//     status: 'awaiting_payment',
//     result: null,
//     createdAt: Date.now(),
//   };
//   db.data.matches.push(match);

//   const payment = {
//     id: db.nextId('payments'),
//     matchId: match.id,
//     teamId: booking.teamId,
//     amount: venue.pricePerSlot,
//     status: 'pending',
//     method: null,
//     createdAt: Date.now(),
//   };
//   db.data.payments.push(payment);
//   db.persist();

//   notify(booking.teamId, 'invitation_accepted', `🏆 Your match invitation has been accepted. Payment is required to confirm.`);
//   res.json({ invitation, match, payment });
// });
app.post('/api/invitations/:id/accept', requireAuth, requireRole('team'), (req, res) => {
  releaseExpiredBookings();
  const invitation = db.data.invitations.find((i) => i.id === Number(req.params.id));
  if (!invitation) return err(res, 404, 'Invitation not found.');
  if (invitation.toTeamId !== req.user.teamId) return err(res, 403, 'This invitation was not sent to your team.');
  if (invitation.status !== 'pending') return err(res, 400, 'This invitation has already been responded to.');

  const booking = db.data.bookings.find((b) => b.id === invitation.bookingId);
  if (!booking || booking.status !== 'invited') return err(res, 400, 'This booking is no longer available.');

  invitation.status = 'accepted';
  booking.status = 'confirmed';

  const match = {
    id: db.nextId('matches'),
    bookingId: booking.id,
    teamAId: booking.teamId,
    teamBId: booking.opponentTeamId,
    sportId: booking.sportId,
    venueId: booking.venueId,
    date: booking.date,
    time: booking.time,
    matchType: booking.matchType,
    status: 'confirmed',
    result: null,
    createdAt: Date.now(),
  };
  db.data.matches.push(match);

  // Link the pre-payment (settled when the slot was reserved) to this match.
  const payment = db.data.payments.find((p) => p.bookingId === booking.id && p.status === 'paid');
  if (payment) payment.matchId = match.id;

  db.persist();

  const teamA = db.data.teams.find((t) => t.id === booking.teamId);
  const teamB = db.data.teams.find((t) => t.id === booking.opponentTeamId);
  notify(booking.teamId, 'match_confirmed', `✅ ${teamB?.name} accepted your challenge. Match confirmed!`);
  notify(booking.opponentTeamId, 'invitation_accepted', `🏆 Match confirmed — you're playing ${teamA?.name}.`);

  res.json({ invitation, match });
});


app.post('/api/invitations/:id/reject', requireAuth, requireRole('team'), (req, res) => {
  const invitation = db.data.invitations.find((i) => i.id === Number(req.params.id));
  if (!invitation) return err(res, 404, 'Invitation not found.');
  if (invitation.toTeamId !== req.user.teamId) return err(res, 403, 'This invitation was not sent to your team.');
  if (invitation.status !== 'pending') return err(res, 400, 'This invitation has already been responded to.');

  invitation.status = 'rejected';
  const booking = db.data.bookings.find((b) => b.id === invitation.bookingId);
  // if (booking) booking.status = 'cancelled';
  // db.persist();
  if (booking) {
    booking.status = 'cancelled';
    const payment = db.data.payments.find((p) => p.bookingId === booking.id && p.status === 'paid');
    if (payment) payment.status = 'refunded';
  }

  const toTeam = db.data.teams.find((t) => t.id === req.user.teamId);
  notify(invitation.fromTeamId, 'invitation_rejected', `Your match invitation was declined by ${toTeam.name}. The slot has been released.`);
  res.json(invitation);
});

// ---------- PAYMENTS ----------

app.get('/api/payments/mine', requireAuth, requireRole('team'), (req, res) => {
  const mine = db.data.payments.filter((p) => p.teamId === req.user.teamId);
  res.json(mine);
});

app.post('/api/payments/:id/pay', requireAuth, requireRole('team'), (req, res) => {
  releaseExpiredBookings();
  const payment = db.data.payments.find((p) => p.id === Number(req.params.id));
  if (!payment) return err(res, 404, 'Payment not found.');
  if (payment.teamId !== req.user.teamId) return err(res, 403, 'This payment does not belong to your team.');
  if (payment.status === 'paid') return err(res, 400, 'This payment has already been completed.');

  const match = db.data.matches.find((m) => m.id === payment.matchId);
  if (!match || match.status === 'cancelled') return err(res, 400, 'This match is no longer awaiting payment (it may have expired).');

  // Mock payment gateway: always succeeds in the demo.
  payment.status = 'paid';
  payment.method = (req.body && req.body.method) || 'card';
  payment.paidAt = Date.now();

  match.status = 'confirmed';
  const booking = db.data.bookings.find((b) => b.id === match.bookingId);
  if (booking) booking.status = 'confirmed';
  db.persist();

  notify(match.teamAId, 'payment_success', '💳 Payment successful. Your match is confirmed!');
  notify(match.teamBId, 'match_confirmed', '✅ Your match has been confirmed by the opponent.');

  res.json({ payment, match });
});

// ---------- MATCHES ----------

app.get('/api/matches', (req, res) => {
  const { sportId, teamId, status, venueId } = req.query;
  let list = db.data.matches;
  if (sportId) list = list.filter((m) => m.sportId === Number(sportId));
  if (teamId) list = list.filter((m) => m.teamAId === Number(teamId) || m.teamBId === Number(teamId));
  if (status) list = list.filter((m) => m.status === status);
  if (venueId) list = list.filter((m) => m.venueId === Number(venueId));
  res.json(list.sort((a, b) => b.createdAt - a.createdAt));
});

app.get('/api/matches/:id', (req, res) => {
  const match = db.data.matches.find((m) => m.id === Number(req.params.id));
  if (!match) return err(res, 404, 'Match not found.');
  const teamA = db.data.teams.find((t) => t.id === match.teamAId);
  const teamB = db.data.teams.find((t) => t.id === match.teamBId);
  const venue = db.data.venues.find((v) => v.id === match.venueId);
  const sport = db.data.sports.find((s) => s.id === match.sportId);
  res.json({ ...match, teamA, teamB, venue, sport });
});

app.post('/api/matches/:id/result', requireAuth, (req, res) => {
  const match = db.data.matches.find((m) => m.id === Number(req.params.id));
  if (!match) return err(res, 404, 'Match not found.');
  const isParticipant = req.user.role === 'team' && (req.user.teamId === match.teamAId || req.user.teamId === match.teamBId);
  const isGroundOwner = req.user.role === 'ground_owner' && ownsVenue(req.user.id, match.venueId);
  if (req.user.role !== 'admin' && !isParticipant && !isGroundOwner) {
    return err(res, 403, 'Only match participants, the ground owner, or an admin can submit a result.');
  }
  if (match.status !== 'confirmed') return err(res, 400, 'Results can only be submitted for confirmed matches.');

  match.result = req.body || {};
  match.status = 'completed';
  db.persist();

  notify(match.teamAId, 'result_submitted', 'The result for your match has been recorded.');
  notify(match.teamBId, 'result_submitted', 'The result for your match has been recorded.');
  res.json(match);
});

// ---------- RANKINGS ----------

app.get('/api/rankings', (req, res) => {
  const { sportId } = req.query;
  if (!sportId) return err(res, 400, 'sportId is required.');
  res.json(computeRankings(Number(sportId)));
});

// ---------- TEAMS ----------

app.get('/api/teams', (req, res) => {
  const { sportId, city, search, venueId } = req.query;
  let list = db.data.teams.filter((t) => t.status === 'approved');
  if (sportId) list = list.filter((t) => t.sportId === Number(sportId));
  if (city) list = list.filter((t) => t.city.toLowerCase() === String(city).toLowerCase());
  if (search) list = list.filter((t) => t.name.toLowerCase().includes(String(search).toLowerCase()));
  if (venueId) list = list.filter((t) => t.venueId === Number(venueId));
  res.json(list.map((t) => ({ ...t, stats: computeTeamStats(t.id) })));
});

app.get('/api/teams/:id', (req, res) => {
  const team = getTeamOr404(res, req.params.id);
  if (!team) return;
  res.json(publicTeam(team));
});

app.patch('/api/teams/:id', requireAuth, requireRole('team'), (req, res) => {
  const team = getTeamOr404(res, req.params.id);
  if (!team) return;
  if (team.id !== req.user.teamId) return err(res, 403, 'You can only edit your own team.');
  const editable = ['name', 'logo', 'description', 'city', 'area', 'homeGround', 'captainName', 'captainPhone', 'captainEmail', 'social', 'preferredFormat'];
  for (const key of editable) if (key in req.body) team[key] = req.body[key];
  db.persist();
  res.json(publicTeam(team));
});

app.post('/api/teams/:id/players', requireAuth, requireRole('team'), (req, res) => {
  const team = getTeamOr404(res, req.params.id);
  if (!team) return;
  if (team.id !== req.user.teamId) return err(res, 403, 'You can only manage your own team.');
  const sport = db.data.sports.find((s) => s.id === team.sportId);
  const currentCount = db.data.players.filter((p) => p.teamId === team.id).length;
  if (currentCount >= sport.squadLimit) {
    return err(res, 400, `You have reached the maximum squad size (${sport.squadLimit}).`);
  }
  const p = req.body || {};
  if (!p.name) return err(res, 400, 'Player name is required.');
  const dup = db.data.players.find(
    (existing) => existing.teamId === team.id && existing.name.trim().toLowerCase() === p.name.trim().toLowerCase()
  );
  if (dup) return err(res, 400, 'A player with this name already exists on your team.');

  const player = {
    id: db.nextId('players'),
    teamId: team.id,
    name: p.name,
    photo: p.photo || null,
    jerseyNumber: p.jerseyNumber || currentCount + 1,
    position: p.position || '',
    dob: p.dob || '',
    phone: p.phone || '',
    status: 'active',
    isCaptain: false,
  };
  db.data.players.push(player);
  db.persist();
  res.status(201).json(player);
});

app.put('/api/teams/:id/players/:playerId', requireAuth, requireRole('team'), (req, res) => {
  const team = getTeamOr404(res, req.params.id);
  if (!team) return;
  if (team.id !== req.user.teamId) return err(res, 403, 'You can only manage your own team.');
  const player = db.data.players.find((p) => p.id === Number(req.params.playerId) && p.teamId === team.id);
  if (!player) return err(res, 404, 'Player not found.');
  Object.assign(player, req.body || {});
  db.persist();
  res.json(player);
});

app.delete('/api/teams/:id/players/:playerId', requireAuth, requireRole('team'), (req, res) => {
  const team = getTeamOr404(res, req.params.id);
  if (!team) return;
  if (team.id !== req.user.teamId) return err(res, 403, 'You can only manage your own team.');
  const idx = db.data.players.findIndex((p) => p.id === Number(req.params.playerId) && p.teamId === team.id);
  if (idx === -1) return err(res, 404, 'Player not found.');
  db.data.players.splice(idx, 1);
  db.persist();
  res.status(204).end();
});

// ---------- NOTIFICATIONS ----------

app.get('/api/notifications/mine', requireAuth, (req, res) => {
  let mine;
  if (req.user.role === 'team') {
    mine = db.data.notifications.filter((n) => n.teamId === req.user.teamId);
  } else if (req.user.role === 'ground_owner') {
    mine = db.data.notifications.filter((n) => n.ownerId === req.user.id);
  } else {
    return err(res, 403, 'Not applicable for this role.');
  }
  res.json(mine.sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/notifications/:id/read', requireAuth, (req, res) => {
  const n = db.data.notifications.find((x) => x.id === Number(req.params.id));
  if (!n) return err(res, 404, 'Notification not found.');
  const isMine = (req.user.role === 'team' && n.teamId === req.user.teamId) || (req.user.role === 'ground_owner' && n.ownerId === req.user.id);
  if (!isMine) return err(res, 403, 'Not your notification.');
  n.read = true;
  db.persist();
  res.json(n);
});

// ---------- RATINGS ----------

app.post('/api/matches/:id/rate', requireAuth, requireRole('team'), (req, res) => {
  const match = db.data.matches.find((m) => m.id === Number(req.params.id));
  if (!match || match.status !== 'completed') return err(res, 400, 'You can only rate completed matches.');
  const isA = match.teamAId === req.user.teamId;
  const isB = match.teamBId === req.user.teamId;
  if (!isA && !isB) return err(res, 403, 'You did not play in this match.');
  const toTeamId = isA ? match.teamBId : match.teamAId;
  const { sportsmanship, fairPlay, teamQuality, punctuality } = req.body || {};
  const overall = +(((sportsmanship || 0) + (fairPlay || 0) + (teamQuality || 0) + (punctuality || 0)) / 4).toFixed(1);
  const rating = { id: db.nextId('ratings'), matchId: match.id, fromTeamId: req.user.teamId, toTeamId, sportsmanship, fairPlay, teamQuality, punctuality, overall, createdAt: Date.now() };
  db.data.ratings.push(rating);

  const targetRatings = db.data.ratings.filter((r) => r.toTeamId === toTeamId);
  const avg = targetRatings.reduce((s, r) => s + r.overall, 0) / targetRatings.length;
  const team = db.data.teams.find((t) => t.id === toTeamId);
  if (team) team.rating = +avg.toFixed(1);

  db.persist();
  res.status(201).json(rating);
});

// ==================== GROUND OWNER ====================
// Everything below is scoped to venue(s) where venue.ownerId === req.user.id.

app.get('/api/ground-owner/venues', requireAuth, requireRole('ground_owner'), (req, res) => {
  res.json(venuesOwnedBy(req.user.id).map(publicVenueSummary));
});

app.patch('/api/ground-owner/venues/:id', requireAuth, requireRole('ground_owner'), (req, res) => {
  const venue = getOwnedVenueOr403(req, res, req.params.id);
  if (!venue) return;
  // Ground owners can tune their own operating parameters, but cannot
  // reassign ownership or rename/relocate the ground itself — that stays
  // with the Super Admin.
  // const editable = ['openingTime', 'closingTime', 'slotDurationMinutes', 'breakMinutes', 'pricePerSlot', 'weekendPricePerSlot', 'address', 'capacity', 'images', 'status'];
  const editable = ['openingTime', 'closingTime', 'slotDurationMinutes', 'breakMinutes', 'pricePerSlot', 'weekendPricePerSlot', 'address', 'capacity', 'images', 'status', 'easypaisaNumber', 'easypaisaName'];
  for (const key of editable) if (key in req.body) venue[key] = req.body[key];
  db.persist();
  res.json(venue);
});

app.get('/api/ground-owner/teams', requireAuth, requireRole('ground_owner'), (req, res) => {
  const venueIds = venuesOwnedBy(req.user.id).map((v) => v.id);
  const teams = db.data.teams.filter((t) => venueIds.includes(t.venueId));
  res.json(
    teams.map((t) => ({
      ...t,
      stats: computeTeamStats(t.id),
      playerCount: db.data.players.filter((p) => p.teamId === t.id).length,
    }))
  );
});

app.patch('/api/ground-owner/teams/:id/status', requireAuth, requireRole('ground_owner'), (req, res) => {
  const team = db.data.teams.find((t) => t.id === Number(req.params.id));
  if (!team) return err(res, 404, 'Team not found.');
  if (!ownsVenue(req.user.id, team.venueId)) return err(res, 403, 'This team is not registered under your ground.');
  const { status } = req.body || {};
  if (!['pending', 'approved', 'suspended', 'blocked'].includes(status)) return err(res, 400, 'Invalid status.');
  const previous = team.status;
  team.status = status;
  db.persist();
  audit(req.user.email, 'team_status_changed', { teamId: team.id, previous, status });
  res.json(team);
});

app.get('/api/ground-owner/matches', requireAuth, requireRole('ground_owner'), (req, res) => {
  const venueIds = venuesOwnedBy(req.user.id).map((v) => v.id);
  res.json(db.data.matches.filter((m) => venueIds.includes(m.venueId)).sort((a, b) => b.createdAt - a.createdAt));
});

// Ground owner directly schedules a match between two teams registered at
// their ground (skips the team-initiated reserve → invite → accept flow).
app.post('/api/ground-owner/matches', requireAuth, requireRole('ground_owner'), (req, res) => {
  releaseExpiredBookings();
  const { venueId, teamAId, teamBId, date, time, matchType } = req.body || {};
  const venue = getOwnedVenueOr403(req, res, venueId);
  if (!venue) return;
  if (!date || !time) return err(res, 400, 'Date and time are required.');

  const teamA = getTeamOr404(res, teamAId);
  if (!teamA) return;
  const teamB = getTeamOr404(res, teamBId);
  if (!teamB) return;
  if (teamA.id === teamB.id) return err(res, 400, 'A team cannot play itself.');
  if (teamA.venueId !== venue.id || teamB.venueId !== venue.id) {
    return err(res, 400, 'Both teams must be registered under this ground.');
  }
  if (teamA.status !== 'approved' || teamB.status !== 'approved') {
    return err(res, 400, 'Both teams must be approved before scheduling a match.');
  }
  if (isSlotTaken(venue.id, date, time)) {
    return err(res, 409, 'This slot is already booked at your ground.');
  }

  const booking = {
    id: db.nextId('bookings'),
    venueId: venue.id,
    sportId: teamA.sportId,
    date,
    time,
    teamId: teamA.id,
    opponentTeamId: teamB.id,
    matchType: matchType || 'League Match',
    status: 'confirmed',
    createdAt: Date.now(),
  };
  db.data.bookings.push(booking);

  const match = {
    id: db.nextId('matches'),
    bookingId: booking.id,
    teamAId: teamA.id,
    teamBId: teamB.id,
    sportId: booking.sportId,
    venueId: venue.id,
    date,
    time,
    matchType: booking.matchType,
    status: 'confirmed',
    result: null,
    createdAt: Date.now(),
  };
  db.data.matches.push(match);
  db.persist();

  notify(teamA.id, 'match_confirmed', `📅 ${venue.name} scheduled your match vs ${teamB.name} on ${date} at ${time}.`);
  notify(teamB.id, 'match_confirmed', `📅 ${venue.name} scheduled your match vs ${teamA.name} on ${date} at ${time}.`);

  res.status(201).json(match);
});

app.patch('/api/ground-owner/matches/:id', requireAuth, requireRole('ground_owner'), (req, res) => {
  const match = db.data.matches.find((m) => m.id === Number(req.params.id));
  if (!match) return err(res, 404, 'Match not found.');
  if (!ownsVenue(req.user.id, match.venueId)) return err(res, 403, 'This match is not at your ground.');
  const editable = ['date', 'time', 'matchType', 'status'];
  for (const key of editable) if (key in req.body) match[key] = req.body[key];
  db.persist();
  res.json(match);
});

app.post('/api/ground-owner/matches/:id/result', requireAuth, requireRole('ground_owner'), (req, res) => {
  const match = db.data.matches.find((m) => m.id === Number(req.params.id));
  if (!match) return err(res, 404, 'Match not found.');
  if (!ownsVenue(req.user.id, match.venueId)) return err(res, 403, 'This match is not at your ground.');
  if (match.status !== 'confirmed') return err(res, 400, 'Results can only be submitted for confirmed matches.');
  match.result = req.body || {};
  match.status = 'completed';
  db.persist();
  notify(match.teamAId, 'result_submitted', 'The result for your match has been recorded.');
  notify(match.teamBId, 'result_submitted', 'The result for your match has been recorded.');
  res.json(match);
});

app.get('/api/ground-owner/bookings', requireAuth, requireRole('ground_owner'), (req, res) => {
  releaseExpiredBookings();
  const venueIds = venuesOwnedBy(req.user.id).map((v) => v.id);
  res.json(db.data.bookings.filter((b) => venueIds.includes(b.venueId)));
});

app.get('/api/ground-owner/stats', requireAuth, requireRole('ground_owner'), (req, res) => {
  const venueIds = venuesOwnedBy(req.user.id).map((v) => v.id);
  const teams = db.data.teams.filter((t) => venueIds.includes(t.venueId));
  const matches = db.data.matches.filter((m) => venueIds.includes(m.venueId));
  const bookings = db.data.bookings.filter((b) => venueIds.includes(b.venueId));
  const payments = db.data.payments.filter((p) => matches.some((m) => m.id === p.matchId));
  res.json({
    totalGrounds: venueIds.length,
    totalTeams: teams.length,
    pendingTeams: teams.filter((t) => t.status === 'pending').length,
    totalMatches: matches.length,
    upcomingMatches: matches.filter((m) => m.status === 'confirmed').length,
    completedMatches: matches.filter((m) => m.status === 'completed').length,
    activeBookings: bookings.filter((b) => ACTIVE_BOOKING_STATUSES.includes(b.status)).length,
    revenue: payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
  });
});

// ==================== ADMIN (Super Admin) ====================

app.get('/api/admin/stats', requireAuth, requireRole('admin'), (req, res) => {
  const { data } = db;
  const revenue = data.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingPayments = data.payments.filter((p) => p.status === 'pending').length;
  res.json({
    totalTeams: data.teams.length,
    activeTeams: data.teams.filter((t) => t.status === 'approved').length,
    pendingTeams: data.teams.filter((t) => t.status === 'pending').length,
    totalPlayers: data.players.length,
    totalMatches: data.matches.length,
    upcomingMatches: data.matches.filter((m) => m.status === 'confirmed').length,
    completedMatches: data.matches.filter((m) => m.status === 'completed').length,
    cancelledMatches: data.matches.filter((m) => m.status === 'cancelled').length,
    totalRevenue: revenue,
    pendingPayments,
    activeBookings: data.bookings.filter((b) => ACTIVE_BOOKING_STATUSES.includes(b.status)).length,
    totalGrounds: data.venues.length,
    unassignedGrounds: data.venues.filter((v) => !v.ownerId).length,
    totalGroundOwners: data.users.filter((u) => u.role === 'ground_owner').length,
    sportsPopularity: data.sports.map((s) => ({
      sport: s.name,
      matches: data.matches.filter((m) => m.sportId === s.id).length,
      teams: data.teams.filter((t) => t.sportId === s.id).length,
    })),
  });
});

app.get('/api/admin/teams', requireAuth, requireRole('admin'), (req, res) => {
  const { status, sportId, venueId } = req.query;
  let list = db.data.teams;
  if (status) list = list.filter((t) => t.status === status);
  if (sportId) list = list.filter((t) => t.sportId === Number(sportId));
  if (venueId) list = list.filter((t) => t.venueId === Number(venueId));
  res.json(list.map((t) => ({ ...t, stats: computeTeamStats(t.id), playerCount: db.data.players.filter((p) => p.teamId === t.id).length })));
});

app.patch('/api/admin/teams/:id/status', requireAuth, requireRole('admin'), (req, res) => {
  const team = db.data.teams.find((t) => t.id === Number(req.params.id));
  if (!team) return err(res, 404, 'Team not found.');
  const { status } = req.body || {};
  if (!['pending', 'approved', 'suspended', 'blocked'].includes(status)) return err(res, 400, 'Invalid status.');
  const previous = team.status;
  team.status = status;
  db.persist();
  audit(req.user.email, 'team_status_changed', { teamId: team.id, previous, status });
  res.json(team);
});

// Full team edit (name, sport/ground, city, captain info, etc.) — separate
// from the status-only route above.
app.patch('/api/admin/teams/:id', requireAuth, requireRole('admin'), (req, res) => {
  const team = db.data.teams.find((t) => t.id === Number(req.params.id));
  if (!team) return err(res, 404, 'Team not found.');

  const body = req.body || {};

  if (body.venueId !== undefined) {
    const venue = db.data.venues.find((v) => v.id === Number(body.venueId));
    if (!venue) return err(res, 400, 'Invalid ground.');
    if (body.sportId === undefined && !venue.sportIds.includes(team.sportId)) {
      return err(res, 400, 'The selected ground does not support this team\'s sport.');
    }
  }
  if (body.sportId !== undefined && !db.data.sports.find((s) => s.id === Number(body.sportId))) {
    return err(res, 400, 'Invalid sport.');
  }

  const editable = [
    'name', 'city', 'area', 'homeGround', 'description',
    'captainName', 'captainPhone', 'captainEmail', 'preferredFormat', 'verified',
  ];
  for (const key of editable) if (key in body) team[key] = body[key];
  if ('sportId' in body) team.sportId = Number(body.sportId);
  if ('venueId' in body) team.venueId = Number(body.venueId);

  db.persist();
  audit(req.user.email, 'team_edited', { teamId: team.id });
  res.json({
    ...team,
    stats: computeTeamStats(team.id),
    playerCount: db.data.players.filter((p) => p.teamId === team.id).length,
  });
});

app.delete('/api/admin/teams/:id', requireAuth, requireRole('admin'), (req, res) => {
  const idx = db.data.teams.findIndex((t) => t.id === Number(req.params.id));
  if (idx === -1) return err(res, 404, 'Team not found.');
  const [removed] = db.data.teams.splice(idx, 1);
  db.data.players = db.data.players.filter((p) => p.teamId !== removed.id);
  db.persist();
  audit(req.user.email, 'team_deleted', { teamId: removed.id });
  res.status(204).end();
});

// ---- Ground owner management (Super Admin only) ----

app.get('/api/admin/ground-owners', requireAuth, requireRole('admin'), (req, res) => {
  const owners = db.data.users.filter((u) => u.role === 'ground_owner');
  res.json(
    owners.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      venues: venuesOwnedBy(u.id).map((v) => ({ id: v.id, name: v.name, city: v.city })),
    }))
  );
});

// Edit a ground owner's name / email / (optionally) reset their password.
app.patch('/api/admin/ground-owners/:id', requireAuth, requireRole('admin'), (req, res) => {
  const owner = db.data.users.find((u) => u.id === Number(req.params.id) && u.role === 'ground_owner');
  if (!owner) return err(res, 404, 'Ground owner not found.');

  const { name, email, password } = req.body || {};
  if (email && email.toLowerCase() !== owner.email.toLowerCase()) {
    if (db.data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return err(res, 409, 'An account with this email already exists.');
    }
    owner.email = email;
  }
  if (name) owner.name = name;
  if (password) owner.passwordHash = hashPassword(password);

  db.persist();
  audit(req.user.email, 'ground_owner_edited', { ownerId: owner.id });
  res.json({ id: owner.id, email: owner.email, name: owner.name, venues: venuesOwnedBy(owner.id) });
});

app.post('/api/admin/ground-owners', requireAuth, requireRole('admin'), (req, res) => {
  const { name, email, password, venueId } = req.body || {};
  if (!name || !email || !password) return err(res, 400, 'Name, email and password are required.');
  if (db.data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return err(res, 409, 'An account with this email already exists.');
  }
  let venue = null;
  if (venueId) {
    venue = db.data.venues.find((v) => v.id === Number(venueId));
    if (!venue) return err(res, 400, 'Invalid ground.');
    if (venue.ownerId) return err(res, 400, 'This ground already has an owner assigned.');
  }
  const owner = {
    id: db.nextId('users'),
    email,
    passwordHash: hashPassword(password),
    role: 'ground_owner',
    teamId: null,
    name,
    createdAt: Date.now(),
  };
  db.data.users.push(owner);
  if (venue) venue.ownerId = owner.id;
  db.persist();
  audit(req.user.email, 'ground_owner_created', { ownerId: owner.id, venueId: venue ? venue.id : null });
  res.status(201).json({ id: owner.id, email: owner.email, name: owner.name, venues: venue ? [venue] : [] });
});

app.patch('/api/admin/venues/:id/owner', requireAuth, requireRole('admin'), (req, res) => {
  const venue = db.data.venues.find((v) => v.id === Number(req.params.id));
  if (!venue) return err(res, 404, 'Ground not found.');
  const { ownerId } = req.body || {};
  if (ownerId) {
    const owner = db.data.users.find((u) => u.id === Number(ownerId) && u.role === 'ground_owner');
    if (!owner) return err(res, 400, 'Invalid ground owner.');
  }
  venue.ownerId = ownerId ? Number(ownerId) : null;
  db.persist();
  audit(req.user.email, 'venue_owner_assigned', { venueId: venue.id, ownerId: venue.ownerId });
  res.json(venue);
});

app.get('/api/admin/payments', requireAuth, requireRole('admin'), (req, res) => {
  res.json(db.data.payments);
});

app.get('/api/admin/matches', requireAuth, requireRole('admin'), (req, res) => {
  res.json(db.data.matches);
});

app.get('/api/admin/audit-logs', requireAuth, requireRole('admin'), (req, res) => {
  res.json(db.data.auditLogs.slice().reverse());
});

app.get('/api/public/stats', (req, res) => {
  const d = db.data;
  res.json({
    registeredTeams: d.teams.filter((t) => t.status === 'approved').length,
    matchesPlayed: d.matches.filter((m) => m.status === 'completed').length,
    upcomingMatches: d.matches.filter((m) => m.status === 'confirmed').length,
    activePlayers: d.players.length,
    tournaments: 0,
    totalMatches: d.matches.length,
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

module.exports = app;
