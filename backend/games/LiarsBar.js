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
    this.finishedRank = 0; 
    this.nextRoundStarterId = null; 
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
    this.finishedRank = 0;
    
    this.players.forEach(p => {
        this.bulletChamber[p.id] = { current: 0, bullet: Math.floor(Math.random() * 6) };
        this.io.to(p.id).emit('set_view', 'LIARS_LOBBY');
    });
  }

  reconnectPlayer(socket, globalPlayer, oldId) {
      const gamePlayer = this.players.find(p => p.name === globalPlayer.name);
      if (!gamePlayer) return false;

      const newId = socket.id;
      gamePlayer.id = newId;

      if (this.bulletChamber[oldId]) {
          this.bulletChamber[newId] = this.bulletChamber[oldId];
          delete this.bulletChamber[oldId];
      }

      if (this.lastPlayerId === oldId) this.lastPlayerId = newId;
      if (this.victimId === oldId) this.victimId = newId;
      if (this.nextRoundStarterId === oldId) this.nextRoundStarterId = newId;

      this.tableStack.forEach(play => {
          if (play.playerId === oldId) play.playerId = newId;
      });

      this.setupListeners(socket);
      this.syncSinglePlayer(socket, gamePlayer);
      return true;
  }

  syncSinglePlayer(socket, player) {
      if (this.gameState === 'GAME_OVER') {
          socket.emit('set_view', 'LIARS_GAME_OVER');
          socket.emit('liars_rank', player.rank);
          return;
      }
      if (!player.isAlive) { socket.emit('set_view', 'LIARS_DEAD'); return; }
      if (player.isFinished) { socket.emit('set_view', 'LIARS_WON'); socket.emit('liars_rank', player.rank); return; }

      if (this.gameState === 'ROULETTE') {
          if (player.id === this.victimId) {
             const chamber = this.bulletChamber[player.id];
             const prob = chamber ? `1 su ${6 - chamber.current}` : "?";
             socket.emit('liars_gun_stats', { probability: prob });
             socket.emit('set_view', 'LIARS_ROULETTE');
          } else {
             socket.emit('set_view', 'LIARS_WAITING_SHOT');
          }
      } else {
          if(this.gameState === 'LOBBY') socket.emit('set_view', 'LIARS_LOBBY');
          else {
              socket.emit('liars_hand', player.hand);
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
    socket.on('liars_start', () => this.startGame());
    socket.on('liars_sync', () => {
        const player = this.players.find(p => p.id === socket.id);
        if(player) this.syncSinglePlayer(socket, player);
    });
    socket.on('liars_play_cards', (indices) => this.handlePlayCards(socket.id, indices));
    socket.on('liars_doubt', () => this.handleDoubt(socket.id));
    socket.on('liars_trigger', () => this.handleTrigger(socket.id));
    socket.on('liars_reconnect', () => {}); 
  }

  startGame() {
    this.gameState = 'PLAYING';
    this.turnIndex = 0;
    this.tableStack = [];
    this.requiredValue = this.pickRandomValue(); 
    this.finishedRank = 0;

    this.players.forEach(player => {
      if (!player.isAlive) return;
      player.hand = this.generateHand();
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
      selectedIndices.forEach(index => {
          if (player.hand[index]) {
              playedCards.push(player.hand[index]);
              player.hand.splice(index, 1);
          }
      });

      this.tableStack.push({
          player: player.name,
          playerId: player.id,
          cards: playedCards, 
          declaredType: this.requiredValue
      });

      this.lastPlayerId = player.id; 
      this.io.to(player.id).emit('liars_hand', player.hand);
      this.nextTurn();
  }

  handleDoubt(doubterId) {
      if (this.tableStack.length === 0) return;
      if (this.gameState !== 'PLAYING') return;

      const lastPlay = this.tableStack[this.tableStack.length - 1];
      const isTruth = lastPlay.cards.every(c => c.type === 'JOLLY' || c.type === this.requiredValue);

      let loserId = isTruth ? doubterId : lastPlay.playerId;
      let winnerId = isTruth ? lastPlay.playerId : doubterId; 

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

      this.io.emit('liars_reveal', {
          cards: lastPlay.cards,
          player: lastPlay.player,
          result: isTruth ? "TRUTH" : "LIE",
          loserId: loserId
      });

      // --- TEMPO VELOCE: 3s suspense + 4s lettura = 7s totali ---
      setTimeout(() => {
          this.startRoulette(loserId);
      }, 3000); 
  }

  startRoulette(victimId) {
      this.gameState = 'ROULETTE';
      this.victimId = victimId;
      const chamber = this.bulletChamber[victimId];
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
      if (this.gameState !== 'ROULETTE' || playerId !== this.victimId) return;
      const chamber = this.bulletChamber[playerId];
      const isDead = chamber.current === chamber.bullet;

      // 1. Manda subito l'evento alla TV per iniziare lo SPIN
      this.io.emit('liars_shot_result', { status: isDead ? 'DEAD' : 'ALIVE', playerId });

      // 2. TIMING SINCRONIZZATO PER IL TELEFONO
      if (isDead) {
          const player = this.players.find(p => p.id === playerId);
          player.isAlive = false;
          
          // ASPETTA 3 SECONDI (Tempo dello spin sulla TV) prima di dire al telefono che è morto
          // Questo serve come backup se il frontend mobile non usa il setTimeout
          setTimeout(() => {
              this.io.to(playerId).emit('set_view', 'LIARS_DEAD');
          }, 3000); 

          // Resetta il round dopo l'animazione completa (3s spin + ~3s morte = ~6s)
          setTimeout(() => { if (!this.checkWinCondition()) this.resetRoundAfterShot(true); }, 6000);
      } else {
          chamber.current += 1;
          // Resetta il round velocemente (2.8s spin + 2s respiro = ~5s)
          setTimeout(() => this.resetRoundAfterShot(false), 5000);
      }
  }

  resetRoundAfterShot(victimDied) {
      this.gameState = 'PLAYING';
      this.tableStack = [];
      this.requiredValue = this.pickRandomValue();
      this.players.forEach(p => {
          if (p.isAlive && !p.isFinished) {
              p.hand = this.generateHand();
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
          players: this.players.map(p => ({ 
              id: p.id, name: p.name, cardCount: p.hand.length, avatar: p.avatar, 
              isAlive: p.isAlive, isFinished: p.isFinished, rank: p.rank,
              isTurn: p.id === activeId
          })) 
      };
      this.io.emit('liars_update_table', gameState);
  }
}