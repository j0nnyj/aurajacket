import React, { useState, useEffect } from 'react';

export default function ImposterMobile({ socket, view, setView, playerName }) {
  const [myRole, setMyRole] = useState(null); 
  const [candidates, setCandidates] = useState([]); 
  const [gameResult, setGameResult] = useState(null);

  useEffect(() => {
    console.log("Sync Impostore...");
    socket.emit('imposter_sync');

    socket.on('imposter_role', (d) => setMyRole(d));
    socket.on('imposter_start_vote', (l) => setCandidates(l));
    
    socket.on('imposter_final_result', (status) => {
        setGameResult(status);
        setView('GAME_OVER');
    });

    return () => {
      socket.off('imposter_role');
      socket.off('imposter_start_vote');
      socket.off('imposter_final_result');
    };
  }, [socket, setView]);

  const submitVote = (candidateName) => {
    // INVIA IL NOME!
    socket.emit('imposter_submit_vote', candidateName);
    setView('IMPOSTER_WAITING'); 
  };

  // 0. RECONNECT
  if (view === 'IMPOSTER_RECONNECT') return <div className="bg-slate-900 h-screen text-white flex items-center justify-center animate-pulse text-2xl">♻️ Riprendo la partita...</div>;

  // 1. INFO
  if (view === 'IMPOSTER_INFO') {
     const isImposter = myRole?.role === 'IMPOSTORE';
     return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-700 ${isImposter ? 'bg-red-900' : 'bg-emerald-800'}`}>
          <div className="bg-black/20 px-4 py-1 rounded-full mb-4"><p className="text-white/80 text-xs font-bold uppercase">Il tuo ruolo</p></div>
          <h1 className="text-5xl font-black text-white mb-8 drop-shadow-xl">{myRole?.role}</h1>
          <div className="bg-white text-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm transform rotate-1 border-4 border-white/50">
            <p className="text-xs text-slate-500 uppercase font-black mb-2">Info Segreta</p>
            <h3 className="text-3xl font-black">{myRole?.secret}</h3>
          </div>
        </div>
      );
  }

  // 2. VOTE
  if (view === 'IMPOSTER_VOTE') {
      return (
        <div className="min-h-screen bg-slate-900 p-6 flex flex-col">
          <h1 className="text-white text-center text-3xl font-black mb-8 text-red-500">Chi è l'impostore?</h1>
          <div className="flex flex-col gap-3 pb-20 max-w-md mx-auto w-full">
            {candidates.map((c) => {
              // Disabilita se sei tu (controllo nome)
              const isMe = c.name === playerName;
              return (
                <button 
                  key={c.id}
                  disabled={isMe} 
                  // --- QUI È LA FIX: submitVote(c.name) ---
                  onClick={() => submitVote(c.name)} 
                  className={`p-5 rounded-2xl font-bold text-lg text-left shadow-lg transition-all flex justify-between items-center
                    ${isMe ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1'}`}
                >
                  <span>{c.name}</span>
                  {isMe && <span className="text-xs font-black bg-slate-700 text-slate-400 px-2 py-1 rounded uppercase">(Tu)</span>}
                </button>
              );
            })}
          </div>
        </div>
      );
  }

  // 3. WAITING
  if (view === 'IMPOSTER_WAITING') return <div className="bg-slate-900 h-screen text-white flex items-center justify-center flex-col"><div className="text-6xl animate-pulse mb-4">🗳️</div><p>Voto inviato...</p></div>;

  // 4. GAME OVER
  if (view === 'GAME_OVER') {
      if (!gameResult) return <div className="bg-slate-900 h-screen text-white flex items-center justify-center">Calcolo risultati...</div>;
      const isWin = gameResult === 'WIN';
      return (
          <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in ${isWin ? 'bg-emerald-600' : 'bg-rose-700'}`}>
              <h1 className="text-6xl font-black text-white mb-6 drop-shadow-xl">{isWin ? "VITTORIA!" : "SCONFITTA"}</h1>
              <div className="text-9xl mb-10 drop-shadow-2xl">{isWin ? "🏆" : "💀"}</div>
              <p className="text-white font-bold text-xl">{isWin ? "Complimenti!" : "Peccato..."}</p>
              <p className="mt-12 text-white/60 text-sm font-bold animate-pulse uppercase">Guarda la TV</p>
          </div>
      );
  }
  
  return <div className="text-white p-10 text-center">Caricamento gioco...</div>;
}