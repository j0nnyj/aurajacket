import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function TrashTalkGame({ socket }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ phase: 'LOBBY', round: 0, totalRounds: 3 });
  const [battle, setBattle] = useState(null);
  const [result, setResult] = useState(null);
  const [scores, setScores] = useState([]); 
  const [timer, setTimer] = useState(0);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    socket.emit('host_request_update');

    // Aggiornamento stato generale (Round, Fase)
    socket.on('trashtalk_state', (data) => {
        setState(prev => ({ ...prev, ...data }));
    });

    socket.on('set_view', (v) => { 
        if(v.startsWith('TRASHTALK_')) {
            setState(prev => ({...prev, phase: v.replace('TRASHTALK_', '')}));
        }
    });

    socket.on('trashtalk_progress', setProgress);

    socket.on('trashtalk_battle_start', (data) => {
        setBattle(data);
        setResult(null);
        // Timer visuale: 20s per 1vs1, 30s per il finale
        setTimer(data.type === '1VS1' ? 25 : 40);
    });

    socket.on('trashtalk_battle_result', (data) => {
        setResult(data);
        setTimer(0); // Ferma il timer appena arriva il risultato
    });

    socket.on('trashtalk_leaderboard', (list) => {
        setScores(list);
        setState(prev => ({ ...prev, phase: 'LEADERBOARD' }));
    });

    socket.on('trashtalk_game_over', (list) => {
        setScores(list);
        setState(prev => ({ ...prev, phase: 'GAMEOVER' }));
    });

    return () => {
        socket.off('trashtalk_state');
        socket.off('trashtalk_battle_start');
        socket.off('trashtalk_battle_result'); 
        socket.off('trashtalk_leaderboard');
        socket.off('trashtalk_game_over'); 
        socket.off('set_view'); 
        socket.off('trashtalk_progress');
    };
  }, [socket]);

  // Gestione Timer (solo visivo)
  useEffect(() => {
      if (timer > 0) {
          const i = setInterval(() => setTimer(t => t - 1), 1000);
          return () => clearInterval(i);
      }
  }, [timer]);

  const startGame = () => socket.emit('trashtalk_start');
  const exitGame = () => { socket.emit('host_back_to_menu'); navigate('/host'); };
  const forceEnd = () => { if(window.confirm("Terminare la partita?")) socket.emit('host_new_session'); };

  // --- STILI PUNK - CONTROLLI ---
  const Controls = () => (
      <>
          <button onClick={exitGame} className="fixed top-6 left-6 z-50 bg-yellow-400 text-black font-black text-sm px-6 py-3 -rotate-3 border-4 border-black shadow-[4px_4px_0_black] hover:scale-105 transition-transform uppercase tracking-widest cursor-pointer">
              ← ESCI
          </button>
          <button onClick={forceEnd} className="fixed top-6 right-6 z-50 bg-red-600 text-white font-black text-sm px-6 py-3 rotate-2 border-4 border-black shadow-[4px_4px_0_black] hover:scale-105 transition-transform uppercase tracking-widest cursor-pointer">
              TERMINA ☠️
          </button>
      </>
  );

  // 1. LOBBY
  if (state.phase === 'LOBBY') {
      return (
          <div className="min-h-screen bg-[#2e0249] flex flex-col items-center justify-center font-sans overflow-hidden relative">
              <Controls />
              {/* Sfondo Noise */}
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/noise.png')]"></div>
              
              <motion.h1 initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ yoyo: Infinity, duration: 2 }} className="text-9xl font-black text-yellow-300 drop-shadow-[8px_8px_0_black] -rotate-6 z-10 italic stroke-black">
                  TRASH TALK
              </motion.h1>
              
              <div className="bg-pink-500 text-white font-black text-2xl px-10 py-4 border-4 border-black shadow-[8px_8px_0_black] rotate-3 mb-12 z-10">
                  SOLO PER GENTE ORRIBILE
              </div>

              <div className="flex gap-6 z-10">
                  <button onClick={startGame} className="bg-white text-black font-black text-4xl px-12 py-6 border-8 border-black shadow-[12px_12px_0_black] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all uppercase cursor-pointer">
                      INIZIA
                  </button>
              </div>
          </div>
      );
  }

  // 2. SCRITTURA
  if (state.phase === 'WRITING') {
      return (
          <div className="min-h-screen bg-[#facc15] flex flex-col items-center justify-center p-10 relative overflow-hidden">
              <Controls />
              <div className="bg-black text-white p-12 max-w-6xl w-full border-8 border-white shadow-[15px_15px_0_rgba(0,0,0,0.2)] transform -rotate-1 relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black px-6 py-2 border-4 border-white rotate-2 uppercase tracking-widest">
                      ROUND {state.round} / {state.totalRounds}
                  </div>
                  <p className="text-5xl font-black leading-tight uppercase text-center">
                      {state.round >= state.totalRounds 
                        ? "ULTIMO ROUND: TUTTI CONTRO TUTTI!" 
                        : "LE VITTIME STANNO SCRIVENDO LE LORO CATTIVERIE..."}
                  </p>
              </div>
              <div className="mt-12 text-4xl font-black text-black bg-white px-8 py-3 border-4 border-black rotate-2 animate-bounce">
                  RISPOSTE: {progress?.current || 0} / {progress?.total || 0}
              </div>
          </div>
      );
  }

  // 3. BATTLE
  if (state.phase === 'VOTE_TV' || state.phase === 'RESULT') {
      if (!battle) return <div></div>;
      const isResult = state.phase === 'RESULT';

      return (
          <div className="min-h-screen bg-[#a855f7] flex flex-col items-center p-6 pt-24 font-sans relative">
              <Controls />
              
              {/* PROMPT HEADER */}
              <div className="w-full max-w-5xl text-center mb-8 relative z-10">
                  <div className="bg-black text-white px-8 py-6 border-4 border-white inline-block shadow-[8px_8px_0_rgba(0,0,0,0.5)] transform rotate-1">
                      <p className="text-2xl font-black uppercase text-yellow-300 leading-none">
                          {battle.prompt.replace('_____', '...')}
                      </p>
                  </div>
              </div>

              {/* TIMER */}
              {!isResult && (
                  <div className="absolute top-24 right-10 w-24 h-24 bg-red-600 rounded-full border-4 border-black flex items-center justify-center text-white font-black text-3xl animate-pulse z-20 shadow-lg">
                      {timer}
                  </div>
              )}

              {/* BATTLE AREA */}
              <div className="flex w-full max-w-7xl justify-center gap-10 items-stretch flex-1 mb-8 z-10">
                  {battle.type === '1VS1' ? (
                      <>
                          <Card 
                              answer={battle.p1.answer} 
                              votes={result?.votes[battle.p1.id] || 0}
                              isWinner={result?.winnerId === battle.p1.id}
                              author={isResult ? battle.p1.name : null}
                              showResult={isResult}
                              rotate="-2deg"
                              color="bg-white"
                          />
                          <div className="flex items-center justify-center text-7xl font-black text-black italic drop-shadow-white">VS</div>
                          <Card 
                              answer={battle.p2.answer} 
                              votes={result?.votes[battle.p2.id] || 0}
                              isWinner={result?.winnerId === battle.p2.id}
                              author={isResult ? battle.p2.name : null}
                              showResult={isResult}
                              rotate="2deg"
                              color="bg-yellow-300"
                          />
                      </>
                  ) : (
                      // ALL VS ALL Grid
                      <div className="grid grid-cols-3 gap-6 w-full">
                          {battle.candidates.map((c, i) => (
                              <Card 
                                  key={c.id}
                                  answer={c.answer}
                                  votes={result?.votes[c.id] || 0}
                                  isWinner={result?.winnerId === c.id}
                                  author={isResult ? c.name : null}
                                  showResult={isResult}
                                  rotate={`${(i%2===0 ? 1 : -1)}deg`}
                                  color="bg-white"
                                  small
                              />
                          ))}
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // 4. LEADERBOARD
  if (state.phase === 'LEADERBOARD' || state.phase === 'GAMEOVER') {
      return (
          <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-10 font-sans">
              <Controls />
              <h1 className="text-8xl font-black text-pink-500 mb-10 drop-shadow-[5px_5px_0_white] italic">
                  {state.phase === 'GAMEOVER' ? 'CLASSIFICA FINALE' : 'PUNTEGGI'}
              </h1>
              <div className="flex flex-col gap-4 w-full max-w-3xl">
                  {scores.map((p, i) => (
                      <div key={i} className={`flex items-center justify-between p-6 border-4 border-black shadow-[8px_8px_0_white] transform ${i%2===0 ? '-rotate-1' : 'rotate-1'} ${i===0 ? 'bg-yellow-400 text-black scale-105 z-10' : 'bg-[#222] text-white'}`}>
                          <div className="flex items-center gap-6">
                              <span className="text-4xl font-black w-12">{i+1}.</span>
                              <span className="text-4xl">{p.avatar}</span>
                              <span className="text-3xl font-black uppercase">{p.name}</span>
                          </div>
                          <span className="text-4xl font-black">{p.score} PT</span>
                      </div>
                  ))}
              </div>
              {state.phase === 'GAMEOVER' && (
                  <button onClick={exitGame} className="mt-12 bg-white text-black font-black text-xl px-10 py-4 uppercase border-4 border-black shadow-[6px_6px_0_red] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer">
                      MENU PRINCIPALE
                  </button>
              )}
          </div>
      );
  }

  return <div className="bg-black h-screen"></div>;
}

// Sottocomponente Card (Punk Style)
const Card = ({ answer, votes, isWinner, author, showResult, rotate, color, small }) => (
    <motion.div 
        layout
        className={`flex-1 p-8 border-4 border-black flex flex-col items-center justify-center text-center shadow-[10px_10px_0_rgba(0,0,0,0.5)] ${color} relative transition-all duration-500`}
        style={{ transform: isWinner ? 'scale(1.1) rotate(0deg)' : `rotate(${rotate})`, zIndex: isWinner ? 50 : 1 }}
    >
        {isWinner && showResult && (
            <div className="absolute -top-6 bg-red-600 text-white font-black px-6 py-2 text-xl uppercase tracking-widest border-4 border-black transform -rotate-3 shadow-lg">
                WINNER
            </div>
        )}
        
        <p className={`${small ? 'text-2xl' : 'text-5xl'} font-black uppercase leading-none text-black break-words`}>
            {answer}
        </p>

        {showResult && (
            <div className="mt-6 flex flex-col items-center">
                {author && <div className="bg-black text-white font-bold text-sm px-3 py-1 mb-2 uppercase tracking-wide">{author}</div>}
                <div className="bg-green-600 text-white font-black text-2xl px-6 py-2 rounded-full border-2 border-white shadow-lg">
                    +{votes} VOTI
                </div>
            </div>
        )}
    </motion.div>
);