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
    
    // Inizializza pistole
    this.players.forEach(p => {
        this.bulletChamber[p.id] = { current: 0, bullet: Math.floor(Math.random() * 6) };
        this.io.to(p.id).emit('set_view', 'LIARS_LOBBY');
    });
  }

  // Helper per mani casuali
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

  setupListeners(socket, getLatestPlayers) {
    socket.on('liars_start', () => this.startGame());
    
    // SYNC
    socket.on('liars_sync', () => {
      const player = this.players.find(p => p.id === socket.id);
      if (!player) return;

      if (this.gameState === 'LOBBY') {
          this.io.to(player.id).emit('set_view', 'LIARS_LOBBY');
      } else if (!player.isAlive) {
          this.io.to(player.id).emit('set_view', 'LIARS_DEAD');
      } else if (player.isFinished) {
          this.io.to(player.id).emit('set_view', 'LIARS_WON');
          this.io.to(player.id).emit('liars_rank', player.rank);
      } else if (this.gameState === 'ROULETTE') {
          if (player.id === this.victimId) {
             const chamber = this.bulletChamber[player.id];
             const prob = chamber ? `1 su ${6 - chamber.current}` : "?";
             this.io.to(player.id).emit('liars_gun_stats', { probability: prob });
             this.io.to(player.id).emit('set_view', 'LIARS_ROULETTE');
          } else {
             this.io.to(player.id).emit('set_view', 'LIARS_WAITING_SHOT');
          }
          this.emitGameState(); 
      } else {
          // Fase PLAYING
          this.io.to(player.id).emit('liars_hand', player.hand);
          this.io.to(player.id).emit('set_view', 'LIARS_HAND');
          this.emitGameState();
      }
    });

    socket.on('liars_play_cards', (indices) => this.handlePlayCards(socket.id, indices));
    socket.on('liars_doubt', () => this.handleDoubt(socket.id));
    socket.on('liars_trigger', () => this.handleTrigger(socket.id));
    socket.on('liars_stop', () => { this.gameState = 'LOBBY'; this.players = []; });
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

      // --- FIX CRASH: Controllo di sicurezza ---
      const activePlayer = this.players[this.turnIndex];
      if (!activePlayer) {
          console.error("ERRORE: Indice turno non valido, resetto al primo giocatore vivo.");
          this.nextTurn(); 
          return;
      }
      if (activePlayer.id !== playerId) return; 
      // ---------------------------------------

      // Check se il giocatore PRECEDENTE è salvo
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
          if (honestPlayer.hand.length === 0 && !honestPlayer.isFinished) {
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

      this.startRoulette(loserId);
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

      if (isDead) {
          const player = this.players.find(p => p.id === playerId);
          player.isAlive = false;
          
          this.io.to(playerId).emit('set_view', 'LIARS_DEAD');
          this.io.emit('liars_shot_result', { status: 'DEAD', playerId });

          setTimeout(() => {
              if (!this.checkWinCondition()) {
                  this.resetRoundAfterShot(true);
              }
          }, 5000);
      } else {
          chamber.current += 1;
          this.io.emit('liars_shot_result', { status: 'ALIVE', playerId });
          setTimeout(() => this.resetRoundAfterShot(false), 3000);
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

      if (victimDied) {
          this.nextTurn();
      } else {
          const winnerIndex = this.players.findIndex(p => p.id === this.nextRoundStarterId);
          if (winnerIndex !== -1 && this.players[winnerIndex].isAlive && !this.players[winnerIndex].isFinished) {
              this.turnIndex = winnerIndex;
          } else {
              this.nextTurn();
              return;
          }
          this.emitGameState();
      }
  }

  nextTurn() {
      let attempts = 0;
      // Loop finché non trovi un giocatore vivo e non finito
      do {
          this.turnIndex = (this.turnIndex + 1) % this.players.length;
          attempts++;
      } while (
          (!this.players[this.turnIndex].isAlive || this.players[this.turnIndex].isFinished) 
          && attempts < this.players.length * 2
      );
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
          this.io.emit('set_view', 'GAME_OVER');
          return true;
      }
      return false;
  }

  emitGameState() {
      // --- FIX CRASH: Controllo di sicurezza anche qui ---
      const activePlayer = this.players[this.turnIndex];
      const activeId = activePlayer ? activePlayer.id : null;

      const gameState = {
          phase: this.gameState, 
          activePlayerId: activeId,
          activePlayerName: activePlayer ? activePlayer.name : null,
          requiredValue: this.requiredValue,
          tableCount: this.tableStack.length,
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