import React, { useState, useEffect } from 'react';

export default function CyberCityMobile({ socket, view, setView }) {
  const [board, setBoard] = useState([]);
  const [me, setMe] = useState(null);
  const [decision, setDecision] = useState(null);
  const [tradeData, setTradeData] = useState(null);
  const [tradeStep, setTradeStep] = useState(0); // 0=SelectPlayer, 1=Offer, 2=Request
  const [allPlayers, setAllPlayers] = useState([]);
  
  // Trade Temp State
  const [targetId, setTargetId] = useState(null);
  const [myOfferMoney, setMyOfferMoney] = useState(0);
  const [myOfferProps, setMyOfferProps] = useState([]);
  const [reqMoney, setReqMoney] = useState(0);
  const [reqProps, setReqProps] = useState([]);

  useEffect(() => {
      socket.emit('cyber_sync');

      socket.on('cyber_state', (data) => {
          setBoard(data.board);
          setAllPlayers(data.players);
          const myself = data.players.find(p => p.id === socket.id);
          setMe(myself);
      });

      socket.on('cyber_decision_data', setDecision);
      socket.on('cyber_trade_data', setTradeData);

      return () => {
          socket.off('cyber_state');
          socket.off('cyber_decision_data');
          socket.off('cyber_trade_data');
      }
  }, [socket]);

  // --- ACTIONS ---
  const roll = () => socket.emit('cyber_roll');
  const decide = (c) => { setDecision(null); socket.emit('cyber_decision', c); };
  const buyHouse = (tid) => socket.emit('cyber_buy_house', tid);
  
  const startTrade = () => {
      if(!targetId) return;
      socket.emit('cyber_trade_start', targetId);
      setTradeStep(1); // Vai all'offerta
  };
  
  const updateTrade = () => {
      socket.emit('cyber_trade_update', { type: 'OFFER', money: parseInt(myOfferMoney), props: myOfferProps });
      socket.emit('cyber_trade_update', { type: 'REQUEST', money: parseInt(reqMoney), props: reqProps });
      // Invia tutto insieme per semplicità
  };

  // --- VIEWS ---

  if (view === 'CYBER_ROLL') return (
      <div className="h-screen bg-black flex flex-col items-center justify-center">
          <button onClick={roll} className="w-64 h-64 bg-cyan-600 rounded-full shadow-[0_0_50px_cyan] text-4xl font-black text-white active:scale-95">TIRA DADI</button>
          <div className="mt-8 flex gap-4">
               <button onClick={() => setView('CYBER_MANAGE')} className="bg-gray-800 p-4 rounded-xl text-white font-bold">GESTISCI PROPRIETÀ</button>
               <button onClick={() => setView('CYBER_TRADE_INIT')} className="bg-purple-800 p-4 rounded-xl text-white font-bold">SCAMBIA</button>
          </div>
      </div>
  );

  if (view === 'CYBER_DECISION' && decision) {
      return (
          <div className="h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center text-center">
              <h1 className="text-yellow-400 font-bold mb-4">{decision.type === 'BUY' ? 'COMPRARE?' : 'POTENZIARE?'}</h1>
              <div className="text-3xl font-black mb-2">{decision.tile.name}</div>
              <div className="text-5xl text-green-400 font-mono mb-8">
                  {decision.type === 'BUY' ? decision.tile.price : decision.cost}$
              </div>
              <div className="flex w-full gap-4">
                  <button onClick={() => decide(false)} className="flex-1 bg-red-600 py-6 rounded-xl font-bold text-xl">NO</button>
                  <button onClick={() => decide(true)} className="flex-1 bg-green-600 py-6 rounded-xl font-bold text-xl">SÌ</button>
              </div>
          </div>
      );
  }

  // --- TRADE UI (Complessa) ---
  if (view === 'CYBER_TRADE_INIT') {
      return (
          <div className="h-screen bg-gray-900 text-white p-4">
              <h2 className="text-2xl font-bold mb-4">SELEZIONA GIOCATORE</h2>
              <div className="flex flex-col gap-2">
                  {allPlayers.filter(p => p.id !== socket.id).map(p => (
                      <button key={p.sessionId} onClick={() => { setTargetId(p.sessionId); startTrade(); }} className="bg-gray-800 p-4 rounded-xl flex justify-between items-center">
                          <span className="font-bold">{p.name}</span>
                          <span className="text-green-400">{p.money}$</span>
                      </button>
                  ))}
              </div>
              <button onClick={() => setView('CYBER_WAITING')} className="mt-8 w-full bg-red-900 py-3 rounded-xl">ANNULLA</button>
          </div>
      );
  }

  if (view === 'CYBER_TRADE_UI' && tradeData) {
      const isInitiator = tradeData.role === 'INITIATOR';
      return (
          <div className="h-screen bg-black text-white p-4 flex flex-col">
              <h1 className="text-center font-bold text-purple-400 mb-4">SCAMBIO IN CORSO</h1>
              
              <div className="flex-1 overflow-y-auto">
                  {/* SEZIONE OFFERTA (TUOI SOLDI/PROPRIETÀ) */}
                  <div className="bg-gray-900 p-4 rounded-xl mb-4">
                      <h3 className="text-green-400 font-bold mb-2">TU OFFRI:</h3>
                      {isInitiator ? (
                          <>
                              <input type="number" value={myOfferMoney} onChange={e => setMyOfferMoney(e.target.value)} className="w-full bg-black p-2 mb-2 border border-green-500" placeholder="Soldi" />
                              <div className="flex flex-wrap gap-2">
                                  {me.properties.map(pid => (
                                      <button key={pid} onClick={() => setMyOfferProps(curr => curr.includes(pid) ? curr.filter(x=>x!==pid) : [...curr, pid])}
                                          className={`px-2 py-1 text-xs border ${myOfferProps.includes(pid) ? 'bg-green-600' : 'bg-black'}`}>
                                          {board[pid].name}
                                      </button>
                                  ))}
                              </div>
                          </>
                      ) : (
                          <div className="text-sm">
                              <div>Soldi: {tradeData.trade.offer.money}$</div>
                              <div>Prop: {tradeData.trade.offer.props.map(id => board[id].name).join(', ')}</div>
                          </div>
                      )}
                  </div>

                  {/* SEZIONE RICHIESTA (SUOI SOLDI/PROPRIETÀ) */}
                  <div className="bg-gray-900 p-4 rounded-xl">
                      <h3 className="text-red-400 font-bold mb-2">TU CHIEDI:</h3>
                      {isInitiator ? (
                          <>
                              <input type="number" value={reqMoney} onChange={e => setReqMoney(e.target.value)} className="w-full bg-black p-2 mb-2 border border-red-500" placeholder="Soldi richiesti" />
                              {/* Lista proprietà dell'altro è complicata da ottenere qui senza passarla. Semplifichiamo: solo soldi per ora nella UI veloce, o bisognerebbe filtrare dal board */}
                          </>
                      ) : (
                          <div className="text-sm">
                              <div>Soldi: {tradeData.trade.request.money}$</div>
                          </div>
                      )}
                  </div>
              </div>

              {isInitiator && <button onClick={updateTrade} className="bg-blue-600 py-2 mb-2 rounded font-bold">AGGIORNA OFFERTA</button>}
              
              <div className="flex gap-2 h-16 mt-2">
                  <button onClick={() => socket.emit('cyber_trade_cancel')} className="flex-1 bg-red-600 rounded font-bold">ANNULLA</button>
                  {!isInitiator && <button onClick={() => socket.emit('cyber_trade_accept')} className="flex-1 bg-green-600 rounded font-bold">ACCETTA</button>}
              </div>
          </div>
      );
  }

  // --- GESTIONE PROPRIETÀ ---
  if (view === 'CYBER_MANAGE' && me) {
      return (
          <div className="h-screen bg-gray-900 text-white p-4 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">LE TUE PROPRIETÀ</h2>
              {me.properties.length === 0 && <p>Non possiedi nulla poveraccio.</p>}
              
              <div className="grid grid-cols-1 gap-3">
                  {me.properties.map(pid => {
                      const t = board[pid];
                      const canBuild = (me.money >= t.houseCost) && t.houses < 5; 
                      return (
                          <div key={pid} className="bg-black border-l-8 p-3 rounded flex justify-between items-center" style={{ borderLeftColor: t.color }}>
                              <div>
                                  <div className="font-bold">{t.name}</div>
                                  <div className="text-xs opacity-70">Case: {t.houses} | Affitto: {t.baseRent}$</div>
                              </div>
                              {t.type === 'PROP' && (
                                  <button disabled={!canBuild} onClick={() => buyHouse(pid)} className="bg-green-700 px-3 py-1 rounded text-xs font-bold disabled:opacity-30">
                                      + CASA ({t.houseCost}$)
                                  </button>
                              )}
                          </div>
                      )
                  })}
              </div>
              <button onClick={() => setView('CYBER_ROLL')} className="mt-8 w-full bg-blue-600 py-3 rounded-xl font-bold">TORNA AL GIOCO</button>
          </div>
      );
  }

  if (view === 'CYBER_WAITING') return <div className="h-screen bg-black flex items-center justify-center text-white text-xl">Attendi il tuo turno...</div>;

  return <div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
}