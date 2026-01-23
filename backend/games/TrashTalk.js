export class TrashTalkGame {
  constructor(io) {
    this.io = io;
    this.players = [];
    this.gameState = 'LOBBY';
    this.round = 0;
    this.TOTAL_ROUNDS = 3; 
    
    this.answers = {}; 
    this.battles = []; 
    this.currentBattleIndex = 0;
    this.currentBattle = null;
    this.roundVotes = {};
    
    // --- LISTA PROMPT CATTIVI (Round 1 e 2) ---
    this.normalPrompts = [
      "Il vero motivo per cui Gesù non è più tornato sulla Terra.",
      "Cosa non dovresti mai dire mentre accarezzi un cane guida?",
      "Il titolo del film porno girato nella casa di riposo di tua nonna.",
      "Cosa c'è scritto sulla lapide di un novax?",
      "L'unica cosa positiva dell'11 settembre è stata __________.",
      "Cosa usa Batman quando finisce la carta igienica?",
      "La frase peggiore da dire subito dopo aver fatto sesso.",
      "Il nome della chat di gruppo segreta del Vaticano.",
      "Cosa ho trovato nella cronologia internet di Padre Pio.",
      "Il motivo per cui sono stato bannato dallo zoo.",
      "L'undicesimo comandamento che Dio ha cancellato all'ultimo minuto.",
      "Cosa non vorresti mai sentire dire dal tuo ginecologo?",
      "Il regalo peggiore da portare a un orfanotrofio.",
      "Come ho rovinato il funerale di mio nonno.",
      "La password del wi-fi ad Auschwitz.",
      "Cosa fanno i nani nel tempo libero?",
      "Il titolo della mia autobiografia sessuale: __________.",
      "Cosa dire per farsi lasciare immediatamente?",
      "Il vero ingrediente segreto della Coca-Cola.",
      "Cosa c'è davvero nell'area 51?",
      "La scusa peggiore per non aver usato il preservativo.",
      "Cosa non dire mai a un poliziotto americano.",
      "Il nome della band punk formata da soli disabili.",
      "L'unico modo per far tacere un vegano.",
      "Cosa c'era scritto nell'ultimo messaggio di Hitler?",
      "Il giocattolo sessuale preferito dalla Regina Elisabetta.",
      "Perché non mi fanno più entrare all'asilo nido?",
      "La cosa più imbarazzante che il tuo cane ti ha visto fare.",
      "Cosa scriveresti sulla tomba del tuo ex?",
      "Il vero motivo per cui i dinosauri si sono suicidati.",
      "Cosa fa Andrea Bocelli quando non canta?",
      "L'unica cosa che i preti amano più di Dio."
    ];

    // --- LISTA PROMPT FINALI (Tutti contro Tutti) ---
    this.finalPrompts = [
        "L'ultima cosa che vorresti vedere mentre sei seduto sul water.",
        "Il modo più creativo per nascondere un cadavere.",
        "Cosa scriveresti sulla Luna se potessi usare un pennarello gigante?",
        "Il pensiero più oscuro che hai avuto oggi.",
        "Se l'inferno avesse una sala d'attesa, quale musica ci sarebbe?",
        "Il titolo di un libro che non venderà mai nemmeno una copia.",
        "La cosa più illegale che faresti se non ci fossero conseguenze.",
        "Cosa diresti a Dio se lo incontrassi ubriaco al bar?",
        "Il superpotere più inutile e disgustoso del mondo."
    ];
  }

  initGame(currentPlayers) {
    this.players = currentPlayers.map(p => ({ ...p, score: 0, answer: '', isConnected: true }));
    this.gameState = 'LOBBY';
    this.round = 0;
    this.io.emit('set_view', 'TRASHTALK_LOBBY');
    this.emitState();
  }

  startGame() {
    this.round = 1;
    this.startWritingPhase();
  }

  // --- FASE 1: SCRITTURA ---
  startWritingPhase() {
    this.gameState = 'WRITING';
    this.answers = {};
    
    const isFinalRound = this.round === this.TOTAL_ROUNDS;
    
    if (isFinalRound) {
        const prompt = this.finalPrompts[Math.floor(Math.random() * this.finalPrompts.length)];
        this.currentBattleIndex = -1; 
        this.io.emit('trashtalk_prompt', prompt); 
    } 
    else {
        this.preparePairsAndPrompts();
    }

    this.io.emit('set_view', 'TRASHTALK_WRITING');
    this.emitState();
  }

  preparePairsAndPrompts() {
      const shuffled = [...this.players].sort(() => 0.5 - Math.random());
      this.battles = []; 

      for (let i = 0; i < shuffled.length; i += 2) {
          const p1 = shuffled[i];
          const p2 = shuffled[i+1] || shuffled[0]; 
          
          const prompt = this.normalPrompts[Math.floor(Math.random() * this.normalPrompts.length)];
          
          this.battles.push({ p1: p1.id, p2: p2.id, prompt: prompt });

          this.io.to(p1.id).emit('trashtalk_prompt', prompt);
          this.io.to(p2.id).emit('trashtalk_prompt', prompt);
      }
  }

  handleAnswer(playerId, text) {
      if (this.gameState !== 'WRITING') return;
      this.answers[playerId] = text.toUpperCase();
      this.io.to(playerId).emit('set_view', 'TRASHTALK_WAITING');
      this.emitState();

      const activePlayers = this.players.filter(p => p.isConnected);
      if (Object.keys(this.answers).length >= activePlayers.length) {
          setTimeout(() => this.startVotingPhase(), 1000);
      }
  }

  // --- FASE 2: VOTAZIONE ---
  startVotingPhase() {
      this.gameState = 'VOTING';
      this.emitState();
      
      if (this.round === this.TOTAL_ROUNDS) {
          this.startFinalBattle();
      } else {
          this.currentBattleIndex = 0;
          this.startNextPairBattle();
      }
  }

  startNextPairBattle() {
      if (this.currentBattleIndex >= this.battles.length) {
          this.endRound();
          return;
      }

      this.currentBattle = this.battles[this.currentBattleIndex];
      this.roundVotes = {};

      const battleData = {
          type: '1VS1',
          prompt: this.currentBattle.prompt, 
          p1: { id: this.currentBattle.p1, answer: this.answers[this.currentBattle.p1] },
          p2: { id: this.currentBattle.p2, answer: this.answers[this.currentBattle.p2] }
      };

      this.io.emit('trashtalk_battle_start', battleData);
      this.io.emit('set_view', 'TRASHTALK_VOTE'); 
      this.emitState();

      setTimeout(() => this.showPairResults(battleData), 15000);
  }

  showPairResults(battleData) {
      let p1Score = 0;
      let p2Score = 0;
      
      Object.values(this.roundVotes).forEach(target => {
          if (target === battleData.p1.id) p1Score++;
          if (target === battleData.p2.id) p2Score++;
      });

      if (p1Score > p2Score) this.addScore(battleData.p1.id, 1000 + (p1Score*100));
      else if (p2Score > p1Score) this.addScore(battleData.p2.id, 1000 + (p2Score*100));
      else { 
          this.addScore(battleData.p1.id, 500);
          this.addScore(battleData.p2.id, 500);
      }

      this.io.emit('trashtalk_battle_result', { 
          winnerId: p1Score > p2Score ? battleData.p1.id : (p2Score > p1Score ? battleData.p2.id : 'DRAW'),
          p1Votes: p1Score,
          p2Votes: p2Score
      });

      setTimeout(() => {
          this.currentBattleIndex++;
          this.startNextPairBattle();
      }, 6000); 
  }

  startFinalBattle() {
      this.roundVotes = {};
      this.currentBattle = { type: 'ALL' }; 

      const allAnswers = this.players.map(p => ({
          id: p.id,
          answer: this.answers[p.id] || "...",
          name: p.name
      }));

      const finalPrompt = "ROUND FINALE: " + (this.answers[this.players[0].id]?.prompt || "RISPONDETE!");

      const battleData = {
          type: 'ALL_VS_ALL',
          prompt: finalPrompt,
          candidates: allAnswers
      };

      this.io.emit('trashtalk_battle_start', battleData);
      this.io.emit('set_view', 'TRASHTALK_VOTE');
      this.emitState();

      setTimeout(() => this.showFinalResults(), 20000); 
  }

  showFinalResults() {
      const scores = {};
      Object.values(this.roundVotes).forEach(target => {
          scores[target] = (scores[target] || 0) + 1;
      });

      for (const [pid, votes] of Object.entries(scores)) {
          this.addScore(pid, votes * 500);
      }

      this.endRound();
  }

  handleVote(voterId, targetId) {
      if (this.gameState !== 'VOTING') return;

      if (this.currentBattle && this.currentBattle.p1 && this.currentBattle.p2) {
          if (voterId === this.currentBattle.p1 || voterId === this.currentBattle.p2) return;
      }

      if (voterId === targetId) return;
      this.roundVotes[voterId] = targetId;
  }

  addScore(id, points) {
      const p = this.players.find(x => x.id === id);
      if (p) p.score += points;
  }

  endRound() {
      this.players.sort((a, b) => b.score - a.score);

      if (this.round >= this.TOTAL_ROUNDS) {
          this.gameState = 'GAME_OVER';
          this.io.emit('trashtalk_game_over', this.players);
          this.io.emit('set_view', 'TRASHTALK_RESULT'); 
      } else {
          this.gameState = 'LEADERBOARD';
          this.io.emit('trashtalk_leaderboard', this.players); 
          this.io.emit('set_view', 'TRASHTALK_RESULT'); 
          this.emitState();

          setTimeout(() => {
              this.round++;
              this.startWritingPhase();
          }, 8000);
      }
  }

  emitState() {
      this.io.emit('trashtalk_state', {
          phase: this.gameState,
          round: this.round,
          totalRounds: this.TOTAL_ROUNDS,
          answersReceived: Object.keys(this.answers).length,
          totalPlayers: this.players.length
      });
  }
}