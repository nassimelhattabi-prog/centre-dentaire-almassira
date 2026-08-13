const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "reservations.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    telephone TEXT NOT NULL,
    email TEXT DEFAULT '',
    date TEXT NOT NULL,
    heure TEXT NOT NULL,
    soin TEXT NOT NULL,
    message TEXT DEFAULT '',
    statut TEXT NOT NULL DEFAULT 'en_attente',
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_slot_unique
    ON reservations(date, heure)
    WHERE statut != 'annulee';
`);

const SLOTS_BY_DAY = {
  1: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"],
  2: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"],
  3: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"],
  4: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"],
  5: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"],
};

function slotsForDate(date) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return SLOTS_BY_DAY[day] || [];
}

function takenSlots(date) {
  const rows = db.prepare(
    "SELECT heure FROM reservations WHERE date = ? AND statut != 'annulee'"
  ).all(date);
  return new Set(rows.map((row) => row.heure));
}

function availableSlots(date) {
  const taken = takenSlots(date);
  return slotsForDate(date).filter((heure) => !taken.has(heure));
}

function listReservations() {
  return db.prepare(
    "SELECT * FROM reservations ORDER BY date DESC, heure DESC, id DESC"
  ).all();
}

function createReservation(payload) {
  const { nom, telephone, email = "", date, heure, soin, message = "" } = payload;
  if (!nom || !telephone || !date || !heure || !soin) {
    const error = new Error("Champs obligatoires manquants.");
    error.status = 400;
    throw error;
  }

  const available = availableSlots(date);
  if (!available.includes(heure)) {
    const error = new Error("Ce créneau n’est plus disponible.");
    error.status = 409;
    throw error;
  }

  const createdAt = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO reservations (nom, telephone, email, date, heure, soin, message, statut, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'en_attente', ?)
  `).run(nom.trim(), telephone.trim(), email.trim(), date, heure, soin, message.trim(), createdAt);

  return db.prepare("SELECT * FROM reservations WHERE id = ?").get(result.lastInsertRowid);
}

function updateStatut(id, statut) {
  const allowed = new Set(["en_attente", "confirmee", "annulee"]);
  if (!allowed.has(statut)) {
    const error = new Error("Statut invalide.");
    error.status = 400;
    throw error;
  }
  db.prepare("UPDATE reservations SET statut = ? WHERE id = ?").run(statut, id);
  return db.prepare("SELECT * FROM reservations WHERE id = ?").get(id);
}

module.exports = {
  availableSlots,
  slotsForDate,
  listReservations,
  createReservation,
  updateStatut,
};
