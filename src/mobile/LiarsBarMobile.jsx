import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiarsBarMobile({ socket, view, setView }) {
  const [hand, setHand] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]); 
  const [gameInfo, setGameInfo] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gunStats, setGunStats] = useState({ probability: '???' });
  const [myRank, setMyRank] = useState(null);
  const [revealInfo, setRevealInfo] = useState(null); 
  // FIX: Stato per bloccare il doppio click
  const [hasShot, setHasShot] = useState(false);

  useEffect(() => {
    socket.emit('liars_sync');
    setHasShot(false);

    socket.on('liars_hand', (cards) => { 
        setHand(cards); 
        setSelectedIndices([]); 
    });
    
    socket.on('liars_update_table', (data) => {
        setGameInfo(data);
        setIsMyTurn(socket.id === data.activePlayerId);
        if(data.phase !== 'PLAYING') setRevealInfo(null);
    });

    socket.on('liars_gun_stats', (stats) => setGunStats(stats));
    
    // --- FIX SINCRONIZZAZIONE MORTE ---
    socket.on('liars_shot_result', (res) => {
        if(res.playerId === socket.id && res.status === 'DEAD') {
            // Vibrazione tattile per suspense (se supportata dal browser mobile)
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            
            // ASPETTA 3 SECONDI (Tempo Spin TV) PRIMA DI MOSTRARE LA SCHERMATA MORTA
            setTimeout(() => {
                if (navigator.vibrate) navigator.vibrate(500); // Vibrazione lunga alla morte
                setView('LIARS_DEAD');
            }, 3000); 
        }
    });
    
    socket.on('liars_rank', (rank) => setMyRank(rank));

    socket.on('liars_reveal', (data) => {
        if (data.loserId === socket.id) {
            // Anche qui, aspettiamo 1.5s per sincronizzarci con la TV
            setTimeout(() => {
                setRevealInfo({ 
                    type: 'LOSE', 
                    msg: data.result === 'LIE' ? 'TI HANNO SCOPERTO!' : 'HAI DUBITATO MALE!' 
                });
            }, 1500);
        }
    });

    return () => { 
        socket.off('liars_hand'); socket.off('liars_update_table'); socket.off('liars_gun_stats'); 
        socket.off('liars_shot_result'); socket.off('liars_rank'); socket.off('liars_reveal');
    };
  }, [socket, setView]);

  // RESET DEL BLOCCO QUANDO CAMBIA LA VISTA
  useEffect(() => {
      setHasShot(false);
  }, [view]);

  const toggleCard = (index) => {
    if (!isMyTurn) return; 
    if (selectedIndices.includes(index)) setSelectedIndices(selectedIndices.filter(i => i !== index));
    else if (selectedIndices.length < 3) setSelectedIndices([...selectedIndices, index]);
  };
  const playCards = () => { if (isMyTurn) socket.emit('liars_play_cards', selectedIndices); };
  const callDoubt = () => { if (isMyTurn) socket.emit('liars_doubt'); };
  
  // FIX: Funzione di sparo protetta
  const pullTrigger = () => { 
      if (hasShot) return; // BLOCCO DOPPIO CLICK
      setHasShot(true);    // Disabilita UI
      socket.emit('liars_trigger'); 
  };
  
  // Rotazione carte a ventaglio
  const getFanRotation = (index, total) => { const angle = 40; const start = -angle / 2; const step = total > 1 ? angle / (total - 1) : 0; return start + (step * index); };

  // GESTIONE VISTE
  if (view === 'LIARS_LOBBY') return <LobbyView />;
  if (view === 'LIARS_DEAD') return <DeadView />;
  if (view === 'LIARS_WON' || view === 'LIARS_GAME_OVER') return <LiarsBarWonView rank={myRank} />;

  // FIX: Passo lo stato hasShot alla vista Roulette
  if (view === 'LIARS_ROULETTE') return <RouletteView probability={gunStats.probability} onTrigger={pullTrigger} hasShot={hasShot} />;
  if (view === 'LIARS_WAITING_SHOT') return <WaitingShotView />;

  // SCHERMATA ROSSA DI ERRORE (DUBBIO FALLITO)
  if (revealInfo) {
      return (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-red-900/40 animate-pulse"></div>
              <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,#000,#000_20px,#ff0000_20px,#ff0000_40px)]"></div>
              <motion.div initial={{ scale: 2, opacity: 0, rotate: -15 }} animate={{ scale: 1, opacity: 1, rotate: -5 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="relative z-10 border-8 border-red-600 p-8 rounded-xl bg-black/80 backdrop-blur-md shadow-[0_0_100px_red]">
                  <div className="text-8xl mb-4 text-center animate-bounce">🚨</div>
                  <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-800 uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] text-center leading-none">{revealInfo.msg === 'TI HANNO SCOPERTO!' ? 'BECCATO!' : 'ERRORE!'}</h1>
                  <div className="w-full h-1 bg-red-600 my-4"></div>
                  <p className="text-white font-bold text-xl uppercase tracking-[0.3em] text-center">{revealInfo.msg}</p>
              </motion.div>
              <p className="absolute bottom-10 text-red-500/70 font-mono text-sm uppercase tracking-widest animate-pulse">Preparati alla Roulette...</p>
          </div>
      );
  }

  // VISTA MANO CARTE
  if (view === 'LIARS_HAND') {
      const canDoubt = isMyTurn && gameInfo?.tableCount > 0;
      return (
        <div className={`min-h-screen flex flex-col transition-colors duration-500 overflow-hidden bg-[#050505]`}>
            {/* Header Turno */}
            <div className="flex flex-col items-center pt-6 pb-2 z-10 relative bg-gradient-to-b from-black to-transparent">
                {isMyTurn ? <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-[0.2em] mb-2 animate-bounce shadow-[0_0_15px_rgba(234,88,12,0.5)]">Il tuo turno</div> : <div className="text-orange-300/50 text-xs font-bold uppercase tracking-[0.2em] mb-2 bg-black/60 px-4 py-1 rounded-full border border-orange-900/30">Turno di {gameInfo?.activePlayerName}</div>}
                <div className="text-orange-100/80 font-bold text-xl drop-shadow-md flex flex-col items-center mt-2"><span className="text-[10px] uppercase tracking-[0.4em] mb-1 text-orange-400/60 leading-none">Richiesto</span><span className="text-orange-500 text-6xl font-black drop-shadow-[0_0_25px_rgba(234,88,12,0.8)] font-serif leading-none">{gameInfo?.requiredValue}</span></div>
            </div>
            
            {/* Area Carte Selezionate */}
            <div className="flex-1 flex items-center justify-center flex-col z-20 py-4">
                {selectedIndices.length > 0 ? (
                    <div className="flex gap-3 items-center justify-center pl-4 pr-4 flex-wrap"><AnimatePresence>{selectedIndices.map((originalIndex) => { const card = hand[originalIndex]; if (!card) return null; let content = card.type === 'JOLLY' ? '💀' : card.type; let color = (card.type === 'JOLLY' || card.type === 'A') ? 'text-red-600' : 'text-slate-900'; return (<motion.button key={card.id} initial={{ scale: 0, y: 100, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.5, y: 50, opacity: 0 }} onClick={() => toggleCard(originalIndex)} className="w-20 h-32 bg-orange-50 rounded-xl border-[3px] border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.5)] flex items-center justify-center relative active:scale-95 transition-transform"><span className={`text-4xl font-black ${color}`}>{content}</span><div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md font-bold text-xs leading-none pt-[1px]">✕</div></motion.button>); })}</AnimatePresence></div>
                ) : (<div className="text-white/20 font-bold uppercase tracking-[0.2em] text-xs border-2 border-dashed border-white/10 px-6 py-4 rounded-xl animate-pulse">Tocca le carte in basso</div>)}
            </div>
            
            {/* Mano Carte (Ventaglio) */}
            <div className="h-[220px] w-full flex justify-center items-end mb-28 z-10 relative overflow-visible">
                {hand.map((card, index) => { const isSelected = selectedIndices.includes(index); const rotation = getFanRotation(index, hand.length); let content = card.type === 'JOLLY' ? '💀' : card.type; let color = (card.type === 'JOLLY' || card.type === 'A') ? 'text-red-600' : 'text-slate-900'; return (<motion.button key={card.id} animate={{ y: isSelected ? 200 : 0, rotate: rotation, opacity: isSelected ? 0 : 1 }} style={{ x: (index - (hand.length - 1) / 2) * 28, transformOrigin: 'bottom center' }} onClick={() => toggleCard(index)} className={`absolute bottom-0 w-24 h-40 bg-slate-200 rounded-xl border-[3px] border-slate-400 shadow-xl flex items-center justify-center active:y-[10px] transition-all ${!isMyTurn ? 'grayscale brightness-50 pointer-events-none' : ''}`}><span className={`text-5xl font-black ${color}`}>{content}</span><span className={`absolute top-1 left-2 text-xs font-bold ${color}`}>{content}</span><span className={`absolute bottom-1 right-2 text-xs font-bold ${color} rotate-180`}>{content}</span></motion.button>); })}
            </div>
            
            {/* Controlli */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black via-black/95 to-transparent z-50 flex gap-3 backdrop-blur-md pb-8 border-t border-white/5">
                {canDoubt && <button onClick={callDoubt} className="flex-1 py-4 bg-[#1a0a0a] border-2 border-red-900/50 text-red-200/80 rounded-2xl font-black text-lg shadow-[0_0_15px_rgba(153,27,27,0.2)] uppercase active:scale-95 transition-all tracking-[0.2em] hover:border-red-500 hover:text-red-100">DUBITO</button>}
                <button disabled={!isMyTurn || selectedIndices.length === 0} onClick={playCards} className={`flex-[2] py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-black text-xl shadow-[0_0_25px_rgba(234,88,12,0.4)] uppercase active:scale-95 transition-all tracking-[0.3em] border-2 border-orange-400/50 disabled:opacity-30 disabled:grayscale disabled:shadow-none`}>GIOCA ({selectedIndices.length})</button>
            </div>
        </div>
      );
  }
  return <div className="bg-[#050505] text-white h-screen flex items-center justify-center font-bold tracking-widest animate-pulse">Caricamento Sistema...</div>;
}

// --- VISTE SECONDARIE ---
const LobbyView = () => (<div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden"><div className="absolute inset-0 bg-orange-600/10 blur-[100px] pointer-events-none"></div><div className="text-7xl mb-6 bg-gradient-to-br from-orange-900 to-black rounded-full w-40 h-40 flex items-center justify-center border-4 border-orange-500/50 shadow-[0_0_50px_rgba(234,88,12,0.4)] relative z-10">🔫</div><h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 mb-4 uppercase tracking-tighter drop-shadow-lg relative z-10">LIAR'S BAR</h1><p className="text-orange-200/60 text-base mb-10 font-medium tracking-wider relative z-10">In attesa dell'Host...</p><div className="bg-black/60 px-6 py-3 rounded-full border border-orange-500/30 text-xs font-bold uppercase tracking-[0.3em] text-orange-300 animate-pulse shadow-lg backdrop-blur-md relative z-10">Prepara il tuo bluff</div></div>);
const DeadView = () => (<div className="min-h-screen bg-[#1a0505] flex flex-col items-center justify-center p-6 text-center animate-pulse relative overflow-hidden"><div className="absolute inset-0 bg-red-900/20 blur-[100px] pointer-events-none"></div><div className="text-[120px] mb-4 drop-shadow-[0_0_40px_red] relative z-10">💀</div><h1 className="text-6xl font-black text-red-600 mb-4 uppercase tracking-tighter drop-shadow-2xl relative z-10">ELIMINATO</h1><p className="text-red-400/80 font-bold text-xl tracking-widest border-t border-red-900/50 pt-4 relative z-10">Game Over</p></div>);

const LiarsBarWonView = ({rank}) => {
    let message = "SOPRAVVISSUTO"; let subMessage = "Hai completato la partita."; let gradient = "from-slate-900 to-black"; let color = "text-white"; let icon = "🏆";
    if (rank === 1) { message = "CAMPIONE DI LIAR'S BAR"; subMessage = "Nessuno ha scoperto i tuoi bluff."; gradient = "from-orange-700 to-black"; color = "text-orange-400"; icon = "👑"; }
    else if (rank === 2) { message = "ARGENTO"; subMessage = "Quasi un maestro."; gradient = "from-gray-700 to-black"; color = "text-slate-300"; icon = "🥈"; }
    else if (rank === 3) { message = "BRONZO"; subMessage = "Sul podio per un pelo."; gradient = "from-red-900 to-black"; color = "text-red-400"; icon = "🥉"; }
    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden bg-gradient-to-b ${gradient}`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="text-[100px] mb-6 animate-bounce drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] relative z-10">{icon}</div>
            <h1 className={`text-4xl font-black ${color} mb-2 uppercase tracking-tighter drop-shadow-lg relative z-10 leading-tight`}>{message}</h1>
            <p className="text-white/60 text-lg mb-12 font-bold tracking-wider relative z-10">{subMessage}</p>
            <div className="bg-black/40 px-12 py-8 rounded-3xl border-2 border-white/10 shadow-2xl backdrop-blur-md relative z-10"><p className="text-white/50 uppercase text-xs font-bold mb-2 tracking-[0.5em]">Posizione</p><p className={`text-9xl font-black ${color} drop-shadow-xl`}>{rank}°</p></div>
        </div>
    );
};

const WaitingShotView = () => (<div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"><div className="absolute inset-0 bg-red-900/10 blur-[80px] animate-pulse pointer-events-none"></div><div className="text-7xl mb-6 animate-spin-slow text-red-500 drop-shadow-[0_0_25px_red] relative z-10">🎲</div><h2 className="text-3xl font-black text-white mb-3 uppercase tracking-wider relative z-10">Roulette Russa</h2><p className="text-red-300/70 font-medium tracking-widest relative z-10 bg-black/40 px-5 py-2 rounded-full text-sm">Qualcuno sta premendo il grilletto...</p></div>);

// FIX: RouletteView aggiornata con il blocco visivo (disabilita bottone se hasShot è true)
const RouletteView = ({ probability, onTrigger, hasShot }) => (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-between p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-red-900/20 animate-pulse pointer-events-none"></div>
        <div className="mt-12 z-10">
            <h1 className="text-4xl font-black text-white uppercase mb-3 tracking-tighter drop-shadow-lg">Tocca a te</h1>
            <p className="text-red-500 font-black text-xl uppercase tracking-[0.3em] drop-shadow-[0_0_15px_red] animate-pulse">Sopravvivi o Muori</p>
            <div className="mt-6 bg-black/60 px-6 py-3 rounded-2xl border border-red-900/50 backdrop-blur-md shadow-xl">
                <span className="text-red-300/70 uppercase text-[10px] font-bold tracking-widest block mb-1">Probabilità morte</span>
                <span className="text-red-100 font-black text-2xl tracking-wider">{probability}</span>
            </div>
        </div>
        
        <button 
            onClick={onTrigger} 
            disabled={hasShot} // FIX: Disabilita il click
            className={`
                w-64 h-64 rounded-full border-[6px] flex flex-col items-center justify-center shadow-[0_0_60px_rgba(220,38,38,0.6)] 
                transition-all duration-200 z-10 group
                ${hasShot 
                    ? 'bg-gray-900 border-gray-700 opacity-50 cursor-not-allowed scale-95' // Stile disabilitato
                    : 'bg-gradient-to-br from-black to-red-950 border-red-600 hover:shadow-[0_0_100px_rgba(220,38,38,0.9)] hover:border-red-500 active:scale-90'
                }
            `}
        >
            <span className={`text-7xl transition mb-3 drop-shadow-2xl ${hasShot ? '' : 'group-hover:scale-110'}`}>🔫</span>
            <span className="text-3xl font-black text-white uppercase tracking-[0.2em] drop-shadow-lg">
                {hasShot ? '...' : 'SPARA'}
            </span>
        </button>
        
        <div className="mb-10 text-red-300/50 text-xs z-10 font-bold uppercase tracking-[0.4em] bg-black/40 px-5 py-3 rounded-full border border-red-900/20">
            Premi per scoprire il tuo destino
        </div>
    </div>
);