export class ImposterGame {
  constructor(io) {
    this.io = io;
    this.players = [];
    this.gameState = 'LOBBY'; 
    this.currentData = null; 
    this.imposterId = null;
    this.votes = {};
    
    this.database = [
      // === LIVELLO MEDIO (Specifici ma descrivibili) ===
      { category: "Cucina di Lusso", word: "Tartufo" },
      { category: "Crimini", word: "Rapimento" },
      { category: "Oggetti Vintage", word: "Vinile" },
      { category: "Fenomeni Naturali", word: "Tsunami" },
      { category: "Strumenti Chirurgici", word: "Bisturi" },
      { category: "Insetti", word: "Mantide Religiosa" },
      { category: "Mezzi Militari", word: "Sottomarino" },
      { category: "Accessori Invernali", word: "Passamontagna" }, // Ambiguo (Rapina o Neve?)
      { category: "Sport Estremi", word: "Paracadutismo" },
      { category: "Luoghi Chiusi", word: "Ascensore" },
      { category: "Giochi da Casinò", word: "Roulette" },
      { category: "Parti dell'Auto", word: "Frizione" },
      { category: "Bevande Alcoliche", word: "Tequila" },
      { category: "Attrezzi da Giardino", word: "Motosega" },
      { category: "Creature Notturne", word: "Pipistrello" },

      // === LIVELLO DIFFICILE (Astratti, ambigui o storici) ===
      { category: "Concetti Astratti", word: "Nostalgia" },
      { category: "Economia", word: "Inflazione" },
      { category: "Fisica Spaziale", word: "Buco Nero" },
      { category: "Eventi Storici", word: "Guerra Fredda" },
      { category: "Sistemi Politici", word: "Dittatura" },
      { category: "Elementi Chimici", word: "Mercurio" }, // Liquido o Pianeta?
      { category: "Creature Mitologiche", word: "Medusa" },
      { category: "Peccati Capitali", word: "Lussuria" },
      { category: "Malattie", word: "Ipocondria" },
      { category: "Figure Religiose", word: "Esorcista" },
      { category: "Catastrofi", word: "Chernobyl" },
      { category: "Simboli Matematici", word: "Infinito" },
      { category: "Generi Musicali", word: "Jazz" }, // Difficile da descrivere senza suoni
      { category: "Tecnologia", word: "Intelligenza Artificiale" },
      { category: "Filosofia", word: "Karma" }
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

  // Funzione chiamata dal server quando l'Host preme "SI VOTA"
  handleForceVoting() {
      this.gameState = 'VOTING';
      this.io.emit('imposter_voting_started');
      
      // Aggiorna la lista giocatori per sicurezza (per i bottoni di voto sul mobile)
      this.io.emit('update_player_list', this.players);

      this.players.forEach(p => this.io.to(p.id).emit('set_view', 'IMPOSTER_VOTE'));
  }

  // Gestione sync per chi si riconnette o entra dopo
  syncSinglePlayer(socket, player) {
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
  }

  handleVote(voterId, targetId) {
      if (this.gameState !== 'VOTING') return;
      this.votes[voterId] = targetId;
      this.io.emit('imposter_vote_update', this.votes);
      
      const livingPlayers = this.players.filter(p => p.isAlive);
      // Se tutti i vivi hanno votato, calcola il risultato
      if (Object.keys(this.votes).length >= livingPlayers.length) {
          this.calculateResults();
      }
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
          winner = "IMPOSTER"; // Nessuno eliminato (pareggio o skip), vince impostore
      } else if (eliminatedId === this.imposterId) {
          winner = "CIVILIANS"; // Impostore beccato
      } else {
          winner = "IMPOSTER"; // Innocente eliminato
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