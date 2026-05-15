import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT UNIQUE,
      password TEXT
    )`, (err) => {
      if (err) {
        console.error('Error creating table', err.message);
      }
    });
  }
});

app.post('/signup', (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ message: 'Nickname e password são obrigatórios.' });
  }

  db.get('SELECT * FROM users WHERE nickname = ?', [nickname], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Erro na base de dados.' });
    }
    if (row) {
      return res.status(409).json({ message: 'Usuário já cadastrado.' });
    }

    db.run('INSERT INTO users (nickname, password) VALUES (?, ?)', [nickname, password], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Erro ao criar usuário.' });
      }
      res.status(200).json({ message: 'Usuário criado com sucesso!' });
    });
  });
});

app.post('/login', (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ message: 'Nickname e password são obrigatórios.' });
  }

  db.get('SELECT * FROM users WHERE nickname = ? AND password = ?', [nickname, password], (err, row: any) => {
    if (err) {
      return res.status(500).json({ message: 'Erro na base de dados.' });
    }
    if (!row) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ id: row.id, nickname: row.nickname }, JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ access_token: token });
  });
});

app.get('/', (req, res) => {
  res.send({
    health: "ok",
    version: "0.1.0"
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

