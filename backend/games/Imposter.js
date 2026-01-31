export class ImposterGame {
  constructor(io) {
    this.io = io;
    this.players = [];
    this.gameState = 'LOBBY'; 
    this.currentData = null; 
    this.imposterSessionId = null; // <--- MODIFICA: Usiamo sessionId per ricordare chi è l'impostore
    this.votes = {};
    
    this.database = [
     // === LIVELLO DIFFICILE (Nuovi) ===
        { category: "Fobie", word: "Claustrofobia", hint: "Paura di non poter uscire." },
        { category: "Crimini Digitali", word: "Hackeraggio", hint: "Serve un computer e non ti vedono." },
        { category: "Disastri Naturali", word: "Valanga", hint: "Bianco, freddo e pericoloso." },
        { category: "Periodi Storici", word: "Rinascimento", hint: "Arte, Italia, passato glorioso." },
        { category: "Fenomeni Ottici", word: "Miraggio", hint: "Sembra vero ma non lo è." },
        { category: "Concetti Giuridici", word: "Alibi", hint: "Serve per dimostrare che non c'eri." },
        { category: "Elementi dell'Universo", word: "Supernova", hint: "Esplosione molto luminosa e lontana." },
        { category: "Mitologia", word: "Fenice", hint: "Rinasce sempre, ha a che fare col fuoco." },
        { category: "Stati d'Animo", word: "Imbarazzo", hint: "Ti fa diventare rosso o vuoi sparire." },
        { category: "Teorie del Complotto", word: "Terrapiattismo", hint: "Contrario a ciò che dice la scienza." },
        { category: "Arte", word: "Mosaico", hint: "Tanti piccoli pezzi fanno un'immagine." },
        { category: "Letteratura", word: "Divina Commedia", hint: "Libro antico, inferno e paradiso." },
        { category: "Economia", word: "Bancarotta", hint: "Quando finiscono i soldi." },
        { category: "Filosofia", word: "Nichilismo", hint: "Nulla ha senso o importanza." },
        { category: "Simboli", word: "Yin e Yang", hint: "Bianco e nero, equilibrio." },
        // === LIVELLO CAOS (Specifici e Divertenti) ===
        { category: "Cose che si perdono", word: "Calzino spaiato", hint: "Ne trovi sempre solo uno." },
        { category: "Stereotipi Italiani", word: "Gesticolare", hint: "Si fa con le mani mentre si parla." },
        { category: "Personaggi Horror", word: "Zombie", hint: "Cammina lento e vuole mangiare." },
        { category: "Oggetti Inutili", word: "Souvenir", hint: "Lo compri in vacanza e prende polvere." },
        { category: "Internet Culture", word: "Meme", hint: "Immagine divertente che gira online." },
        { category: "Fastidi Quotidiani", word: "Zanzara", hint: "Piccolo, vola e non ti fa dormire." },
        { category: "Cibi Controversi", word: "Pizza con Ananas", hint: "A molti piace, agli italiani no." },
        { category: "Superpoteri", word: "Invisibilità", hint: "Nessuno ti può vedere." },
        { category: "Videogiochi", word: "Battle Royale", hint: "Ne rimane solo uno alla fine." },
        { category: "Feste", word: "Addio al Celibato", hint: "Ultima festa prima di cambiare vita." },
        // === NUOVI: VITA QUOTIDIANA ===
        { category: "Igiene Personale", word: "Spazzolino", hint: "Si usa almeno due volte al giorno in bagno." },
        { category: "Oggetti in Tasca", word: "Chiavi", hint: "Aprono cose, fanno rumore metallico." },
        { category: "Arredamento", word: "Specchio", hint: "Riflette l'immagine, si rompe facilmente." },
        { category: "Cancelleria", word: "Graffetta", hint: "Tiene insieme i fogli, è di metallo." },
        { category: "In Cucina", word: "Tostapane", hint: "Fa saltare fuori il cibo quando è caldo." },
        { category: "Accessori", word: "Occhiali da Sole", hint: "Si mettono sul viso quando c'è molta luce." },
        { category: "Pulizie", word: "Aspirapolvere", hint: "Fa rumore e risucchia lo sporco." },
        { category: "Bricolage", word: "Martello", hint: "Serve per battere chiodi o rompere cose." },
        { category: "Meteo", word: "Grandine", hint: "Ghiaccio che cade dal cielo e fa danni." },
        { category: "Calzature", word: "Infradito", hint: "Scarpe estive, molto aperte, da spiaggia." },
        // === NUOVI: LUOGHI ===
        { category: "Luoghi Pubblici", word: "Biblioteca", hint: "Bisogna stare in silenzio, ci sono libri." },
        { category: "Luoghi di Svago", word: "Cinema", hint: "Buio, schermo grande, popcorn." },
        { category: "Luoghi di Relax", word: "Sauna", hint: "Fa molto caldo, c'è vapore, si suda." },
        { category: "Luoghi Spaventosi", word: "Cimitero", hint: "Posto silenzioso, lapidi, rispetto." },
        { category: "Trasporti", word: "Stazione Ferroviaria", hint: "Binari, ritardi, gente che parte." },
        { category: "Negozi", word: "IKEA", hint: "Mobili svedesi, labirinto, polpette." },
        { category: "Luoghi di Lavoro", word: "Ufficio", hint: "Scrivanie, computer, riunioni noiose." },
        { category: "Intrattenimento", word: "Circo", hint: "Tendone, acrobati, animali." },
        { category: "Natura", word: "Grotta", hint: "Buia, umida, sotto terra." },
        { category: "Edifici", word: "Faro", hint: "Luce che gira, guida le navi." },
        // === NUOVI: ASTRATTI E DIFFICILI ===
        { category: "Concetti", word: "Fortuna", hint: "Quando le cose vanno bene per caso." },
        { category: "Internet", word: "Spoiler", hint: "Ti rovina la fine di un film." },
        { category: "Relazioni", word: "Tradimento", hint: "Rompere la fiducia di qualcuno." },
        { category: "Sensazioni", word: "Brivido", hint: "Sensazione di freddo o paura sulla pelle." },
        { category: "Tempo", word: "Ritardo", hint: "Arrivare dopo l'orario stabilito." },
        { category: "Legalità", word: "Multa", hint: "Paghi soldi perché hai infranto una regola." },
        { category: "Emozioni", word: "Noia", hint: "Quando non c'è nulla di interessante da fare." },
        { category: "Società", word: "Privacy", hint: "Il diritto di stare per fatti propri." },
        { category: "Logica", word: "Coincidenza", hint: "Due cose succedono insieme per caso." },
        { category: "Lavoro", word: "Sciopero", hint: "Smettere di lavorare per protesta." },
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