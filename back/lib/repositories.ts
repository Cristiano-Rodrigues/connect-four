import sqlite3 from 'sqlite3';

export const db = new sqlite3.Database('./database.sqlite', (err) => {
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
