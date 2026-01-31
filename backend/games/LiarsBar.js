export class LiarsBarGame {
  constructor(io) {
    this.io = io;
    this.players = [];
    this.gameState = 'LOBBY'; 
    this.turnIndex = 0;
    this.tableStack = [];      
    this.requiredValue = 'Q';  
    this.lastPlayerId = null; 
    this.victimId = null;      
    this.bulletChamber = {}; 
    this.hands = {}; 
    this.finishedRank = 0; 
    this.nextRoundStarterId = null; 
    
    // VARIABILE ANTI-SPAM
    this.isProcessingShot = false; 
    // DATI PER LA FASE DI RIVELAZIONE (TV)
    this.revealData = null;
  }

  initGame(currentPlayers) {
    this.players = currentPlayers.map(p => ({
      ...p,
      hand: [],       
      isAlive: true,
      isFinished: false,
      rank: null,
      cardCount: 0
    }));
    this.gameState = 'LOBBY';
    this.tableStack = [];
    this.bulletChamber = {};
    this.hands = {};
    this.finishedRank = 0;
    this.isProcessingShot = false; 
    this.revealData = null;
    
    this.players.forEach(p => {
        this.bulletChamber[p.sessionId] = { current: 0, bullet: Math.floor(Math.random() * 6) };
        this.io.to(p.id).emit('set_view', 'LIARS_LOBBY');
    });
  }

  reconnectPlayer(socket, player, oldId) {
      const gamePlayer = this.players.find(p => p.sessionId === player.sessionId);
      if (!gamePlayer) return false;

      const oldSocketId = gamePlayer.id;
      gamePlayer.id = socket.id;

      if (this.lastPlayerId === oldSocketId) this.lastPlayerId = socket.id;
      if (this.victimId === oldSocketId) this.victimId = socket.id;
      if (this.nextRoundStarterId === oldSocketId) this.nextRoundStarterId = socket.id;

      this.tableStack.forEach(play => {
          if (play.playerId === oldSocketId) play.playerId = socket.id;
      });

      this.setupListeners(socket);
      this.syncSinglePlayer(socket, gamePlayer);
      return true;
  }

  removePlayer(sessionId) {
      const indexToRemove = this.players.findIndex(p => p.sessionId === sessionId);
      if (indexToRemove === -1) return;

      console.log(`🃏 Liar's Bar: Giocatore uscito index ${indexToRemove}`);
      const wasHisTurn = (this.turnIndex === indexToRemove);

      this.players.splice(indexToRemove, 1);
      delete this.bulletChamber[sessionId];
      delete this.hands[sessionId];

      if (indexToRemove < this.turnIndex) {
          this.turnIndex--; 
      }
      if (this.turnIndex >= this.players.length) {
          this.turnIndex = 0;
      }

      if (wasHisTurn) {
          this.nextTurn();
      }

      if (this.checkWinCondition()) return;
      this.emitGameState();
  }

  syncSinglePlayer(socket, player) {
      if (this.gameState === 'GAME_OVER') {
          socket.emit('set_view', 'LIARS_GAME_OVER');
          socket.emit('liars_rank', player.rank);
          return;
      }
      if (!player.isAlive) { socket.emit('set_view', 'LIARS_DEAD'); return; }
      if (player.isFinished) { socket.emit('set_view', 'LIARS_WON'); socket.emit('liars_rank', player.rank); return; }

      // Se siamo in fase REVEAL, il telefono aspetta o vede la schermata di rivelazione
      if (this.gameState === 'REVEAL') {
          socket.emit('set_view', 'LIARS_REVEAL'); 
          return;
      }

      if (this.gameState === 'ROULETTE') {
          if (player.id === this.victimId) {
             const chamber = this.bulletChamber[player.sessionId];
             const prob = chamber ? `1 su ${6 - chamber.current}` : "?";
             socket.emit('liars_gun_stats', { probability: prob });
             socket.emit('set_view', 'LIARS_ROULETTE');
          } else {
             socket.emit('set_view', 'LIARS_WAITING_SHOT');
          }
      } else {
          if(this.gameState === 'LOBBY') socket.emit('set_view', 'LIARS_LOBBY');
          else {
              const savedHand = this.hands[player.sessionId] || player.hand;
              socket.emit('liars_hand', savedHand);
              socket.emit('set_view', 'LIARS_HAND');
          }
      }
      this.emitGameState();
  }

  generateHand() {
      const hand = [];
      for (let i = 0; i < 5; i++) {
        const rand = Math.random();
        let card = 'Q';
        if (rand < 0.15) card = 'JOLLY'; 
        else if (rand < 0.45) card = 'A';
        else if (rand < 0.75) card = 'K';
        hand.push({ id: Math.random().toString(36).substr(2, 5), type: card });
      }
      return hand;
  }

  pickRandomValue() {
      const values = ['A', 'K', 'Q'];
      return values[Math.floor(Math.random() * values.length)];
  }

  setupListeners(socket) {
    socket.removeAllListeners('liars_start');
    socket.removeAllListeners('liars_sync');
    socket.removeAllListeners('liars_play_cards');
    socket.removeAllListeners('liars_doubt');
    socket.removeAllListeners('liars_trigger');

    socket.on('liars_start', () => this.startGame());
    socket.on('liars_sync', () => {
        const player = this.players.find(p => p.id === socket.id);
        if(player) this.syncSinglePlayer(socket, player);
    });
    socket.on('liars_play_cards', (indices) => this.handlePlayCards(socket.id, indices));
    socket.on('liars_doubt', () => this.handleDoubt(socket.id));
    socket.on('liars_trigger', () => this.handleTrigger(socket.id));
  }

  startGame() {
    this.gameState = 'PLAYING';
    this.turnIndex = 0;
    this.tableStack = [];
    this.requiredValue = this.pickRandomValue(); 
    this.finishedRank = 0;
    this.isProcessingShot = false;
    this.revealData = null;

    this.players.forEach(player => {
      if (!player.isAlive) return;
      const newHand = this.generateHand();
      player.hand = newHand;
      this.hands[player.sessionId] = newHand; 
      this.io.to(player.id).emit('liars_hand', player.hand);
      this.io.to(player.id).emit('set_view', 'LIARS_HAND');
    });
    this.emitGameState();
  }

  handlePlayCards(playerId, selectedIndices) {
      if (this.gameState !== 'PLAYING') return;
      const player = this.players.find(p => p.id === playerId);
      if (!player) return;
      const activePlayer = this.players[this.turnIndex];
      if (!activePlayer || activePlayer.id !== playerId) return; 

      if (this.lastPlayerId) {
          const prev = this.players.find(p => p.id === this.lastPlayerId);
          if (prev && prev.isAlive && !prev.isFinished && prev.hand.length === 0) {
              this.finishedRank++;
              prev.isFinished = true;
              prev.rank = this.finishedRank;
              this.io.to(prev.id).emit('set_view', 'LIARS_WON');
              this.io.to(prev.id).emit('liars_rank', prev.rank);
              if(this.checkWinCondition()) return;
          }
      }

      selectedIndices.sort((a, b) => b - a);
      const playedCards = [];
      const sessionHand = this.hands[player.sessionId];
      
      selectedIndices.forEach(index => {
          if (sessionHand[index]) {
              playedCards.push(sessionHand[index]);
              sessionHand.splice(index, 1);
          }
      });
      player.hand = sessionHand;

      this.tableStack.push({
          player: player.name,
          playerId: player.id,
          cards: playedCards, 
          declaredType: this.requiredValue
      });

      this.lastPlayerId = player.id; 
      this.io.to(player.id).emit('liars_hand', sessionHand);
      this.nextTurn();
  }

   handleDoubt(doubterId) {
      if (this.tableStack.length === 0) return;
      if (this.gameState !== 'PLAYING') return;

      const lastPlay = this.tableStack[this.tableStack.length - 1];
      const isTruth = lastPlay.cards.every(c => c.type === 'JOLLY' || c.type === this.requiredValue);

      let loserId = isTruth ? doubterId : lastPlay.playerId;
      let winnerId = isTruth ? lastPlay.playerId : doubterId; 
      
      // Controllo se il giocatore onesto ha finito le carte
      if (isTruth) {
          const honestPlayer = this.players.find(p => p.id === lastPlay.playerId);
          if (honestPlayer && honestPlayer.hand.length === 0 && !honestPlayer.isFinished) {
               this.finishedRank++;
               honestPlayer.isFinished = true;
               honestPlayer.rank = this.finishedRank;
               this.io.to(honestPlayer.id).emit('set_view', 'LIARS_WON');
               this.io.to(honestPlayer.id).emit('liars_rank', honestPlayer.rank);
            }
      }

      this.nextRoundStarterId = winnerId;
      
      // --- FIX: FASE RIVELAZIONE ---
      // Imposta stato REVEAL invece di passare subito alla roulette
      this.gameState = 'REVEAL';
      
      const doubter = this.players.find(p => p.id === doubterId);
      
      this.revealData = {
          doubterName: doubter ? doubter.name : 'Qualcuno',
          liarName: lastPlay.player,
          cards: lastPlay.cards.map(c => c.type), // Solo i tipi per la visualizzazione
          tableValue: this.requiredValue,
          isLie: !isTruth,
          message: !isTruth ? "BECCATO! Era una bugia." : "DUBITATO MALE! Era la verità.",
          loserId: loserId
      };

      this.emitGameState(); // Manda alla TV i dati per mostrare "BECCATO"

      // Aspetta 5 secondi prima di dare la pistola
      setTimeout(() => {
          this.startRoulette(loserId);
      }, 5000); 
  }

  startRoulette(victimId) {
      this.gameState = 'ROULETTE';
      this.revealData = null; // Pulisci fase rivelazione
      this.victimId = victimId;
      this.isProcessingShot = false; // RESET BANDIERINA
      
      const victimPlayer = this.players.find(p => p.id === victimId);
      if(!victimPlayer) return;

      const chamber = this.bulletChamber[victimPlayer.sessionId];
      const prob = chamber ? `1 su ${6 - chamber.current}` : "?";

      this.emitGameState();

      this.players.forEach(p => {
          if (p.id === victimId) {
              this.io.to(p.id).emit('set_view', 'LIARS_ROULETTE');
              this.io.to(p.id).emit('liars_gun_stats', { probability: prob });
          } else {
              if (p.isAlive && !p.isFinished) this.io.to(p.id).emit('set_view', 'LIARS_WAITING_SHOT');
          }
      });
  }

  handleTrigger(playerId) {
      if (this.isProcessingShot) return; // Anti-spam

      if (this.gameState !== 'ROULETTE' || playerId !== this.victimId) return;
      
      this.isProcessingShot = true; 

      const player = this.players.find(p => p.id === playerId);
      if(!player) { this.isProcessingShot = false; return; }

      const chamber = this.bulletChamber[player.sessionId];
      const isDead = chamber.current === chamber.bullet;

      this.io.emit('liars_shot_result', { status: isDead ? 'DEAD' : 'ALIVE', playerId });

      if (isDead) {
          player.isAlive = false;
          setTimeout(() => {
              this.io.to(playerId).emit('set_view', 'LIARS_DEAD');
          }, 3000); 

          setTimeout(() => { if (!this.checkWinCondition()) this.resetRoundAfterShot(true); }, 6000);
      } else {
          chamber.current += 1;
          setTimeout(() => this.resetRoundAfterShot(false), 5000);
      }
  }

  resetRoundAfterShot(victimDied) {
      this.isProcessingShot = false; 
      
      this.gameState = 'PLAYING';
      this.tableStack = [];
      this.requiredValue = this.pickRandomValue();
      
      this.players.forEach(p => {
          if (p.isAlive && !p.isFinished) {
              const newHand = this.generateHand();
              p.hand = newHand;
              this.hands[p.sessionId] = newHand; 
              
              this.io.to(p.id).emit('liars_hand', p.hand);
              this.io.to(p.id).emit('set_view', 'LIARS_HAND');
          }
      });
      if (victimDied) this.nextTurn();
      else {
          const winnerIndex = this.players.findIndex(p => p.id === this.nextRoundStarterId);
          if (winnerIndex !== -1 && this.players[winnerIndex].isAlive && !this.players[winnerIndex].isFinished) this.turnIndex = winnerIndex;
          else this.nextTurn();
          this.emitGameState();
      }
  }
  
  nextTurn() {
      let attempts = 0;
      do {
          this.turnIndex = (this.turnIndex + 1) % this.players.length;
          attempts++;
      } while ((!this.players[this.turnIndex].isAlive || this.players[this.turnIndex].isFinished) && attempts < this.players.length * 2);
      this.emitGameState();
  }

  checkWinCondition() {
      const activePlayers = this.players.filter(p => p.isAlive && !p.isFinished);
      if (activePlayers.length <= 1) {
          if (activePlayers.length === 1) {
              this.finishedRank++;
              activePlayers[0].isFinished = true;
              activePlayers[0].rank = this.finishedRank;
              this.io.to(activePlayers[0].id).emit('set_view', 'LIARS_WON');
              this.io.to(activePlayers[0].id).emit('liars_rank', this.finishedRank);
          }
          this.gameState = 'GAME_OVER';
          this.emitGameState();
          this.io.emit('set_view', 'LIARS_GAME_OVER'); 
          return true;
      }
      return false;
  }

  emitGameState() {
      const activePlayer = this.players[this.turnIndex];
      const activeId = activePlayer ? activePlayer.id : null;
      const realCardCount = this.tableStack.reduce((acc, play) => acc + play.cards.length, 0);

      const gameState = {
          phase: this.gameState, 
          activePlayerId: activeId,
          activePlayerName: activePlayer ? activePlayer.name : null,
          requiredValue: this.requiredValue,
          tableCount: realCardCount,
          lastActorId: this.lastPlayerId,
          victimId: this.victimId,
          revealData: this.revealData, // Dati per la TV
          players: this.players.map(p => ({ 
              id: p.id, name: p.name, cardCount: p.hand.length, avatar: p.avatar, 
              isAlive: p.isAlive, isFinished: p.isFinished, rank: p.rank,
              isTurn: p.id === activeId
          })) 
      };
      this.io.emit('liars_update_table', gameState);

      // FORZA LA VISTA SU MOBILE DURANTE REVEAL
      if (this.gameState === 'REVEAL') {
          this.players.forEach(p => {
              if (p.isAlive) {
                  this.io.to(p.id).emit('set_view', 'LIARS_REVEAL');
              }
          });
      }
  }
}