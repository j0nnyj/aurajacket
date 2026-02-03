import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ImposterMobile({ socket, view, setView, playerName }) {
  const [roleData, setRoleData] = useState({ role: null, info: '' });
  const [players, setPlayers] = useState([]); 
  const [voted, setVoted] = useState(false);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    socket.emit('imposter_sync');
    socket.emit('host_request_update'); 

    socket.on('imposter_role_data', (data) => {
        setRoleData(data);
        setVoted(false);
    });
    
    socket.on('update_player_list', (list) => {
        const safeList = list.map(p => ({...p, isAlive: p.isAlive !== undefined ? p.isAlive : true}));
        setPlayers(safeList);
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

  // --- 1. LOBBY ---
  if (view === 'IMPOSTER_LOBBY') {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-mono">
              <div className="w-24 h-24 border-2 border-gray-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <span className="text-4xl grayscale opacity-50">🔒</span>
              </div>
              <h1 className="text-xl font-bold text-gray-300 uppercase tracking-[0.2em] mb-2">Connessione Sicura</h1>
              <p className="text-green-600 text-xs uppercase tracking-widest">In attesa dell'Host...</p>
          </div>
      );
  }

  // --- 2. RUOLO ---
  if (view === 'IMPOSTER_ROLE') {
      const isImposter = roleData.role === 'IMPOSTER';
      const color = isImposter ? 'text-red-600' : 'text-cyan-500';
      const border = isImposter ? 'border-red-900' : 'border-cyan-900';

      return (
          <div className="min-h-screen bg-black flex flex-col p-6 font-mono relative overflow-hidden">
              {/* Scanlines */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px] pointer-events-none z-20 opacity-50"></div>
              
              <div className="flex-1 flex flex-col justify-center items-center relative z-10">
                  <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em] mb-4">Classificazione Identità</p>
                  
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`text-6xl mb-6 ${color}`}>
                      {isImposter ? '☠️' : '🛡️'}
                  </motion.div>

                  <h1 className={`text-5xl font-black uppercase mb-12 tracking-tighter ${color}`}>
                      {isImposter ? 'IMPOSTORE' : 'AGENTE'}
                  </h1>

                  <div className={`w-full border-t-2 border-b-2 ${border} bg-gray-900/50 p-8 mb-8 backdrop-blur-sm`}>
                      <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-2 text-center">
                          {isImposter ? "CATEGORIA BERSAGLIO" : "CODICE SEGRETO"}
                      </p>
                      <p className="text-3xl font-black text-white tracking-widest text-center break-words">
                          {roleData.info}
                      </p>
                  </div>

                  <p className="text-gray-600 text-xs uppercase tracking-widest max-w-xs text-center leading-relaxed">
                      {isImposter ? 'Nessuno conosce la tua identità. Mentire è la tua unica opzione.' : 'Proteggi la parola. Individua il traditore tra di voi.'}
                  </p>
              </div>
          </div>
      );
  }

  // --- 3. VOTING ---
  if (view === 'IMPOSTER_VOTE' || view === 'IMPOSTER_VOTING') {
      if (voted) {
          return (
              <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-mono">
                  <div className="text-6xl mb-6 animate-bounce">📨</div>
                  <h2 className="text-xl font-bold uppercase tracking-widest mb-2">Voto Trasmesso</h2>
                  <p className="text-gray-600 text-xs uppercase">Attendere il termine delle operazioni</p>
              </div>
          );
      }

      const targets = players.filter(p => p.name !== playerName && (p.isAlive !== false));

      return (
          <div className="min-h-screen bg-[#080808] flex flex-col font-mono">
              <div className="bg-red-900/20 border-b border-red-900 p-4 text-center shrink-0">
                  <h2 className="text-red-500 font-bold uppercase tracking-widest text-sm animate-pulse">Eliminazione Richiesta</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start pb-10">
                  {targets.map(p => (
                      <button 
                          key={p.id} 
                          onClick={() => sendVote(p.id)}
                          className="bg-[#111] border border-gray-800 p-4 flex flex-col items-center active:bg-red-900/50 active:border-red-600 transition-all h-32 justify-center rounded shadow-lg"
                      >
                          <div className="text-4xl mb-2 grayscale contrast-125">{p.avatar}</div>
                          <div className="text-gray-300 font-bold uppercase text-xs w-full truncate text-center tracking-wider">{p.name}</div>
                      </button>
                  ))}
              </div>
          </div>
      );
  }

  // --- 4. GAME OVER (NEW STYLE) ---
  if (view === 'GAME_OVER') {
      const isImposter = roleData.role === 'IMPOSTER';
      const imposterWon = resultData?.winner === 'IMPOSTER';
      const iWon = (isImposter && imposterWon) || (!isImposter && !imposterWon);
      
      const themeColor = iWon ? 'green' : 'red';
      const bgColor = iWon ? 'bg-green-950' : 'bg-red-950';

      return (
          <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center font-mono ${bgColor} relative overflow-hidden`}>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
              
              <div className="relative z-10 w-full max-w-sm border-t-4 border-b-4 border-white/20 py-10 bg-black/40 backdrop-blur-md">
                   <h1 className="text-7xl mb-4 drop-shadow-lg">{iWon ? '🏆' : '💀'}</h1>
                   <h2 className="text-4xl font-black text-white uppercase tracking-widest mb-2 drop-shadow-md">
                       {iWon ? 'VITTORIA' : 'SCONFITTA'}
                   </h2>
                   
                   <div className={`w-16 h-1 mx-auto my-6 bg-${themeColor}-500`}></div>

                   <p className="text-white/50 text-[10px] uppercase tracking-[0.3em] mb-2">Identità Nemico</p>
                   <p className="text-2xl font-black text-white uppercase tracking-wider">{resultData?.imposterName}</p>
              </div>
              
              <button 
                onClick={() => setView('IMPOSTER_LOBBY')}
                className="mt-12 text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white transition border-b border-transparent hover:border-white relative z-10"
              >
                  Torna allo Standby
              </button>
          </div>
      );
  }

  return <div className="bg-black text-white h-screen flex items-center justify-center font-bold animate-pulse tracking-widest text-xs">ESTABLISHING LINK...</div>;
}