import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function TrashTalkGame({ socket }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ phase: 'LOBBY' });
  const [battle, setBattle] = useState(null);
  const [result, setResult] = useState(null);
  const [scores, setScores] = useState([]); 
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    socket.emit('host_request_update');

    socket.on('trashtalk_state', (data) => setState(data));
    
    socket.on('trashtalk_battle_start', (data) => {
        setBattle(data);
        setResult(null);
        setTimer(data.type === '1VS1' ? 15 : 25);
    });

    socket.on('trashtalk_battle_result', (data) => {
        setResult(data);
        setTimer(0);
    });

    socket.on('trashtalk_leaderboard', (playerList) => {
        setScores(playerList);
        setBattle(null); 
        setState(prev => ({ ...prev, phase: 'LEADERBOARD' }));
    });

    socket.on('trashtalk_game_over', (playerList) => {
        setScores(playerList);
        setBattle(null);
        setState(prev => ({ ...prev, phase: 'GAME_OVER' }));
    });

    return () => {
        socket.off('trashtalk_state');
        socket.off('trashtalk_battle_start');
        socket.off('trashtalk_battle_result');
        socket.off('trashtalk_leaderboard');
        socket.off('trashtalk_game_over');
    };
  }, [socket]);

  useEffect(() => {
      if (timer > 0) {
          const i = setInterval(() => setTimer(t => t - 1), 1000);
          return () => clearInterval(i);
      }
  }, [timer]);

  const startGame = () => socket.emit('trashtalk_start');
  const exitGame = () => { socket.emit('host_back_to_menu'); navigate('/host'); };

  const showBattle = battle !== null; 

  if (state.phase === 'LOBBY') {
      return (
          <div className="min-h-screen bg-violet-900 flex flex-col items-center justify-center text-white font-sans">
              <h1 className="text-9xl font-black mb-4 -rotate-3 text-yellow-400 drop-shadow-lg">TRASH TALK</h1>
              <p className="text-2xl mb-8 font-bold">Round Totali: {state.totalRounds}</p>
              <button onClick={startGame} className="px-10 py-5 bg-white text-black font-black text-2xl border-4 border-black shadow-[5px_5px_0_black] hover:-translate-y-1 transition-all cursor-pointer">INIZIA</button>
          </div>
      );
  }

  if (showBattle) {
      if (battle.type === '1VS1') {
          return (
              <div className="min-h-screen bg-blue-600 flex flex-col items-center p-4 relative overflow-hidden">
                  <div className="w-full max-w-7xl z-20 mb-4 mt-2">
                      <div className="bg-yellow-400 text-black px-10 py-6 rounded-3xl border-4 border-black shadow-[0_10px_20px_rgba(0,0,0,0.4)] text-center transform -rotate-1">
                          <p className="text-xs font-black text-black/60 uppercase tracking-[0.2em] mb-1">COMPLETATE LA FRASE:</p>
                          <h2 className="text-4xl md:text-5xl font-black leading-tight uppercase">{battle.prompt}</h2>
                      </div>
                  </div>

                  <div className="flex w-full max-w-7xl justify-between items-stretch z-10 flex-1 gap-4 mb-10 px-4">
                      <motion.div initial={{ x: -200, opacity: 0 }} animate={result?.winnerId === battle.p1.id ? { scale: 1.05, opacity: 1, zIndex: 50 } : result ? { scale: 0.9, opacity: 0.5 } : { x: 0, opacity: 1 }} className={`flex-1 p-8 rounded-3xl border-8 flex flex-col items-center justify-center bg-white text-black border-black relative shadow-2xl transition-all duration-500`}>
                          {result?.winnerId === battle.p1.id && <div className="absolute -top-8 bg-green-500 text-white font-black text-2xl px-6 py-2 rounded-full border-4 border-black animate-bounce z-50 shadow-lg">VINCITORE!</div>}
                          <p className="text-5xl font-black uppercase text-center leading-tight break-words">{battle.p1.answer}</p>
                          {result && <div className="mt-6 bg-black text-white px-6 py-2 font-bold text-xl rounded-full">{result.p1Votes} Voti</div>}
                      </motion.div>

                      <div className="flex items-center justify-center w-20">
                          <span className="text-7xl font-black text-yellow-400 italic drop-shadow-[4px_4px_0_black]">VS</span>
                      </div>

                      <motion.div initial={{ x: 200, opacity: 0 }} animate={result?.winnerId === battle.p2.id ? { scale: 1.05, opacity: 1, zIndex: 50 } : result ? { scale: 0.9, opacity: 0.5 } : { x: 0, opacity: 1 }} className={`flex-1 p-8 rounded-3xl border-8 flex flex-col items-center justify-center bg-black text-white border-white relative shadow-2xl transition-all duration-500`}>
                          {result?.winnerId === battle.p2.id && <div className="absolute -top-8 bg-green-500 text-white font-black text-2xl px-6 py-2 rounded-full border-4 border-white animate-bounce z-50 shadow-lg">VINCITORE!</div>}
                          <p className="text-5xl font-black uppercase text-center leading-tight break-words">{battle.p2.answer}</p>
                          {result && <div className="mt-6 bg-white text-black px-6 py-2 font-bold text-xl rounded-full border-2 border-black">{result.p2Votes} Voti</div>}
                      </motion.div>
                  </div>

                  {!result && (
                      <div className="absolute bottom-0 left-0 w-full h-8 bg-black/50 backdrop-blur-sm border-t border-white/20">
                          <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 15, ease: "linear" }} className="h-full bg-yellow-400" />
                          <p className="absolute top-1 left-0 w-full text-center text-white font-black text-sm tracking-[0.3em] drop-shadow-md">VOTATE SUI TELEFONI</p>
                      </div>
                  )}
              </div>
          );
      }

      if (battle.type === 'ALL_VS_ALL') {
          return (
              <div className="min-h-screen bg-red-900 p-8 flex flex-col items-center">
                  <h1 className="text-5xl font-black text-yellow-400 mb-4 uppercase drop-shadow-md">FINAL ROUND</h1>
                  
                  {/* --- FIX: PROMPT FINALE VISIBILE --- */}
                  <div className="bg-black text-white px-10 py-6 rounded-2xl mb-8 text-3xl font-bold border-4 border-white shadow-xl text-center max-w-5xl">
                      <p className="text-sm text-gray-400 uppercase tracking-widest mb-2">LA DOMANDA FINALE:</p>
                      {battle.prompt}
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-4 w-full">
                      {battle.candidates.map((c) => (
                          <div key={c.id} className="bg-white text-black p-4 rounded-xl border-4 border-black shadow-lg w-64 text-center transform rotate-1 hover:scale-105 transition">
                              <p className="font-black text-xl uppercase break-words leading-tight">{c.answer}</p>
                              <p className="text-xs mt-2 text-gray-500 uppercase font-bold">{c.name}</p>
                          </div>
                      ))}
                  </div>
                  <div className="absolute bottom-10 text-4xl font-bold text-white animate-pulse">VOTATE LA MIGLIORE! {timer}s</div>
              </div>
          );
      }
  }

  if (state.phase === 'WRITING') {
      return (
          <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-white">
              <h2 className="text-4xl font-bold mb-8 uppercase tracking-widest text-yellow-400">
                  {state.round === state.totalRounds ? "ULTIMO ROUND: FINALE" : `ROUND ${state.round}`}
              </h2>
              <div className="text-6xl font-black bg-white/10 px-10 py-5 rounded-full border border-white/20 animate-pulse">
                  Risposte: {state.answersReceived} / {state.totalPlayers}
              </div>
          </div>
      );
  }

  if (state.phase === 'LEADERBOARD') {
      return (
          <div className="min-h-screen bg-orange-600 flex flex-col items-center justify-center p-10">
              <h1 className="text-6xl font-black text-white mb-8 uppercase drop-shadow-md">CLASSIFICA PARZIALE</h1>
              <div className="flex flex-col gap-3 w-full max-w-2xl">
                  {scores.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-black/10">
                          <div className="flex items-center gap-4">
                              <span className="text-3xl font-black text-white w-10">#{i+1}</span>
                              <span className="text-3xl">{p.avatar}</span>
                              <span className="text-2xl font-bold uppercase text-white">{p.name}</span>
                          </div>
                          <span className="text-3xl font-black text-white">{p.score}</span>
                      </div>
                  ))}
              </div>
              <p className="mt-8 text-white font-bold animate-pulse uppercase tracking-widest">Preparatevi per il prossimo round...</p>
          </div>
      );
  }

  if (state.phase === 'GAME_OVER') {
      return (
          <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-10">
              <h1 className="text-7xl font-black text-yellow-400 mb-8">VINCITORI</h1>
              <div className="flex flex-col gap-3 w-full max-w-2xl">
                  {scores.map((p, i) => (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${i===0 ? 'bg-yellow-400 text-black border-white scale-110 shadow-[0_0_30px_yellow]' : 'bg-white/10 text-white border-white/20'}`}>
                          <div className="flex items-center gap-4">
                              <span className="text-3xl font-black w-10">{i===0 ? '🏆' : `#${i+1}`}</span>
                              <span className="text-3xl">{p.avatar}</span>
                              <span className="text-2xl font-bold uppercase">{p.name}</span>
                          </div>
                          <span className="text-3xl font-black">{p.score}</span>
                      </div>
                  ))}
              </div>
              <button onClick={exitGame} className="mt-10 px-8 py-3 bg-white text-black font-bold uppercase rounded-full hover:bg-yellow-400 transition cursor-pointer">Menu Principale</button>
          </div>
      );
  }

  return <div className="bg-black h-screen text-white flex items-center justify-center">Loading...</div>;
}