import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImposterGame({ socket }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('LOBBY'); 
  const [players, setPlayers] = useState([]);
  const [votes, setVotes] = useState({});
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    socket.emit('request_server_info');
    socket.emit('host_request_update');

    socket.on('update_player_list', (list) => setPlayers(list));
    
    socket.on('imposter_game_started', () => {
        setResultData(null);
        setVotes({});
        setPhase('GAME');
    });
    
    socket.on('imposter_reset_ui', () => {
        setResultData(null);
        setVotes({});
        setPhase('GAME');
    });

    socket.on('imposter_voting_started', () => {
        setPhase('VOTING');
        setVotes({});
    });

    socket.on('imposter_vote_update', (updatedVotes) => setVotes(updatedVotes));

    socket.on('imposter_game_over', (data) => {
        setResultData(data);
        setPhase('GAME_OVER');
    });

    return () => {
        socket.off('update_player_list');
        socket.off('imposter_game_started');
        socket.off('imposter_reset_ui');
        socket.off('imposter_voting_started');
        socket.off('imposter_vote_update');
        socket.off('imposter_game_over');
    };
  }, [socket]);

  const startGame = () => {
    if (players.length < 3) { alert("Servono almeno 3 giocatori!"); return; }
    socket.emit('imposter_start');
  };

  const startVoting = () => socket.emit('imposter_force_voting');
  const playAgain = () => socket.emit('imposter_play_again');
  const exitGame = () => { socket.emit('host_back_to_menu'); navigate('/host'); };

  // --- 1. LOBBY VIEW ---
  if (phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-10 font-mono relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-30"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600 shadow-[0_0_20px_red]"></div>
        
        <h1 className="text-9xl font-black mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-gray-100 to-gray-600 drop-shadow-2xl z-10">
            IMPOSTER
        </h1>
        <p className="text-red-600 font-bold uppercase tracking-[0.5em] mb-12 animate-pulse z-10 border border-red-900/50 px-4 py-1 rounded bg-red-950/20">
            Protocollo Avviato
        </p>

        <div className="flex flex-wrap justify-center gap-6 w-full max-w-6xl mb-12 z-10">
            {players.map((p, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-[#111] border border-gray-800 p-6 flex flex-col items-center gap-2 shadow-lg min-w-[150px]">
                    <div className="text-5xl grayscale brightness-75">{p.avatar}</div>
                    <div className="font-bold uppercase text-gray-300 tracking-wider text-sm">{p.name}</div>
                    <div className="w-full h-1 bg-green-600 mt-2 shadow-[0_0_5px_green]"></div>
                </motion.div>
            ))}
            {players.length === 0 && <div className="text-gray-600 italic tracking-widest animate-pulse">In attesa di connessioni...</div>}
        </div>

        <div className="flex gap-6 z-10">
            <button onClick={exitGame} className="px-8 py-4 border border-gray-700 text-gray-500 hover:text-white hover:border-white uppercase tracking-widest font-bold transition-all text-sm">Esci</button>
            <button onClick={startGame} disabled={players.length < 3} className="px-16 py-5 bg-red-800 hover:bg-red-600 text-white font-black text-xl uppercase tracking-widest shadow-[0_0_30px_rgba(185,28,28,0.4)] transition-all disabled:opacity-30 disabled:shadow-none hover:scale-105 clip-path-slant">
                AVVIA MISSIONE
            </button>
        </div>
      </div>
    );
  }

  // --- 2. GAME VIEW ---
  if (phase === 'GAME') {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden font-mono">
            <div className="absolute inset-0 bg-red-900/5 animate-pulse"></div>
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
            
            <h2 className="text-5xl font-black uppercase tracking-[0.2em] mb-12 z-10 text-gray-300">BRIEFING IN CORSO</h2>
            
            <div className="relative w-64 h-64 flex items-center justify-center mb-16 z-10">
                <div className="absolute inset-0 border-2 border-gray-800 rounded-full"></div>
                <div className="absolute inset-0 border-t-4 border-red-600 rounded-full animate-spin"></div>
                <div className="text-8xl relative z-20 animate-pulse">🕵️</div>
            </div>

            <p className="text-xl max-w-3xl text-center text-gray-400 mb-16 z-10 leading-relaxed px-8">
                C'è un infiltrato tra di voi.<br/>
                Interrogate i sospettati. Identificate la minaccia.<br/>
                <span className="text-red-500 font-bold block mt-4">NON FIDATEVI DI NESSUNO.</span>
            </p>

            <button onClick={startVoting} className="px-16 py-6 bg-red-700 text-white text-2xl font-black uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(220,38,38,0.5)] hover:bg-red-600 hover:scale-105 transition-all z-10">
                VOTAZIONE D'EMERGENZA
            </button>
        </div>
      );
  }

  // --- 3. VOTING VIEW ---
  if (phase === 'VOTING') {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative font-mono">
            <div className="absolute top-0 w-full bg-red-600 text-black font-black text-center py-2 uppercase tracking-[0.5em] text-sm animate-pulse shadow-lg">ALLARME: PROCEDURA DI VOTO ATTIVA</div>
            <h2 className="text-6xl font-black uppercase mb-16 mt-10 text-gray-200">CHI È IL SOSPETTO?</h2>
            
            <div className="flex flex-wrap justify-center gap-8 w-full max-w-7xl px-10">
                {players.map((p, i) => {
                    const count = Object.values(votes).filter(id => id === p.id).length;
                    return (
                        <div key={p.id} className="bg-[#111] border border-gray-800 p-6 flex flex-col items-center relative min-w-[160px] shadow-xl">
                            <div className="text-7xl mb-4 grayscale contrast-125 drop-shadow-md">{p.avatar}</div>
                            <div className="text-xl font-bold uppercase tracking-wider text-gray-400">{p.name}</div>
                            {count > 0 && (
                                <div className="absolute -top-4 -right-4 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center font-black text-xl shadow-[0_0_20px_red] animate-bounce z-20 border-2 border-white">
                                    {count}
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800"></div>
                            {count > 0 && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600 shadow-[0_0_10px_red]"></div>}
                        </div>
                    );
                })}
            </div>
            <div className="mt-16 flex items-center gap-4 text-gray-500 font-mono text-sm uppercase tracking-widest">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span> In attesa dei voti...
            </div>
        </div>
      );
  }

  // --- 4. GAME OVER VIEW (NEW TACTICAL STYLE) ---
  if (phase === 'GAME_OVER') {
      const imposterWins = resultData?.winner === 'IMPOSTER';
      const themeColor = imposterWins ? 'red' : 'cyan';
      const bgColor = imposterWins ? 'bg-red-950' : 'bg-cyan-950';
      const textColor = imposterWins ? 'text-red-500' : 'text-cyan-400';
      const borderColor = imposterWins ? 'border-red-600' : 'border-cyan-600';

      return (
          <div className={`h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-mono transition-colors duration-1000 bg-black`}>
              {/* Background FX */}
              <div className={`absolute inset-0 ${bgColor} opacity-20`}></div>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-40 mix-blend-overlay"></div>
              <div className={`absolute -bottom-1/2 left-1/2 -translate-x-1/2 w-[100vw] h-[100vw] ${imposterWins ? 'bg-red-600' : 'bg-cyan-500'} blur-[200px] opacity-20 pointer-events-none`}></div>

              {/* MAIN CONTENT */}
              <div className="z-10 text-center animate-fade-in-up w-full max-w-6xl">
                  
                  {/* TITLE */}
                  <h1 className={`text-9xl font-black uppercase mb-2 tracking-tighter drop-shadow-[0_0_25px_rgba(0,0,0,0.8)] ${textColor}`}>
                      {imposterWins ? 'IMPOSTOR WINS' : 'AGENTS WIN'}
                  </h1>
                  <p className="text-white/50 text-xl uppercase tracking-[0.5em] mb-12 font-bold">
                      {imposterWins ? 'MISSION FAILED' : 'MISSION ACCOMPLISHED'}
                  </p>
                  
                  {/* DATA GRID */}
                  <div className="grid grid-cols-3 gap-8 mb-16 items-stretch">
                      
                      {/* 1. THE IMPOSTOR */}
                      <div className={`bg-black/60 border-t-4 ${borderColor} p-8 relative overflow-hidden group shadow-2xl`}>
                          <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-black uppercase bg-${themeColor}-600 text-black`}>Target</div>
                          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">Identità Nemico</p>
                          <div className="text-8xl mb-4 group-hover:scale-110 transition-transform duration-300">{resultData?.imposterAvatar || '👺'}</div>
                          <p className="text-4xl font-black text-white uppercase">{resultData?.imposterName}</p>
                      </div>

                      {/* 2. THE SECRET WORD */}
                      <div className="bg-black/60 border-t-4 border-yellow-500 p-8 flex flex-col justify-center relative shadow-2xl">
                          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Codice Segreto</p>
                          <div className="text-5xl font-mono font-bold text-yellow-400 tracking-wider break-all drop-shadow-md">
                              {resultData?.secretWord}
                          </div>
                          <p className="text-gray-600 text-xs uppercase mt-2">{resultData?.category}</p>
                      </div>

                      {/* 3. ELIMINATED */}
                      <div className="bg-black/60 border-t-4 border-gray-600 p-8 flex flex-col justify-center relative shadow-2xl">
                          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Stato Eliminazione</p>
                          <p className={`text-3xl font-bold uppercase ${resultData?.eliminatedName === "Nessuno" ? 'text-gray-400' : 'text-white'}`}>
                              {resultData?.eliminatedName}
                          </p>
                          <p className={`text-xs font-bold uppercase mt-2 ${resultData?.eliminatedName === "Nessuno" ? 'text-green-500' : 'text-red-500'}`}>
                              {resultData?.eliminatedName === "Nessuno" ? "NESSUNA VITTIMA" : "TERMINATO"}
                          </p>
                      </div>
                  </div>

                  {/* BUTTONS */}
                  <div className="flex gap-8 justify-center">
                      <button onClick={exitGame} className="px-10 py-4 border border-white/20 text-gray-400 hover:text-white hover:bg-white/10 font-bold uppercase tracking-widest transition-all">
                          Ritorna al Menu
                      </button>
                      <button onClick={playAgain} className={`px-12 py-4 text-white font-black uppercase tracking-widest shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-all ${imposterWins ? 'bg-red-700 hover:bg-red-600' : 'bg-cyan-700 hover:bg-cyan-600'}`}>
                          GIOCA ANCORA ↻
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return null;
}