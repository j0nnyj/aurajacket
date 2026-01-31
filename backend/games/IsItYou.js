export class IsItYouGame {
  constructor(io) {
    this.io = io;
    this.players = [];
    this.gameState = 'LOBBY';
    this.round = -1;
    this.images = {};       
    this.roundImages = {};  
    this.votes = {};
    this.jokers = {};       
    
    // CONFIGURAZIONE FASI DI GIOCO
    this.gameFlow = [
        { type: 'POLL', text: "Chi morirebbe per primo in un film horror?" },
        { type: 'POLL', text: "Chi controlla il telefono del partner di nascosto?" },
        { type: 'MIMIC', text: "Fate una faccia come se aveste appena pestato una cacca!" },
        { type: 'POLL', text: "Chi venderebbe un amico per 100€?" },
        { type: 'DRAW', text: "Fatelo sembrare un Pirata Spaziale!", target: 'DYNAMIC' }, 
        { type: 'POLL', text: "Chi ha la cronologia internet più imbarazzante?" },
        { type: 'MIMIC', text: "Fate la vostra migliore faccia da 'Ho appena vinto la lotteria'!" }
    ];
    
    this.currentTask = null;
    this.drawTargetId = null; 
  }

  initGame(players) {
    this.players = players.map(p => ({ ...p, score: 0 }));
    this.images = {}; 
    this.gameState = 'SELFIE'; 
    this.io.emit('set_view', 'ISITYOU_SELFIE'); 
    this.emitState();
  }

  handleUpload(socketId, { img, type }) {
      const p = this.players.find(x => x.id === socketId);
      if (!p) return;

      if (type === 'PROFILE') {
          this.images[p.sessionId] = img;
          if (Object.keys(this.images).length >= this.players.length) {
              this.startRoundLoop();
          } else {
              this.emitState();
          }
      } 
      else if (type === 'ROUND') {
          this.roundImages[p.sessionId] = img; 
          if (Object.keys(this.roundImages).length >= this.players.length) {
              this.startGalleryVoting();
          } else {
              this.io.emit('isityou_upload_progress', Object.keys(this.roundImages).length);
          }
      }
  }

  startRoundLoop() {
      this.round = -1;
      this.nextRound();
  }

  nextRound() {
      this.round++;
      if (this.round >= this.gameFlow.length) {
          this.endGame();
          return;
      }

      this.currentTask = this.gameFlow[this.round];
      this.votes = {};
      this.jokers = {};
      this.roundImages = {}; 
      
      if (this.currentTask.type === 'POLL') {
          this.gameState = 'POLL';
          this.broadcastTask();
          this.setAllViews('ISITYOU_VOTE_POLL');
      } 
      else if (this.currentTask.type === 'MIMIC') {
          this.gameState = 'MIMIC';
          this.broadcastTask();
          this.setAllViews('ISITYOU_CAMERA'); 
      }
      else if (this.currentTask.type === 'DRAW') {
          this.gameState = 'DRAW';
          const victimIndex = this.round % this.players.length;
          const victim = this.players[victimIndex];
          this.drawTargetId = victim.sessionId;
          
          const victimPhoto = this.images[victim.sessionId];
          
          this.io.emit('isityou_task', { 
              ...this.currentTask, 
              targetName: victim.name,
              bgImage: victimPhoto 
          });
          
          this.setAllViews('ISITYOU_CANVAS');
      }
      
      this.emitState();
  }

  handleVote(socketId, { target, joker }) {
      const p = this.players.find(x => x.id === socketId);
      if (!p) return;

      this.votes[p.sessionId] = target;
      if (joker) this.jokers[p.sessionId] = true;

      if (Object.keys(this.votes).length >= this.players.length) {
          this.calculateResults();
      }
  }

  startGalleryVoting() {
      this.gameState = 'VOTING_IMAGES';
      const gallery = this.players.map(p => ({
          id: p.sessionId,
          name: p.name,
          image: this.roundImages[p.sessionId]
      }));
      this.io.emit('isityou_gallery', gallery);
      this.io.emit('set_view', 'ISITYOU_GALLERY_VOTE'); // TV
      this.setAllViews('ISITYOU_VOTE_IMAGE'); // Mobile
  }

  calculateResults() {
      this.gameState = 'RESULTS';
      const voteCounts = {};
      Object.values(this.votes).forEach(t => voteCounts[t] = (voteCounts[t] || 0) + 1);
      
      let maxVotes = 0;
      let winnerId = null;
      for (const [id, count] of Object.entries(voteCounts)) {
          if (count > maxVotes) { maxVotes = count; winnerId = id; }
      }

      const results = this.players.map(p => {
          let points = 0;
          const myVote = this.votes[p.sessionId];
          const isJoker = this.jokers[p.sessionId];

          if (this.currentTask.type === 'POLL') {
              if (myVote === winnerId) {
                  points = 1000;
                  if (isJoker) points *= 2;
              }
              if (p.sessionId === winnerId) points += 500;
          } 
          else {
              const received = voteCounts[p.sessionId] || 0;
              points = received * 400;
              if (p.sessionId === winnerId) points += 500; 
          }
          
          p.score += points;
          return { ...p, roundPoints: points, vote: myVote };
      });

      this.io.emit('isityou_results', { results, winnerId, type: this.currentTask.type });
      this.io.emit('set_view', 'ISITYOU_RESULT');

      setTimeout(() => this.nextRound(), 10000); 
  }

  endGame() {
      this.gameState = 'GAME_OVER';
      this.players.sort((a,b) => b.score - a.score);
      this.io.emit('isityou_game_over', this.players);
      this.io.emit('set_view', 'ISITYOU_GAMEOVER');
  }

  // --- SYNC ROBUSTO (FIX LOADING) ---
  syncSinglePlayer(socket, player) {
      const p = this.players.find(x => x.sessionId === player.sessionId);
      if(p) p.id = socket.id;
      
      // Rimanda sempre lo stato attuale
      this.emitState();

      if (this.gameState === 'SELFIE') {
          // Se ha già caricato, aspetta, altrimenti chiedi selfie
          socket.emit('set_view', this.images[p.sessionId] ? 'ISITYOU_WAITING' : 'ISITYOU_SELFIE');
      } 
      else if (this.gameState === 'POLL') {
          // Rimanda domanda e vista voto
          socket.emit('isityou_task', this.currentTask);
          if (this.votes[p.sessionId]) socket.emit('set_view', 'ISITYOU_WAITING');
          else socket.emit('set_view', 'ISITYOU_VOTE_POLL');
      }
      else if (this.gameState === 'MIMIC') {
          socket.emit('isityou_task', this.currentTask);
          if (this.roundImages[p.sessionId]) socket.emit('set_view', 'ISITYOU_WAITING');
          else socket.emit('set_view', 'ISITYOU_CAMERA');
      }
      else if (this.gameState === 'DRAW') {
          // Rimanda dati per disegnare
          const victim = this.players.find(x => x.sessionId === this.drawTargetId);
          const victimPhoto = this.images[this.drawTargetId];
          socket.emit('isityou_task', { ...this.currentTask, targetName: victim?.name, bgImage: victimPhoto });
          
          if (this.roundImages[p.sessionId]) socket.emit('set_view', 'ISITYOU_WAITING');
          else socket.emit('set_view', 'ISITYOU_CANVAS');
      }
      else if (this.gameState === 'VOTING_IMAGES') {
           // Rimanda galleria
           const gallery = this.players.map(pl => ({ id: pl.sessionId, name: pl.name, image: this.roundImages[pl.sessionId] }));
           socket.emit('isityou_gallery', gallery);
           if (this.votes[p.sessionId]) socket.emit('set_view', 'ISITYOU_WAITING');
           else socket.emit('set_view', 'ISITYOU_VOTE_IMAGE');
      }
      else if (this.gameState === 'RESULTS') {
          socket.emit('set_view', 'ISITYOU_RESULT'); // Mobile vede solo schermata attesa verde
      }
      else {
          socket.emit('set_view', 'ISITYOU_WAITING');
      }
  }

  broadcastTask() {
      this.io.emit('isityou_task', this.currentTask);
  }
  
  setAllViews(viewName) {
      this.players.forEach(p => this.io.to(p.id).emit('set_view', viewName));
  }

  emitState() {
      this.io.emit('isityou_state', {
          gameState: this.gameState,
          round: this.round + 1,
          totalRounds: this.gameFlow.length,
          uploadedCount: Object.keys(this.images).length
      });
  }

  setupListeners(socket) {
      socket.on('isityou_upload', (d) => this.handleUpload(socket.id, d));
      socket.on('isityou_vote', (d) => this.handleVote(socket.id, d));
      socket.on('isityou_sync', () => {
          const p = this.players.find(x => x.id === socket.id);
          if(p) this.syncSinglePlayer(socket, p);
      });
      // Listener per terminare partita da Host
      socket.on('isityou_force_end', () => this.endGame());
  }
}