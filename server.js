const http = require("http");
const fs = require("fs");
const path = require("path");
const db = require("./db");

const PORT = Number(process.env.PORT) || 5180;
const ADMIN_KEY = process.env.ADMIN_KEY || "almassira2026";
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    ...headers,
  });
  res.end(payload);
}

function isAdmin(req) {
  const key = req.headers["x-admin-key"] || "";
  return key === ADMIN_KEY;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("JSON invalide."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === "/") filePath = "/index.html";
  const abs = path.normalize(path.join(ROOT, filePath));
  if (!abs.startsWith(ROOT)) return send(res, 403, { error: "Accès refusé." });
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    return send(res, 404, { error: "Introuvable." });
  }
  const ext = path.extname(abs).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(abs).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    return send(res, 204, "");
  }

  try {
    if (req.method === "GET" && url.pathname === "/api/slots") {
      const date = url.searchParams.get("date");
      if (!date) return send(res, 400, { error: "Date manquante." });
      return send(res, 200, { date, slots: db.availableSlots(date) });
    }

    if (req.method === "POST" && url.pathname === "/api/reservations") {
      const payload = await readBody(req);
      const reservation = db.createReservation(payload);
      return send(res, 201, { ok: true, reservation });
    }

    if (req.method === "GET" && url.pathname === "/api/reservations") {
      if (!isAdmin(req)) return send(res, 401, { error: "Clé admin requise." });
      return send(res, 200, { reservations: db.listReservations() });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/reservations/")) {
      if (!isAdmin(req)) return send(res, 401, { error: "Clé admin requise." });
      const id = Number(url.pathname.split("/").pop());
      const payload = await readBody(req);
      const reservation = db.updateStatut(id, payload.statut);
      if (!reservation) return send(res, 404, { error: "Réservation introuvable." });
      return send(res, 200, { ok: true, reservation });
    }

    if (req.method === "GET") return serveStatic(req, res);
    send(res, 405, { error: "Méthode non autorisée." });
  } catch (error) {
    send(res, error.status || 500, { error: error.message || "Erreur serveur." });
  }
});

server.listen(PORT, () => {
  console.log(`Centre Dentaire ALMASSIRA → http://localhost:${PORT}`);
  console.log(`Admin → http://localhost:${PORT}/admin.html`);
});
