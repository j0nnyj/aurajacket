import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ip from 'ip';

// Importa i giochi
import { ImposterGame } from './backend/games/Imposter.js';
import { LiarsBarGame } from './backend/games/LiarsBar.js';
import { TrashTalkGame } from './backend/games/TrashTalk.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Serve i file statici
app.use(express.static(join(__dirname, 'dist')));

const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// STATO GLOBALE
let players = [];
let activeGame = 'LOBBY'; 

// ISTANZE GIOCHI
const imposterGame = new ImposterGame(io);
const liarsBarGame = new LiarsBarGame(io);
const trashTalkGame = new TrashTalkGame(io);

io.on('connection', (socket) => {
  console.log(`⚡ Nuova connessione: ${socket.id}`);

  // --- 1. HOST COMANDI ---
  socket.on('request_server_info', () => {
    socket.emit('server_info', { ip: ip.address(), port: 3000 });
  });

  socket.on('host_request_update', () => {
    io.emit('update_player_list', players);
  });

  socket.on('host_change_game', (gameName) => {
    activeGame = gameName;
    
    if (gameName === 'IMPOSTER') {
        imposterGame.initGame(players);
    } 
    else if (gameName === 'LIARS_BAR') {
        liarsBarGame.initGame(players);
        io.emit('set_view', 'LIARS_LOBBY'); 
    }
    else if (gameName === 'TRASHTALK') {
        trashTalkGame.initGame(players);
    }
  });

  socket.on('host_new_session', () => {
      activeGame = 'LOBBY';
      players = [];
      io.emit('force_reset_to_login'); 
      io.emit('update_player_list', players);
  });

  socket.on('host_back_to_menu', () => {
      activeGame = 'LOBBY';
      io.emit('set_view', 'GLOBAL_LOBBY');
  });

  socket.on('host_kick_player', (playerId) => {
      const playerToRemove = players.find(p => p.id === playerId);
      if (playerToRemove) {
          io.to(playerId).emit('force_reset_to_login');
          players = players.filter(p => p.id !== playerId);
          io.emit('update_player_list', players);
      }
  });

  // --- 2. GIOCATORE: LOGIN ---
  socket.on('join_game', ({ name, avatar }) => {
      const existingPlayer = players.find(p => p.name.toLowerCase() === name.toLowerCase());

      if (existingPlayer) {
          // RICONNESSIONE
          const oldId = existingPlayer.id;
          existingPlayer.id = socket.id;
          existingPlayer.avatar = avatar;
          existingPlayer.isConnected = true;

          socket.emit('login_success', existingPlayer);

          if (activeGame === 'LIARS_BAR') {
              liarsBarGame.reconnectPlayer(socket, existingPlayer, oldId);
          } else if (activeGame === 'IMPOSTER') {
              imposterGame.syncSinglePlayer(socket, existingPlayer);
          } else if (activeGame === 'TRASHTALK') {
              socket.emit('set_view', 'TRASHTALK_LOBBY');
          } else {
              socket.emit('set_view', 'GLOBAL_LOBBY');
          }
      } else {
          // NUOVO GIOCATORE
          if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
              socket.emit('login_error', 'Nome già preso!');
              return;
          }

          const newPlayer = { id: socket.id, name, avatar, score: 0, isConnected: true };
          players.push(newPlayer);
          socket.emit('login_success', newPlayer);

          // Auto-Join
          if (activeGame === 'LIARS_BAR') {
              liarsBarGame.reconnectPlayer(socket, newPlayer, null);
              socket.emit('set_view', 'LIARS_LOBBY');
          } 
          else if (activeGame === 'IMPOSTER') {
              imposterGame.syncSinglePlayer(socket, newPlayer);
              socket.emit('set_view', 'IMPOSTER_LOBBY');
          } 
          else if (activeGame === 'TRASHTALK') {
              trashTalkGame.initGame(players);
              socket.emit('set_view', 'TRASHTALK_LOBBY');
          } 
          else {
              socket.emit('set_view', 'GLOBAL_LOBBY');
          }
      }
      io.emit('update_player_list', players);
  });

  socket.on('disconnect', () => {
    const p = players.find(p => p.id === socket.id);
    if (p) p.isConnected = false;
    
    if (activeGame === 'LOBBY') {
        players = players.filter(p => p.id !== socket.id);
        io.emit('update_player_list', players);
    }
  });

  // --- 3. ROUTING AI GIOCHI ---
  
  // Liar's Bar
  liarsBarGame.setupListeners(socket);

  // Imposter
  socket.on('imposter_start', () => imposterGame.startGame());
  socket.on('imposter_vote', (id) => imposterGame.handleVote(socket.id, id));
  socket.on('imposter_task_complete', () => imposterGame.handleTaskComplete(socket.id));
  socket.on('imposter_sync', () => {
      const p = players.find(x => x.id === socket.id);
      if(p) imposterGame.syncSinglePlayer(socket, p);
  });
  socket.on('imposter_force_voting', () => imposterGame.handleForceVoting());

  // Trash Talk
  socket.on('trashtalk_start', () => trashTalkGame.startGame());
  socket.on('trashtalk_vote', (targetId) => trashTalkGame.handleVote(socket.id, targetId));
  socket.on('trashtalk_answer', (text) => trashTalkGame.handleAnswer(socket.id, text));
  
  // E siccome abbiamo messo il timer automatico nel backend (TrashTalk.js), 
  // non serve 'next_battle' dal client, ma per sicurezza aggiungiamolo se vogliamo forzare:
  socket.on('trashtalk_next_battle', () => trashTalkGame.nextBattle()); 
  // --------------------------------

});

// FIX ROUTING
app.get(/^(?!\/socket.io).*/, (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

httpServer.listen(3000, '0.0.0.0', () => {
  console.log(`🚀 SERVER AVVIATO SU: http://${ip.address()}:3000`);
});