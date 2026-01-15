import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ip from 'ip';

import { ImposterGame } from './backend/games/Imposter.js';
import { LiarsBarGame } from './backend/games/LiarsBar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(express.static(join(__dirname, 'dist')));

// DATI SERVER
let players = []; 
let isGameRunning = false; 

const imposterGame = new ImposterGame(io);
const liarsBarGame = new LiarsBarGame(io); 
const getPlayers = () => players;

io.on('connection', (socket) => {
  // INFO INIZIALI
  socket.emit('server_info', { ip: ip.address(), port: 3000 });
  socket.on('request_server_info', () => socket.emit('server_info', { ip: ip.address(), port: 3000 }));

  // SYNC PER HOST (Per evitare schermate bianche)
  socket.on('host_request_update', () => {
      socket.emit('update_player_list', players);
  });

  // JOIN SEMPLIFICATO (Senza riconnessione intelligente)
  socket.on('join_game', (playerData) => {
    let finalName = playerData.name.trim();
    
    // Controlla se il nome esiste già
    const existingPlayer = players.find(p => p.name === finalName);
    
    if (existingPlayer) {
        // Se esiste, cambia nome aggiungendo un numero
        finalName = `${finalName}${Math.floor(Math.random()*100)}`;
        socket.emit('force_name_change', finalName);
    }

    const existingIndex = players.findIndex(p => p.id === socket.id);
    if (existingIndex !== -1) {
        players[existingIndex] = { ...players[existingIndex], ...playerData, name: finalName };
    } else {
        players.push({ id: socket.id, name: finalName, avatar: playerData.avatar || '😎' });
    }

    io.emit('update_player_list', players);
    
    // Se non si sta giocando, manda alla GLOBAL LOBBY
    if (!isGameRunning) socket.emit('set_view', 'GLOBAL_LOBBY');
  });

  // TASTO INDIETRO (Soft Reset)
  socket.on('host_back_to_menu', () => {
      isGameRunning = false;
      imposterGame.initGame([]); 
      liarsBarGame.initGame([]); 
      io.emit('set_view', 'GLOBAL_LOBBY');
  });

  // TASTO NUOVA SESSIONE (Hard Reset)
  socket.on('host_new_session', () => {
      isGameRunning = false;
      players = []; 
      io.emit('force_reset_to_login'); 
      io.emit('server_info', { ip: ip.address(), port: 3000 });
      imposterGame.initGame([]); 
      liarsBarGame.initGame([]); 
  });
  
  // CAMBIO GIOCO
  socket.on('host_change_game', (gameName) => {
    if (gameName === 'IMPOSTER') imposterGame.initGame(players);
    else if (gameName === 'LIARS_BAR') liarsBarGame.initGame(players);
  });
  
  // EVENTI GIOCHI
  socket.on('imposter_start', () => { isGameRunning = true; });
  socket.on('imposter_play_again', () => { isGameRunning = false; }); 
  
  socket.on('liars_start', () => { isGameRunning = true; });
  socket.on('liars_stop', () => { isGameRunning = false; });

  imposterGame.setupListeners(socket, getPlayers);
  liarsBarGame.setupListeners(socket, getPlayers);
});

app.get(/.*/, (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVER AVVIATO`);
});