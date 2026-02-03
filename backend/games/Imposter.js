export class ImposterGame {
  constructor(io) {
    this.io = io;
    this.players = [];
    this.gameState = 'LOBBY'; 
    this.currentData = null; 
    this.imposterSessionId = null; 
    this.votes = {};
    
    this.database = [
       { category: "Pietanza", word: "Pizza" },
        { category: "Pietanza", word: "Sushi" },
        { category: "Pietanza", word: "Lasagna" },
        { category: "Pietanza", word: "Hamburger" },
        { category: "Pietanza", word: "Kebab" },
        { category: "Pietanza", word: "Carbonara" },
        { category: "Pietanza", word: "Risotto" },
        { category: "Pietanza", word: "Pollo Arrosto" },
        { category: "Pietanza", word: "Insalata" },
        { category: "Pietanza", word: "Zuppa" },
        
        { category: "Frutta/Verdura", word: "Banana" },
        { category: "Frutta/Verdura", word: "Mela" },
        { category: "Frutta/Verdura", word: "Anguria" },
        { category: "Frutta/Verdura", word: "Carota" },
        { category: "Frutta/Verdura", word: "Patata" },
        { category: "Frutta/Verdura", word: "Pomodoro" },
        { category: "Frutta/Verdura", word: "Limone" },
        { category: "Frutta/Verdura", word: "Cipolla" },
        { category: "Frutta/Verdura", word: "Melanzana" },
        { category: "Frutta/Verdura", word: "Ananas" },

        { category: "Dolce", word: "Gelato" },
        { category: "Dolce", word: "Tiramisù" },
        { category: "Dolce", word: "Cioccolato" },
        { category: "Dolce", word: "Torta di Mele" },
        { category: "Dolce", word: "Cornetto" },
        { category: "Dolce", word: "Biscotto" },
        { category: "Dolce", word: "Miele" },
        { category: "Dolce", word: "Pancake" },
        { category: "Dolce", word: "Nutella" },
        { category: "Dolce", word: "Cheesecake" },

        { category: "Bevanda", word: "Caffè" },
        { category: "Bevanda", word: "Vino" },
        { category: "Bevanda", word: "Birra" },
        { category: "Bevanda", word: "Tè" },
        { category: "Bevanda", word: "Coca Cola" },
        { category: "Bevanda", word: "Latte" },
        { category: "Bevanda", word: "Acqua" },
        { category: "Bevanda", word: "Spremuta" },
        { category: "Bevanda", word: "Whisky" },
        { category: "Bevanda", word: "Champagne" },

        // --- OGGETTI (Categoria Vaga: "Elettrodomestico", "Arredamento", "Oggetto Personale") ---
        { category: "Elettrodomestico", word: "Lavatrice" },
        { category: "Elettrodomestico", word: "Frigorifero" },
        { category: "Elettrodomestico", word: "Microonde" },
        { category: "Elettrodomestico", word: "Aspirapolvere" },
        { category: "Elettrodomestico", word: "Phon" },
        { category: "Elettrodomestico", word: "Tostapane" },
        { category: "Elettrodomestico", word: "Televisore" },
        { category: "Elettrodomestico", word: "Ventilatore" },
        { category: "Elettrodomestico", word: "Frullatore" },
        { category: "Elettrodomestico", word: "Forno" },

        { category: "Arredamento", word: "Divano" },
        { category: "Arredamento", word: "Letto" },
        { category: "Arredamento", word: "Tavolo" },
        { category: "Arredamento", word: "Sedia" },
        { category: "Arredamento", word: "Armadio" },
        { category: "Arredamento", word: "Specchio" },
        { category: "Arredamento", word: "Libreria" },
        { category: "Arredamento", word: "Lampada" },
        { category: "Arredamento", word: "Tappeto" },
        { category: "Arredamento", word: "Scrivania" },

        { category: "Tecnologia", word: "Smartphone" },
        { category: "Tecnologia", word: "Computer" },
        { category: "Tecnologia", word: "Tablet" },
        { category: "Tecnologia", word: "Cuffie" },
        { category: "Tecnologia", word: "Mouse" },
        { category: "Tecnologia", word: "Tastiera" },
        { category: "Tecnologia", word: "Caricabatterie" },
        { category: "Tecnologia", word: "Drone" },
        { category: "Tecnologia", word: "Smartwatch" },
        { category: "Tecnologia", word: "Fotocamera" },

        { category: "Oggetto Tascabile", word: "Chiavi" },
        { category: "Oggetto Tascabile", word: "Portafoglio" },
        { category: "Oggetto Tascabile", word: "Accendino" },
        { category: "Oggetto Tascabile", word: "Fazzoletto" },
        { category: "Oggetto Tascabile", word: "Moneta" },
        { category: "Oggetto Tascabile", word: "Penna" },
        { category: "Oggetto Tascabile", word: "Occhiali" },
        { category: "Oggetto Tascabile", word: "Rossetto" },
        { category: "Oggetto Tascabile", word: "Orologio" },
        { category: "Oggetto Tascabile", word: "Coltellino" },

        // --- LUOGHI (Categoria Vaga: "Luogo Pubblico", "Luogo Naturale", "Stanza") ---
        { category: "Luogo Pubblico", word: "Scuola" },
        { category: "Luogo Pubblico", word: "Ospedale" },
        { category: "Luogo Pubblico", word: "Aeroporto" },
        { category: "Luogo Pubblico", word: "Stazione" },
        { category: "Luogo Pubblico", word: "Ristorante" },
        { category: "Luogo Pubblico", word: "Supermercato" },
        { category: "Luogo Pubblico", word: "Cinema" },
        { category: "Luogo Pubblico", word: "Palestra" },
        { category: "Luogo Pubblico", word: "Chiesa" },
        { category: "Luogo Pubblico", word: "Banca" },
        { category: "Luogo Pubblico", word: "Museo" },
        { category: "Luogo Pubblico", word: "Discoteca" },
        { category: "Luogo Pubblico", word: "Farmacia" },
        { category: "Luogo Pubblico", word: "Biblioteca" },
        { category: "Luogo Pubblico", word: "Stadio" },

        { category: "Luogo Naturale", word: "Spiaggia" },
        { category: "Luogo Naturale", word: "Montagna" },
        { category: "Luogo Naturale", word: "Bosco" },
        { category: "Luogo Naturale", word: "Deserto" },
        { category: "Luogo Naturale", word: "Grotta" },
        { category: "Luogo Naturale", word: "Lago" },
        { category: "Luogo Naturale", word: "Vulcano" },
        { category: "Luogo Naturale", word: "Cascata" },
        { category: "Luogo Naturale", word: "Isola" },
        { category: "Luogo Naturale", word: "Giungla" },

        { category: "Stanza", word: "Cucina" },
        { category: "Stanza", word: "Bagno" },
        { category: "Stanza", word: "Camera da Letto" },
        { category: "Stanza", word: "Salotto" },
        { category: "Stanza", word: "Garage" },
        { category: "Stanza", word: "Soffitta" },
        { category: "Stanza", word: "Cantina" },
        { category: "Stanza", word: "Ufficio" },
        { category: "Stanza", word: "Classe" },
        { category: "Stanza", word: "Corridoio" },

        // --- ANIMALI (Categoria Vaga: "Animale") ---
        { category: "Animale", word: "Cane" },
        { category: "Animale", word: "Gatto" },
        { category: "Animale", word: "Topo" },
        { category: "Animale", word: "Leone" },
        { category: "Animale", word: "Elefante" },
        { category: "Animale", word: "Cavallo" },
        { category: "Animale", word: "Mucca" },
        { category: "Animale", word: "Maiale" },
        { category: "Animale", word: "Serpente" },
        { category: "Animale", word: "Aquila" },
        { category: "Animale", word: "Pinguino" },
        { category: "Animale", word: "Squalo" },
        { category: "Animale", word: "Delfino" },
        { category: "Animale", word: "Balena" },
        { category: "Animale", word: "Ragno" },
        { category: "Animale", word: "Ape" },
        { category: "Animale", word: "Farfalla" },
        { category: "Animale", word: "Lupo" },
        { category: "Animale", word: "Orso" },
        { category: "Animale", word: "Scimmia" },
        { category: "Animale", word: "Giraffa" },
        { category: "Animale", word: "Canguro" },
        { category: "Animale", word: "Panda" },
        { category: "Animale", word: "Coccodrillo" },
        { category: "Animale", word: "Tartaruga" },

        // --- MEZZI DI TRASPORTO (Categoria Vaga: "Veicolo") ---
        { category: "Veicolo", word: "Automobile" },
        { category: "Veicolo", word: "Moto" },
        { category: "Veicolo", word: "Bicicletta" },
        { category: "Veicolo", word: "Autobus" },
        { category: "Veicolo", word: "Treno" },
        { category: "Veicolo", word: "Aereo" },
        { category: "Veicolo", word: "Nave" },
        { category: "Veicolo", word: "Elicottero" },
        { category: "Veicolo", word: "Sottomarino" },
        { category: "Veicolo", word: "Camion" },
        { category: "Veicolo", word: "Trattore" },
        { category: "Veicolo", word: "Monopattino" },
        { category: "Veicolo", word: "Skateboard" },
        { category: "Veicolo", word: "Barca a vela" },
        { category: "Veicolo", word: "Ambulanza" },

        // --- PROFESSIONI (Categoria Vaga: "Lavoro") ---
        { category: "Lavoro", word: "Dottore" },
        { category: "Lavoro", word: "Poliziotto" },
        { category: "Lavoro", word: "Pompiere" },
        { category: "Lavoro", word: "Insegnante" },
        { category: "Lavoro", word: "Avvocato" },
        { category: "Lavoro", word: "Cuoco" },
        { category: "Lavoro", word: "Cameriere" },
        { category: "Lavoro", word: "Barbiere" },
        { category: "Lavoro", word: "Meccanico" },
        { category: "Lavoro", word: "Contadino" },
        { category: "Lavoro", word: "Muratore" },
        { category: "Lavoro", word: "Attore" },
        { category: "Lavoro", word: "Cantante" },
        { category: "Lavoro", word: "Calciatore" },
        { category: "Lavoro", word: "Pilota" },
        { category: "Lavoro", word: "Astronauta" },
        { category: "Lavoro", word: "Giudice" },
        { category: "Lavoro", word: "Scienziato" },
        { category: "Lavoro", word: "Pittore" },
        { category: "Lavoro", word: "Fotografo" },

        // --- ABBIGLIAMENTO (Categoria Vaga: "Indumento") ---
        { category: "Indumento", word: "Maglietta" },
        { category: "Indumento", word: "Pantaloni" },
        { category: "Indumento", word: "Scarpe" },
        { category: "Indumento", word: "Calzini" },
        { category: "Indumento", word: "Mutande" },
        { category: "Indumento", word: "Giacca" },
        { category: "Indumento", word: "Cappello" },
        { category: "Indumento", word: "Sciarpa" },
        { category: "Indumento", word: "Guanti" },
        { category: "Indumento", word: "Cintura" },
        { category: "Indumento", word: "Cravatta" },
        { category: "Indumento", word: "Costume da bagno" },
        { category: "Indumento", word: "Pigiama" },
        { category: "Indumento", word: "Accappatoio" },
        { category: "Indumento", word: "Vestito da sposa" },

        // --- STRUMENTI MUSICALI (Categoria Vaga: "Musica") ---
        { category: "Musica", word: "Chitarra" },
        { category: "Musica", word: "Pianoforte" },
        { category: "Musica", word: "Batteria" },
        { category: "Musica", word: "Violino" },
        { category: "Musica", word: "Flauto" },
        { category: "Musica", word: "Tromba" },
        { category: "Musica", word: "Sassofono" },
        { category: "Musica", word: "Microfono" },
        { category: "Musica", word: "Cuffie" },
        { category: "Musica", word: "Radio" },

        // --- CORPO UMANO (Categoria Vaga: "Parte del Corpo") ---
        { category: "Parte del Corpo", word: "Mano" },
        { category: "Parte del Corpo", word: "Piede" },
        { category: "Parte del Corpo", word: "Testa" },
        { category: "Parte del Corpo", word: "Occhi" },
        { category: "Parte del Corpo", word: "Naso" },
        { category: "Parte del Corpo", word: "Bocca" },
        { category: "Parte del Corpo", word: "Orecchie" },
        { category: "Parte del Corpo", word: "Cuore" },
        { category: "Parte del Corpo", word: "Cervello" },
        { category: "Parte del Corpo", word: "Denti" },
        { category: "Parte del Corpo", word: "Capelli" },
        { category: "Parte del Corpo", word: "Ginocchio" },
        { category: "Parte del Corpo", word: "Pancia" },
        { category: "Parte del Corpo", word: "Schiena" },
        { category: "Parte del Corpo", word: "Dito" },

        // --- SPORT (Categoria Vaga: "Sport") ---
        { category: "Sport", word: "Calcio" },
        { category: "Sport", word: "Basket" },
        { category: "Sport", word: "Tennis" },
        { category: "Sport", word: "Pallavolo" },
        { category: "Sport", word: "Nuoto" },
        { category: "Sport", word: "Boxe" },
        { category: "Sport", word: "Golf" },
        { category: "Sport", word: "Sci" },
        { category: "Sport", word: "Ciclismo" },
        { category: "Sport", word: "Formula 1" }
    ];
  }

  initGame(currentPlayers) {
    // Creiamo la copia locale dei player con le proprietà di gioco
    this.players = currentPlayers.map(p => ({
      ...p,
      role: 'CIVILIAN', 
      secretInfo: '', 
      isAlive: true
    }));
    this.gameState = 'LOBBY';
    this.votes = {};

    this.players.forEach(p => {
        this.io.to(p.id).emit('set_view', 'IMPOSTER_LOBBY');
    });
  }

  startGame() {
    this.gameState = 'GAME';
    this.votes = {};
    
    // Reset stato
    this.players.forEach(p => {
        p.isAlive = true;
        p.role = 'CIVILIAN';
        p.secretInfo = '';
    });

    const randomIndex = Math.floor(Math.random() * this.database.length);
    this.currentData = this.database[randomIndex];

    const imposterIndex = Math.floor(Math.random() * this.players.length);
    this.imposterSessionId = this.players[imposterIndex].sessionId; 

    // Distribuzione
    this.players.forEach((p) => {
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

  // --- FIX QUI SOTTO ---
  syncSinglePlayer(socket, player) {
      const internalPlayer = this.players.find(p => p.sessionId === player.sessionId);
      if (internalPlayer) internalPlayer.id = socket.id;

      // FIX CRITICO: Inviamo la lista "arrichita" (con isAlive) a TUTTI.
      // Questo sovrascrive la lista "nuda" inviata da server.js al riconnettersi.
      this.io.emit('update_player_list', this.players);

      // Restore view per chi si è riconnesso
      if (this.gameState === 'LOBBY') {
          this.io.to(socket.id).emit('set_view', 'IMPOSTER_LOBBY');
      } 
      else if (this.gameState === 'GAME') {
          const isImposter = (player.sessionId === this.imposterSessionId);
          this.io.to(socket.id).emit('imposter_role_data', { 
              role: isImposter ? 'IMPOSTER' : 'CIVILIAN', 
              info: isImposter ? this.currentData.category : this.currentData.word 
          });
          this.io.to(socket.id).emit('set_view', 'IMPOSTER_ROLE');
      }
      else if (this.gameState === 'VOTING') {
          this.io.to(socket.id).emit('set_view', 'IMPOSTER_VOTE');
          this.io.to(socket.id).emit('imposter_vote_update', this.votes);
      }
      else if (this.gameState === 'GAME_OVER') {
          this.io.to(socket.id).emit('set_view', 'GAME_OVER');
      }
  }

  handleForceVoting() {
      this.gameState = 'VOTING';
      this.io.emit('imposter_voting_started');
      // Anche qui, assicuriamoci che tutti abbiano la lista con isAlive corretto
      this.io.emit('update_player_list', this.players);
      this.players.forEach(p => this.io.to(p.id).emit('set_view', 'IMPOSTER_VOTE'));
  }

  handleVote(voterId, targetId) {
      if (this.gameState !== 'VOTING') return;
      
      this.votes[voterId] = targetId;
      this.io.emit('imposter_vote_update', this.votes);
      
      const activeLivingPlayers = this.players.filter(p => p.isAlive && p.isConnected !== false);
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
          if (count > maxVotes) { maxVotes = count; eliminatedId = id; }
      }

      this.gameState = 'GAME_OVER';
      
      const imposterPlayer = this.players.find(p => p.sessionId === this.imposterSessionId);
      const eliminatedPlayer = this.players.find(p => p.id === eliminatedId);
      
      let winner = "";
      if (!eliminatedPlayer) winner = "IMPOSTER"; 
      else if (eliminatedPlayer.sessionId === this.imposterSessionId) winner = "CIVILIANS"; 
      else winner = "IMPOSTER"; 

      const resultData = {
          winner,
          imposterName: imposterPlayer ? imposterPlayer.name : "???",
          eliminatedName: eliminatedPlayer ? eliminatedPlayer.name : "Nessuno",
          secretWord: this.currentData.word
      };

      this.io.emit('imposter_game_over', resultData);
      this.io.emit('set_view', 'GAME_OVER');
  }

  setupListeners(socket) {
      socket.removeAllListeners('imposter_start');
      socket.removeAllListeners('imposter_play_again');
      socket.removeAllListeners('imposter_vote');
      socket.removeAllListeners('imposter_force_voting');
      socket.removeAllListeners('imposter_sync');

      socket.on('imposter_start', () => this.startGame());
      socket.on('imposter_play_again', () => this.startGame()); 
      socket.on('imposter_vote', (id) => this.handleVote(socket.id, id));
      socket.on('imposter_force_voting', () => this.handleForceVoting());
      socket.on('imposter_sync', () => {
          const p = this.players.find(x => x.id === socket.id);
          if(p) this.syncSinglePlayer(socket, p);
      });
  }
}