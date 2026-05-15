import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { findUserByNickname, createUser, findUserByCredentials } from './lib/repositories';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

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

app.get('/api/rooms/create', (req, res) => {
  const roomId = uuidv4();
  res.status(200).json({ roomId });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_room', (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    const numClients = room ? room.size : 0;

    if (numClients === 0) {
      socket.join(roomId);
      socket.emit('room_joined', { roomId, status: 'waiting' });
      console.log(`Socket ${socket.id} created and joined room ${roomId}`);
    } else if (numClients === 1) {
      socket.join(roomId);
      socket.emit('room_joined', { roomId, status: 'ready' });
      socket.to(roomId).emit('game_ready', { message: 'Opponent joined' });
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    } else {
      socket.emit('room_full', { roomId, message: 'Sala cheia. Máximo de 2 jogadores.' });
      console.log(`Socket ${socket.id} rejected from room ${roomId}`);
    }
  });

  socket.on('send_message', ({ roomId, message, nickname }) => {
    io.to(roomId).emit('receive_message', { message, nickname, timestamp: new Date().toISOString() });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.get('/', (req, res) => {
  res.send({
    health: "ok",
    version: "0.1.0"
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});