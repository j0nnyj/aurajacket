export class TrashTalkGame {
  constructor(io) {
    this.io = io;
    this.players = [];
    this.gameState = 'LOBBY';
    this.round = 0;
    this.totalRounds = 3; 
    this.answers = {};
    this.votes = {};
    this.battlesQueue = [];
    this.currentBattle = null;
    this.roundPairings = [];
    
    this.prompts = [
        "Il mio prete di fiducia mi ha confessato che _____.",
        "Per il mio funerale non voglio fiori, voglio _____.",
        "Ho lasciato la mia ragazza perché puzzava di _____.",
        "Cosa hai trovato nella cronologia del tuo capo? _____.",
        "Il vero motivo per cui i dinosauri si sono estinti è _____.",
        "_____ : ecco perché non possiamo avere cose belle.",
        "Mamma, papà... sono incinta. Il padre è _____.",
        "Il nuovo gusto di gelato che sta facendo impazzire l'Italia: _____.",
        "Durante il sesso, grido sempre il nome di _____.",
        "La polizia ha trovato _____ nel bagagliaio della mia auto.",
        "Cosa usano i ricchi al posto della carta igienica? _____.",
        "Il mio superpotere inutile è evocare _____ a comando.",
        "Ho perso la verginità guardando _____.",
        "Gesù ha trasformato l'acqua in _____.",
        "La prima regola del Fight Club è: non parlare mai di _____.",
        "Il regalo peggiore da portare a un orfanotrofio: _____.",
        "Cosa nasconde Trump sotto il parrucchino? _____.",
        "_____ : testato sugli animali, approvato dai bambini.",
        "Il mio psicologo ha smesso di ascoltarmi quando ho parlato di _____.",
        "Non sono razzista, ma _____.",
        "L'unica cosa che mi eccita più dei soldi è _____.",
        "Perché mi brucia quando faccio pipì? Colpa di _____.",
        "_____ è la prova che Dio ha un senso dell'umorismo crudele.",
        "Cosa c'è davvero nell'Area 51? _____.",
        "Il titolo del mio sex tape sarebbe '_____ e altri disastri'.",
        "Ho smesso di drogarmi grazie a _____.",
        "La nonna è caduta dalle scale perché stava inseguendo _____.",
        "Invece della mirra, il quarto Re Magio portò _____.",
        "Cosa farei per un Klondike? Probabilmente _____.",
        "La Disney presenta il nuovo film: Biancaneve e _____.",
        "Il Papa ha appena twittato riguardo _____.",
        "Se fossi un dittatore, la mia prima legge vieterebbe _____.",
        "Ho licenziato la baby-sitter perché l'ho trovata a fare _____ col cane.",
        "L'ingrediente segreto della carbonara di mia madre è _____.",
        "Sono stato bannato da Tinder per aver messo _____ nella foto profilo."
    ];
  }

  initGame(players) {
    this.players = players.map(p => ({ ...p, score: 0, answers: [] }));
    this.gameState = 'LOBBY';
    this.io.emit('set_view', 'TRASHTALK_LOBBY');
    this.emitState();
  }

  startGame() {
    this.gameState = 'WRITING';
    this.round = 0;
    this.players.forEach(p => p.score = 0);
    this.nextRound();
  }

  nextRound() {
    this.round++;
    this.answers = {};
    this.votes = {};
    this.battlesQueue = [];
    this.roundPairings = [];
    
    const shuffledPrompts = [...this.prompts].sort(() => 0.5 - Math.random());
    this.gameState = 'WRITING';
    
    // ROUND FINALE: Tutti stessa domanda
    if (this.round >= this.totalRounds) {
        this.finalPrompt = shuffledPrompts[0];
        this.players.forEach(p => {
            this.io.to(p.id).emit('trashtalk_prompt', { text: this.finalPrompt, round: 'FINAL' });
            this.io.to(p.id).emit('set_view', 'TRASHTALK_INPUT');
        });
        this.io.emit('set_view', 'TRASHTALK_WRITING');
    } 
    // ROUND NORMALE: Coppie
    else {
        const availablePlayers = [...this.players].sort(() => 0.5 - Math.random());
        while (availablePlayers.length >= 2) {
            const p1 = availablePlayers.pop();
            const p2 = availablePlayers.pop();
            const prompt = shuffledPrompts.pop();
            this.roundPairings.push({ p1Id: p1.sessionId, p2Id: p2.sessionId, prompt: prompt });

            this.io.to(p1.id).emit('trashtalk_prompt', { text: prompt, round: this.round });
            this.io.to(p2.id).emit('trashtalk_prompt', { text: prompt, round: this.round });
            this.io.to(p1.id).emit('set_view', 'TRASHTALK_INPUT');
            this.io.to(p2.id).emit('set_view', 'TRASHTALK_INPUT');
        }
        if (availablePlayers.length === 1) {
            const pOdd = availablePlayers.pop();
            const prompt = shuffledPrompts.pop();
            this.roundPairings.push({ p1Id: pOdd.sessionId, p2Id: 'GHOST', prompt: prompt });
            this.io.to(pOdd.id).emit('trashtalk_prompt', { text: prompt, round: this.round });
            this.io.to(pOdd.id).emit('set_view', 'TRASHTALK_INPUT');
        }
        this.io.emit('set_view', 'TRASHTALK_WRITING');
    }
    this.emitState();
  }

  handleAnswer(socketId, text) {
      if (this.gameState !== 'WRITING') return;
      const p = this.players.find(x => x.id === socketId);
      if (!p || this.answers[p.sessionId]) return;

      this.answers[p.sessionId] = text;
      this.io.emit('trashtalk_progress', { current: Object.keys(this.answers).length, total: this.players.length });

      if (Object.keys(this.answers).length >= this.players.length) {
          this.prepareBattles();
      }
  }

  prepareBattles() {
      this.battlesQueue = [];

      if (this.round >= this.totalRounds) {
          this.battlesQueue.push({
              type: 'ALL_VS_ALL',
              prompt: this.finalPrompt,
              candidates: this.players.map(p => ({
                  id: p.sessionId,
                  socketId: p.id,
                  name: p.name,
                  answer: this.answers[p.sessionId]
              }))
          });
      } else {
          this.roundPairings.forEach(pairing => {
              const p1 = this.players.find(x => x.sessionId === pairing.p1Id);
              if (pairing.p2Id === 'GHOST') {
                  this.battlesQueue.push({
                      type: '1VS1',
                      prompt: pairing.prompt,
                      p1: { id: p1.sessionId, socketId: p1.id, name: p1.name, answer: this.answers[p1.sessionId] },
                      p2: { id: 'GHOST', socketId: 'GHOST', name: "Sconosciuto", answer: "Non so cosa scrivere..." }
                  });
              } else {
                  const p2 = this.players.find(x => x.sessionId === pairing.p2Id);
                  this.battlesQueue.push({
                      type: '1VS1',
                      prompt: pairing.prompt,
                      p1: { id: p1.sessionId, socketId: p1.id, name: p1.name, answer: this.answers[p1.sessionId] },
                      p2: { id: p2.sessionId, socketId: p2.id, name: p2.name, answer: this.answers[p2.sessionId] }
                  });
              }
          });
          this.battlesQueue.sort(() => Math.random() - 0.5);
      }
      this.startNextBattle();
  }

  startNextBattle() {
      if (this.battlesQueue.length === 0) {
          this.showLeaderboard();
          return;
      }

      this.currentBattle = this.battlesQueue.shift();
      this.votes = {};
      this.gameState = 'VOTING';
      
      this.io.emit('trashtalk_battle_start', this.currentBattle);
      this.io.emit('set_view', 'TRASHTALK_VOTE_TV'); 
      this.players.forEach(p => this.io.to(p.id).emit('set_view', 'TRASHTALK_VOTE')); 
      
      const time = this.currentBattle.type === '1VS1' ? 20000 : 40000;
      setTimeout(() => {
          if (this.gameState === 'VOTING') this.endBattle();
      }, time);
  }

  handleVote(socketId, targetId) {
      if (this.gameState !== 'VOTING') return;
      const voter = this.players.find(p => p.id === socketId);
      if (!voter || this.votes[voter.sessionId]) return;

      // --- FIX CRITICO: BLOCCO AUTOVOTO LATO SERVER ---
      // Se è un 1vs1, controlla se il votante è uno dei duellanti
      if (this.currentBattle.type === '1VS1') {
          if (voter.sessionId === this.currentBattle.p1.id || voter.sessionId === this.currentBattle.p2.id) {
              return; // Ignora il voto se sei in gara
          }
      } 
      // Se è All vs All, non puoi votare te stesso
      else if (targetId === voter.sessionId) {
          return; 
      }

      this.votes[voter.sessionId] = targetId;
      
      // --- LOGICA FINE ANTICIPATA ---
      let votersNeeded = this.players.length;
      
      if (this.currentBattle.type === '1VS1') {
          // Nel 1vs1 votano tutti tranne i 2 partecipanti
          if (this.currentBattle.p2.id === 'GHOST') votersNeeded -= 1;
          else votersNeeded -= 2;
      }
      // Nel finale (All vs All) tutti votano (tranne se stessi), quindi aspettiamo N voti totali.
      
      if (votersNeeded < 1) votersNeeded = 1;

      if (Object.keys(this.votes).length >= votersNeeded) {
           setTimeout(() => this.endBattle(), 1000);
      }
  }

  endBattle() {
      if (this.gameState !== 'VOTING') return;

      const scores = {};
      Object.values(this.votes).forEach(v => scores[v] = (scores[v] || 0) + 1);

      let winnerId = null;
      let max = -1;

      if (this.currentBattle.type === '1VS1') {
          const id1 = this.currentBattle.p1.id;
          const id2 = this.currentBattle.p2.id;
          const v1 = scores[id1] || 0;
          const v2 = scores[id2] || 0;
          
          if (v1 > v2) winnerId = id1;
          else if (v2 > v1) winnerId = id2;
          
          if (winnerId && winnerId !== 'GHOST') {
              const w = this.players.find(p => p.sessionId === winnerId);
              if (w) w.score += 500 + (Math.max(v1, v2) * 50); 
          }
      } else {
          for (const [pid, count] of Object.entries(scores)) {
              if (pid === 'GHOST') continue;
              const p = this.players.find(x => x.sessionId === pid);
              if (p) {
                  p.score += count * 200; 
                  if (count > max) { max = count; winnerId = pid; }
              }
          }
      }

      this.io.emit('trashtalk_battle_result', {
          winnerId,
          battle: this.currentBattle,
          votes: scores
      });
      
      this.io.emit('set_view', 'TRASHTALK_RESULT');

      setTimeout(() => {
          this.startNextBattle();
      }, 7000); 
  }

  showLeaderboard() {
      this.gameState = 'LEADERBOARD';
      this.players.sort((a,b) => b.score - a.score);
      
      if (this.round >= this.totalRounds) {
          this.io.emit('trashtalk_game_over', this.players);
          this.io.emit('set_view', 'TRASHTALK_GAMEOVER');
      } else {
          this.io.emit('trashtalk_leaderboard', this.players);
          setTimeout(() => this.nextRound(), 8000);
      }
  }

  emitState() {
      this.io.emit('trashtalk_state', {
          round: this.round,
          totalRounds: this.totalRounds,
          phase: this.gameState
      });
  }

  syncSinglePlayer(socket, player) {
      const p = this.players.find(x => x.sessionId === player.sessionId);
      if(p) p.id = socket.id;

      if (this.gameState === 'LOBBY') socket.emit('set_view', 'TRASHTALK_LOBBY');
      else if (this.gameState === 'WRITING') {
          let myPrompt = "";
          if (this.round >= this.totalRounds) {
              myPrompt = this.finalPrompt;
          } else {
              const pairing = this.roundPairings.find(pair => pair.p1Id === p.sessionId || pair.p2Id === p.sessionId);
              if (pairing) myPrompt = pairing.prompt;
          }
          if(myPrompt) socket.emit('trashtalk_prompt', { text: myPrompt, round: this.round });
          socket.emit('set_view', this.answers[p.sessionId] ? 'TRASHTALK_WAITING' : 'TRASHTALK_INPUT');
      }
      else if (this.gameState === 'VOTING') {
          socket.emit('trashtalk_battle_start', this.currentBattle);
          socket.emit('set_view', this.votes[p.sessionId] ? 'TRASHTALK_WAITING' : 'TRASHTALK_VOTE');
      }
      else if (this.gameState === 'RESULTS' || this.gameState === 'LEADERBOARD') {
          socket.emit('set_view', 'TRASHTALK_WAITING');
      }
  }
}