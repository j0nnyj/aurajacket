import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiarsBarMobile({ socket, view, setView }) {
  const [hand, setHand] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [gameInfo, setGameInfo] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gunStats, setGunStats] = useState({ probability: '???' });
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    // 1. Chiedi lo stato appena entri
    socket.emit('liars_sync');

    // 2. Ricezione Carte
    socket.on('liars_hand', (cards) => { 
        setHand(cards); 
        setSelectedIndices([]); 
    });
    
    // 3. Info Tavolo
    socket.on('liars_update_table', (data) => {
        setGameInfo(data);
        setIsMyTurn(socket.id === data.activePlayerId);
    });

    // 4. Info Pistola
    socket.on('liars_gun_stats', (stats) => setGunStats(stats));
    
    // 5. Risultati
    socket.on('liars_shot_result', (res) => {
        if(res.playerId === socket.id && res.status === 'DEAD') setView('LIARS_DEAD'); 
    });
    
    socket.on('liars_rank', (rank) => setMyRank(rank));

    return () => { 
        socket.off('liars_hand'); 
        socket.off('liars_update_table'); 
        socket.off('liars_gun_stats');
        socket.off('liars_shot_result');
        socket.off('liars_rank');
    };
  }, [socket]);

  // --- AZIONI ---
  const toggleCard = (index) => {
    if (!isMyTurn) return; 
    if (selectedIndices.includes(index)) {
        setSelectedIndices(selectedIndices.filter(i => i !== index));
    } else {
        if (selectedIndices.length < 3) setSelectedIndices([...selectedIndices, index]);
    }
  };

  const playCards = () => { if (isMyTurn) socket.emit('liars_play_cards', selectedIndices); };
  const callDoubt = () => { if (isMyTurn) socket.emit('liars_doubt'); };
  const pullTrigger = () => { socket.emit('liars_trigger'); };

  // --- MATEMATICA VENTAGLIO ---
  const getCardStyle = (index, total) => {
      const fanAngle = 40; // Gradi totali del ventaglio
      const startAngle = -fanAngle / 2;
      const step = total > 1 ? fanAngle / (total - 1) : 0;
      
      const rotate = startAngle + (step * index);
      // Spostamento X per distanziarle
      const xOffset = (index - (total - 1) / 2) * 25;
      // Spostamento Y per l'arco (più basso ai lati, più alto al centro)
      // Nota: qui "yOffset" positivo le spinge in basso (CSS transform)
      const yOffset = Math.abs(index - (total - 1) / 2) * 15;

      return { rotate, x: xOffset, y: yOffset };
  };

  // --- GESTIONE VISTE ---
  if (view === 'LIARS_LOBBY') return <LobbyView />;
  if (view === 'LIARS_DEAD') return <DeadView />;
  if (view === 'LIARS_WON') return <WonView rank={myRank} />;
  if (view === 'LIARS_ROULETTE') return <RouletteView probability={gunStats.probability} onTrigger={pullTrigger} />;
  if (view === 'LIARS_WAITING_SHOT') return <WaitingShotView />;

  // --- 6. MANO DI GIOCO (MAIN) ---
  if (view === 'LIARS_HAND') {
      const canDoubt = isMyTurn && gameInfo?.tableCount > 0;

      return (
        <div className={`min-h-screen flex flex-col transition-colors duration-500 overflow-hidden ${isMyTurn ? 'bg-[#1a2e22]' : 'bg-[#0f1713]'}`}>
            
            {/* HEADER INFO */}
            <div className="flex flex-col items-center pt-6 pb-2 z-10 relative">
                {isMyTurn ? (
                    <div className="bg-green-600 text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest mb-2 animate-bounce shadow-lg">
                        Tocca a te
                    </div>
                ) : (
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
                        Turno di {gameInfo?.activePlayerName}
                    </div>
                )}
                <div className="text-slate-300 font-bold text-xl drop-shadow-md">
                    Richiesto: <span className="text-orange-500 text-5xl font-black ml-1 drop-shadow-lg" style={{textShadow: '0 0 15px orange'}}>{gameInfo?.requiredValue}</span>
                </div>
            </div>
            
            {/* SPAZIO CENTRALE */}
            <div className="flex-1 relative">
                {/* Qui potresti mettere animazioni extra */}
            </div>

            {/* AREA CARTE (VENTAGLIO) */}
            <div className="relative h-[300px] w-full flex justify-center items-end mb-24 z-0 perspective-1000">
                <AnimatePresence>
                    {hand.map((card, index) => {
                        const isSelected = selectedIndices.includes(index);
                        const style = getCardStyle(index, hand.length);
                        
                        let content = card.type === 'JOLLY' ? '💀' : card.type;
                        let color = (card.type === 'JOLLY' || card.type === 'A') ? 'text-red-600' : 'text-slate-900';
                        
                        return (
                            <motion.button 
                                key={card.id}
                                initial={{ y: 500, rotate: 0 }} // Entrata dal basso
                                animate={{ 
                                    // SE SELEZIONATA: Sale di 120px, rotazione 0, scala 1.2
                                    y: isSelected ? -120 : style.y, 
                                    x: style.x,
                                    rotate: isSelected ? 0 : style.rotate,
                                    scale: isSelected ? 1.2 : 1,
                                    zIndex: isSelected ? 50 : index // Porta davanti
                                }}
                                exit={{ y: 500, opacity: 0 }} // Uscita verso il basso
                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                onClick={() => toggleCard(index)}
                                className={`absolute bottom-10 w-32 h-48 rounded-xl border-4 shadow-2xl flex items-center justify-center transform origin-bottom cursor-pointer
                                    ${isSelected ? 'bg-orange-50 border-orange-500 shadow-[0_20px_50px_rgba(249,115,22,0.6)]' : 'bg-slate-200 border-slate-400 hover:brightness-110'}
                                    ${!isMyTurn ? 'grayscale brightness-50' : ''}
                                `}
                            >
                                {/* Simbolo Grande Centrale */}
                                <span className={`text-6xl font-black ${color}`}>{content}</span>
                                {/* Simbolo Piccolo Angolo SX */}
                                <span className={`absolute top-2 left-2 text-sm font-bold ${color}`}>{content}</span>
                                {/* Simbolo Piccolo Angolo DX (Ruotato) */}
                                <span className={`absolute bottom-2 right-2 text-sm font-bold ${color} rotate-180`}>{content}</span>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* PULSANTIERA FISSA IN BASSO */}
            <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-black/80 z-50 flex gap-3 backdrop-blur-md border-t border-white/10">
                {canDoubt && (
                    <button 
                        onClick={callDoubt}
                        className="flex-1 py-4 bg-slate-800 hover:bg-red-900 border-2 border-slate-600 hover:border-red-500 text-slate-300 hover:text-white rounded-2xl font-black text-xl shadow-lg transition uppercase tracking-widest"
                    >
                        DUBITO
                    </button>
                )}

                <button 
                    disabled={!isMyTurn || selectedIndices.length === 0}
                    onClick={playCards}
                    className={`py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-black text-2xl shadow-lg transition uppercase tracking-widest active:scale-95 disabled:opacity-30 disabled:grayscale ${canDoubt ? 'flex-[2]' : 'w-full'}`}
                >
                    GIOCA
                </button>
            </div>
        </div>
      );
  }

  return <div className="bg-slate-900 text-white h-screen flex items-center justify-center">Caricamento Liar's Bar...</div>;
}

// ==========================================
// SOTTO-COMPONENTI (Viste Secondarie)
// ==========================================

const LobbyView = () => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="text-8xl mb-6 bg-slate-800 rounded-full w-40 h-40 flex items-center justify-center border-4 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.4)]">🔫</div>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 mb-2 uppercase tracking-tighter">LIAR'S BAR</h1>
        <p className="text-slate-400 text-lg mb-12 font-medium">Prepara la tua faccia da poker.</p>
        <div className="bg-slate-800 px-8 py-4 rounded-full border border-slate-700 flex items-center gap-4 animate-pulse shadow-xl">
             <span className="text-slate-200 font-bold uppercase text-sm tracking-widest">In attesa dell'Host</span>
        </div>
    </div>
);

const DeadView = () => (
    <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center p-6 text-center animate-pulse">
        <div className="text-9xl mb-4">💀</div>
        <h1 className="text-6xl font-black text-red-600 mb-4 uppercase tracking-tighter">ELIMINATO</h1>
        <p className="text-red-400 font-bold text-xl">Sei fuori dai giochi.</p>
    </div>
);

const WonView = ({rank}) => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="text-9xl mb-6 animate-bounce">🏆</div>
        <h1 className="text-5xl font-black text-yellow-400 mb-2 uppercase tracking-tighter">SEI SALVO!</h1>
        <p className="text-slate-300 text-xl mb-8 font-bold">Hai finito le carte.</p>
        <div className="bg-slate-800 px-10 py-6 rounded-2xl border-2 border-yellow-500 shadow-xl">
            <p className="text-slate-500 uppercase text-xs font-bold mb-1">Posizione</p>
            <p className="text-6xl font-black text-white">{rank}°</p>
        </div>
    </div>
);

