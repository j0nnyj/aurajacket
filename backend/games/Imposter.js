export class ImposterGame {
  constructor(io) {
    this.io = io;
    this.players = [];
    this.gameState = 'LOBBY'; 
    this.currentData = null; 
    this.imposterId = null;
    this.votes = {};
    
    this.database = [
      { category: "Mezzo di Trasporto", word: "Ferrari" },
      { category: "Cibo Italiano", word: "Pizza" },
      { category: "Animale Domestico", word: "Gatto" },
      { category: "Sport", word: "Calcio" },
      { category: "Elettrodomestico", word: "Lavatrice" },
      { category: "Luogo di Vacanza", word: "Spiaggia" },
      { category: "Strumento Musicale", word: "Chitarra" },
      { category: "Bevanda", word: "Caffè" },
      { category: "Oggetto Scolastico", word: "Zaino" },
      { category: "Parte del Corpo", word: "Mano" }
    ];
  }

  initGame(currentPlayers) {
    this.players = currentPlayers.map(p => ({
      ...p,
      role: 'CIVILIAN', 
      secretInfo: '', 
      isAlive: true
    }));
    this.gameState = 'LOBBY';
    this.votes = {};

    if (this.players.length > 0) {
        this.players.forEach(p => {
            this.io.to(p.id).emit('set_view', 'IMPOSTER_LOBBY');
        });
    }
  }

  setupListeners(socket, getLatestPlayers) {
    socket.on('imposter_start', () => {
      if (getLatestPlayers) {
         const livePlayers = getLatestPlayers();
         this.players = livePlayers.map(lp => ({ 
             ...lp, 
             role: 'CIVILIAN', 
             secretInfo: '',
             isAlive: true 
         }));
      }
      this.startGame();
    });

    socket.on('imposter_sync', () => {
        const player = this.players.find(p => p.id === socket.id);
        if (!player) return;

        if (this.gameState === 'LOBBY') {
            this.io.to(player.id).emit('set_view', 'IMPOSTER_LOBBY');
        } 
        else if (this.gameState === 'GAME') {
            this.io.to(player.id).emit('imposter_role_data', {
                role: player.role,
                info: player.secretInfo
            });
            this.io.to(player.id).emit('set_view', 'IMPOSTER_ROLE');
        }
        else if (this.gameState === 'VOTING') {
            this.io.to(player.id).emit('set_view', 'IMPOSTER_VOTE');
        }
        else if (this.gameState === 'GAME_OVER') {
            this.io.to(player.id).emit('set_view', 'GAME_OVER');
        }
    });

    socket.on('imposter_vote', (targetId) => {
        if (this.gameState !== 'VOTING') return;
        this.votes[socket.id] = targetId;
        this.io.emit('imposter_vote_update', this.votes);
        
        const livingPlayers = this.players.filter(p => p.isAlive);
        if (Object.keys(this.votes).length >= livingPlayers.length) {
            this.calculateResults();
        }
    });

    socket.on('imposter_force_voting', () => {
        this.gameState = 'VOTING';
        this.io.emit('imposter_voting_started');
        
        // --- MODIFICA SICUREZZA ---
        // Quando inizia il voto, reinviamo la lista dei giocatori a tutti
        // per essere sicuri che i telefoni abbiano i dati per generare i pulsanti
        this.io.emit('update_player_list', this.players);

        this.players.forEach(p => this.io.to(p.id).emit('set_view', 'IMPOSTER_VOTE'));
    });
  }

  startGame() {
    this.gameState = 'GAME';
    this.votes = {};

    const randomIndex = Math.floor(Math.random() * this.database.length);
    this.currentData = this.database[randomIndex];

    const imposterIndex = Math.floor(Math.random() * this.players.length);
    this.imposterId = this.players[imposterIndex].id;

    console.log(`🕵️ Parola: ${this.currentData.word} | Impostore: ${this.players[imposterIndex].name}`);

    this.players.forEach((p, index) => {
        if (index === imposterIndex) {
            p.role = 'IMPOSTER';
            p.secretInfo = this.currentData.category; 
        } else {
            p.role = 'CIVILIAN';
            p.secretInfo = this.currentData.word; 
        }
        
        this.io.to(p.id).emit('imposter_role_data', {
            role: p.role,       
            info: p.secretInfo  
        });
        this.io.to(p.id).emit('set_view', 'IMPOSTER_ROLE');
    });

    this.io.emit('imposter_game_started');
  }

  calculateResults() {
      const counts = {};
      Object.values(this.votes).forEach(targetId => {
          counts[targetId] = (counts[targetId] || 0) + 1;
      });

      let maxVotes = 0;
      let eliminatedId = null;
      
      for (const [id, count] of Object.entries(counts)) {
          if (count > maxVotes) {
              maxVotes = count;
              eliminatedId = id;
          }
      }

      this.gameState = 'GAME_OVER';
      const imposterPlayer = this.players.find(p => p.id === this.imposterId);
      const eliminatedPlayer = this.players.find(p => p.id === eliminatedId);
      
      let winner = "";
      
      if (!eliminatedPlayer) {
          winner = "IMPOSTER"; 
      } else if (eliminatedId === this.imposterId) {
          winner = "CIVILIANS"; 
      } else {
          winner = "IMPOSTER"; 
      }

      const resultData = {
          winner,
          imposterName: imposterPlayer ? imposterPlayer.name : "???",
          eliminatedName: eliminatedPlayer ? eliminatedPlayer.name : "Nessuno",
          secretWord: this.currentData.word
      };

      this.io.emit('imposter_game_over', resultData);
      this.io.emit('set_view', 'GAME_OVER');
  }
}