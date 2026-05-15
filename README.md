# Connect Four

Uma implementação full-stack do clássico jogo **Connect Four**, com suporte a multiplayer em tempo real e modo de jogo contra um Robô com três níveis de dificuldade.

---

## Funcionalidades

- **Autenticação** — Registo e login com nickname e password. Sessão gerida via JWT.
- **Multiplayer em tempo real** — Dois jogadores podem jogar na mesma sala via WebSockets (Socket.io). As jogadas são sincronizadas instantaneamente entre ambos os clientes.
- **Modo Robô** — Joga contra um robô com três níveis de dificuldade:
  - **Fácil** — O robô escolhe sempre a primeira coluna disponível.
  - **Médio** — O robô escolhe uma coluna aleatória disponível.
  - **Difícil** — O robô utiliza o algoritmo **Minimax com poda Alpha-Beta** para antecipar jogadas e jogar de forma inteligente.
- **Chat em tempo real** — Cada sala tem um chat ao vivo entre os jogadores, com mensagens persistidas na base de dados.
- **Histórico de partidas** — O vencedor de cada partida é guardado e apresentado no painel lateral da sala.
- **Criação de salas** — Gera um link único para convidar um amigo a juntar-se à tua partida.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS |
| Backend | Node.js, Express 5, Socket.io, TypeScript |
| Base de dados | SQLite (via `sqlite3`) |
| Autenticação | JSON Web Tokens (JWT) |
| Comunicação RT | Socket.io (WebSockets) |

---

## Estrutura do Projeto

```
.
├── back/           # Servidor Node.js/Express
│   ├── lib/
│   │   ├── game.ts         # Lógica do jogo (Connect Four)
│   │   └── repositories.ts # Acesso à base de dados SQLite
│   └── server.ts           # Servidor principal, rotas REST e eventos Socket.io
│
└── front/          # Aplicação Next.js
    ├── app/
    │   ├── login/          # Página de autenticação
    │   ├── setup-room/     # Página de configuração da sala
    │   └── game/[roomId]/  # Sala de jogo (multiplayer ou robô)
    └── lib/
        └── game.ts         # Lógica do jogo para modo Robô (client-side)
```

---

## Instruções de Execução

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- npm

---

### 1. Clonar o repositório

```bash
git clone https://github.com/Cristiano-Rodrigues/connect-four.git
cd connect-four
```

---

### 2. Configurar e iniciar o Backend

```bash
cd back
npm install
```

Cria um ficheiro `.env` dentro de `back/`:

```env
PORT=
JWT_SECRET=uma_chave_secreta_qualquer
```

Inicia o servidor:

```bash
npm run dev
```

O servidor ficará disponível em `http://localhost:${PORT}`.

---

### 3. Configurar e iniciar o Frontend

Abre um novo terminal e executa:

```bash
cd front
npm install
```

Cria um ficheiro `.env` dentro de `front/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:${PORT}
```

Inicia a aplicação:

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:${PORT}`.

---

### 4. Jogar

1. Acede a `http://localhost:${PORT}`
2. Cria uma conta ou faz login
3. Na página de configuração, escolhe **"Jogar com Amigo"** ou **"Jogar contra Robô"**
4. Para o modo multiplayer, copia o link gerado e partilha-o com um amigo

---

## API REST

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/signup` | Criar conta |
| `POST` | `/login` | Autenticar e obter JWT |
| `GET` | `/api/rooms/create` | Criar uma nova sala |
| `GET` | `/api/rooms/:roomId/messages` | Listar mensagens de uma sala |
| `GET` | `/api/rooms/:roomId/matches` | Listar histórico de partidas de uma sala |

## Eventos Socket.io

| Evento (emit) | Payload | Descrição |
|---|---|---|
| `join_room` | `{ roomId, nickname }` | Entrar numa sala |
| `send_message` | `{ roomId, message, nickname }` | Enviar mensagem no chat |
| `make_move` | `{ roomId, col }` | Realizar uma jogada |
| `restart_game` | `{ roomId }` | Reiniciar a partida |

| Evento (on) | Descrição |
|---|---|
| `room_joined` | Confirmação de entrada + estado da sala |
| `game_ready` | A sala está cheia e o jogo pode começar |
| `game_update` | Estado atualizado do tabuleiro |
| `receive_message` | Nova mensagem no chat |
| `match_history_update` | Histórico de partidas atualizado |
| `room_full` | Sala com limite de jogadores atingido |
