export class ImposterGame {
  constructor(io) {
    this.io = io;
    this.players = [];
    this.gameState = 'LOBBY'; 
    this.currentData = null; 
    this.imposterSessionId = null; // <--- MODIFICA: Usiamo sessionId per ricordare chi è l'impostore
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
      { category: "Accessori Invernali", word: "Passamontagna" },
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
      { category: "Elementi Chimici", word: "Mercurio" },
      { category: "Creature Mitologiche", word: "Medusa" },
      { category: "Peccati Capitali", word: "Lussuria" },
      { category: "Malattie", word: "Ipocondria" },
      { category: "Figure Religiose", word: "Esorcista" },
      { category: "Catastrofi", word: "Chernobyl" },
      { category: "Simboli Matematici", word: "Infinito" },
      { category: "Generi Musicali", word: "Jazz" },
      { category: "Tecnologia", word: "Intelligenza Artificiale" },
      { category: "Filosofia", word: "Karma" }
    ];
  }

  initGame(currentPlayers) {
    // Clona i giocatori assicurandosi di mantenere il sessionId
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

  startGame() {
    this.gameState = 'GAME';
    this.votes = {};

    const randomIndex = Math.floor(Math.random() * this.database.length);
    this.currentData = this.database[randomIndex];

    // Scegli Impostore a caso
    const imposterIndex = Math.floor(Math.random() * this.players.length);
    // <--- MODIFICA: Salviamo la sessione, non il socket ID
    this.imposterSessionId = this.players[imposterIndex].sessionId; 

    console.log(`🕵️ Parola: ${this.currentData.word} | Impostore: ${this.players[imposterIndex].name}`);

    this.players.forEach((p) => {
        // Controllo ruolo basato su SessionID
        const isImposter = (p.sessionId === this.imposterSessionId);

        if (isImposter) {
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

  // --- GESTIONE RICONNESSIONE (FIX REFRESH) ---
  syncSinglePlayer(socket, player) {
      // 1. Trova il giocatore nella lista interna usando il sessionId
      const internalPlayer = this.players.find(p => p.sessionId === player.sessionId);
      
      // 2. Aggiorna il socket ID interno (il telefono è cambiato!)
      if (internalPlayer) {
          internalPlayer.id = socket.id;
      }

      // 3. Rimanda la vista corretta in base allo stato
      if (this.gameState === 'LOBBY') {
          this.io.to(socket.id).emit('set_view', 'IMPOSTER_LOBBY');
      } 
      else if (this.gameState === 'GAME') {
          // Ricalcola al volo cosa deve vedere
          const isImposter = (player.sessionId === this.imposterSessionId);
          const role = isImposter ? 'IMPOSTER' : 'CIVILIAN';
          const info = isImposter ? this.currentData.category : this.currentData.word;

          this.io.to(socket.id).emit('imposter_role_data', { role, info });
          this.io.to(socket.id).emit('set_view', 'IMPOSTER_ROLE');
      }
      else if (this.gameState === 'VOTING') {
          this.io.to(socket.id).emit('set_view', 'IMPOSTER_VOTE');
          // Rimanda anche lo stato dei voti attuali se serve
          this.io.to(socket.id).emit('imposter_vote_update', this.votes);
      }
      else if (this.gameState === 'GAME_OVER') {
          this.io.to(socket.id).emit('set_view', 'GAME_OVER');
      }
  }

  handleForceVoting() {
      this.gameState = 'VOTING';
      this.io.emit('imposter_voting_started');
      this.io.emit('update_player_list', this.players);
      this.players.forEach(p => this.io.to(p.id).emit('set_view', 'IMPOSTER_VOTE'));
  }

  handleVote(voterId, targetId) {
      if (this.gameState !== 'VOTING') return;
      
      // Nota: voterId qui è il socket ID. 
      // Va bene perché syncSinglePlayer ha aggiornato l'ID interno.
      this.votes[voterId] = targetId;
      this.io.emit('imposter_vote_update', this.votes);
      
      // Conta i voti solo dei giocatori vivi e connessi
      const activeLivingPlayers = this.players.filter(p => p.isAlive && p.isConnected !== false);
      
      // Se abbiamo abbastanza voti (o tutti hanno votato)
      if (Object.keys(this.votes).length >= activeLivingPlayers.length) {
          this.calculateResults();
      }
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
      
      // Trova i giocatori usando ID o SessionID per sicurezza
      const imposterPlayer = this.players.find(p => p.sessionId === this.imposterSessionId);
      const eliminatedPlayer = this.players.find(p => p.id === eliminatedId);
      
      let winner = "";
      
      if (!eliminatedPlayer) {
          winner = "IMPOSTER"; 
      } else if (eliminatedPlayer.sessionId === this.imposterSessionId) {
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