import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { findUserByNickname, createUser, findUserByCredentials, saveMessage, getMessagesByRoom, saveMatch, getMatchesByRoom } from './lib/repositories';
import { ConnectFour } from './lib/game';
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

app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const messages = await getMessagesByRoom(req.params.roomId);
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar mensagens' });
  }
});

app.get('/api/rooms/:roomId/matches', async (req, res) => {
  try {
    const matches = await getMatchesByRoom(req.params.roomId);
    res.status(200).json(matches);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar partidas' });
  }
});

interface PlayerInfo {
  id: string;
  nickname: string;
}

const roomGames = new Map<string, ConnectFour>();
const roomPlayers = new Map<string, { player1?: PlayerInfo, player2?: PlayerInfo }>();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_room', (payload: any) => {
    let roomId: string;
    let nickname = 'Anônimo';

    if (typeof payload === 'string') {
      roomId = payload;
    } else {
      roomId = payload.roomId;
      nickname = payload.nickname || 'Anônimo';
    }

    console.log(`User ${socket.id} joining room ${roomId} with nickname ${nickname}`);
    socket.join(roomId);

    let players = roomPlayers.get(roomId) || {};
    let status: 'waiting' | 'ready' = 'waiting';

    if (!players.player1) {
      players.player1 = { id: socket.id, nickname };
    } else if (!players.player2 && players.player1.id !== socket.id) {
      players.player2 = { id: socket.id, nickname };
      status = 'ready';
    } else if (players.player1.id !== socket.id && players.player2?.id !== socket.id) {
      socket.emit('room_full', { roomId, message: 'Sala cheia. Máximo de 2 jogadores.' });
      return;
    }

    roomPlayers.set(roomId, players);

    if (!roomGames.has(roomId)) {
      roomGames.set(roomId, new ConnectFour());
    }

    io.to(roomId).emit('room_joined', { 
      roomId, 
      status, 
      player1: players.player1?.nickname, 
      player2: players.player2?.nickname 
    });
    
    if (status === 'ready') {
      io.to(roomId).emit('game_ready', { 
        message: 'Opponent joined',
        player1: players.player1?.nickname,
        player2: players.player2?.nickname
      });
    }

    const game = roomGames.get(roomId);
    socket.emit('game_update', { 
      grid: game?.grid, 
      turn: game?.turn, 
      state: game?.state, 
      winner: game?.winner,
      player1: players.player1?.nickname,
      player2: players.player2?.nickname
    });
  });

  socket.on('send_message', async ({ roomId, message, nickname }: { roomId: string, message: string, nickname: string }) => {
    const timestamp = new Date().toISOString();
    try {
      await saveMessage(roomId, nickname, message, timestamp);
      io.to(roomId).emit('receive_message', { message, nickname, timestamp });
    } catch (err) {
      console.error('Error saving message', err);
    }
  });

  socket.on('make_move', async ({ roomId, col }: { roomId: string, col: number }) => {
    const game = roomGames.get(roomId);
    const players = roomPlayers.get(roomId);

    if (!game || !players || game.state !== 'playing') return;

    const currentPlayerRole = game.turn % 2 === 1 ? 1 : 2;
    const isPlayer1 = socket.id === players.player1?.id;
    const isPlayer2 = socket.id === players.player2?.id;

    if ((currentPlayerRole === 1 && !isPlayer1) || (currentPlayerRole === 2 && !isPlayer2)) {
      return;
    }

    const result = game.insertTile(col);
    if (result) {
      io.to(roomId).emit('game_update', { 
        grid: game.grid, 
        turn: game.turn, 
        state: game.state, 
        winner: game.winner,
        player1: players.player1?.nickname,
        player2: players.player2?.nickname
      });

      if ((game.state as string) === 'won' || (game.state as string) === 'tied') {
        let winnerName = 'Empate';
        if ((game.state as string) === 'won') {
          winnerName = game.winner === 1 ? (players.player1?.nickname || 'Jogador 1') : (players.player2?.nickname || 'Jogador 2');
        }
        try {
          await saveMatch(roomId, winnerName, new Date().toLocaleTimeString());
          const updatedMatches = await getMatchesByRoom(roomId);
          io.to(roomId).emit('match_history_update', updatedMatches);
        } catch (err) {
          console.error('Error saving match', err);
        }
      }
    }
  });

  socket.on('restart_game', ({ roomId }: { roomId: string }) => {
    roomGames.set(roomId, new ConnectFour());
    const game = roomGames.get(roomId);
    const players = roomPlayers.get(roomId);
    io.to(roomId).emit('game_update', { 
      grid: game?.grid, 
      turn: game?.turn, 
      state: game?.state, 
      winner: game?.winner,
      player1: players?.player1?.nickname,
      player2: players?.player2?.nickname
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    for (const [roomId, players] of roomPlayers.entries()) {
      if (players.player1?.id === socket.id) {
        players.player1 = undefined;
        if (players.player2) {
          players.player1 = players.player2;
          players.player2 = undefined;
          io.to(roomId).emit('room_joined', { roomId, status: 'waiting', player1: players.player1.nickname });
        } else {
          roomPlayers.delete(roomId);
        }
      } else if (players.player2?.id === socket.id) {
        players.player2 = undefined;
        io.to(roomId).emit('room_joined', { roomId, status: 'waiting', player1: players.player1?.nickname });
      }
    }
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