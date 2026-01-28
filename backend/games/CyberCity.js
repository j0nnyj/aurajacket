export class CyberCityGame {
  constructor(io) {
    this.io = io;
    this.players = [];
    this.gameState = 'LOBBY';
    this.board = [];
    this.turnIndex = 0;
    this.doublesCount = 0;
    this.activeTrade = null; // { initiatorId, targetId, offer: {}, request: {} }
    this.lastDice = [0, 0];
    this.generateBoard();
  }

  generateBoard() {
    // Generazione 40 caselle (Standard Monopoly Layout)
    this.board = Array(40).fill(null);

    // ANGOLI
    this.board[0] = { type: 'START', name: "VIA" };
    this.board[10] = { type: 'JAIL', name: "PRIGIONE", prisoners: [] };
    this.board[20] = { type: 'PARKING', name: "PARCHEGGIO" };
    this.board[30] = { type: 'GO_JAIL', name: "IN PRIGIONE!" };

    // DEFINIZIONE GRUPPI (Colore, PrezzoBase, AffittoBase, CostoCasa)
    // Affitto case: x5, x15, x45, x80, x100 (approssimato)
    const groups = [
        { c: '#8B4513', p: 60, r: 2, h: 50 },    // Marrone (Vicolo Corto)
        { c: '#87CEEB', p: 100, r: 6, h: 50 },   // Azzurro
        { c: '#FF00FF', p: 140, r: 10, h: 100 }, // Rosa
        { c: '#FFA500', p: 180, r: 14, h: 100 }, // Arancione
        { c: '#FF0000', p: 220, r: 18, h: 150 }, // Rosso
        { c: '#FFFF00', p: 260, r: 22, h: 150 }, // Giallo
        { c: '#008000', p: 300, r: 26, h: 200 }, // Verde
        { c: '#0000FF', p: 350, r: 35, h: 200 }  // Blu (Parco Vittoria)
    ];

    // Helper per creare proprietà
    const addProp = (idx, name, gIdx) => {
        const g = groups[gIdx];
        this.board[idx] = {
            id: idx, type: 'PROP', name, color: g.c, group: gIdx,
            price: g.p, baseRent: g.r, houseCost: g.h,
            ownerId: null, houses: 0 // 0-4 case, 5 = Hotel
        };
    };

    const addStation = (idx, name) => {
        this.board[idx] = { id: idx, type: 'STATION', name, price: 200, ownerId: null };
    };

    const addUtil = (idx, name) => {
        this.board[idx] = { id: idx, type: 'UTIL', name, price: 150, ownerId: null };
    };

    const addTax = (idx, name, amount) => {
        this.board[idx] = { type: 'TAX', name, amount };
    };

    const addChance = (idx, name) => { this.board[idx] = { type: 'CHANCE', name }; };

    // LATO 1 (Bottom)
    addProp(1, "Vicolo Corto", 0);
    addChance(2, "Probabilità");
    addProp(3, "Vicolo Stretto", 0);
    addTax(4, "Tassa Patrimoniale", 200);
    addStation(5, "Stazione Sud");
    addProp(6, "Bastioni Gran Sasso", 1);
    addChance(7, "Imprevisti");
    addProp(8, "Viale Monterosa", 1);
    addProp(9, "Viale Vesuvio", 1);

    // LATO 2 (Left)
    addProp(11, "Via Accademia", 2);
    addUtil(12, "Società Elettrica");
    addProp(13, "Corso Ateneo", 2);
    addProp(14, "Piazza Università", 2);
    addStation(15, "Stazione Ovest");
    addProp(16, "Via Verdi", 3);
    addChance(17, "Probabilità");
    addProp(18, "Corso Raffaello", 3);
    addProp(19, "Piazza Dante", 3);

    // LATO 3 (Top)
    addProp(21, "Via Marco Polo", 4);
    addChance(22, "Imprevisti");
    addProp(23, "Corso Magellano", 4);
    addProp(24, "Largo Colombo", 4);
    addStation(25, "Stazione Nord");
    addProp(26, "Viale Costantino", 5);
    addProp(27, "Viale Traiano", 5);
    addUtil(28, "Società Acqua");
    addProp(29, "Piazza Giulio Cesare", 5);

    // LATO 4 (Right)
    addProp(31, "Via Roma", 6);
    addProp(32, "Corso Impero", 6);
    addChance(33, "Probabilità");
    addProp(34, "Largo Augusto", 6);
    addStation(35, "Stazione Est");
    addChance(36, "Imprevisti");
    addProp(37, "Viale dei Giardini", 7);
    addTax(38, "Tassa di Lusso", 100);
    addProp(39, "Parco della Vittoria", 7);
  }

  initGame(players) {
    this.players = players.map(p => ({
        ...p, money: 1500, position: 0, color: this.getHexColor(p.sessionId),
        isJailed: false, jailTurns: 0, bankrupt: false,
        properties: [] // Lista ID proprietà possedute
    }));
    this.gameState = 'PLAYING';
    this.turnIndex = 0;
    this.doublesCount = 0;
    this.lastDice = [0, 0];
    this.generateBoard();
    this.notifyTurn();
  }

  getHexColor(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
      const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
      return "#" + "00000".substring(0, 6 - c.length) + c;
  }

  // --- LOGICA GIOCO ---

  handleRoll(socketId) {
    const p = this.players[this.turnIndex];
    if (p.id !== socketId || this.pendingDecision || this.activeTrade) return;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    this.lastDice = [d1, d2];
    
    // Gestione doppi
    if (d1 === d2) this.doublesCount++;
    else this.doublesCount = 0;

    if (this.doublesCount >= 3) {
        this.goToJail(p);
        return;
    }

    // Movimento
    if (p.isJailed) {
        if (d1 === d2) {
            p.isJailed = false;
            p.jailTurns = 0;
            this.movePlayer(p, d1 + d2);
        } else {
            p.jailTurns++;
            if(p.jailTurns >= 3) {
                p.money -= 50;
                p.isJailed = false;
                this.movePlayer(p, d1 + d2);
            } else {
                this.io.emit('cyber_log', `${p.name} resta in prigione.`);
                this.nextTurn();
            }
        }
    } else {
        this.movePlayer(p, d1 + d2);
    }
  }

  movePlayer(p, steps) {
      const oldPos = p.position;
      p.position = (p.position + steps) % 40;
      
      if (p.position < oldPos) {
          p.money += 200; // VIA
          this.io.emit('cyber_log', `${p.name} passa dal VIA (+200$)`);
      }
      
      this.emitState();
      setTimeout(() => this.evaluateTile(p), 1000);
  }

  evaluateTile(p) {
      const tile = this.board[p.position];

      if (tile.type === 'GO_JAIL') { this.goToJail(p); return; }
      if (tile.type === 'TAX') {
          p.money -= tile.amount;
          this.io.emit('cyber_log', `${p.name} paga ${tile.amount}$ di tasse.`);
          this.endMove(p);
      }
      else if (tile.ownerId === null && (tile.type === 'PROP' || tile.type === 'STATION' || tile.type === 'UTIL')) {
          if (p.money >= tile.price) {
            this.pendingDecision = { type: 'BUY', tile };
            this.syncSinglePlayer(this.io.sockets.sockets.get(p.id), p);
          } else {
            this.endMove(p);
          }
      }
      else if (tile.ownerId && tile.ownerId !== p.sessionId) {
          const owner = this.players.find(x => x.sessionId === tile.ownerId);
          if (owner && !owner.isJailed) {
              const rent = this.calculateRent(tile);
              p.money -= rent;
              owner.money += rent;
              this.io.emit('cyber_log', `${p.name} paga ${rent}$ a ${owner.name}`);
          }
          this.endMove(p);
      }
      else {
          this.endMove(p);
      }
  }

  calculateRent(tile) {
      if (tile.type === 'STATION') {
          const ownerProps = this.board.filter(t => t.ownerId === tile.ownerId && t.type === 'STATION');
          return 25 * Math.pow(2, ownerProps.length - 1);
      }
      if (tile.type === 'UTIL') {
          const count = this.board.filter(t => t.ownerId === tile.ownerId && t.type === 'UTIL').length;
          const diceSum = this.lastDice[0] + this.lastDice[1];
          return count === 2 ? diceSum * 10 : diceSum * 4;
      }
      if (tile.type === 'PROP') {
          // Logica affitto con case (moltiplicatori standard monopoli)
          const m = [1, 5, 15, 45, 80, 100]; 
          let rent = tile.baseRent * m[tile.houses];
          // Se non ci sono case ma ha tutto il gruppo -> Raddoppia
          if (tile.houses === 0 && this.hasMonopoly(tile.group, tile.ownerId)) {
              rent *= 2;
          }
          return rent;
      }
      return 0;
  }

  hasMonopoly(group, ownerId) {
      const groupTiles = this.board.filter(t => t && t.group === group);
      return groupTiles.every(t => t.ownerId === ownerId);
  }

  handleDecision(socketId, choice) {
      const p = this.players[this.turnIndex];
      if (p.id !== socketId || !this.pendingDecision) return;
      
      if (choice) {
          const t = this.board[this.pendingDecision.tile.id];
          p.money -= t.price;
          t.ownerId = p.sessionId;
          p.properties.push(t.id);
          this.io.emit('cyber_log', `${p.name} compra ${t.name}`);
      }
      this.pendingDecision = null;
      this.endMove(p);
  }

  handleBuyHouse(socketId, tileId) {
      const p = this.players.find(x => x.id === socketId);
      const tile = this.board[tileId];
      
      // Controlli: è suo? è property? ha il monopolio? ha soldi? non ha hotel?
      if (!p || tile.ownerId !== p.sessionId || tile.type !== 'PROP' || tile.houses >= 5) return;
      if (!this.hasMonopoly(tile.group, p.sessionId)) {
          this.io.to(p.id).emit('cyber_error', "Ti serve il gruppo completo!");
          return;
      }
      if (p.money < tile.houseCost) return;

      p.money -= tile.houseCost;
      tile.houses++;
      this.emitState();
      this.io.emit('cyber_log', `${p.name} costruisce su ${tile.name}`);
  }

  // --- SISTEMA SCAMBI (TRADING) ---
  
  initiateTrade(initiatorSocketId, targetSessionId) {
      const p1 = this.players.find(p => p.id === initiatorSocketId);
      const p2 = this.players.find(p => p.sessionId === targetSessionId);
      if(!p1 || !p2 || p1.sessionId === p2.sessionId) return;

      this.activeTrade = {
          p1: p1.sessionId,
          p2: p2.sessionId,
          offer: { money: 0, props: [] },
          request: { money: 0, props: [] },
          status: 'PENDING'
      };
      
      this.updateTradeViews();
  }

  updateTradeOffer(socketId, data) { 
      // data = { type: 'OFFER'|'REQUEST', money: 100, props: [id, id] }
      if (!this.activeTrade) return;
      
      // Solo chi ha iniziato lo scambio può modificare l'offerta per ora (semplifichiamo)
      // O facciamo che ognuno modifica la sua parte.
      const p = this.players.find(x => x.id === socketId);
      if (p.sessionId === this.activeTrade.p1) {
          if (data.type === 'OFFER') this.activeTrade.offer = data;
          if (data.type === 'REQUEST') this.activeTrade.request = data;
      }
      this.updateTradeViews();
  }

  acceptTrade(socketId) {
      const p = this.players.find(x => x.id === socketId);
      if (!this.activeTrade || p.sessionId !== this.activeTrade.p2) return;

      // ESEGUI SCAMBIO
      const p1 = this.players.find(x => x.sessionId === this.activeTrade.p1);
      const p2 = this.players.find(x => x.sessionId === this.activeTrade.p2);

      // Sposta soldi
      p1.money -= this.activeTrade.offer.money;
      p2.money += this.activeTrade.offer.money;
      p2.money -= this.activeTrade.request.money;
      p1.money += this.activeTrade.request.money;

      // Sposta proprietà (Offer: P1 -> P2)
      this.activeTrade.offer.props.forEach(tid => {
          this.board[tid].ownerId = p2.sessionId;
          p1.properties = p1.properties.filter(x => x !== tid);
          p2.properties.push(tid);
      });

      // Sposta proprietà (Request: P2 -> P1)
      this.activeTrade.request.props.forEach(tid => {
          this.board[tid].ownerId = p1.sessionId;
          p2.properties = p2.properties.filter(x => x !== tid);
          p1.properties.push(tid);
      });

      this.io.emit('cyber_log', `Scambio completato tra ${p1.name} e ${p2.name}`);
      this.cancelTrade();
      this.emitState();
  }

  cancelTrade() {
      this.activeTrade = null;
      this.players.forEach(p => {
          if (p.id === this.players[this.turnIndex].id) this.io.to(p.id).emit('set_view', 'CYBER_ROLL');
          else this.io.to(p.id).emit('set_view', 'CYBER_WAITING');
      });
  }

  updateTradeViews() {
      const p1 = this.players.find(p => p.sessionId === this.activeTrade.p1);
      const p2 = this.players.find(p => p.sessionId === this.activeTrade.p2);
      
      // Manda view specifica ai due coinvolti
      this.io.to(p1.id).emit('set_view', 'CYBER_TRADE_UI');
      this.io.to(p1.id).emit('cyber_trade_data', { role: 'INITIATOR', trade: this.activeTrade });
      
      this.io.to(p2.id).emit('set_view', 'CYBER_TRADE_UI');
      this.io.to(p2.id).emit('cyber_trade_data', { role: 'TARGET', trade: this.activeTrade });
  }

  // --- FINE TURNO ---
  endMove(p) {
      if (this.lastDice[0] === this.lastDice[1] && !p.isJailed) {
          this.io.emit('cyber_log', "Doppio! Tira ancora.");
          this.io.to(p.id).emit('set_view', 'CYBER_ROLL');
      } else {
          this.nextTurn();
      }
      this.emitState();
  }

  goToJail(p) {
      p.position = 10;
      p.isJailed = true;
      p.jailTurns = 0;
      this.doublesCount = 0;
      this.io.emit('cyber_log', `${p.name} va in prigione!`);
      this.emitState();
      this.nextTurn();
  }

  nextTurn() {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
      this.notifyTurn();
  }

  notifyTurn() {
      const activeP = this.players[this.turnIndex];
      this.players.forEach(p => {
          if(this.activeTrade && (p.sessionId === this.activeTrade.p1 || p.sessionId === this.activeTrade.p2)) {
               // Stanno scambiando, non cambiare view
          } else if (p.id === activeP.id) {
              this.io.to(p.id).emit('set_view', 'CYBER_ROLL');
          } else {
              this.io.to(p.id).emit('set_view', 'CYBER_WAITING');
          }
      });
  }

  emitState() {
      this.io.emit('cyber_state', {
          board: this.board,
          players: this.players,
          turnIndex: this.turnIndex,
          lastDice: this.lastDice
      });
  }

  syncSinglePlayer(socket, player) {
      const p = this.players.find(x => x.sessionId === player.sessionId);
      if(p) p.id = socket.id;

      if(this.activeTrade && (p.sessionId === this.activeTrade.p1 || p.sessionId === this.activeTrade.p2)) {
          this.updateTradeViews();
      } else if (this.players[this.turnIndex].id === socket.id) {
          if (this.pendingDecision) {
              socket.emit('set_view', 'CYBER_DECISION');
              socket.emit('cyber_decision_data', this.pendingDecision);
          } else {
              socket.emit('set_view', 'CYBER_ROLL');
          }
      } else {
          socket.emit('set_view', 'CYBER_WAITING');
      }
      this.emitState();
  }

  // LISTENER RICHIESTI
  setupListeners(socket) {
      socket.on('cyber_roll', () => this.handleRoll(socket.id));
      socket.on('cyber_decision', (c) => this.handleDecision(socket.id, c));
      
      // Trading events
      socket.on('cyber_trade_start', (targetId) => this.initiateTrade(socket.id, targetId));
      socket.on('cyber_trade_update', (data) => this.updateTradeOffer(socket.id, data));
      socket.on('cyber_trade_accept', () => this.acceptTrade(socket.id));
      socket.on('cyber_trade_cancel', () => this.cancelTrade());
      
      // Housing
      socket.on('cyber_buy_house', (tileId) => this.handleBuyHouse(socket.id, tileId));
      
      socket.on('cyber_sync', () => {
          const p = this.players.find(x => x.id === socket.id);
          if (p) this.syncSinglePlayer(socket, p);
      });
  }
}