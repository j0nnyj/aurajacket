import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function HostMenu({ socket }) {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [joinUrl, setJoinUrl] = useState('');
  
  // STATO PER IL POPUP DI ESPULSIONE
  const [kickTarget, setKickTarget] = useState(null); 

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  useEffect(() => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    setJoinUrl(`${protocol}//${hostname}${port}`);

    socket.emit('request_server_info');
    socket.emit('host_request_update');

    socket.on('server_info', (info) => {
        if (isLocal && info.ip) setJoinUrl(`http://${info.ip}:${info.port}`);
    });

    socket.on('update_player_list', (list) => setPlayers(list));

    return () => {
        socket.off('server_info');
        socket.off('update_player_list');
    };
  }, [socket, isLocal]);

  // --- CORREZIONE QUI: AGGIUNTO TRASHTALK ---
  const selectGame = (game) => {
    if (game === 'imposter') {
        socket.emit('host_change_game', 'IMPOSTER');
        navigate('/host/imposter');
    } else if (game === 'liarsbar') {
        socket.emit('host_change_game', 'LIARS_BAR');
        navigate('/host/liarsbar');
    } else if (game === 'trashtalk') { // <--- AGGIUNTO QUESTO BLOCCO
        socket.emit('host_change_game', 'TRASHTALK');
        navigate('/host/trashtalk');
    }
  };

  const resetSession = () => {
      if(confirm("Vuoi davvero disconnettere tutti e creare una nuova sessione?")) {
          socket.emit('host_new_session');
      }
  };

  // FUNZIONE PER ESPELLERE
  const confirmKick = () => {
      if (kickTarget) {
          socket.emit('host_kick_player', kickTarget.id);
          setKickTarget(null);
      }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans relative overflow-hidden flex flex-col items-center">
      
      {/* SFONDO AMBIENTALE */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[120px]"></div>
      </div>

      {/* MODALE DI CONFERMA ESPULSIONE */}
      <AnimatePresence>
          {kickTarget && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center"
                onClick={() => setKickTarget(null)} // Chiudi se clicchi fuori
              >
                  <motion.div 
                    initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#1a1a1a] border-2 border-red-600 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(220,38,38,0.4)]"
                  >
                      <div className="text-6xl mb-4 grayscale opacity-80">{kickTarget.avatar}</div>
                      <h2 className="text-2xl font-black text-white mb-2">ESPELLERE {kickTarget.name}?</h2>
                      <p className="text-slate-400 text-sm mb-8">Verrà disconnesso dalla lobby.</p>
                      
                      <div className="flex gap-4">
                          <button onClick={() => setKickTarget(null)} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition">ANNULLA</button>
                          <button onClick={confirmKick} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black shadow-lg hover:shadow-red-600/40 transition">ESPELLI</button>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="z-10 text-center pt-12 pb-8">
          <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-2 tracking-tighter drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            AURAGIOCHET
          </h1>
          <p className="text-indigo-300/50 text-xs font-bold uppercase tracking-[0.6em]">Console di Comando</p>
      </div>

      {/* CONTENT GRID */}
      <div className="flex-1 flex items-center justify-center gap-12 px-20 z-10 w-full max-w-[1600px] mx-auto">
          
          {/* COLONNA SINISTRA: CONNESSIONE */}
          <div className="w-1/3 flex flex-col gap-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center">
                  <div className="bg-white p-4 rounded-2xl mb-6 shadow-inner">
                      {joinUrl && <QRCodeSVG value={joinUrl} size={180} />}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Entra in Partita</h3>
                  <div className="bg-black/40 px-6 py-3 rounded-xl border border-white/5 font-mono text-indigo-300 font-bold text-lg tracking-wider shadow-inner break-all">
                      {joinUrl || "Cercando..."}
                  </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex justify-between items-center">
                  <div>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Giocatori</p>
                      <p className="text-3xl font-black text-white">{players.length}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Stato Server</p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                          <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${isLocal ? 'bg-green-500 text-green-500' : 'bg-cyan-400 text-cyan-400'}`}></div>
                          <span className={`font-bold text-sm ${isLocal ? 'text-green-400' : 'text-cyan-400'}`}>
                              {isLocal ? "Locale (LAN)" : "Globale (Web)"}
                          </span>
                      </div>
                  </div>
              </div>
          </div>

          {/* COLONNA DESTRA: SELEZIONE GIOCHI (AGGIORNATA PER 3 GIOCHI) */}
          <div className="w-2/3 grid grid-cols-3 gap-6 h-full items-center"> {/* CAMBIATO grid-cols-2 in grid-cols-3 */}
                
                {/* 1. IMPOSTER */}
                <motion.div whileHover={{ scale: 1.05, translateY: -5 }} whileTap={{ scale: 0.98 }} className="bg-[#1a1a1a] rounded-3xl border border-white/10 overflow-hidden cursor-pointer group shadow-2xl relative transition-all duration-300 hover:border-purple-500 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] flex flex-col" onClick={() => selectGame('imposter')}>
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="flex-1 flex items-center justify-center text-8xl group-hover:scale-110 transition-transform duration-500 drop-shadow-lg min-h-[180px]">🕵️‍♂️</div>
                    <div className="p-6 relative z-10 bg-black/40 backdrop-blur-md border-t border-white/5">
                        <h2 className="text-3xl font-black uppercase mb-1 group-hover:text-purple-400 transition-colors">Impostore</h2>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium uppercase tracking-wide">Social deduction.</p>
                    </div>
                </motion.div>

                {/* 2. LIAR'S BAR */}
                <motion.div whileHover={{ scale: 1.05, translateY: -5 }} whileTap={{ scale: 0.98 }} className="bg-[#1a1a1a] rounded-3xl border border-white/10 overflow-hidden cursor-pointer group shadow-2xl relative transition-all duration-300 hover:border-orange-500 hover:shadow-[0_0_40px_rgba(249,115,22,0.3)] flex flex-col" onClick={() => selectGame('liarsbar')}>
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="flex-1 flex items-center justify-center text-8xl group-hover:scale-110 transition-transform duration-500 drop-shadow-lg min-h-[180px]">🔫</div>
                    <div className="p-6 relative z-10 bg-black/40 backdrop-blur-md border-t border-white/5">
                        <h2 className="text-3xl font-black uppercase mb-1 group-hover:text-orange-400 transition-colors">Liar's Bar</h2>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium uppercase tracking-wide">Bluff & Roulette.</p>
                    </div>
                </motion.div>

                {/* 3. TRASH TALK (NUOVO) */}
                <motion.div whileHover={{ scale: 1.05, translateY: -5 }} whileTap={{ scale: 0.98 }} className="bg-[#1a1a1a] rounded-3xl border border-white/10 overflow-hidden cursor-pointer group shadow-2xl relative transition-all duration-300 hover:border-yellow-500 hover:shadow-[0_0_40px_rgba(234,179,8,0.3)] flex flex-col" onClick={() => selectGame('trashtalk')}>
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 to-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="flex-1 flex items-center justify-center text-8xl group-hover:scale-110 transition-transform duration-500 drop-shadow-lg min-h-[180px]">🤬</div>
                    <div className="p-6 relative z-10 bg-black/40 backdrop-blur-md border-t border-white/5">
                        <h2 className="text-3xl font-black uppercase mb-1 group-hover:text-yellow-400 transition-colors">Trash Talk</h2>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium uppercase tracking-wide">La verità fa male.</p>
                    </div>
                </motion.div>

          </div>
      </div>

      {/* FOOTER: LISTA GIOCATORI CONNESSI (CON KICK) */}
      <div className="h-28 border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center px-10 gap-6 overflow-hidden mt-8 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20 w-full">
          <div className="flex flex-col justify-center border-r border-white/10 pr-6 mr-2 h-full py-4 min-w-[150px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Stanza D'Attesa</span>
              <span className="text-3xl font-black text-white">{players.length} <span className="text-sm font-normal text-slate-400">Giocatori</span></span>
          </div>
          
          <div className="flex gap-4 overflow-x-auto items-center h-full py-2 scrollbar-hide w-full">
              <AnimatePresence>
                  {players.map((p, i) => (
                      <motion.div 
                        key={p.id || i} 
                        initial={{ scale: 0, opacity: 0, x: 20 }}
                        animate={{ scale: 1, opacity: 1, x: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setKickTarget(p)} // CLICCA PER ESPELLERE
                        className="flex items-center gap-3 bg-gradient-to-b from-white/10 to-white/5 px-5 py-3 rounded-2xl border border-white/10 min-w-fit shadow-lg cursor-pointer hover:bg-red-900/20 hover:border-red-500/50 transition-all group"
                      >
                          <div className="bg-black/30 rounded-full w-10 h-10 flex items-center justify-center text-2xl shadow-inner border border-white/5">
                              {p.avatar}
                          </div>
                          <div className="flex flex-col">
                              <span className="font-bold text-sm text-white group-hover:text-red-200">{p.name}</span>
                              <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider group-hover:text-red-400 group-hover:content-['ESPELLI?']">Pronto</span>
                          </div>
                      </motion.div>
                  ))}
              </AnimatePresence>
              
              {players.length === 0 && (
                  <span className="text-slate-600 italic text-sm animate-pulse ml-4">Nessuno connesso...</span>
              )}
          </div>

          <div className="ml-auto pl-6 border-l border-white/10 h-full flex items-center">
                <button onClick={resetSession} className="text-red-500/50 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition border border-transparent hover:border-red-500/20 whitespace-nowrap">
                    Reset Sessione
                </button>
          </div>
      </div>

    </div>
  );
}