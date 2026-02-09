import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ip from 'ip';
import { v4 as uuidv4 } from 'uuid'; 

// Importa i giochi
import { ImposterGame } from './backend/games/Imposter.js';
import { LiarsBarGame } from './backend/games/LiarsBar.js';
import { TrashTalkGame } from './backend/games/TrashTalk.js';
import { BufalaGame } from './backend/games/Bufala.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

app.use(express.static(join(__dirname, 'dist')));

const io = new Server(httpServer, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e8, // 100 MB per upload immagini
  pingTimeout: 60000 
});

// STATO GLOBALE
let players = [];
let activeGame = 'LOBBY'; 

// ISTANZE GIOCHI
const imposterGame = new ImposterGame(io);
const liarsBarGame = new LiarsBarGame(io);
const trashTalkGame = new TrashTalkGame(io);
const bufalaGame = new BufalaGame(io); 

io.on('connection', (socket) => {
  console.log(`⚡ Nuova connessione: ${socket.id}`);

  // ==========================================================
  // 1. GESTIONE HOST (TV)
  // ==========================================================
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
    else if (gameName === 'BUFALA') {
         bufalaGame.initGame(players); 
    }
  });

  socket.on('host_new_session', () => {
      activeGame = 'LOBBY';
      players = [];
      io.emit('force_reset_to_login'); 
      io.emit('update_player_list', players);
  });

  socket.on('host_back_to_menu', () => {
      console.log("🔙 Ritorno al Menu Principale");
      activeGame = 'LOBBY';
      io.emit('set_view', 'GLOBAL_LOBBY');
      io.emit('update_player_list', players); 
  });

  socket.on('host_kick_player', (playerId) => {
      const playerToRemove = players.find(p => p.id === playerId);
      if (playerToRemove) {
          io.to(playerId).emit('force_reset_to_login'); 
          players = players.filter(p => p.id !== playerId);
          io.emit('update_player_list', players);
      }
  });

  // ==========================================================
  // 2. GESTIONE GIOCATORI (LOGIN, SESSIONI, USCITA)
  // ==========================================================
  
  socket.on('join_game', ({ name, avatar, sessionId }) => {
      
      // A. TENTATIVO DI RECUPERO SESSIONE
      let existingPlayer = null;
      if (sessionId) {
          existingPlayer = players.find(p => p.sessionId === sessionId);
      }
      if (!existingPlayer) {
          existingPlayer = players.find(p => p.name.toLowerCase() === name.toLowerCase());
      }

      if (existingPlayer) {
          // --- RICONNESSIONE ---
          console.log(`🔄 Riconnessione rilevata: ${existingPlayer.name}`);
          
          existingPlayer.id = socket.id; 
          existingPlayer.isConnected = true;
          
          // Aggiorna ID nei giochi specifici (Importante per far funzionare i giochi dopo refresh)
          if (activeGame === 'TRASHTALK') {
             const p = trashTalkGame.players.find(x => x.sessionId === existingPlayer.sessionId);
             if (p) p.id = socket.id;
          }
          else if (activeGame === 'LIARS_BAR') {
             liarsBarGame.reconnectPlayer(socket, existingPlayer, null);
          }
          // Imposter fa il sync nel restorePlayerView chiamando syncSinglePlayer

          socket.emit('login_success', existingPlayer);
          restorePlayerView(socket, existingPlayer);
          
      } else {
          // --- NUOVO GIOCATORE ---
          if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
              socket.emit('login_error', 'Nome già preso!');
              return;
          }

          const newSessionId = uuidv4(); 
          const newPlayer = { 
              id: socket.id, sessionId: newSessionId, name, avatar, score: 0, isConnected: true 
          };
          
          players.push(newPlayer);
          console.log(`✨ Nuovo giocatore: ${name}`);
          socket.emit('login_success', newPlayer);
          restorePlayerView(socket, newPlayer);
      }
      
      io.emit('update_player_list', players);
  });

  socket.on('leave_game', () => {
      const playerToRemove = players.find(p => p.id === socket.id);
      if (playerToRemove) {
          console.log(`👋 Giocatore uscito volontariamente: ${playerToRemove.name}`);
          players = players.filter(p => p.id !== socket.id);
          
          // Rimuovi dai giochi attivi
          if (activeGame === 'TRASHTALK') {
             trashTalkGame.removePlayer(playerToRemove.sessionId);
          } else if (activeGame === 'LIARS_BAR') {
             liarsBarGame.removePlayer(playerToRemove.sessionId);
          }

          io.emit('update_player_list', players);
      }
  });

  socket.on('disconnect', () => {
    const p = players.find(p => p.id === socket.id);
    if (p) {
        p.isConnected = false;
        console.log(`❌ Disconnesso (in attesa): ${p.name}`);
    }
    io.emit('update_player_list', players);
  });

  // HELPER PER RIPRISTINARE LA VISTA CORRETTA
  const restorePlayerView = (socket, player) => {
      if (activeGame === 'LIARS_BAR') {
          liarsBarGame.reconnectPlayer(socket, player, null); 
      } 
      else if (activeGame === 'IMPOSTER') {
          imposterGame.syncSinglePlayer(socket, player);
      } 
      else if (activeGame === 'TRASHTALK') {
          trashTalkGame.syncSinglePlayer(socket, player);
      }
      else {
          socket.emit('set_view', 'GLOBAL_LOBBY');
      }
  };

  // ==========================================================
  // 3. ROUTING EVENTI DEI GIOCHI
  // ==========================================================
  
  // --- LIAR'S BAR ---
  liarsBarGame.setupListeners(socket);

  // --- IMPOSTER ---
  // Importante: deleghiamo tutto al file Imposter.js che gestisce anche 'play_again'
  imposterGame.setupListeners(socket);

  // --- TRASH TALK ---
  socket.on('trashtalk_start', () => trashTalkGame.startGame());
  socket.on('trashtalk_vote', (targetId) => trashTalkGame.handleVote(socket.id, targetId));
  socket.on('trashtalk_answer', (text) => trashTalkGame.handleAnswer(socket.id, text));
  socket.on('trashtalk_sync', () => {
      const p = players.find(x => x.id === socket.id);
      if(p) trashTalkGame.syncSinglePlayer(socket, p);
  });

  bufalaGame.setupListeners(socket);

});

app.get(/^(?!\/socket.io).*/, (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

httpServer.listen(3000, '0.0.0.0', () => {
  console.log(`🚀 SERVER AVVIATO SU: http://${ip.address()}:3000`);
});