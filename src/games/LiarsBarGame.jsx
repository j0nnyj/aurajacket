import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// AUDIO MANAGER (Assicurati che il file esista o commenta se non serve)
import { playSound, stopAll } from '../utils/AudioManager';

export default function LiarsBarGame({ socket }) {
  const navigate = useNavigate();
  
  // STATI
  const [phase, setPhase] = useState('LOBBY'); 
  const [players, setPlayers] = useState([]);
  const [tableData, setTableData] = useState(null);
  
  // STATI VISIVI
  const [revealData, setRevealData] = useState(null); // Dati fase "Beccato!"
  const [shotResult, setShotResult] = useState(null); // Dati fase "Bang/Click"
  const [isSpinning, setIsSpinning] = useState(false); 
  
  const prevTableCountRef = useRef(0);
  const [lastThrow, setLastThrow] = useState({ id: 0, fromIndex: -1, count: 0 });

  useEffect(() => {
    socket.emit('request_server_info');
    socket.emit('host_request_update');
    
    socket.on('update_player_list', setPlayers);
    
    socket.on('liars_update_table', (data) => {
        setTableData(data); 
        setPhase(data.phase);

        // GESTIONE ANIMAZIONE CARTE LANCIATE
        const prevCount = prevTableCountRef.current;
        if (data.tableCount > prevCount) {
            const diff = data.tableCount - prevCount;
            const actorIndex = data.players.findIndex(p => p.id === data.lastActorId);
            setLastThrow({ id: Date.now(), fromIndex: actorIndex, count: diff });
            playSound('card_slide'); // Suono carte se hai l'audio
        } else if (data.tableCount === 0) {
            setLastThrow({ id: 0, fromIndex: -1, count: 0 });
        }
        prevTableCountRef.current = data.tableCount;

        // GESTIONE FASE: REVEAL (RIVELAZIONE)
        if (data.phase === 'REVEAL' && data.revealData) {
            setRevealData(data.revealData);
            // Non usiamo setTimeout qui per nasconderlo, perché il backend 
            // cambierà fase (a ROULETTE) dopo 5 secondi, facendo sparire l'overlay da solo.
        } else {
            setRevealData(null);
        }

        // GESTIONE ALTRE FASI
        if (data.phase === 'LOBBY') {
            stopAll();
        } 
        else if (data.phase === 'GAME_OVER') {
            playSound('win'); 
        }
    });

    // --- ROULETTE (CON SUONI SPIN & BANG) ---
    socket.on('liars_shot_result', (data) => { 
        playSound('spin');
        setIsSpinning(true); 

        // Aspetta la durata dello spin (2.8s)
        setTimeout(() => {
            setIsSpinning(false);
            
            if (data.status === 'DEAD') {
                playSound('bang');
            } else {
                playSound('click');
            }
            
            setShotResult(data); 
            setTimeout(() => setShotResult(null), 3000); 
        }, 2800); 
    });

    return () => {
        socket.off('update_player_list');
        socket.off('liars_update_table');
        socket.off('liars_shot_result');
        stopAll();
    };
  }, [socket]);

  const startGame = () => { 
      if(players.length>=2) {
          socket.emit('liars_start'); 
      }
  };
  
  const exitGame = () => { 
      stopAll();
      socket.emit('host_back_to_menu'); 
      navigate('/host'); 
  };

  const getCoordinates = (index, total) => {
      const positions = [{ x: 0, y: 350 }, { x: -500, y: 0 }, { x: 0, y: -350 }, { x: 500, y: 0 }];
      if (total === 2) return index === 0 ? positions[0] : positions[2];
      return positions[index % 4];
  };

  // --- 1. LOBBY VIEW ---
  if (phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-10 font-sans relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none"></div>
        <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-300 to-red-600 mb-6 z-10 drop-shadow-[0_0_35px_rgba(234,88,12,0.6)]" style={{fontFamily: 'Courier New, monospace'}}>LIAR'S BAR</h1>
        <div className="border-t-2 border-orange-800/50 w-64 mb-16"></div>
        <div className="flex flex-wrap justify-center gap-10 mb-16 z-10 w-full max-w-6xl min-h-[150px]">
            {players.length === 0 && <p className="text-orange-800 animate-pulse text-2xl font-serif">In attesa di avventurieri...</p>}
            {players.map((p, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center group">
                    <div className="w-28 h-28 bg-gradient-to-br from-gray-900 to-black rounded-xl border-2 border-orange-500/30 flex items-center justify-center text-6xl shadow-[0_0_20px_rgba(234,88,12,0.2)] group-hover:border-orange-500 group-hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] transition-all duration-300">{p.avatar}</div>
                    <div className="mt-4 font-bold text-orange-100 tracking-widest uppercase bg-black/60 border border-orange-500/20 px-4 py-1 rounded">{p.name}</div>
                </motion.div>
            ))}
        </div>
        <div className="flex gap-8 z-10 items-center">
             <button onClick={exitGame} className="px-8 py-4 border border-orange-900/50 text-orange-700 uppercase hover:bg-orange-900/10 hover:text-orange-400 transition tracking-widest font-bold rounded-lg">Esci</button>
             <button onClick={startGame} disabled={players.length < 2} className="px-16 py-5 bg-gradient-to-r from-orange-600 to-red-700 text-white font-black text-3xl rounded-xl shadow-[0_0_40px_rgba(234,88,12,0.5)] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:shadow-none disabled:grayscale hover:shadow-[0_0_60px_rgba(234,88,12,0.8)]">INIZIA PARTITA</button>
        </div>
    </div>
    );
  }

  // --- 2. GAME OVER VIEW ---
  if (phase === 'GAME_OVER') {
      const rankedPlayers = tableData?.players.filter(p => p.rank).sort((a,b) => a.rank - b.rank);
      const others = tableData?.players.filter(p => !p.rank && !p.isAlive) || [];
      const first = rankedPlayers[0]; const second = rankedPlayers[1]; const third = rankedPlayers[2];

      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white relative overflow-hidden font-sans">
            <div className="absolute inset-0 bg-orange-900/10 blur-[100px] pointer-events-none"></div>
            <h1 className="absolute top-10 text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 uppercase tracking-[0.2em] z-10 drop-shadow-[0_0_25px_rgba(255,69,0,0.8)]" style={{fontFamily: 'Courier New, monospace'}}>CLASSIFICA</h1>
            <div className="flex items-end justify-center gap-8 z-10 w-full max-w-6xl h-[500px] mt-32">
                <div className="flex flex-col items-center w-1/4 justify-end h-full">{second && (<motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col items-center w-full"><div className="text-7xl mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] grayscale">{second.avatar}</div><div className="text-xl text-slate-300 font-bold uppercase tracking-widest mb-3 bg-black/60 px-4 py-1 rounded border border-slate-500/30">{second.name}</div><div className="w-full h-56 bg-black rounded-t-xl border-[3px] border-slate-400 shadow-[0_0_40px_rgba(148,163,184,0.2)] flex flex-col items-center justify-start pt-4 relative"><span className="text-8xl font-black text-slate-800 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">2</span></div></motion.div>)}</div>
                <div className="flex flex-col items-center w-1/3 justify-end h-full z-20 pb-0 mx-2">{first && (<motion.div initial={{ y: 300, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center w-full"><div className="text-8xl absolute -top-32 animate-bounce drop-shadow-[0_0_30px_orange]">👑</div><div className="text-[10rem] mb-4 drop-shadow-[0_0_40px_rgba(234,88,12,0.6)] scale-110">{first.avatar}</div><div className="text-3xl text-orange-100 font-black uppercase tracking-[0.2em] mb-4 bg-gradient-to-r from-orange-800 to-red-900 px-8 py-2 rounded-lg border border-orange-500 shadow-[0_0_30px_rgba(234,88,12,0.4)]">{first.name}</div><div className="w-full h-80 bg-black rounded-t-2xl border-[4px] border-orange-500 shadow-[0_0_80px_rgba(234,88,12,0.4)] flex flex-col items-center justify-start pt-6 relative overflow-hidden"><div className="absolute inset-0 bg-orange-600/20 animate-pulse"></div><span className="text-9xl font-black text-orange-900 drop-shadow-[0_0_10px_rgba(234,88,12,0.8)]">1</span></div></motion.div>)}</div>
                <div className="flex flex-col items-center w-1/4 justify-end h-full">{third && (<motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-col items-center w-full"><div className="text-7xl mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)] sepia contrast-125">{third.avatar}</div><div className="text-xl text-red-300 font-bold uppercase tracking-widest mb-3 bg-black/60 px-4 py-1 rounded border border-red-900/50">{third.name}</div><div className="w-full h-32 bg-black rounded-t-xl border-[3px] border-red-800 shadow-[0_0_30px_rgba(153,27,27,0.3)] flex flex-col items-center justify-start pt-4 relative"><span className="text-8xl font-black text-red-950 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]">3</span></div></motion.div>)}</div>
            </div>
            {others.length > 0 && (<div className="z-10 flex gap-6 mt-6 bg-black/60 px-8 py-4 rounded-full border border-white/5 backdrop-blur-sm shadow-lg">{others.map((p, i) => (<div key={i} className="flex flex-col items-center opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all"><span className="text-3xl">{p.avatar}</span><span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{p.name}</span></div>))}</div>)}
            <div className="fixed bottom-10 right-10 z-[200]">
                <button onClick={exitGame} className="px-10 py-4 bg-orange-900/30 hover:bg-orange-800/50 border border-orange-600/50 text-orange-200 hover:text-white uppercase font-black tracking-[0.3em] rounded-full shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_40px_rgba(234,88,12,0.6)] transition-all duration-300 backdrop-blur-md">Termina Partita</button>
            </div>
        </div>
      );
  }

  // --- 3. MAIN GAME VIEW ---
  return (
    <div className="min-h-screen bg-[#020202] relative overflow-hidden font-sans perspective-[1200px]">
        {/* TAVOLO DI GIOCO */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${phase === 'ROULETTE' ? 'opacity-0 scale-75 blur-md' : 'opacity-100'}`}>
            <div className="relative w-[950px] h-[650px] rounded-[220px] border-[4px] border-orange-900/80 shadow-[0_0_80px_rgba(234,88,12,0.3),inset_0_0_100px_rgba(0,0,0,0.9)] bg-[#0a0a0a]" style={{ transform: 'rotateX(35deg)' }}>
                 <div className="absolute inset-4 rounded-[200px] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                 <div className="absolute inset-0 rounded-[220px] shadow-[inset_0_0_30px_rgba(234,88,12,0.2)]"></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-500/10 text-8xl font-black tracking-widest pointer-events-none font-serif transform -rotate-6 mix-blend-screen drop-shadow-[0_0_10px_rgba(234,88,12,0.5)]">LIAR'S</div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 flex flex-col items-center justify-center z-10">
                      <AnimatePresence>
                         {lastThrow.count > 0 && lastThrow.fromIndex !== -1 && (
                             Array.from({ length: lastThrow.count }).map((_, i) => (
                                 <motion.div key={`${lastThrow.id}-${i}`} initial={{ x: getCoordinates(lastThrow.fromIndex, tableData?.players.length).x, y: getCoordinates(lastThrow.fromIndex, tableData?.players.length).y, opacity: 0, scale: 1.5, rotateZ: Math.random() * 360 }} animate={{ x: i * 8 - (lastThrow.count * 4), y: i * 8 - (lastThrow.count * 4), opacity: 1, scale: 1, rotateZ: (i * 10) - 15 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, type: "spring", bounce: 0.3, delay: i * 0.05 }} className="absolute w-40 h-56 bg-gradient-to-br from-red-900 to-black border border-orange-500/50 rounded-lg shadow-[0_0_20px_rgba(234,88,12,0.4)] z-20"><div className="w-full h-full bg-[repeating-linear-gradient(45deg,#2a0a0a_0,#2a0a0a_10px,#1a0505_10px,#1a0505_20px)] opacity-80"></div></motion.div>))
                         )}
                      </AnimatePresence>
                      {tableData?.tableCount > 0 ? (
                          <div className="relative z-30 flex flex-col items-center justify-center transform rotate-3">
                              <motion.div key={lastThrow.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-black/90 border-[3px] border-orange-600 rounded-2xl px-8 py-6 shadow-[0_0_60px_rgba(234,88,12,0.5)] backdrop-blur-md mb-4 flex flex-col items-center min-w-[200px]">
                                  <div className="text-orange-200/50 text-[10px] font-bold uppercase tracking-[0.4em] mb-1">Dichiarazione</div>
                                  <div className="flex items-center gap-2 leading-none">
                                      <span className="text-8xl font-black text-white font-serif tracking-tighter">{lastThrow.count > 0 ? lastThrow.count : '?'}</span>
                                      <span className="text-4xl font-bold text-orange-500 mx-1">x</span>
                                      <span className="text-8xl font-black text-orange-500 font-serif">{tableData.requiredValue}</span>
                                  </div>
                              </motion.div>
                              <div className="bg-[#1a0505] border border-orange-900/50 rounded-full px-5 py-2 shadow-lg flex items-center gap-2">
                                  <span className="text-orange-400/60 text-[10px] font-bold uppercase tracking-widest">Totale Carte:</span>
                                  <span className="text-white font-bold text-lg">{tableData.tableCount}</span>
                              </div>
                          </div>
                      ) : (
                          <div className="text-orange-900/40 font-bold uppercase tracking-[0.2em] text-sm border-2 border-dashed border-orange-900/30 px-6 py-3 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">Tavolo Vuoto</div>
                      )}
                 </div>
            </div>
            
            <div className="absolute inset-0 pointer-events-none">
                {tableData?.players.map((p, i) => {
                     const coords = getCoordinates(i, tableData.players.length);
                     return (
                         <div key={p.id} className="absolute flex flex-col items-center justify-center w-48 transition-all duration-500" style={{ top: '50%', left: '50%', transform: `translate(${coords.x - 96}px, ${coords.y * 0.85 - 96}px)` }}>
                             {p.isTurn && phase !== 'ROULETTE' && (
                                <motion.div animate={{ y: [0, -10, 0], opacity: [0.8, 1, 0.8] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-orange-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-3 drop-shadow-[0_0_10px_orange]">
                                    Tocca a te
                                </motion.div>
                             )}
                             <div className="relative">
                                 <div className={`w-28 h-28 rounded-full p-1 transition-all duration-500 relative z-20 ${p.isTurn ? 'bg-gradient-to-tr from-orange-600 via-red-600 to-orange-400 shadow-[0_0_50px_rgba(234,88,12,0.6)] scale-110' : 'bg-gradient-to-tr from-gray-800 to-black border border-orange-900/30'} ${!p.isAlive ? 'grayscale opacity-30' : ''}`}>
                                     <div className="w-full h-full bg-[#0a0a0a] rounded-full flex items-center justify-center text-5xl relative overflow-hidden">
                                         {p.isAlive ? p.avatar : '💀'}
                                     </div>
                                 </div>
                                 {p.isAlive && !p.isFinished && (
                                     <div className="absolute -top-2 -right-4 bg-white text-black text-lg font-black w-10 h-10 flex items-center justify-center rounded-full border-4 border-orange-600 shadow-[0_0_20px_rgba(255,255,255,0.5)] z-30 transform hover:scale-125 transition-transform">
                                         {p.cardCount}
                                     </div>
                                 )}
                             </div>
                             <div className="mt-4 font-bold text-orange-100/80 text-sm bg-black/70 px-4 py-1.5 rounded-full backdrop-blur-xl shadow-lg border border-orange-500/10 tracking-wider">{p.name}</div>
                             {p.isFinished && <div className="text-green-400 text-[10px] font-black uppercase mt-2 tracking-widest bg-green-900/30 px-3 py-1 rounded-full border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.3)]">Salvo</div>}
                         </div>
                     );
                })}
            </div>
            
            <div className="absolute top-12 left-12 bg-[#0a0a0a]/90 p-6 rounded-2xl border border-orange-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(234,88,12,0.15)]">
                <div className="text-orange-300/60 text-xs uppercase font-bold tracking-[0.4em] mb-1 pl-1">Carta Valida</div>
                <div className="text-8xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-300 to-orange-600 drop-shadow-[0_0_25px_rgba(234,88,12,0.7)]">{tableData?.requiredValue}</div>
            </div>
            
            <div className="fixed bottom-5 right-5 z-40">
                 <button onClick={exitGame} className="text-orange-700/50 hover:text-red-500 text-xs font-bold uppercase transition tracking-widest bg-black/50 px-4 py-2 rounded-full border border-orange-900/30 backdrop-blur-md">Termina Partita</button>
            </div>
        </div>

        {/* OVERLAY: ROULETTE & SPIN ANIMATION */}
        <AnimatePresence>
            {phase === 'ROULETTE' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(185,28,28,0.3)_0%,rgba(0,0,0,1)_70%)] animate-pulse"></div>
                    <motion.div 
                        animate={isSpinning ? { rotate: 360 * 5 } : (shotResult?.status === 'DEAD' ? { x: [-10, 50, 0], rotate: [0, -10, 0] } : {})} 
                        transition={isSpinning ? { duration: 2.5, ease: "easeInOut" } : { type: "spring", stiffness: 300 }} 
                        className="text-[300px] drop-shadow-[0_0_80px_rgba(220,38,38,0.8)] z-10 relative"
                    >
                        🔫
                        {shotResult?.status === 'DEAD' && <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 0.5] }} transition={{ duration: 0.2 }} className="absolute top-[-50px] left-[-50px] text-orange-200 text-9xl drop-shadow-[0_0_50px_orange]">💥</motion.div>}
                    </motion.div>
                    <h2 className="text-8xl font-black text-red-600 uppercase tracking-[0.2em] mt-4 z-10 font-serif drop-shadow-[0_0_30px_red]">
                        {isSpinning ? "SPINNING..." : "ROULETTE"}
                    </h2>
                    <div className="mt-16 flex gap-16 z-10">
                         {tableData?.players.map(p => (
                             <div key={p.id} className={`flex flex-col items-center transition-all duration-500 ${p.id === tableData.victimId ? 'opacity-100 scale-125' : 'opacity-30 blur-sm grayscale'}`}>
                                 <div className="text-7xl mb-4 drop-shadow-lg">{p.avatar}</div>
                                 <div className="text-white font-bold text-2xl tracking-wider">{p.name}</div>
                                 {p.id === tableData.victimId && <div className="text-red-500 font-black uppercase text-sm tracking-[0.3em] mt-3 bg-red-900/30 px-4 py-1 rounded-full border border-red-500/50 shadow-[0_0_20px_red]">Vittima</div>}
                             </div>
                         ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* OVERLAY: REVEAL (AGGIORNATO CON NUOVI DATI) */}
        <AnimatePresence>
            {revealData && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center">
                    <h2 className="text-[10rem] font-black mb-16 font-serif tracking-widest leading-none">
                        {revealData.isLie ? (
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-800 drop-shadow-[0_0_80px_red]">BUGIA!</span>
                        ) : (
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-green-400 to-green-700 drop-shadow-[0_0_80px_green]">VERITÀ!</span>
                        )}
                    </h2>
                    <h3 className="text-4xl text-white mb-10 font-bold uppercase tracking-widest">
                        {revealData.message}
                    </h3>
                    
                    <div className="flex gap-10 perspective-[1000px]">
                        {revealData.cards.map((c, i) => (
                            <motion.div key={i} initial={{ rotateY: 180, scale: 0.5 }} animate={{ rotateY: 0, scale: 1 }} transition={{ delay: i*0.1, type: "spring" }} className={`w-56 h-80 rounded-2xl flex items-center justify-center text-9xl border-[6px] shadow-[0_0_40px_rgba(0,0,0,0.8)] ${c === 'JOLLY' ? 'bg-black border-red-600 text-red-600 shadow-[0_0_30px_red]' : 'bg-[#1a1a1a] text-white border-orange-500/30'}`}>
                                {c === 'JOLLY' ? '🤡' : c}
                            </motion.div>
                        ))}
                    </div>
                    
                    <div className="mt-16 text-2xl font-bold uppercase tracking-[0.2em] text-orange-200/60">
                        <p>Giocate da <span className="text-orange-400">{revealData.liarName}</span></p>
                        <p className="mt-2 text-sm text-red-500">Dubitate da {revealData.doubterName}</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* OVERLAY: SHOT RESULT */}
        <AnimatePresence>
            {shotResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`absolute inset-0 z-[60] flex flex-col items-center justify-center ${shotResult.status === 'DEAD' ? 'bg-red-950' : 'bg-[#0a1a0f]'}`}>
                    <div className="text-[250px] mb-10 drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]">{shotResult.status === 'DEAD' ? '💀' : '😅'}</div>
                    <div className={`text-[8rem] font-black uppercase tracking-tighter leading-none drop-shadow-2xl ${shotResult.status === 'DEAD' ? 'text-red-600' : 'text-green-500'}`}>{shotResult.status === 'DEAD' ? 'ELIMINATO' : 'SALVO'}</div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}