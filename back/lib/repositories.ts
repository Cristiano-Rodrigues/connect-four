import sqlite3 from 'sqlite3';

export const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT UNIQUE,
        password TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roomId TEXT,
        nickname TEXT,
        message TEXT,
        timestamp TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roomId TEXT,
        winner TEXT,
        date TEXT
      )`);
    });
  }
});

export interface User {
  id: number;
  nickname: string;
  password?: string;
}

export const findUserByNickname = (nickname: string): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE nickname = ?', [nickname], (err, row: User) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
};

export const createUser = (nickname: string, password: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO users (nickname, password) VALUES (?, ?)', [nickname, password], function (err) {
      if (err) return reject(err);
      resolve();
    });
  });
};

export const findUserByCredentials = (nickname: string, password: string): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE nickname = ? AND password = ?', [nickname, password], (err, row: User) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
};

export interface ChatMessage {
  id?: number;
  roomId: string;
  nickname: string;
  message: string;
  timestamp: string;
}

export interface MatchRecord {
  id?: number;
  roomId: string;
  winner: string;
  date: string;
}

export const saveMessage = (roomId: string, nickname: string, message: string, timestamp: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO messages (roomId, nickname, message, timestamp) VALUES (?, ?, ?, ?)', [roomId, nickname, message, timestamp], function (err) {
      if (err) return reject(err);
      resolve();
    });
  });
};

export const getMessagesByRoom = (roomId: string): Promise<ChatMessage[]> => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM messages WHERE roomId = ? ORDER BY timestamp ASC', [roomId], (err, rows: ChatMessage[]) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
};

export const saveMatch = (roomId: string, winner: string, date: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO matches (roomId, winner, date) VALUES (?, ?, ?)', [roomId, winner, date], function (err) {
      if (err) return reject(err);
      resolve();
    });
  });
};

export const getMatchesByRoom = (roomId: string): Promise<MatchRecord[]> => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM matches WHERE roomId = ? ORDER BY date DESC', [roomId], (err, rows: MatchRecord[]) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
};
