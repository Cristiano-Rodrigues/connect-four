import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { findUserByNickname, createUser, findUserByCredentials } from './lib/repositories';

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

app.use(cors());
app.use(express.json());

app.post('/signup', async (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ message: 'Nickname e password são obrigatórios.' });
  }

  try {
    const existingUser = await findUserByNickname(nickname);
    if (existingUser) {
      return res.status(409).json({ message: 'Usuário já cadastrado.' });
    }

    await createUser(nickname, password);
    res.status(200).json({ message: 'Usuário criado com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro na base de dados.' });
  }
});

app.post('/login', async (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ message: 'Nickname e password são obrigatórios.' });
  }

  try {
    const user = await findUserByCredentials(nickname, password);
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ id: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ access_token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro na base de dados.' });
  }
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