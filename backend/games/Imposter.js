export class ImposterGame {
  constructor(io) {
    this.io = io;
    this.players = []; 
    
    // STATO
    this.imposterName = null; // Unica verità
    this.currentRound = null; 
    this.currentPhase = 'LOBBY'; 
    
    // TRACCIAMENTO
    this.votesCounts = {}; // { "Mario": 2 }
    this.votersNames = []; // ["Luigi", "Marco"] (Chi ha votato)
    this.lastResultStatus = {}; 
    
    this.wordsDatabase = [
      { word: "Piramidi", hint: "Antico Egitto" },
      { word: "Ferrari", hint: "Macchina veloce rossa" },
      { word: "Smartphone", hint: "Oggetto sempre in tasca" },
      { word: "Pizza", hint: "Cibo italiano rotondo" },
      { word: "Batman", hint: "Supereroe ricco pipistrello" },
      { word: "Minecraft", hint: "Gioco a cubetti" },
      { word: "YouTube", hint: "Sito video rossi" },
      { word: "Coca Cola", hint: "Bevanda nera frizzante" }
    ];
  }

  initGame(currentPlayers) {
    this.players = currentPlayers;
    this.currentPhase = 'LOBBY';
  }

  setupListeners(socket, getLatestPlayers) {
    
    socket.on('imposter_start', () => {
        if(getLatestPlayers) this.players = getLatestPlayers();
        this.startGame();
    });

    // --- SYNC ---
    socket.on('imposter_sync', () => {
        let freshPlayers = getLatestPlayers ? getLatestPlayers() : this.players;
        const player = freshPlayers.find(p => p.id === socket.id);
        
        if (!player || !this.currentRound || this.currentPhase === 'LOBBY') return;

        console.log(`♻️ SYNC: ${player.name} chiede ripristino.`);

        const isImposter = (player.name === this.imposterName);

        // 1. Ruolo
        this.io.to(player.id).emit('imposter_role', { 
            role: isImposter ? "IMPOSTORE" : "CIVILE", 
            secret: isImposter ? this.currentRound.hint : this.currentRound.word 
        });

        // 2. Fase
        switch (this.currentPhase) {
            case 'INFO':
                this.io.to(player.id).emit('set_view', 'IMPOSTER_INFO');
                break;
            case 'VOTING':
                const publicList = this.players.map(p => ({ id: p.id, name: p.name }));
                this.io.to(player.id).emit('imposter_start_vote', publicList);
                
                // Controllo se QUESTO nome ha già votato
                if (this.votersNames.includes(player.name)) {
                    this.io.to(player.id).emit('set_view', 'IMPOSTER_WAITING');
                } else {
                    this.io.to(player.id).emit('set_view', 'IMPOSTER_VOTE');
                }
                break;
            case 'RESULT':
                const status = this.lastResultStatus[player.name];
                if (status) {
                    this.io.to(player.id).emit('imposter_final_result', status);
                    this.io.to(player.id).emit('set_view', 'GAME_OVER');
                }
                break;
        }
    });

    socket.on('imposter_start_voting', () => {
        this.currentPhase = 'VOTING'; 
        this.votesCounts = {}; 
        this.votersNames = []; 
        
        const publicList = this.players.map(p => ({ id: p.id, name: p.name }));
        this.io.emit('imposter_start_vote', publicList);
        this.io.emit('set_view', 'IMPOSTER_VOTE');
    });

    // --- VOTO BASATO SUL NOME ---
    socket.on('imposter_submit_vote', (votedName) => {
        if (!votedName) return;

        let freshPlayers = getLatestPlayers ? getLatestPlayers() : this.players;
        const voter = freshPlayers.find(p => p.id === socket.id);
        
        // Se non trovo chi vota o ha già votato
        if (!voter || this.votersNames.includes(voter.name)) return;

        this.votersNames.push(voter.name); // Segno che "Mario" ha votato

        // Salvo il voto usando il NOME come chiave
        if (!this.votesCounts[votedName]) this.votesCounts[votedName] = 0;
        this.votesCounts[votedName]++;

        const totalVotes = Object.values(this.votesCounts).reduce((a, b) => a + b, 0);
        this.io.emit('update_votes_count', totalVotes);
        
        console.log(`📩 Voto: ${voter.name} -> ${votedName}`);
    });

    // --- RIVELAZIONE BASATA SUL NOME ---
    socket.on('imposter_reveal', () => {
        this.currentPhase = 'RESULT'; 
        
        let maxVotedName = "Nessuno";
        let maxVotes = -1;
        
        // Trovo il NOME più votato
        for (const [name, count] of Object.entries(this.votesCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                maxVotedName = name;
            }
        }
        
        // Controllo vittoria: STRINGA vs STRINGA
        const isCaught = (maxVotedName === this.imposterName);
        
        console.log(`🔎 REVEAL: Votato=[${maxVotedName}] vs Impostore=[${this.imposterName}] -> Preso? ${isCaught}`);

        this.io.emit('imposter_result', { name: maxVotedName, votes: maxVotes });

        let freshPlayers = getLatestPlayers ? getLatestPlayers() : this.players;

        freshPlayers.forEach(p => {
            const isImposterPlayer = (p.name === this.imposterName);
            
            let resultStatus = isCaught 
                ? (isImposterPlayer ? 'LOSE' : 'WIN') 
                : (isImposterPlayer ? 'WIN' : 'LOSE');
            
            this.lastResultStatus[p.name] = resultStatus;
            this.io.to(p.id).emit('imposter_final_result', resultStatus);
        });
    });

    socket.on('imposter_play_again', () => {
        this.currentPhase = 'LOBBY';
        this.lastResultStatus = {};
        this.votersNames = [];
        this.votesCounts = {};
        this.io.emit('set_view', 'WAITING');
    });
  }

  startGame() {
    this.currentPhase = 'INFO';
    this.votesCounts = {}; 
    this.votersNames = [];
    this.lastResultStatus = {};

    this.currentRound = this.wordsDatabase[Math.floor(Math.random() * this.wordsDatabase.length)];
    const imposterIndex = Math.floor(Math.random() * this.players.length);
    const imposterPlayer = this.players[imposterIndex];

    this.imposterName = imposterPlayer.name; 

    console.log(`🏁 Start. Impostore: ${this.imposterName}`);

    this.players.forEach((player, index) => {
      const isImposter = (player.name === this.imposterName);
      this.io.to(player.id).emit('imposter_role', { 
        role: isImposter ? "IMPOSTORE" : "CIVILE", 
        secret: isImposter ? this.currentRound.hint : this.currentRound.word 
      });
      this.io.to(player.id).emit('set_view', 'IMPOSTER_INFO');
    });
  }
}