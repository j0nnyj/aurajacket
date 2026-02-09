import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function BufalaGame({ socket }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('LOBBY');
  const [prompt, setPrompt] = useState("");
  const [timer, setTimer] = useState(60);
  const [progress, setProgress] = useState(null);
  const [votingOptions, setVotingOptions] = useState([]);
  const [revealData, setRevealData] = useState(null);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(-1);
  const [showTruth, setShowTruth] = useState(false);
  const [scores, setScores] = useState([]);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    socket.emit('host_request_update');
    socket.on('update_player_list', (list) => setPlayers(list));
    socket.on('set_view', (v) => { if(v.startsWith('BUFALA_')) setPhase(v.replace('BUFALA_', '')); });
    socket.on('bufala_prompt', (data) => {
        setPrompt(data.text);
        setTimer(60);
        setRevealData(null);
        setCurrentRevealIndex(-1);
        setShowTruth(false);
    });
    socket.on('bufala_progress', setProgress);
    socket.on('bufala_voting_start', (data) => {
        setVotingOptions(data.options);
        setTimer(30);
    });
    socket.on('bufala_round_results', (data) => {
        const sorted = data.stats.filter(x => x.type === 'LIE' && x.voters.length > 0);
        const truthData = data.stats.find(x => x.type === 'TRUTH');
        setRevealData({ list: sorted, truth: truthData });
        setCurrentRevealIndex(-1);
        setShowTruth(false);
        setPhase('REVEAL');
        startRevealSequence(sorted.length);
    });
    socket.on('bufala_leaderboard', (list) => setScores(list));
    socket.on('bufala_game_over', (list) => setScores(list));

    return () => {
        socket.off('update_player_list');
        socket.off('set_view'); socket.off('bufala_prompt');
        socket.off('bufala_progress'); socket.off('bufala_voting_start');
        socket.off('bufala_round_results'); socket.off('bufala_leaderboard');
        socket.off('bufala_game_over');
    };
  }, [socket]);

  useEffect(() => {
      if ((phase === 'WRITING' || phase === 'VOTE_TV') && timer > 0) {
          const i = setInterval(() => setTimer(t => t - 1), 1000);
          return () => clearInterval(i);
      }
  }, [timer, phase]);

  const startRevealSequence = (totalLies) => {
      let idx = 0;
      const nextStep = () => {
          if (idx < totalLies) {
              setCurrentRevealIndex(idx);
              idx++;
              setTimeout(nextStep, 4000); 
          } else {
              setCurrentRevealIndex(-1); 
              setShowTruth(true);
          }
      };
      setTimeout(nextStep, 1000);
  };

  const startGame = () => {
      if (players.length < 2) { alert("Servono almeno 2 giocatori!"); return; }
      socket.emit('bufala_start');
  };
  
  // --- FUNZIONE DI USCITA SICURA ---
  const exitToMenu = () => { 
      // 1. Ferma il gioco lato server (uccide i timer)
      socket.emit('bufala_stop'); 
      // 2. Chiede al server di riportare tutti alla home/lobby
      socket.emit('host_back_to_menu'); 
      // 3. Naviga localmente
      navigate('/host'); 
  };

  const skipPhase = () => {
      socket.emit('bufala_skip');
  };

  // --- CONTROLLI ---
  const Controls = () => (
      <>
          <button 
              onClick={exitToMenu} 
              className="absolute top-8 left-8 border-2 border-black bg-white px-6 py-2 font-bold uppercase tracking-widest hover:bg-black hover:text-[#e8e4d3] transition-colors z-50 font-serif shadow-md cursor-pointer"
          >
              ← Indietro
          </button>

          <button 
              onClick={exitToMenu} 
              className="absolute top-8 right-8 border-2 border-red-600 bg-white text-red-600 px-6 py-2 font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors z-50 font-serif shadow-md cursor-pointer"
          >
              Termina X
          </button>

          {phase !== 'LOBBY' && phase !== 'GAMEOVER' && (
              <button 
                  onClick={skipPhase} 
                  className="fixed bottom-8 right-8 border-2 border-blue-600 bg-blue-600 text-white px-8 py-3 font-bold uppercase tracking-widest hover:bg-blue-500 hover:scale-105 transition-all z-50 font-serif shadow-[4px_4px_0_black] cursor-pointer"
              >
                  AVANTI &gt;&gt;
              </button>
          )}
      </>
  );

  // --- UI (Identica a prima) ---
  if (phase === 'LOBBY') {
      return (
          <div className="min-h-screen bg-[#e8e4d3] text-black font-serif flex flex-col items-center justify-center p-8 relative overflow-hidden">
              <Controls />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/old-mathematics.png')] opacity-10 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center w-full max-w-6xl">
                  <h1 className="text-9xl font-black uppercase mb-4 tracking-tighter bg-red-600 text-white px-10 py-2 rotate-2 shadow-xl border-4 border-black">
                      LA BUFALA
                  </h1>
                  <p className="text-3xl font-bold uppercase tracking-widest mb-10 border-b-4 border-black pb-2">
                      Notizie false, gente vera.
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-6 mb-12 w-full">
                      {players.map((p, i) => (
                          <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center bg-white p-4 border-2 border-black shadow-[5px_5px_0_rgba(0,0,0,0.2)]">
                              <div className="text-5xl grayscale mb-2">{p.avatar}</div>
                              <div className="font-bold uppercase tracking-widest bg-black text-white px-2">{p.name}</div>
                          </motion.div>
                      ))}
                      {players.length === 0 && <p className="text-gray-500 italic animate-pulse">In attesa di bugiardi...</p>}
                  </div>

                  <button 
                      onClick={startGame} 
                      disabled={players.length < 2}
                      className="px-16 py-6 bg-black text-white font-black text-4xl uppercase hover:scale-105 hover:bg-red-600 transition-all shadow-[10px_10px_0_rgba(0,0,0,0.3)] border-4 border-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      INIZIA A MENTIRE
                  </button>
              </div>
          </div>
      );
  }

  if (phase === 'WRITING') {
      const parts = prompt.split('_____');
      return (
          <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col items-center justify-center p-10 font-sans relative">
              <Controls />
              <div className="absolute top-10 right-1/2 translate-x-1/2 w-24 h-24 rounded-full border-4 border-white flex items-center justify-center text-4xl font-bold bg-red-600 shadow-lg animate-pulse z-10">
                  {timer}
              </div>
              <div className="bg-[#e8e4d3] text-black p-12 max-w-6xl text-center shadow-[20px_20px_0_#ef4444] rotate-1 border-4 border-black relative z-10">
                  <p className="text-5xl font-bold leading-relaxed font-serif uppercase">
                      {parts[0]} <span className="inline-block border-b-8 border-black w-48 mx-2 bg-black/10"></span> {parts[1]}
                  </p>
              </div>
              <div className="mt-16 text-3xl font-bold uppercase tracking-widest text-white bg-red-600 px-6 py-2 relative z-10">
                  SCRIVETE LA VOSTRA BUFALA!
              </div>
              <div className="mt-4 text-xl font-mono text-gray-400 relative z-10">Finito: {progress?.current || 0} / {progress?.total || 0}</div>
          </div>
      );
  }

  if (phase === 'VOTE_TV') {
      return (
          <div className="min-h-screen bg-blue-900 text-white flex flex-col items-center p-10 font-sans relative">
              <Controls />
              <h2 className="text-6xl font-black uppercase mb-12 text-yellow-400 drop-shadow-[5px_5px_0_black] bg-blue-800 px-8 py-2 border-4 border-yellow-400 rotate-1 relative z-10">TROVA LA VERITÀ</h2>
              <div className="absolute top-10 right-1/2 translate-x-1/2 w-20 h-20 rounded-full bg-black flex items-center justify-center text-2xl font-bold border-2 border-white animate-pulse z-10">{timer}</div>
              
              <div className="flex flex-wrap justify-center gap-6 w-full max-w-7xl relative z-10">
                  {votingOptions.map((opt, i) => (
                      <div key={i} className="bg-white text-black px-8 py-5 text-3xl font-bold shadow-[8px_8px_0_black] border-4 border-black rotate-1">
                          {opt}
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  if (phase === 'REVEAL') {
      return (
          <div className="min-h-screen bg-[#e8e4d3] flex flex-col items-center justify-center p-10 font-serif relative overflow-hidden">
              <Controls />
              <h2 className="absolute top-10 text-5xl font-black uppercase border-b-8 border-black pb-2 tracking-tighter z-10">LA VERITÀ È...</h2>
              
              <AnimatePresence mode='wait'>
                  {currentRevealIndex !== -1 && revealData?.list[currentRevealIndex] && (
                      <motion.div 
                          key={currentRevealIndex}
                          initial={{ opacity: 0, scale: 0.8, rotate: -5 }} 
                          animate={{ opacity: 1, scale: 1, rotate: 0 }} 
                          exit={{ opacity: 0, y: 100, rotate: 10 }}
                          className="bg-white p-16 shadow-2xl text-center max-w-5xl border-8 border-black relative z-10"
                      >
                          <p className="text-6xl font-black mb-10 uppercase leading-tight">"{revealData.list[currentRevealIndex].text}"</p>
                          <motion.div 
                              initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                              className="absolute -top-10 -right-10 bg-red-600 text-white font-black text-5xl px-10 py-4 -rotate-12 border-8 border-white shadow-xl"
                          >
                              BUFALA!
                          </motion.div>
                          <div className="mt-8 bg-gray-100 p-6 border-2 border-dashed border-gray-400">
                              <p className="text-xl font-bold uppercase text-gray-500 mb-4">Scritta da: <span className="text-black text-2xl">{revealData.list[currentRevealIndex].author}</span></p>
                              {revealData.list[currentRevealIndex].voters.length > 0 && (
                                  <>
                                    <p className="text-sm font-bold uppercase text-gray-500">Hanno abboccato:</p>
                                    <div className="flex flex-wrap justify-center gap-3 mt-3">
                                        {revealData.list[currentRevealIndex].voters.map((v, i) => (
                                            <span key={i} className="bg-black text-white px-4 py-2 text-lg font-bold uppercase -rotate-2">{v}</span>
                                        ))}
                                    </div>
                                  </>
                              )}
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>

              {showTruth && revealData?.truth && (
                  <motion.div 
                      initial={{ scale: 0 }} animate={{ scale: 1 }} 
                      className="bg-green-600 text-white p-16 shadow-[0_0_100px_rgba(0,255,0,0.6)] text-center max-w-6xl border-8 border-white z-10"
                  >
                      <p className="text-8xl font-black uppercase mb-6 drop-shadow-lg">VERITÀ!</p>
                      <p className="text-5xl font-bold uppercase border-b-4 border-white pb-4 mb-6">"{revealData.truth.text}"</p>
                      <div className="mt-6">
                          <p className="text-lg uppercase font-bold opacity-80 mb-2">Geni che l'hanno saputa:</p>
                          <div className="flex flex-wrap justify-center gap-4 mt-2">
                              {revealData.truth.voters.length > 0 ? revealData.truth.voters.map((v, i) => (
                                  <span key={i} className="bg-white text-green-800 px-6 py-3 font-black text-2xl shadow-lg rotate-1">{v}</span>
                              )) : <span className="text-3xl font-black italic opacity-50">NESSUNO... CHE VERGOGNA!</span>}
                          </div>
                      </div>
                  </motion.div>
              )}
          </div>
      );
  }

  if (phase === 'LEADERBOARD' || phase === 'GAMEOVER') {
      return (
          <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-10 font-mono">
              <Controls />
              <h1 className="text-7xl font-black mb-10 text-yellow-400 uppercase tracking-tighter border-b-8 border-white pb-4 relative z-10">
                  {phase === 'GAMEOVER' ? 'CLASSIFICA FINALE' : 'PUNTEGGI'}
              </h1>
              <div className="w-full max-w-3xl flex flex-col gap-4 relative z-10">
                  {scores.map((p, i) => (
                      <div key={i} className={`flex justify-between p-6 border-l-[16px] items-center ${i===0 ? 'bg-yellow-400 text-black border-white scale-105' : 'bg-[#222] border-red-600'}`}>
                          <div className="flex items-center gap-4">
                              <span className="text-4xl font-black">{i+1}.</span>
                              <span className="text-3xl font-bold uppercase">{p.name}</span>
                          </div>
                          <span className="text-4xl font-black">{p.score}</span>
                      </div>
                  ))}
              </div>
              {phase === 'GAMEOVER' && (
                  <button onClick={exitToMenu} className="mt-12 bg-white text-black px-10 py-4 font-black uppercase text-xl hover:bg-gray-200 relative z-10 cursor-pointer">
                      TORNA AL MENU
                  </button>
              )}
          </div>
      );
  }

  return <div className="h-screen bg-black"></div>;
}