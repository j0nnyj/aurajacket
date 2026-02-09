export class BufalaGame {
  constructor(io) {
    this.io = io;
    this.players = [];
    this.gameState = 'LOBBY';
    this.round = 0;
    this.totalRounds = 4; 
    this.currentQuestion = null;
    this.lies = {}; 
    this.votes = {}; 
    this.activeTimer = null; // Il timer che dobbiamo uccidere
    this.currentVotingOptions = [];
    
    // DATABASE
    this.questions = [
        { text: "Nel 2013, un uomo in Svezia è stato arrestato per aver tentato di dividere l'atomo nella sua _____.", answer: "CUCINA" },
        { text: "Il nome originale di Google doveva essere _____.", answer: "BACKRUB" },
        { text: "In Texas è illegale sparare a un _____ da un hotel.", answer: "BUFALO" },
        { text: "Un'azienda giapponese vende un cuscino a forma di _____ per donne sole.", answer: "TORSO" },
        { text: "Nel 1980, l'ospedale di Las Vegas ha dovuto sospendere alcuni dipendenti che scommettevano su _____ dei pazienti.", answer: "LA MORTE" },
        { text: "Il re Luigi XIV di Francia possedeva 413 _____.", answer: "LETTI" },
        { text: "In Danimarca non puoi chiamare tuo figlio _____.", answer: "ANUS" },
        { text: "Per legge, in Vermont, una donna deve avere il permesso scritto del marito per mettere _____.", answer: "LA DENTIERA" },
        { text: "Il famoso criminale Al Capone sul suo biglietto da visita si definiva un _____.", answer: "VENDITORE DI MOBILI" },
        { text: "L'animale nazionale della Scozia è il _____.", answer: "UNICORNO" },
        { text: "Fino al 2011, in Russia la birra era considerata giuridicamente _____.", answer: "CIBO" },
        { text: "Un uomo in Florida è stato arrestato per aver aggredito la fidanzata con un _____.", answer: "TACO" },
        { text: "Il Vaticano ha il tasso di _____ più alto del mondo.", answer: "CRIMINALITÀ" }
    ];
  }

  // Uccide qualsiasi timer attivo
  clearGameTimer() {
      if (this.activeTimer) {
          clearTimeout(this.activeTimer);
          this.activeTimer = null;
          // console.log("TIMER BUFALA UCCISO 💀");
      }
  }

  // --- NUOVA FUNZIONE DI STOP ---
  stopGame() {
      this.clearGameTimer();
      this.gameState = 'LOBBY';
      this.round = 0;
      this.lies = {};
      this.votes = {};
      // Non emettiamo nulla qui, lasciamo gestire al menu principale
  }

  initGame(players) {
    this.stopGame(); // Resetta tutto prima di iniziare
    this.players = players.map(p => ({ ...p, score: 0 }));
    this.gameState = 'LOBBY';
    this.io.emit('set_view', 'BUFALA_LOBBY');
    this.emitState();
  }

  startGame() {
    this.gameState = 'WRITING';
    this.round = 0;
    this.nextRound();
  }

  nextRound() {
    this.clearGameTimer();
    this.round++;
    this.lies = {};
    this.votes = {};
    this.currentVotingOptions = [];
    
    if (this.round > this.totalRounds) {
        this.endGame();
        return;
    }

    const qIndex = Math.floor(Math.random() * this.questions.length);
    this.currentQuestion = this.questions[qIndex];

    this.gameState = 'WRITING';
    
    this.io.emit('bufala_prompt', { 
        text: this.currentQuestion.text, 
        round: this.round,
        isFinal: this.round === this.totalRounds
    });
    
    this.io.emit('set_view', 'BUFALA_WRITING');
    
    this.players.forEach(p => {
        this.io.to(p.id).emit('set_view', 'BUFALA_INPUT');
    });

    this.emitState();

    this.activeTimer = setTimeout(() => {
        if (this.gameState === 'WRITING') this.startVoting(); 
    }, 60000);
  }

  handleLie(socketId, text) {
      if (this.gameState !== 'WRITING') return;
      const p = this.players.find(x => x.id === socketId);
      if (!p) return;

      const cleanLie = text.trim().toUpperCase();
      const cleanTruth = this.currentQuestion.answer.toUpperCase();

      if (cleanLie === cleanTruth || (cleanLie.includes(cleanTruth) && cleanLie.length < cleanTruth.length + 3)) {
          this.io.to(socketId).emit('bufala_error', "Non puoi scrivere la verità! Inventa una bugia.");
          return;
      }

      this.lies[p.sessionId] = cleanLie;
      this.io.emit('bufala_progress', { current: Object.keys(this.lies).length, total: this.players.length });

      if (Object.keys(this.lies).length >= this.players.length) {
          this.clearGameTimer();
          setTimeout(() => {
             if (this.gameState === 'WRITING') this.startVoting();
          }, 1000);
      }
  }

  startVoting() {
      this.clearGameTimer();
      this.gameState = 'VOTING';
      
      let options = Object.values(this.lies);
      options.push(this.currentQuestion.answer.toUpperCase());
      options = [...new Set(options)].sort(() => Math.random() - 0.5);
      this.currentVotingOptions = options;

      this.io.emit('bufala_voting_start', { options: this.currentVotingOptions });
      this.io.emit('set_view', 'BUFALA_VOTE_TV');
      
      this.players.forEach(p => {
          this.io.to(p.id).emit('set_view', 'BUFALA_VOTE_MOBILE');
      });

      this.activeTimer = setTimeout(() => {
          if (this.gameState === 'VOTING') this.calculateResults();
      }, 30000);
  }

  handleVote(socketId, textVote) {
      if (this.gameState !== 'VOTING') return;
      const p = this.players.find(x => x.id === socketId);
      if (!p || this.votes[p.sessionId]) return;

      this.votes[p.sessionId] = textVote;
      
      const votesCount = Object.keys(this.votes).length;
      this.io.emit('bufala_progress', { current: votesCount, total: this.players.length });

      if (votesCount >= this.players.length) {
          this.clearGameTimer();
          setTimeout(() => {
              if (this.gameState === 'VOTING') this.calculateResults();
          }, 1000);
      }
  }

  calculateResults() {
      this.clearGameTimer();
      this.gameState = 'REVEAL';
      const truth = this.currentQuestion.answer.toUpperCase();
      const roundStats = [];
      const multiplier = (this.round === this.totalRounds) ? 3 : 1;

      Object.entries(this.lies).forEach(([authorId, lieText]) => {
          const voters = this.players.filter(p => this.votes[p.sessionId] === lieText && p.sessionId !== authorId);
          if (voters.length > 0) {
              const author = this.players.find(p => p.sessionId === authorId);
              if (author) author.score += (voters.length * 500 * multiplier);
              roundStats.push({
                  type: 'LIE',
                  text: lieText,
                  author: author ? author.name : "Sconosciuto",
                  voters: voters.map(v => v.name)
              });
          } else {
              roundStats.push({ type: 'LIE', text: lieText, author: this.getPlayerName(authorId), voters: [] });
          }
      });

      const truthVoters = this.players.filter(p => this.votes[p.sessionId] === truth);
      truthVoters.forEach(p => p.score += (1000 * multiplier));
      roundStats.push({ type: 'TRUTH', text: truth, author: "LA VERITÀ", voters: truthVoters.map(v => v.name) });

      this.io.emit('bufala_round_results', { stats: roundStats, truth: truth });
      this.io.emit('set_view', 'BUFALA_REVEAL');
      this.players.forEach(p => this.io.to(p.id).emit('set_view', 'BUFALA_WAITING'));

      this.activeTimer = setTimeout(() => {
          if (this.gameState === 'REVEAL') this.showLeaderboard();
      }, 25000); 
  }

  showLeaderboard() {
      this.clearGameTimer();
      this.gameState = 'LEADERBOARD';
      this.players.sort((a,b) => b.score - a.score);
      
      if (this.round >= this.totalRounds) {
          this.io.emit('set_view', 'BUFALA_GAMEOVER');
          this.io.emit('bufala_game_over', this.players);
      } else {
          this.io.emit('set_view', 'BUFALA_LEADERBOARD');
          this.io.emit('bufala_leaderboard', this.players);
          this.activeTimer = setTimeout(() => {
              if (this.gameState === 'LEADERBOARD') this.nextRound();
          }, 10000);
      }
  }

  handleSkip() {
      this.clearGameTimer();
      switch (this.gameState) {
          case 'WRITING': this.startVoting(); break;
          case 'VOTING': this.calculateResults(); break;
          case 'REVEAL': this.showLeaderboard(); break;
          case 'LEADERBOARD': this.nextRound(); break;
      }
  }

  getPlayerName(sessionId) {
      const p = this.players.find(x => x.sessionId === sessionId);
      return p ? p.name : "???";
  }

  emitState() {
      this.io.emit('bufala_state', {
          round: this.round,
          totalPlayers: this.players.length
      });
  }

  syncSinglePlayer(socket, player) {
      const p = this.players.find(x => x.sessionId === player.sessionId);
      if(!p) return;
      p.id = socket.id;

      if (this.gameState === 'LOBBY') {
          socket.emit('set_view', 'BUFALA_LOBBY');
      } else if (this.gameState === 'WRITING') {
          if (this.lies[p.sessionId]) socket.emit('set_view', 'BUFALA_WAITING');
          else {
              socket.emit('bufala_prompt', { text: this.currentQuestion.text, round: this.round });
              socket.emit('set_view', 'BUFALA_INPUT');
          }
      } else if (this.gameState === 'VOTING') {
          socket.emit('bufala_voting_start', { options: this.currentVotingOptions });
          if (this.votes[p.sessionId]) socket.emit('set_view', 'BUFALA_WAITING');
          else socket.emit('set_view', 'BUFALA_VOTE_MOBILE');
      } else {
          socket.emit('set_view', 'BUFALA_WAITING');
      }
  }

  setupListeners(socket) {
      socket.on('bufala_start', () => this.startGame());
      socket.on('bufala_lie', (text) => this.handleLie(socket.id, text));
      socket.on('bufala_vote', (text) => this.handleVote(socket.id, text));
      socket.on('bufala_skip', () => this.handleSkip());
      
      // STOP GAME: Chiamato dal tasto Termina
      socket.on('bufala_stop', () => this.stopGame()); 

      socket.on('bufala_sync', () => {
          const p = this.players.find(x => x.id === socket.id);
          if(p) this.syncSinglePlayer(socket, p);
      });
  }
}