const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
// Railway asigna un puerto automáticamente, por eso usamos process.env.PORT
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir la web (index.html) automáticamente al entrar a la URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Conectar a la base de datos persistente
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error("Error BD:", err.message);
    else console.log("[+] Base de datos conectada.");
});

// Crear tablas iniciales
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS scripts (
        id TEXT PRIMARY KEY,
        name TEXT,
        code TEXT,
        key_used TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// --- API PARA LA WEB ---

app.post('/api/keys', (req, res) => {
    const newKey = "NEXUS-" + uuidv4().toUpperCase().substring(0, 8);
    db.run(`INSERT INTO api_keys (key) VALUES (?)`, [newKey], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, apiKey: newKey });
    });
});

app.get('/api/keys', (req, res) => {
    db.all(`SELECT key, created_at FROM api_keys ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/scripts', (req, res) => {
    db.all(`SELECT * FROM scripts ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- API PARA TU BOT ---

app.post('/api/upload', (req, res) => {
    const providedKey = req.headers['x-api-key'];
    const { scriptName, obfuscatedCode } = req.body;

    db.get(`SELECT key FROM api_keys WHERE key = ?`, [providedKey], (err, row) => {
        if (!row) return res.status(401).json({ error: "Key no autorizada" });

        const scriptId = uuidv4().substring(0, 8);
        db.run(`INSERT INTO scripts (id, name, code, key_used) VALUES (?, ?, ?, ?)`, 
        [scriptId, scriptName || "Auto-Upload", obfuscatedCode, providedKey], function(err) {
            if (err) return res.status(500).json({ error: "Error al guardar script" });
            res.json({ success: true, id: scriptId });
        });
    });
});

app.listen(PORT, () => {
    console.log(`[+] Servidor corriendo en puerto ${PORT}`);
});
          
