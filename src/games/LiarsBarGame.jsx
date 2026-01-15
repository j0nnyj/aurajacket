import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiarsBarGame({ socket }) {
  const navigate = useNavigate();
  
  // STATI
  const [phase, setPhase] = useState('LOBBY'); 
  const [players, setPlayers] = useState([]);
  const [tableData, setTableData] = useState(null);
  
  // ANIMAZIONI
  const [revealData, setRevealData] = useState(null);
  const [shotResult, setShotResult] = useState(null);
  
  // Gestione Lancio Carte: Memorizza chi ha lanciato e quando
  const [lastThrow, setLastThrow] = useState({ id: 0, fromIndex: -1 });

  useEffect(() => {
    socket.emit('request_server_info');
    socket.emit('host_request_update');
    
    socket.on('update_player_list', setPlayers);
    
    socket.on('liars_update_table', (data) => {
        setTableData((prev) => {
            // Rileva se sono state giocate nuove carte
            if (prev && data.tableCount > prev.tableCount) {
                // Trova l'indice del giocatore che ha appena giocato (usando lastActorId dal backend)
                const actorIndex = data.players.findIndex(p => p.id === data.lastActorId);
                setLastThrow({ id: Date.now(), fromIndex: actorIndex });
            }
            return data;
        });

        if(data.phase === 'ROULETTE') setPhase('ROULETTE');
        else if(data.phase === 'GAME_OVER') setPhase('GAME_OVER');
        else setPhase('GAME');
    });

    socket.on('liars_reveal', (data) => { setRevealData(data); setTimeout(() => setRevealData(null), 6000); });
    socket.on('liars_shot_result', (data) => { setShotResult(data); setTimeout(() => setShotResult(null), 5000); });

    return () => {
        socket.off('update_player_list');
        socket.off('liars_update_table');
        socket.off('liars_reveal');
        socket.off('liars_shot_result');
    };
  }, [socket]);

  // AZIONI HOST
  const startGame = () => { if(players.length>=2) socket.emit('liars_start'); };
  const exitGame = () => { socket.emit('host_back_to_menu'); navigate('/host'); };

  // --- LOGICA POSIZIONI 3D ---
  // Definisce le coordinate (X, Y) relative al centro per l'animazione delle carte
  const getCoordinates = (index, total) => {
      // Configurazioni fisse per 4 lati
      const positions = [
          { x: 0, y: 300, label: 'bottom' },  // Sud
          { x: -450, y: 0, label: 'left' },   // Ovest
          { x: 0, y: -300, label: 'top' },    // Nord
          { x: 450, y: 0, label: 'right' }    // Est
      ];
      // Se siamo in 2, usiamo solo Nord e Sud
      if (total === 2) {
          return index === 0 ? positions[0] : positions[2];
      }
      return positions[index % 4];
  };

  // --- 1. LOBBY (STILE NEON ARANCIONE RIPRISTINATO) ---
  if (phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-[#0a0503] text-white flex flex-col items-center justify-center p-10 font-sans relative overflow-hidden">
        {/* Sfondo Atmosferico */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-600/10 blur-[120px] rounded-full"></div>
        
        {/* TITOLO NEON */}
        <h1 className="text-8xl font-black text-orange-500 mb-12 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] z-10" style={{ fontFamily: 'Courier New, monospace' }}>
            LIAR'S BAR 
        </h1>
        <div className="border-t-2 border-orange-800 w-64 mb-16 opacity-50"></div>
        
        {/* LISTA GIOCATORI */}
        <div className="flex flex-wrap justify-center gap-10 mb-16 z-10 w-full max-w-6xl min-h-[150px]">
            {players.length === 0 && <p className="text-orange-800 animate-pulse text-2xl font-serif">In attesa di avventurieri...</p>}
            {players.map((p, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center group">
                    <div className="w-28 h-28 bg-[#1a120e] rounded-xl border-2 border-orange-900/50 flex items-center justify-center text-6xl shadow-2xl group-hover:border-orange-500 transition-colors">
                        {p.avatar}
                    </div>
                    <div className="mt-4 font-bold text-[#d4c4b5] tracking-widest uppercase bg-black/40 px-4 py-1 rounded">{p.name}</div>
                </motion.div>
            ))}
        </div>

        {/* BOTTONI */}
        <div className="flex gap-8 z-10 items-center">
             <button onClick={exitGame} className="px-8 py-4 border border-orange-900 text-orange-800 uppercase hover:bg-orange-900/20 hover:text-orange-200 transition tracking-widest font-bold">Esci</button>
             
             <button 
                onClick={startGame} 
                disabled={players.length < 2} 
                className="px-16 py-5 bg-gradient-to-r from-orange-700 to-red-800 text-white font-black text-3xl rounded shadow-[0_0_30px_rgba(234,88,12,0.4)] uppercase tracking-widest hover:scale-105 active:scale-95 transition disabled:opacity-20 disabled:shadow-none disabled:grayscale"
             >
                INIZIA PARTITA
             </button>
        </div>
        <div className="absolute bottom-5 text-orange-900/50 text-xs font-bold uppercase tracking-[0.5em]">Tavolo per minimo 2 giocatori</div>
      </div>
    );
  }

  // --- 2. GAME OVER ---
  if (phase === 'GAME_OVER') {
      const winners = tableData?.players.filter(p => p.isAlive || p.isFinished).sort((a,b) => (a.rank||99)-(b.rank||99));
      return (
        <div className="min-h-screen bg-[#0a0503] flex flex-col items-center justify-center text-white relative">
            <h1 className="text-7xl text-[#d4c4b5] font-serif mb-16 uppercase tracking-widest z-10 drop-shadow-md">La Serata è Finita</h1>
            <div className="flex gap-16 z-10 items-end">
                {winners.map((p, i) => (
                    <motion.div key={p.id} initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i*0.2 }} className="text-center flex flex-col items-center">
                        <div className="text-9xl mb-6 filter drop-shadow-[0_10px_20px_black]">{p.avatar}</div>
                        <div className="text-4xl text-orange-500 font-black tracking-wider mb-2">{p.name}</div>
                        <div className="text-sm text-[#8c7b6d] uppercase tracking-[0.3em] border border-[#8c7b6d] px-3 py-1 rounded">{p.rank ? `${p.rank}° Posto` : 'Sopravvissuto'}</div>
                    </motion.div>
                ))}
            </div>
            <button onClick={exitGame} className="mt-24 px-10 py-4 border border-[#4a3b2a] text-[#8c7b6d] uppercase z-10 hover:bg-[#4a3b2a] hover:text-white transition font-bold tracking-widest">Torna alla Lobby</button>
        </div>
      );
  }

  // --- 3. MAIN GAME (TAVOLO 3D & ROULETTE) ---
  return (
    <div className="min-h-screen bg-[#050302] relative overflow-hidden font-sans perspective-[1200px]">
        
        {/* --- SCENA TAVOLO (Visibile in GAME) --- */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${phase === 'ROULETTE' ? 'opacity-0 scale-75 blur-md' : 'opacity-100'}`}>
            
            {/* TAVOLO 3D */}
            <div className="relative w-[900px] h-[600px] bg-[#1e3a29] rounded-[200px] border-[25px] border-[#3d2b1f] shadow-[0_60px_120px_black]"
                 style={{ transform: 'rotateX(35deg)' }}>
                 
                 {/* Texture Panno */}
                 <div className="absolute inset-0 rounded-[170px] opacity-40 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
                 
                 {/* Ombreggiatura interna */}
                 <div className="absolute inset-0 rounded-[170px] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"></div>

                 {/* Logo Tavolo */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black/20 text-7xl font-black tracking-widest pointer-events-none font-serif transform -rotate-6 mix-blend-overlay">
                     LIAR'S
                 </div>

                 {/* CENTRO CARTE (Mazzo) */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 flex items-center justify-center z-10">
                      
                      {/* ANIMAZIONE LANCIO CARTE */}
                      <AnimatePresence>
                         {lastThrow.id > 0 && lastThrow.fromIndex !== -1 && (
                             <motion.div 
                                key={lastThrow.id} 
                                // Partenza: coordinate del giocatore
                                initial={{ 
                                    x: getCoordinates(lastThrow.fromIndex, tableData?.players.length).x,
                                    y: getCoordinates(lastThrow.fromIndex, tableData?.players.length).y,
                                    opacity: 0, 
                                    scale: 1.5,
                                    rotateZ: Math.random() * 360 // Rotazione casuale mentre vola
                                }} 
                                // Arrivo: Centro (0,0)
                                animate={{ x: 0, y: 0, opacity: 1, scale: 1, rotateZ: 0 }} 
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
                                className="absolute w-full h-full bg-red-900 border-2 border-[#d4c4b5] rounded shadow-2xl z-20"
                             >
                                 {/* Retro della carta */}
                                 <div className="w-full h-full bg-[repeating-linear-gradient(45deg,#600_0,#600_10px,#500_10px,#500_20px)] opacity-50"></div>
                             </motion.div>
                         )}
                      </AnimatePresence>

                      {/* Mazzo Statico al Centro */}
                      {tableData?.tableCount > 0 ? (
                          <div className="w-full h-full bg-[#8a1c1c] border-4 border-[#d4c4b5] rounded-lg shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex items-center justify-center transform rotate-3">
                              <span className="text-5xl font-bold text-[#d4c4b5] font-serif">{tableData.tableCount}</span>
                          </div>
                      ) : (
                          <div className="text-[#5c4b3a] font-bold uppercase tracking-widest text-sm border-2 border-dashed border-[#5c4b3a] px-4 py-2 rounded">Piatto Vuoto</div>
                      )}
                 </div>

                 {/* GIOCATORI SEDUTI (Posizionati in modo assoluto rispetto al tavolo ruotato, ma contro-ruotati o gestiti) */}
                 {/* NOTA: Per evitare che i giocatori sembrino piatti, li mettiamo "fuori" dal div ruotato nel container principale, vedi sotto */}
            </div>

            {/* GIOCATORI (Fuori dal rotateX per rimanere dritti) */}
            <div className="absolute inset-0 pointer-events-none">
                {tableData?.players.map((p, i) => {
                     const coords = getCoordinates(i, tableData.players.length);
                     // Aggiustiamo un po' la posizione Y per la prospettiva
                     const perspectiveY = coords.y * 0.8; 
                     
                     return (
                         <div key={p.id} 
                              className="absolute flex flex-col items-center justify-center w-40 transition-all duration-300"
                              style={{ 
                                  top: '50%', left: '50%', 
                                  transform: `translate(${coords.x - 80}px, ${perspectiveY - 80}px)` // -80 è metà w/h per centrare
                              }}
                         >
                             {/* Indicatore Turno */}
                             {p.isTurn && phase !== 'ROULETTE' && (
                                <motion.div 
                                    animate={{ y: [0, -10, 0] }} 
                                    transition={{ repeat: Infinity }}
                                    className="text-orange-500 font-bold uppercase text-[10px] tracking-widest mb-2 drop-shadow-[0_0_5px_orange]"
                                >
                                    Tocca a te
                                </motion.div>
                             )}
                             
                             {/* Avatar */}
                             <div className={`w-24 h-24 rounded-full border-[6px] flex items-center justify-center text-5xl bg-[#15100d] shadow-2xl relative z-20 transition-all duration-300
                                 ${p.isTurn ? 'border-orange-500 scale-110 shadow-[0_0_30px_orange]' : 'border-[#3d2b1f]'}
                                 ${!p.isAlive ? 'grayscale opacity-40' : ''}
                             `}>
                                 {p.isAlive ? p.avatar : '💀'}
                                 
                                 {/* Badge Carte */}
                                 {p.isAlive && !p.isFinished && (
                                     <div className="absolute -bottom-3 bg-[#1a120e] text-[#d4c4b5] text-[10px] font-bold px-3 py-0.5 rounded-full border border-[#3d2b1f] shadow-lg">
                                         {p.cardCount} Carte
                                     </div>
                                 )}
                             </div>
                             
                             {/* Nome */}
                             <div className="mt-4 font-bold text-[#d4c4b5] text-sm bg-black/60 px-3 py-1 rounded backdrop-blur-md shadow-lg border border-white/5">
                                 {p.name}
                             </div>

                             {p.isFinished && <div className="text-green-500 text-[10px] font-black uppercase mt-1 tracking-widest bg-green-900/20 px-2 rounded">Salvo</div>}
                         </div>
                     );
                })}
            </div>

            {/* INFO GAME (Valore Richiesto) */}
            <div className="absolute top-12 left-12 bg-[#1a120e]/80 p-6 rounded-xl border border-[#3d2b1f] backdrop-blur-md">
                <div className="text-[#8c7b6d] text-xs uppercase font-bold tracking-[0.3em] mb-1">Si gioca</div>
                <div className="text-7xl font-serif font-black text-[#ffaa00] drop-shadow-[0_0_15px_rgba(255,170,0,0.6)]">
                    {tableData?.requiredValue}
                </div>
            </div>
        </div>

        {/* === FASE ROULETTE (OVERLAY) === */}
        <AnimatePresence>
            {phase === 'ROULETTE' && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center"
                >
                    {/* Sfondo Rosso Pulsante */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(139,0,0,0.4)_0%,rgba(0,0,0,1)_70%)] animate-pulse"></div>

                    {/* ANIMAZIONE PISTOLA */}
                    <motion.div 
                        // Rinculo se spara (shotResult)
                        animate={shotResult?.status === 'DEAD' ? { x: [-10, 50, 0], rotate: [0, -10, 0] } : {}}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="text-[300px] drop-shadow-[0_20px_60px_red] z-10 relative"
                    >
                        🔫
                        {/* Flash dello sparo */}
                        {shotResult?.status === 'DEAD' && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 0.5] }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-[-50px] left-[-50px] text-yellow-200 text-9xl"
                            >
                                💥
                            </motion.div>
                        )}
                    </motion.div>
                    
                    <h2 className="text-8xl font-black text-red-600 uppercase tracking-widest mt-4 z-10 font-serif">
                        ROULETTE
                    </h2>
                    
                    <div className="mt-12 flex gap-12 z-10">
                         {tableData?.players.map(p => (
                             <div key={p.id} className={`flex flex-col items-center transition-all duration-500 ${p.id === tableData.victimId ? 'opacity-100 scale-125' : 'opacity-20 blur-sm'}`}>
                                 <div className="text-6xl mb-4">{p.avatar}</div>
                                 <div className="text-white font-bold text-xl">{p.name}</div>
                                 {p.id === tableData.victimId && <div className="text-red-500 font-black uppercase text-sm tracking-widest mt-2">Vittima</div>}
                             </div>
                         ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* === OVERLAYS RISULTATI === */}
        <AnimatePresence>
            {revealData && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center">
                    <h2 className="text-9xl font-black mb-16 font-serif tracking-widest">
                        {revealData.result === 'LIE' 
                            ? <span className="text-red-600 drop-shadow-[0_0_50px_red]">BUGIA!</span> 
                            : <span className="text-green-500 drop-shadow-[0_0_50px_green]">VERITÀ!</span>}
                    </h2>
                    <div className="flex gap-8 perspective-[1000px]">
                        {revealData.cards.map((c, i) => (
                            <motion.div 
                                key={i} 
                                initial={{ rotateY: 180, scale: 0.5 }} 
                                animate={{ rotateY: 0, scale: 1 }} 
                                transition={{ delay: i*0.1, type: "spring" }} 
                                className={`w-48 h-72 rounded-xl flex items-center justify-center text-8xl border-8 shadow-2xl ${c.type === 'JOLLY' ? 'bg-[#1a120e] border-red-800 text-red-600' : 'bg-[#e3dcd2] text-black border-[#4a3b2a]'}`}
                            >
                                {c.type === 'JOLLY' ? '💀' : c.type}
                            </motion.div>
                        ))}
                    </div>
                    <p className="mt-12 text-[#8c7b6d] uppercase tracking-widest text-xl">Giocate da {revealData.player}</p>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Schermata Risultato Sparo (Vivo/Morto) */}
        <AnimatePresence>
            {shotResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`absolute inset-0 z-[60] flex flex-col items-center justify-center ${shotResult.status === 'DEAD' ? 'bg-red-950' : 'bg-[#1e3a29]'}`}>
                    <div className="text-[200px] mb-8">{shotResult.status === 'DEAD' ? '💀' : '😅'}</div>
                    <div className="text-9xl font-black text-[#d4c4b5] uppercase tracking-tighter drop-shadow-lg">
                        {shotResult.status === 'DEAD' ? 'ELIMINATO' : 'SALVO'}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="fixed bottom-5 right-5 z-40">
             <button onClick={exitGame} className="text-[#4a3b2a] hover:text-red-500 text-xs font-bold uppercase transition">Termina</button>
        </div>
    </div>
  );
}