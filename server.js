import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ip from 'ip';
import { v4 as uuidv4 } from 'uuid'; // Assicurati di aver fatto: npm install uuid

// Importa i giochi
import { ImposterGame } from './backend/games/Imposter.js';
import { LiarsBarGame } from './backend/games/LiarsBar.js';
import { TrashTalkGame } from './backend/games/TrashTalk.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

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
    
    if (gameName === 'IMPOSTER') { imposterGame.initGame(players); } 
    else if (gameName === 'LIARS_BAR') { liarsBarGame.initGame(players); io.emit('set_view', 'LIARS_LOBBY'); }
    else if (gameName === 'TRASHTALK') { trashTalkGame.initGame(players); }
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
      
      // 1. Diciamo a tutti di tornare alla vista Lobby Globale
      io.emit('set_view', 'GLOBAL_LOBBY');
      
      // 2. IMPORTANTE: Forziamo l'invio della lista aggiornata
      // Così l'Host Menu la riceve appena viene caricato
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
  
  // LOGIN / RICONNESSIONE
  socket.on('join_game', ({ name, avatar, sessionId }) => {
      
      // A. TENTATIVO DI RECUPERO SESSIONE
      let existingPlayer = null;
      
      if (sessionId) {
          existingPlayer = players.find(p => p.sessionId === sessionId);
      }

      // Fallback: cerca per nome (utile se il browser pulisce la cache ma il server no)
      if (!existingPlayer) {
          existingPlayer = players.find(p => p.name.toLowerCase() === name.toLowerCase());
      }

      if (existingPlayer) {
          // --- BENTORNATO! (RICONNESSIONE) ---
          console.log(`🔄 Riconnessione rilevata: ${existingPlayer.name} (UUID: ${existingPlayer.sessionId})`);
          
          existingPlayer.id = socket.id; // Aggiorna il socket ID attuale
          existingPlayer.isConnected = true;
          
          // Aggiorna ID anche dentro la lista specifica di TrashTalk se serve
          if (activeGame === 'TRASHTALK') {
             const p = trashTalkGame.players.find(x => x.sessionId === existingPlayer.sessionId);
             if (p) p.id = socket.id;
          }

          socket.emit('login_success', existingPlayer);
          restorePlayerView(socket, existingPlayer);
          
      } else {
          // --- NUOVO GIOCATORE ---
          if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
              socket.emit('login_error', 'Nome già preso!');
              return;
          }

          const newSessionId = uuidv4(); // Genera braccialetto univoco
          
          const newPlayer = { 
              id: socket.id, 
              sessionId: newSessionId, 
              name, 
              avatar, 
              score: 0, 
              isConnected: true 
          };
          
          players.push(newPlayer);
          console.log(`✨ Nuovo giocatore: ${name} (UUID: ${newSessionId})`);
          socket.emit('login_success', newPlayer);
          restorePlayerView(socket, newPlayer);
      }
      
      io.emit('update_player_list', players);
  });

  // LOGOUT (CAMBIA PROFILO)
  socket.on('leave_game', () => {
      const playerToRemove = players.find(p => p.id === socket.id);
      if (playerToRemove) {
          console.log(`👋 Giocatore uscito volontariamente: ${playerToRemove.name}`);
          
          // Rimuovi dalla lista globale
          players = players.filter(p => p.id !== socket.id);
          
          // Gestione specifica per rimuovere dai giochi attivi
          if (activeGame === 'TRASHTALK') {
             trashTalkGame.removePlayer(playerToRemove.sessionId);
          } else if (activeGame === 'LIARS_BAR') {
             liarsBarGame.removePlayer(playerToRemove.sessionId);
          }
          // (Imposter non ha bisogno di rimozione critica perché ricalcola i vivi al volo)

          io.emit('update_player_list', players);
      }
  });

  // DISCONNESSIONE INVOLONTARIA (CHIUSURA BROWSER/REFRESH)
  socket.on('disconnect', () => {
    const p = players.find(p => p.id === socket.id);
    if (p) {
        p.isConnected = false;
        console.log(`❌ Disconnesso (in attesa): ${p.name}`);
        // NON LO RIMUOVIAMO -> Session Recovery attiva
    }
    io.emit('update_player_list', players);
  });

  // HELPER PER RIPRISTINARE LA VISTA CORRETTA
  const restorePlayerView = (socket, player) => {
      if (activeGame === 'LIARS_BAR') {
          // Passiamo null come oldId perché reconnectPlayer se lo cerca da solo tramite sessionId
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
  socket.on('imposter_start', () => imposterGame.startGame());
  socket.on('imposter_vote', (id) => imposterGame.handleVote(socket.id, id));
  socket.on('imposter_task_complete', () => imposterGame.handleTaskComplete(socket.id));
  socket.on('imposter_sync', () => {
      const p = players.find(x => x.id === socket.id);
      if(p) imposterGame.syncSinglePlayer(socket, p);
  });
  socket.on('imposter_force_voting', () => imposterGame.handleForceVoting());

  // --- TRASH TALK ---
  socket.on('trashtalk_start', () => trashTalkGame.startGame());
  socket.on('trashtalk_vote', (targetId) => trashTalkGame.handleVote(socket.id, targetId));
  socket.on('trashtalk_answer', (text) => trashTalkGame.handleAnswer(socket.id, text));
  
  // FIX IMPORTANTE: Sync manuale per quando il telefono carica la pagina
  socket.on('trashtalk_sync', () => {
      const p = players.find(x => x.id === socket.id);
      if(p) trashTalkGame.syncSinglePlayer(socket, p);
  });

});

// SERVE IL FRONTEND REACT
app.get(/^(?!\/socket.io).*/, (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// AVVIO SERVER
httpServer.listen(3000, '0.0.0.0', () => {
  console.log(`🚀 SERVER AVVIATO SU: http://${ip.address()}:3000`);
});