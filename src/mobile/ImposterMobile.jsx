import React, { useState, useEffect } from 'react';

export default function ImposterMobile({ socket, view, setView, playerName }) {
  const [roleData, setRoleData] = useState({ role: null, info: '' });
  const [players, setPlayers] = useState([]); // Lista fondamentale per il voto
  const [voted, setVoted] = useState(false);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    // 1. Chiedi lo stato del gioco
    socket.emit('imposter_sync');
    
    // 2. CRUCIALE: Chiedi la lista dei giocatori appena carichi il componente
    // Senza questo, la schermata di voto rimane vuota!
    socket.emit('host_request_update'); 

    // ASCOLTATORI
    socket.on('imposter_role_data', (data) => setRoleData(data));
    
    // Aggiorna la lista per i bottoni di voto
    socket.on('update_player_list', (list) => {
        console.log("Lista giocatori ricevuta su mobile:", list);
        setPlayers(list);
    });

    socket.on('imposter_game_over', (data) => setResultData(data));

    return () => {
        socket.off('imposter_role_data');
        socket.off('update_player_list');
        socket.off('imposter_game_over');
    };
  }, [socket]);

  const sendVote = (targetId) => {
      setVoted(true);
      socket.emit('imposter_vote', targetId);
  };

  // ==========================================
  // VISTE
  // ==========================================

  // 1. LOBBY (DESIGN ALLINEATO A LIAR'S BAR)
  if (view === 'IMPOSTER_LOBBY') {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              {/* ICONA CERCHIO PULSANTE */}
              <div className="text-8xl mb-6 bg-slate-800 rounded-full w-40 h-40 flex items-center justify-center border-4 border-purple-600 shadow-[0_0_30px_rgba(147,51,234,0.5)]">
                  🕵️‍♂️
              </div>
              
              {/* TITOLO GRADIENTE */}
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 mb-2 uppercase tracking-tighter">
                  IMPOSTORE
              </h1>
              
              {/* SOTTOTITOLO */}
              <p className="text-slate-400 text-lg mb-12 font-medium">
                  C'è una spia tra noi.<br/>Fidarsi è bene, non fidarsi è meglio.
              </p>
              
              {/* BADGE STATO */}
              <div className="bg-slate-800 px-8 py-4 rounded-full border border-slate-700 flex items-center gap-4 animate-pulse shadow-xl">
                  <div className="w-4 h-4 bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7]"></div>
                  <span className="text-slate-200 font-bold uppercase text-sm tracking-widest">In attesa dell'Host</span>
              </div>
          </div>
      );
  }

  // 2. RUOLO (Restyling)
  if (view === 'IMPOSTER_ROLE') {
      const isImposter = roleData.role === 'IMPOSTER';
      // Colori di sfondo drastici per far capire subito il ruolo
      const bgColor = isImposter ? 'bg-red-950' : 'bg-emerald-950';
      const accentColor = isImposter ? 'text-red-500' : 'text-emerald-400';
      const borderColor = isImposter ? 'border-red-600' : 'border-emerald-500';

      return (
          <div className={`min-h-screen ${bgColor} flex flex-col items-center justify-center p-6 text-center transition-colors duration-500`}>
              
              <div className="mb-4">
                  <span className={`text-xs font-black uppercase tracking-[0.3em] bg-black/30 px-4 py-2 rounded-full ${accentColor}`}>
                      IL TUO RUOLO
                  </span>
              </div>
              
              <h2 className={`text-4xl font-black text-white mb-8 uppercase tracking-tighter drop-shadow-lg`}>
                  {isImposter ? "SEI L'IMPOSTORE" : "SEI UN CIVILE"}
              </h2>
              
              {/* CARD RUOLO */}
              <div className={`w-full py-12 rounded-3xl border-4 ${borderColor} bg-slate-900/50 shadow-2xl mb-8 relative overflow-hidden`}>
                  {/* Etichetta in alto */}
                  <div className={`absolute top-0 left-0 right-0 h-2 ${isImposter ? 'bg-red-600' : 'bg-emerald-500'}`}></div>
                  
                  <p className="text-slate-400 text-xs uppercase font-bold mb-2">
                      {isImposter ? "La Categoria è" : "La Parola Segreta è"}
                  </p>
                  <span className="text-4xl font-black text-white uppercase tracking-wider block px-2 break-words">
                      {roleData.info}
                  </span>
              </div>

              <div className="bg-black/20 p-6 rounded-2xl text-sm text-slate-300 leading-relaxed border border-white/5">
                  {isImposter 
                    ? <span>Devi <b>fingere</b> di conoscere la parola specifica. Ascolta gli altri e cerca di capire qual è!</span> 
                    : <span>La tua parola appartiene a questa categoria. Trova chi sta mentendo!</span>}
              </div>
          </div>
      );
  }

  // 3. VOTAZIONE (Fix Lista Vuota)
  if (view === 'IMPOSTER_VOTE') {
      if (voted) {
          return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <div className="text-8xl mb-6 animate-bounce">🗳️</div>
                <h2 className="text-3xl font-black text-white mb-2 uppercase">Voto Inviato</h2>
                <p className="text-slate-400 font-bold">In attesa degli altri...</p>
            </div>
          );
      }

      return (
          <div className="min-h-screen bg-slate-900 flex flex-col p-6">
              <h1 className="text-3xl font-black text-white mb-2 text-center uppercase tracking-tighter">Vota l'Impostore</h1>
              <p className="text-center text-slate-400 text-sm mb-8 font-bold uppercase tracking-widest">Tocca per eliminare</p>
              
              {/* GRIGLIA VOTI */}
              <div className="grid grid-cols-2 gap-4 pb-10">
                  {players.length === 0 && (
                      <div className="col-span-2 text-center text-red-500 font-bold animate-pulse">
                          Caricamento lista giocatori...
                      </div>
                  )}

                  {players.filter(p => p.name !== playerName).map((p, i) => (
                      <button 
                        key={i}
                        onClick={() => sendVote(p.id)}
                        className="bg-slate-800 p-4 rounded-2xl border-2 border-slate-700 hover:border-red-500 hover:bg-red-900/20 active:scale-95 transition flex flex-col items-center shadow-lg relative group"
                      >
                          <div className="text-4xl mb-3 group-hover:scale-110 transition">{p.avatar}</div>
                          <div className="font-bold text-white truncate w-full text-center text-sm">{p.name}</div>
                      </button>
                  ))}
              </div>
          </div>
      );
  }

  // 4. GAME OVER
  if (view === 'GAME_OVER') {
      const isImposter = roleData.role === 'IMPOSTER';
      const imposterWon = resultData?.winner === 'IMPOSTER';
      const iWon = (isImposter && imposterWon) || (!isImposter && !imposterWon);

      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <h1 className="text-4xl font-black text-white mb-8 uppercase tracking-tighter">PARTITA TERMINATA</h1>
              
              <div className={`p-10 rounded-3xl border-4 mb-8 w-full shadow-2xl relative overflow-hidden ${iWon ? 'bg-green-900/40 border-green-500' : 'bg-red-900/40 border-red-500'}`}>
                   {/* Background Glow */}
                   <div className={`absolute inset-0 opacity-20 ${iWon ? 'bg-green-500' : 'bg-red-500'} blur-xl`}></div>
                   
                   <div className="relative z-10">
                       <div className="text-7xl mb-4">{iWon ? '🏆' : '💀'}</div>
                       <p className="text-3xl font-black text-white uppercase tracking-widest">{iWon ? 'VITTORIA' : 'SCONFITTA'}</p>
                   </div>
              </div>

              <div className="text-slate-400 font-medium">
                  L'impostore era <br/>
                  <span className="text-white font-black text-xl uppercase bg-slate-800 px-3 py-1 rounded mt-1 inline-block border border-slate-700">
                      {resultData?.imposterName}
                  </span>
              </div>
              
              <button 
                onClick={() => setView('IMPOSTER_LOBBY')}
                className="mt-12 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white transition"
              >
                  Torna alla Lobby
              </button>
          </div>
      );
  }

  return <div className="bg-slate-900 text-white h-screen flex items-center justify-center font-bold animate-pulse">Caricamento...</div>;
}