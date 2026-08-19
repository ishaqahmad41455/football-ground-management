const db = require('./db');
const { hashPassword } = require('./auth');

function seed() {
  const data = {
    users: [],
    teams: [],
    players: [],
    sports: [],
    venues: [],
    bookings: [],
    matches: [],
    invitations: [],
    payments: [],
    notifications: [],
    ratings: [],
    auditLogs: [],
    seq: {},
  };
  let idc = { sports: 0, venues: 0, teams: 0, players: 0, users: 0, bookings: 0, matches: 0, invitations: 0, payments: 0, notifications: 0, ratings: 0, auditLogs: 0 };
  const nid = (t) => ++idc[t];

  // Sports
  const futsal = { id: nid('sports'), key: 'futsal', name: 'Futsal', icon: '⚽', squadLimit: 15, startingPlayers: 5, matchDurationMinutes: 40, description: 'Fast-paced 5-a-side football on a compact court.' };
  const cricket = { id: nid('sports'), key: 'cricket', name: 'Cricket', icon: '🏏', squadLimit: 15, startingPlayers: 11, matchDurationMinutes: 180, description: 'Classic 11-a-side limited-overs cricket.' };
  data.sports.push(futsal, cricket);

  // Venues (grounds) — ownerId is filled in below once ground-owner accounts exist.
  const venueSeeds = [
    { name: 'Thunder Arena', city: 'Rawalpindi', address: 'Adiala Road, Rawalpindi', sportIds: [futsal.id], openingTime: '09:00', closingTime: '23:30', slotDurationMinutes: 90, breakMinutes: 15, pricePerSlot: 3000, weekendPricePerSlot: 4000, capacity: 12, images: [] },
    { name: 'Victory Futsal Court', city: 'Islamabad', address: 'F-10 Markaz, Islamabad', sportIds: [futsal.id], openingTime: '08:00', closingTime: '24:00', slotDurationMinutes: 60, breakMinutes: 10, pricePerSlot: 2500, weekendPricePerSlot: 3200, capacity: 10, images: [] },
    { name: 'National Cricket Ground', city: 'Rawalpindi', address: 'Chaklala, Rawalpindi', sportIds: [cricket.id], openingTime: '07:00', closingTime: '19:00', slotDurationMinutes: 180, breakMinutes: 30, pricePerSlot: 9000, weekendPricePerSlot: 12000, capacity: 22, images: [] },
    { name: 'Green Oval', city: 'Lahore', address: 'Gulberg, Lahore', sportIds: [cricket.id], openingTime: '07:00', closingTime: '20:00', slotDurationMinutes: 180, breakMinutes: 30, pricePerSlot: 8000, weekendPricePerSlot: 10000, capacity: 22, images: [] },
  ];
  for (const v of venueSeeds) data.venues.push({ id: nid('venues'), status: 'active', ownerId: null, ...v });

  // Super Admin user (role stays "admin" internally; UI labels it "Super Admin").
  data.users.push({ id: nid('users'), email: 'admin@sportshub.com', passwordHash: hashPassword('Admin@123'), role: 'admin', teamId: null, name: 'Platform Admin', createdAt: Date.now() });

  // Ground Owner accounts — one per venue, so every ground has an operator.
  const groundOwners = data.venues.map((venue) => {
    const owner = {
      id: nid('users'),
      email: `owner${venue.id}@sportshub.com`,
      passwordHash: hashPassword('Owner@123'),
      role: 'ground_owner',
      teamId: null,
      name: `${venue.name} Manager`,
      createdAt: Date.now(),
    };
    data.users.push(owner);
    venue.ownerId = owner.id;
    return owner;
  });

  // Predictable demo ground-owner login (manages Thunder Arena, venue[0]).
  const demoOwner = groundOwners[0];
  demoOwner.email = 'owner@ground.com';
  demoOwner.passwordHash = hashPassword('Owner@123');
  demoOwner.name = 'Demo Ground Owner';

  const futsalNames = ['Thunder FC', 'Warriors United', 'Falcon Futsal', 'Titans Arena', 'Blaze FC', 'Rangers Court', 'Storm Kickers', 'Nova United', 'Apex Futsal', 'Rapid Strikers'];
  const cricketNames = ['Alpha Strikers CC', 'United Gladiators', 'Punjab Panthers', 'Capital Kings', 'Northern Knights', 'Rawal Royals', 'Margalla Mavericks', 'Steel Strikers', 'Victory XI', 'Iron Warriors CC'];
  const cities = ['Rawalpindi', 'Islamabad', 'Lahore'];

  function makeTeam(name, sport, i) {
    // Assign each team to one of the two grounds that support its sport —
    // this is the ground the team is "registered under".
    const venue = sport.key === 'futsal' ? data.venues[i % 2] : data.venues[2 + (i % 2)];

    const team = {
      id: nid('teams'),
      name,
      sportId: sport.id,
      venueId: venue.id,
      logo: null,
      description: `${name} is a competitive ${sport.name.toLowerCase()} team known for discipline and teamwork.`,
      city: cities[i % cities.length],
      area: 'Sector ' + (i + 1),
      homeGround: venue.name,
      captainName: `Captain ${i + 1}`,
      captainPhone: `030${100000000 + i}`,
      captainEmail: `captain${i + 1}.${sport.key}@example.com`,
      social: { instagram: '', twitter: '' },
      preferredFormat: sport.key === 'futsal' ? '5-a-side' : 'T20',
      // Seeded teams are pre-approved for demo purposes; in normal use a
      // team starts "pending" until its ground owner approves it.
      status: 'approved',
      verified: i % 3 === 0,
      rating: +(3.5 + Math.random() * 1.5).toFixed(1),
      createdAt: Date.now() - i * 86400000,
    };
    data.teams.push(team);

    const email = `manager${team.id}@example.com`;
    data.users.push({ id: nid('users'), email, passwordHash: hashPassword('Team@123'), role: 'team', teamId: team.id, name: team.captainName, createdAt: Date.now() });

    const squad = sport.squadLimit;
    for (let p = 1; p <= squad; p++) {
      data.players.push({
        id: nid('players'),
        teamId: team.id,
        name: `Player ${p} (${name})`,
        photo: null,
        jerseyNumber: p,
        position: sport.key === 'futsal' ? ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD', 'MID', 'DEF', 'FWD', 'MID'][p - 1] || 'MID' : ['Batsman', 'Batsman', 'Bowler', 'Bowler', 'All-rounder', 'Wicketkeeper', 'Batsman', 'Bowler', 'All-rounder', 'Batsman', 'Bowler'][p - 1] || 'Batsman',
        dob: '1998-0' + ((p % 9) + 1) + '-1' + (p % 9),
        phone: `031${100000000 + team.id * 100 + p}`,
        status: 'active',
        isCaptain: p === 1,
      });
    }
    return team;
  }

  const futsalTeams = futsalNames.map((n, i) => makeTeam(n, futsal, i));
  const cricketTeams = cricketNames.map((n, i) => makeTeam(n, cricket, i));
  const allTeams = [...futsalTeams, ...cricketTeams];

  // Demo team account (predictable login for reviewers)
  const demoTeam = futsalTeams[0];
  const demoUser = data.users.find((u) => u.teamId === demoTeam.id);
  demoUser.email = 'demo@team.com';
  demoUser.passwordHash = hashPassword('Demo@123');

  // Completed matches with results (to populate rankings/history)
  function randScore(sportKey) {
    return sportKey === 'futsal' ? Math.floor(Math.random() * 7) : 90 + Math.floor(Math.random() * 90);
  }

  function completedMatch(teamA, teamB, sport, venue, daysAgo) {
    const scoreA = randScore(sport.key);
    const scoreB = randScore(sport.key);
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
    const booking = {
      id: nid('bookings'),
      venueId: venue.id,
      sportId: sport.id,
      date,
      time: '18:00',
      teamId: teamA.id,
      opponentTeamId: teamB.id,
      matchType: 'Competitive Match',
      status: 'confirmed',
      createdAt: Date.now() - daysAgo * 86400000,
    };
    data.bookings.push(booking);
    const match = {
      id: nid('matches'),
      bookingId: booking.id,
      teamAId: teamA.id,
      teamBId: teamB.id,
      sportId: sport.id,
      venueId: venue.id,
      date,
      time: '18:00',
      matchType: 'Competitive Match',
      status: 'completed',
      result: {
        scoreA,
        scoreB,
        mvp: Math.random() > 0.5 ? teamA.name : teamB.name,
        notes: 'Well-fought contest with strong performances on both sides.',
      },
      createdAt: Date.now() - daysAgo * 86400000,
    };
    data.matches.push(match);
    data.payments.push({ id: nid('payments'), matchId: match.id, teamId: teamA.id, amount: venue.pricePerSlot, status: 'paid', method: 'card', createdAt: Date.now() - daysAgo * 86400000 });
  }

  for (let i = 0; i < 12; i++) {
    const pool = i % 2 === 0 ? futsalTeams : cricketTeams;
    const a = pool[i % pool.length];
    const b = pool[(i + 3) % pool.length];
    if (a.id === b.id) continue;
    completedMatch(a, b, i % 2 === 0 ? futsal : cricket, i % 2 === 0 ? data.venues[i % 2] : data.venues[2 + (i % 2)], 5 + i * 3);
  }

  // Upcoming confirmed matches
  function upcomingMatch(teamA, teamB, sport, venue, daysAhead, time) {
    const date = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
    const booking = { id: nid('bookings'), venueId: venue.id, sportId: sport.id, date, time, teamId: teamA.id, opponentTeamId: teamB.id, matchType: 'Friendly Match', status: 'confirmed', createdAt: Date.now() };
    data.bookings.push(booking);
    const match = { id: nid('matches'), bookingId: booking.id, teamAId: teamA.id, teamBId: teamB.id, sportId: sport.id, venueId: venue.id, date, time, matchType: 'Friendly Match', status: 'confirmed', result: null, createdAt: Date.now() };
    data.matches.push(match);
    data.payments.push({ id: nid('payments'), matchId: match.id, teamId: teamA.id, amount: venue.pricePerSlot, status: 'paid', method: 'card', createdAt: Date.now() });
  }

  upcomingMatch(demoTeam, futsalTeams[1], futsal, data.venues[0], 3, '19:00');
  upcomingMatch(futsalTeams[2], futsalTeams[3], futsal, data.venues[1], 5, '17:00');
  upcomingMatch(cricketTeams[0], cricketTeams[1], cricket, data.venues[2], 7, '09:00');

  // A pending invitation waiting on the demo team
  const inviteBooking = { id: nid('bookings'), venueId: data.venues[0].id, sportId: futsal.id, date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), time: '20:30', teamId: futsalTeams[4].id, opponentTeamId: demoTeam.id, matchType: 'Friendly Match', status: 'invited', createdAt: Date.now() };
  data.bookings.push(inviteBooking);
  data.invitations.push({ id: nid('invitations'), bookingId: inviteBooking.id, fromTeamId: futsalTeams[4].id, toTeamId: demoTeam.id, status: 'pending', message: 'We would like to challenge your team to a Futsal match this weekend!', createdAt: Date.now() });
  data.notifications.push({ id: nid('notifications'), teamId: demoTeam.id, type: 'invitation', message: `⚽ ${futsalTeams[4].name} has challenged your team.`, read: false, createdAt: Date.now() });

  // A team pending approval, so the ground owner dashboard has something to review.
  const pendingTeam = {
    id: nid('teams'),
    name: 'Newcomers FC',
    sportId: futsal.id,
    venueId: data.venues[0].id,
    logo: null,
    description: 'A brand-new squad waiting on ground approval.',
    city: 'Rawalpindi',
    area: 'Sector 12',
    homeGround: data.venues[0].name,
    captainName: 'Bilal Ahmed',
    captainPhone: '03001112233',
    captainEmail: 'newcomers@example.com',
    social: {},
    preferredFormat: '5-a-side',
    status: 'pending',
    verified: false,
    rating: 0,
    createdAt: Date.now(),
  };
  data.teams.push(pendingTeam);
  data.users.push({ id: nid('users'), email: 'newcomers@example.com', passwordHash: hashPassword('Team@123'), role: 'team', teamId: pendingTeam.id, name: pendingTeam.captainName, createdAt: Date.now() });
  data.notifications.push({ id: nid('notifications'), ownerId: demoOwner.id, type: 'team_registered', message: `${pendingTeam.name} registered under ${data.venues[0].name} and is awaiting your approval.`, read: false, createdAt: Date.now() });

  data.seq = idc;
  db.reset(data);
  console.log('Seed complete.');
  console.log('Super Admin login   -> email: admin@sportshub.com / password: Admin@123');
  console.log('Ground Owner login  -> email: owner@ground.com / password: Owner@123 (manages: ' + data.venues[0].name + ')');
  console.log('Demo team login     -> email: demo@team.com / password: Demo@123 (team: ' + demoTeam.name + ')');
}

if (require.main === module) {
  seed();
}

module.exports = seed;
