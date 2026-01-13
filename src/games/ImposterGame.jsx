import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';

export default function ImposterGame({ socket }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('LOBBY'); 
  const [players, setPlayers] = useState([]);
  // serverInfo non ci serve più per il QR, ma lo teniamo per debug o altro
  const [serverInfo, setServerInfo] = useState(null); 
  const [votesCount, setVotesCount] = useState(0);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    socket.emit('request_server_info'); 
    
    socket.on('server_info', (info) => setServerInfo(info));
    socket.on('update_player_list', (list) => setPlayers(list));
    socket.on('update_votes_count', (c) => setVotesCount(c));
    socket.on('imposter_result', (d) => { setResultData(d); setPhase('RESULT'); });

    return () => {
      socket.off('server_info');
      socket.off('update_player_list');
      socket.off('update_votes_count');
      socket.off('imposter_result');
    };
  }, [socket]);

  const startGame = () => { socket.emit('imposter_start'); setPhase('INFO'); };
  const startVote = () => { socket.emit('imposter_start_voting'); setPhase('VOTING'); };
  const reveal = () => { socket.emit('imposter_reveal'); };
  
  const playAgain = () => {
    socket.emit('imposter_play_again'); 
    setVotesCount(0); setResultData(null); setPhase('LOBBY'); 
  };

  const exitGame = () => {
    socket.emit('host_closes_lobby'); 
    navigate('/host');
  };

  // --- RENDER UI ---

  // 1. LOBBY
  if (phase === 'LOBBY') {
    // MODIFICA QUI: Usiamo l'indirizzo del browser, non l'IP del server
    // window.location.origin restituisce es: "https://imposter-game.onrender.com"
    const joinUrl = window.location.origin; 
    
    // Per mostrare il link a testo, togliamo "https://" per pulizia
    const displayUrl = joinUrl.replace(/^https?:\/\//, '');

    return (
      <div className="min-h-screen bg-slate-900 text-white flex p-10 gap-10 font-sans">
        {/* QR */}
        <div className="w-1/3 flex flex-col items-center justify-center bg-slate-800 rounded-3xl p-8 border-4 border-slate-700 shadow-2xl">
          <h2 className="text-3xl font-bold mb-6 text-slate-300">UNISCITI</h2>
          <div className="bg-white p-4 rounded-xl mb-6"><QRCode value={joinUrl} size={200} /></div>
          {/* Mostriamo il link pulito */}
          <div className="text-2xl font-mono text-yellow-400 font-bold tracking-tighter text-center break-all">
            {displayUrl}
          </div>
        </div>

        {/* LISTA GIOCATORI (uguale a prima) */}
        <div className="w-2/3 flex flex-col">
          <div className="flex justify-between items-center mb-6">
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-600">IMPOSTORE</h1>
              <div className="text-2xl font-bold text-slate-400">{players.length} Giocatori</div>
          </div>
          <div className="flex-1 bg-slate-800/50 rounded-3xl p-8 grid grid-cols-4 gap-6 content-start border-2 border-slate-700/50 overflow-y-auto max-h-[60vh]">
            {players.map((p, i) => (
              <div key={i} className="flex flex-col items-center animate-bounce-short">
                <div className="text-7xl mb-2 drop-shadow-xl">{p.avatar || '🙂'}</div>
                <div className="bg-slate-700 px-4 py-1 rounded-full font-bold shadow-md">{p.name}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-end gap-4">
             <button onClick={exitGame} className="px-8 py-4 bg-gray-600 rounded-xl font-bold text-slate-300 hover:text-white hover:bg-gray-500 transition">ESCI</button>
             <button onClick={startGame} disabled={players.length < 2} className="px-12 py-4 bg-green-500 hover:bg-green-400 rounded-xl text-3xl font-bold text-white shadow-xl transition disabled:opacity-50">INIZIA PARTITA</button>
          </div>
        </div>
      </div>
    );
  }

  // ... (Tutto il resto, INFO, VOTING, RESULT rimane identico a prima) ...
  if (phase === 'INFO') {
    return (
        <div className="min-h-screen bg-slate-800 text-white flex flex-col items-center justify-center p-10 text-center">
            <h1 className="text-6xl font-black mb-12 text-yellow-400 drop-shadow-lg">SILENZIO!</h1>
            <div className="bg-slate-900 p-10 rounded-3xl border border-slate-600 shadow-2xl max-w-4xl">
                <p className="text-3xl leading-relaxed">Controllate i telefoni.<br/><span className="text-green-400 font-bold">CIVILI:</span> Avete la parola.<br/><span className="text-red-500 font-bold">IMPOSTORE:</span> Hai solo un indizio.<br/><br/>Discutete e scovate il bugiardo!</p>
            </div>
            <button onClick={startVote} className="mt-12 bg-red-600 px-12 py-6 rounded-2xl text-3xl font-bold animate-pulse hover:bg-red-500 transition shadow-lg shadow-red-900/50">APRI VOTAZIONI</button>
        </div>
    );
  }

  if (phase === 'VOTING') {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
            <h1 className="text-5xl font-bold mb-10 text-red-500 tracking-widest uppercase">VOTAZIONE IN CORSO</h1>
            <div className="w-80 h-80 bg-slate-800 rounded-full border-8 border-slate-700 flex flex-col items-center justify-center shadow-2xl mb-10">
                <div className="text-9xl font-black text-white">{votesCount}</div>
                <div className="text-slate-400 uppercase tracking-widest mt-2">Voti</div>
            </div>
            <button onClick={reveal} className="bg-indigo-600 px-10 py-5 rounded-xl text-2xl font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/50">MOSTRA RISULTATO</button>
        </div>
      );
  }

  if (phase === 'RESULT') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black">
        <h1 className="text-4xl mb-12 text-slate-400 uppercase tracking-widest">Il villaggio ha eliminato:</h1>
        <div className="bg-red-600 p-16 rounded-3xl mb-16 text-center transform -rotate-2 border-4 border-red-500 shadow-[0_0_100px_rgba(220,38,38,0.5)]">
          <h2 className="text-8xl font-black uppercase mb-4 drop-shadow-xl">{resultData?.name || "Nessuno"}</h2>
          <div className="inline-block bg-black/20 px-6 py-2 rounded-lg"><p className="text-3xl font-mono">{resultData?.votes} voti</p></div>
        </div>
        <div className="flex gap-6">
            <button onClick={exitGame} className="px-8 py-4 bg-slate-800 rounded-xl font-bold text-slate-400 hover:text-white transition">Esci al Menu</button>
            <button onClick={playAgain} className="px-12 py-4 bg-green-600 rounded-xl text-2xl font-bold hover:scale-105 transition shadow-lg hover:bg-green-500">🔄 NUOVA PARTITA</button>
        </div>
      </div>
    );
  }
}