const WaitingShotView = () => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-6 animate-spin-slow text-red-500">🎲</div>
        <h2 className="text-3xl font-bold text-white mb-2">Roulette Russa</h2>
        <p className="text-slate-400">Qualcuno sta premendo il grilletto...</p>
    </div>
);

const RouletteView = ({ probability, onTrigger }) => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-between p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-red-900/20 animate-pulse pointer-events-none"></div>

        <div className="mt-10 z-10">
            <h1 className="text-4xl font-black text-white uppercase mb-2">Tocca a te</h1>
            <p className="text-red-500 font-bold text-xl uppercase tracking-widest">Sopravvivi o Muori</p>
            <div className="mt-4 bg-black/40 px-4 py-2 rounded text-slate-300 border border-slate-700">
                Probabilità morte: <span className="text-white font-bold">{probability}</span>
            </div>
        </div>

        {/* GRILLETTO GIGANTE */}
        <button 
          onClick={onTrigger}
          className="w-64 h-64 bg-slate-800 rounded-full border-8 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.6)] flex flex-col items-center justify-center active:scale-95 transition-transform z-10 group"
        >
            <span className="text-7xl group-hover:scale-110 transition mb-2">🔫</span>
            <span className="text-2xl font-black text-white uppercase">SPARA</span>
        </button>

        <div className="mb-10 text-slate-500 text-sm z-10 font-bold uppercase tracking-widest">
            Premi per scoprire il tuo destino
        </div>
    </div>
);