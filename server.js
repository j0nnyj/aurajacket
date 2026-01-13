import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ip from 'ip';

// Importiamo il modulo del gioco
import { ImposterGame } from './backend/games/Imposter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(express.static(join(__dirname, 'dist')));

// --- STATO DEL SERVER ---
let players = []; 
let isGameRunning = false; // Flag per gestire le riconnessioni

const serverIp = ip.address(); 
console.log(`📡 IP RILEVATO: ${serverIp}`);

const imposterGame = new ImposterGame(io);
const getPlayers = () => players;

io.on('connection', (socket) => {
  // 1. Info Server (IP)
  socket.emit('server_info', { ip: serverIp, port: 3000 });
  socket.on('request_server_info', () => socket.emit('server_info', { ip: serverIp, port: 3000 }));

  // 2. LOGICA DI INGRESSO (JOIN)
  socket.on('join_game', (playerData) => {
    let finalName = playerData.name.trim();
    
    // Controlla omonimi
    const existingPlayer = players.find(p => p.name === finalName);
    
    if (existingPlayer) {
        if (isGameRunning) {
            // A. GIOCO IN CORSO -> RICONNESSIONE
            console.log(`♻️ RICONNESSIONE: ${finalName} (${existingPlayer.id} -> ${socket.id})`);
            existingPlayer.id = socket.id; 
            existingPlayer.avatar = playerData.avatar;

            io.emit('update_player_list', players);
            
            // Forza il client ad aprire il gioco per sincronizzarsi
            socket.emit('set_view', 'IMPOSTER_RECONNECT'); 
            return; 
        } else {
            // B. LOBBY -> DUPLICATO (Rinomina)
            finalName = `${finalName} (${Math.floor(Math.random() * 100)})`;
            socket.emit('force_name_change', finalName);
        }
    }

    // Aggiungi o Aggiorna
    const existingIndex = players.findIndex(p => p.id === socket.id);
    if (existingIndex !== -1) {
        players[existingIndex] = { ...players[existingIndex], ...playerData, name: finalName };
    } else {
        players.push({ id: socket.id, name: finalName, avatar: playerData.avatar || '🙂' });
    }

    io.emit('update_player_list', players);
    
    // Se il gioco NON è partito, vai in attesa
    if (!isGameRunning) socket.emit('set_view', 'WAITING');
  });

  // 3. DISCONNESSIONE
  socket.on('disconnect', () => {
    if (isGameRunning) {
        console.log(`⚠️ Player disconnesso in-game: ${socket.id}`);
    } else {
        players = players.filter(p => p.id !== socket.id);
        io.emit('update_player_list', players);
    }
  });

  // 4. HOST CHIUDE TUTTO (RESET)
  socket.on('host_closes_lobby', () => {
      console.log("🛑 HOST CHIUDE LA LOBBY. Reset totale.");
      isGameRunning = false;
      players = []; 
      io.emit('force_reset_to_login'); // Ordina ai telefoni di cancellare la memoria
      imposterGame.initGame([]); 
  });

  // 5. GESTIONE GIOCO
  socket.on('host_change_game', (gameName) => {
    if (gameName === 'IMPOSTER') imposterGame.initGame(players);
  });
  
  socket.on('imposter_start', () => { isGameRunning = true; });
  socket.on('imposter_play_again', () => { isGameRunning = false; }); 

  imposterGame.setupListeners(socket, getPlayers);
});

app.get(/.*/, (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 SERVER ON su ${PORT}`);
});