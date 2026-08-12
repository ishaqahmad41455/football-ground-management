// Lightweight synchronous JSON-file datastore.
// All mutating operations are synchronous, so within a single Node.js
// process (single-threaded event loop, no `await` between check-and-write)
// they are effectively atomic. This is what gives us real, safe
// double-booking prevention without needing a native SQLite build.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DEFAULT_DATA = {
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

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

let db = load();

function persist() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function nextId(table) {
  db.seq[table] = (db.seq[table] || 0) + 1;
  return db.seq[table];
}

function reset(seedData) {
  db = seedData;
  persist();
}

module.exports = {
  get data() {
    return db;
  },
  nextId,
  persist,
  reset,
};
