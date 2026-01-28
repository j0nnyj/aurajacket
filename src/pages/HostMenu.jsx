import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function HostMenu({ socket }) {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [serverInfo, setServerInfo] = useState({ ip: 'LOADING...', port: '...' });
  const [showQrMobile, setShowQrMobile] = useState(false);

  useEffect(() => {
    socket.emit('host_request_update'); 
    socket.emit('request_server_info');

    socket.on('update_player_list', (list) => setPlayers(list));
    socket.on('server_info', (info) => setServerInfo(info));

    return () => {
        socket.off('update_player_list');
        socket.off('server_info');
    };
  }, [socket]);

  const startGame = (gameRoute, gameId) => {
      socket.emit('host_change_game', gameId);
      navigate(gameRoute);
  };

  const kickPlayer = (playerId) => {
      if(window.confirm("Espellere il giocatore?")) socket.emit('host_kick_player', playerId);
  };

  const resetSession = () => {
      if(window.confirm("RESET TOTALE? Tutti i giocatori verranno disconnessi.")) socket.emit('host_new_session');
  };

  const joinUrl = `http://${serverInfo.ip}:${serverInfo.port}`;
  // QR Code pulito per massima leggibilità, il design è intorno
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=5&data=${joinUrl}`;

  return (
    <div className="min-h-screen w-full bg-[#090014] text-white font-sans overflow-x-hidden flex flex-col relative selection:bg-fuchsia-500 selection:text-white">
        
        {/* --- BACKGROUND SYNTHWAVE --- */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
            {/* Sole Retrò */}
            <div className="absolute top-[-10%] left-[20%] w-[60vw] h-[60vw] bg-gradient-to-b from-yellow-500 via-fuchsia-600 to-purple-900 rounded-full blur-[150px] opacity-40"></div>
            {/* Griglia Pavimento Prospettico */}
            <div className="absolute bottom-0 w-full h-[60vh] bg-[linear-gradient(to_top,rgba(255,0,255,0.3)_1px,transparent_1px),linear-gradient(to_right,rgba(255,0,255,0.3)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(1000px)_rotateX(60deg)] origin-bottom opacity-30 after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-t after:from-[#090014] after:via-transparent after:to-transparent"></div>
        </div>

        {/* --- HEADER NEON --- */}
        <header className="px-6 pt-6 pb-2 flex flex-wrap justify-between items-end z-20 relative">
            <div className="mb-4 md:mb-0">
                <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 drop-shadow-[0_0_10px_rgba(255,0,255,0.8)] filter saturate-150">
                    AURAGIOCHET
                    <span className="text-white not-italic ml-1 animate-pulse">_</span>
                </h1>
                <div className="inline-flex items-center gap-3 bg-black/50 px-4 py-2 rounded-sm border-l-4 border-cyan-500 backdrop-blur-md mt-2 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                     <span className="font-mono text-sm text-cyan-300 tracking-widest uppercase font-bold">SYSTEM READY // IP: {serverInfo.ip}</span>
                </div>
            </div>
            
            <div className="flex gap-4">
                 {/* Bottone Mobile QR */}
                 <button onClick={() => setShowQrMobile(!showQrMobile)} className="md:hidden relative group px-6 py-3 bg-black border border-fuchsia-500 text-fuchsia-400 font-bold uppercase tracking-widest text-xs overflow-hidden">
                    <span className="relative z-10 group-hover:text-white transition-colors">{showQrMobile ? 'CHIUDI PORTALE' : 'APRI PORTALE'}</span>
                    <div className="absolute inset-0 bg-fuchsia-600 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                 </button>
                 {/* Bottone Reset */}
                 <button onClick={resetSession} className="relative group px-6 py-3 bg-black border border-red-600 text-red-500 font-bold uppercase tracking-widest text-xs overflow-hidden hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-shadow">
                    <span className="relative z-10 group-hover:text-white transition-colors">RESET SYSTEM</span>
                    <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                 </button>
            </div>
        </header>

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 flex flex-col md:flex-row gap-10 px-8 py-6 z-10 relative">
            
            {/* SINISTRA: GIOCHI OLOGRAFICI */}
            <div className="flex-[3] flex items-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                    
                    <SynthCard 
                        title="IMPOSTER"
                        tagline="Trova l'intruso"
                        color="cyan"
                        icon="🕵️"
                        onClick={() => startGame('/host/imposter', 'IMPOSTER')}
                    />

                    <SynthCard 
                        title="LIAR'S BAR"
                        tagline="Bluff & Roulette"
                        color="red"
                        icon="🔫"
                        onClick={() => startGame('/host/liarsbar', 'LIARS_BAR')}
                    />

                    <SynthCard 
                        title="TRASH TALK"
                        tagline="Solo Cattiverie"
                        color="yellow"
                        icon="🤬"
                        onClick={() => startGame('/host/trashtalk', 'TRASHTALK')}
                    />

                </div>
            </div>

            {/* DESTRA: PORTALE QR (Visibile su Desktop o su Mobile se attivato) */}
            <AnimatePresence>
                {(window.innerWidth >= 768 || showQrMobile) && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className={`
                            ${showQrMobile ? 'fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6' : 'flex-1 flex flex-col justify-center max-w-md'}
                        `}
                        onClick={() => showQrMobile && setShowQrMobile(false)}
                    >
                        <div className="relative group cursor-pointer">
                            {/* Effetti Neon Portale */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-500 rounded-3xl blur-xl opacity-70 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500 animate-pulse-slow"></div>
                            <div className="absolute -inset-px bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400 rounded-[1.6rem] opacity-100 z-0"></div>
                            
                            <div className="relative z-10 bg-[#090014] rounded-3xl p-8 flex flex-col items-center text-center border-[3px] border-black/50 h-full">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 mb-6 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                                     DATA PORTAL 
                                </h3>
                                
                                <div className="bg-white p-3 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.2)] mb-6 group-hover:scale-105 transition-transform relative overflow-hidden">
                                     {/* Linea di scansione */}
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-fuchsia-500 shadow-[0_0_10px_#d946ef] animate-scan pointer-events-none z-20"></div>
                                    <img src={qrUrl} alt="Join QR" className="w-48 h-48 md:w-64 md:h-64 object-contain relative z-10" />
                                </div>

                                <div className="w-full bg-black/80 border-2 border-fuchsia-500/50 p-3 rounded-lg">
                                    <p className="font-mono text-lg md:text-2xl font-bold text-fuchsia-400 tracking-wider glow-text">
                                        {serverInfo.ip}
                                    </p>
                                    <p className="text-cyan-500/70 font-mono text-xs uppercase mt-1">PORT: 3000 // STATUS: OPEN</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* --- FOOTER ROSTER (Cartucce Dati) --- */}
        <div className="fixed bottom-0 left-0 right-0 h-24 bg-[#090014]/80 backdrop-blur-xl border-t-2 border-fuchsia-500/30 z-30 flex flex-col">
             {/* Linea luminosa superiore */}
            <div className="w-full h-[2px] bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-500 shadow-[0_0_15px_#d946ef]"></div>
            
            <div className="flex-1 flex items-center px-6 overflow-x-auto custom-scrollbar-x py-2">
                <div className="mr-6 flex flex-col justify-center shrink-0">
                     <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Player Slots</span>
                     <span className="text-2xl font-black italic text-fuchsia-500 drop-shadow-[0_0_5px_#d946ef]">{players.length} ACTIVE</span>
                </div>

                {players.length === 0 ? (
                    <div className="flex items-center gap-3 opacity-50 select-none border-2 border-dashed border-fuchsia-500/50 rounded-lg px-4 py-2">
                        <span className="text-sm font-bold uppercase tracking-wide text-fuchsia-300 animate-pulse">INSERT COIN... (Waiting players)</span>
                    </div>
                ) : (
                    players.map(p => (
                        <motion.div 
                            initial={{ scale: 0, x: -50 }} animate={{ scale: 1, x: 0 }}
                            key={p.id} 
                            onClick={() => kickPlayer(p.id)}
                            className="group relative flex-shrink-0 flex items-center gap-3 bg-black/60 pl-3 pr-5 py-2 mx-2 rounded-md border-2 border-cyan-500/50 hover:border-red-500 hover:bg-red-950/50 transition-all cursor-pointer overflow-hidden shadow-[0_0_15px_rgba(0,255,255,0.1)] hover:shadow-[0_0_25px_rgba(220,38,38,0.3)]"
                            title="Clicca per espellere"
                        >
                            {/* Effetto "KICK" al passaggio del mouse */}
                            <div className="absolute inset-0 bg-red-600 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            
                            <div className="text-3xl relative z-10 drop-shadow-md">{p.avatar}</div>
                            <div className="flex flex-col relative z-10">
                                <span className="text-sm font-black uppercase italic leading-none text-cyan-100 group-hover:text-white transition-colors truncate max-w-[120px]">
                                    {p.name}
                                </span>
                                <span className={`text-[8px] font-bold uppercase tracking-wider mt-1 ${p.isConnected ? 'text-green-400 drop-shadow-[0_0_5px_#22c55e]' : 'text-red-500'}`}>
                                    {p.isConnected ? '● ONLINE' : '○ DISCONNECTED'}
                                </span>
                            </div>
                            <div className="absolute right-0 top-0 h-full w-1 bg-cyan-500 group-hover:bg-red-500 transition-colors"></div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>

        {/* STILI CSS AGGIUNTIVI */}
        <style>{`
            .custom-scrollbar-x::-webkit-scrollbar { height: 6px; }
            .custom-scrollbar-x::-webkit-scrollbar-track { background: rgba(255,0,255,0.1); }
            .custom-scrollbar-x::-webkit-scrollbar-thumb { background: #d946ef; border-radius: 3px; }
            .custom-scrollbar-x::-webkit-scrollbar-thumb:hover { background: #f0abfc; box-shadow: 0 0 10px #d946ef; }
            
            @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
            .animate-scan { animation: scan 2s linear infinite; }
            .glow-text { text-shadow: 0 0 10px currentColor; }
        `}</style>
    </div>
  );
}

// --- COMPONENTE SYNTH-CARD (Le schede dei giochi) ---
function SynthCard({ title, tagline, color, icon, onClick }) {
    // Mappatura colori per i diversi stati (cyan, red, yellow)
    const colors = {
        cyan: {
            border: 'border-cyan-500',
            shadow: 'hover:shadow-[0_0_40px_rgba(0,255,255,0.6)]',
            text: 'text-cyan-400',
            bgGrad: 'from-cyan-500/20 via-cyan-900/10 to-transparent',
            btn: 'bg-cyan-500 group-hover:bg-cyan-400'
        },
        red: {
            border: 'border-red-500',
            shadow: 'hover:shadow-[0_0_40px_rgba(239,68,68,0.6)]',
            text: 'text-red-400',
            bgGrad: 'from-red-500/20 via-red-900/10 to-transparent',
            btn: 'bg-red-600 group-hover:bg-red-500'
        },
        yellow: {
            border: 'border-yellow-400',
            shadow: 'hover:shadow-[0_0_40px_rgba(250,204,21,0.6)]',
            text: 'text-yellow-400',
            bgGrad: 'from-yellow-400/20 via-yellow-900/10 to-transparent',
            btn: 'bg-yellow-500 group-hover:bg-yellow-400'
        }
    };
    const c = colors[color];

    return (
        <motion.button 
            whileHover={{ scale: 1.03, rotateX: 5, rotateY: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            // Su desktop usiamo la prospettiva 3D
            className={`
                group relative w-full aspect-[3/4] md:aspect-[4/5] rounded-2xl p-[3px] transition-all duration-300 cursor-pointer text-left
                md:[transform:perspective(1000px)_rotateX(10deg)_rotateY(-5deg)] md:hover:[transform:perspective(1000px)_rotateX(0deg)_rotateY(0deg)]
                bg-black border-2 ${c.border} ${c.shadow}
            `}
        >
            {/* Sfondo interno con gradiente e pattern */}
            <div className="absolute inset-0 bg-[#090014] rounded-[13px] overflow-hidden z-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${c.bgGrad} opacity-50 group-hover:opacity-80 transition-opacity`}></div>
                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')] bg-[size:100px]"></div>
            </div>

            {/* Contenuto */}
            <div className="relative z-10 h-full flex flex-col justify-between p-6">
                {/* Header Card */}
                <div className="flex justify-between items-start">
                    <div className={`inline-block px-3 py-1 rounded-sm border ${c.border} bg-black/50 backdrop-blur-sm text-[10px] font-black uppercase tracking-[0.2em] ${c.text} glow-text`}>
                        ARCADE UNIT
                    </div>
                    <div className={`text-5xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 drop-shadow-[0_0_10px_currentColor] ${c.text}`}>
                        {icon}
                    </div>
                </div>

                {/* Titolo Grande */}
                <div className="mt-auto mb-6">
                    <h2 className={`text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none drop-shadow-lg ${c.text} glow-text scale-y-110`}>
                        {title}
                    </h2>
                    <p className="text-white/70 font-bold uppercase tracking-widest text-xs mt-2 pl-1">
                        {tagline}
                    </p>
                </div>

                {/* Bottone "START" finto */}
                <div className={`w-full py-3 text-center rounded-sm font-black uppercase tracking-[0.3em] text-black text-sm transition-all shadow-[0_0_15px_currentColor] ${c.btn}`}>
                    <span className="group-hover:animate-pulse">INSERT START</span>
                </div>
            </div>

            {/* Effetto Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[size:100%_4px] z-20 opacity-20"></div>
        </motion.button>
    );
}