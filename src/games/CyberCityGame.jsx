import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function CyberCityGame({ socket }) {
  const [state, setState] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    socket.on('cyber_state', setState);
    socket.on('cyber_log', msg => setLogs(p => [msg, ...p].slice(0, 6)));
    return () => { socket.off('cyber_state'); socket.off('cyber_log'); };
  }, [socket]);

  if (!state) return <div className="bg-black h-screen flex items-center justify-center text-green-500 font-mono">LOADING BOARD...</div>;

  // Logica per disegnare la griglia 11x11
  // Bottom: 10->0, Left: 11->19, Top: 20->30, Right: 31->39
  const renderTile = (i) => {
      const t = state.board[i];
      if (!t) return null;
      const owner = t.ownerId ? state.players.find(p => p.sessionId === t.ownerId) : null;
      const playersHere = state.players.filter(p => p.position === i);

      // Stile bordo proprietario
      const borderStyle = owner ? { border: `4px solid ${owner.color}` } : {};

      return (
          <div key={i} className="relative w-full h-full bg-[#1a1a1a] border border-white/10 flex flex-col items-center justify-between p-1 overflow-hidden" style={borderStyle}>
              {/* Fascia Colore */}
              {t.color && <div className="w-full h-1/4 absolute top-0 left-0" style={{ backgroundColor: t.color }}></div>}
              
              {/* Contenuto */}
              <div className="z-10 mt-4 text-[9px] md:text-[10px] text-center font-bold uppercase leading-tight text-white">{t.name}</div>
              
              {/* Case / Hotel */}
              {t.houses > 0 && (
                  <div className="z-10 flex gap-0.5">
                      {t.houses === 5 
                        ? <span className="text-red-500 text-lg">🏨</span> 
                        : Array(t.houses).fill(0).map((_,k) => <span key={k} className="text-green-500 text-xs">🏠</span>)
                      }
                  </div>
              )}

              {/* Prezzo */}
              {t.price && <div className="z-10 text-[9px] mb-1 text-white/70">{t.price}$</div>}

              {/* Pedine */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  {playersHere.map((p, idx) => (
                      <motion.div layoutId={`p-${p.sessionId}`} key={p.sessionId} 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-[10px] bg-black relative"
                        style={{ backgroundColor: p.color, marginLeft: idx * -10 }}
                      >
                          {p.avatar}
                      </motion.div>
                  ))}
              </div>
          </div>
      );
  };

  // Funzione per posizionare nella griglia CSS 11x11
  const getGridPos = (index) => {
      if (index <= 10) return { col: 11 - index, row: 11 }; // Bottom (11,11 -> 1,11)
      if (index <= 20) return { col: 1, row: 11 - (index - 10) }; // Left (1,11 -> 1,1)
      if (index <= 30) return { col: 1 + (index - 20), row: 1 }; // Top (1,1 -> 11,1)
      return { col: 11, row: 1 + (index - 30) }; // Right (11,1 -> 11,11)
  };

  return (
    <div className="h-screen bg-black text-white p-2 flex gap-4">
        {/* TABELLONE GRIGLIA */}
        <div className="h-full aspect-square grid grid-cols-11 grid-rows-11 gap-0.5 bg-gray-900 border-4 border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            {state.board.map((_, i) => {
                const pos = getGridPos(i);
                return <div key={i} style={{ gridColumnStart: pos.col, gridRowStart: pos.row }}>{renderTile(i)}</div>;
            })}
            
            {/* CENTRO (LOGS) */}
            <div className="col-start-2 col-end-11 row-start-2 row-end-11 bg-black/80 flex flex-col items-center justify-center p-8 relative">
                 <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8 italic tracking-tighter opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] pointer-events-none">
                     CYBERPOLY
                 </h1>
                 
                 {/* DADI */}
                 <div className="flex gap-4 mb-6">
                     <div className="w-16 h-16 bg-white text-black text-4xl font-bold flex items-center justify-center rounded-xl shadow-lg border-b-4 border-gray-400">
                         {/* Se lastDice esiste, mostra il primo numero, altrimenti 0 */}
                         {state.lastDice ? state.lastDice[0] : 0}
                     </div>
                     <div className="w-16 h-16 bg-white text-black text-4xl font-bold flex items-center justify-center rounded-xl shadow-lg border-b-4 border-gray-400">
                         {/* Se lastDice esiste, mostra il secondo numero, altrimenti 0 */}
                         {state.lastDice ? state.lastDice[1] : 0}
                     </div>
                 </div>

                 {/* LOG */}
                 <div className="w-full max-w-lg bg-gray-900/90 rounded-xl p-4 h-48 overflow-y-auto font-mono text-sm border border-white/10 shadow-inner custom-scrollbar">
                     {logs.map((l, i) => (
                         <div key={i} className="mb-1 border-b border-white/5 pb-1 last:text-green-400 last:font-bold">{`> ${l}`}</div>
                     ))}
                 </div>
            </div>
        </div>

        {/* SIDEBAR PLAYERS */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2">
            {state.players.map(p => (
                <div key={p.id} className={`p-3 rounded-xl border-l-8 transition-all ${p.id === state.players[state.turnIndex].id ? 'bg-white/10 scale-105' : 'bg-white/5 opacity-70'}`} style={{ borderLeftColor: p.color }}>
                    <div className="flex justify-between">
                        <span className="font-bold uppercase">{p.name}</span>
                        <span>{p.avatar}</span>
                    </div>
                    <div className="text-2xl font-mono text-green-400">{p.money}$</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {/* Pallini proprietà */}
                        {p.properties.map(pid => {
                            const t = state.board[pid];
                            return <div key={pid} className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || 'white' }}></div>
                        })}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}