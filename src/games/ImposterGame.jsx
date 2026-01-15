import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ImposterGame({ socket }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('LOBBY'); 
  const [players, setPlayers] = useState([]);
  const [votes, setVotes] = useState({});
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    socket.emit('request_server_info');
    socket.emit('host_request_update'); // Sync lista giocatori

    socket.on('update_player_list', (list) => setPlayers(list));
    socket.on('imposter_game_started', () => setPhase('GAME'));
    
    socket.on('imposter_voting_started', () => {
        setPhase('VOTING');
        setVotes({});
    });

    socket.on('imposter_vote_update', (updatedVotes) => setVotes(updatedVotes));

    socket.on('imposter_game_over', (data) => {
        setResultData(data);
        setPhase('GAME_OVER');
    });

    return () => {
        socket.off('update_player_list');
        socket.off('imposter_game_started');
        socket.off('imposter_voting_started');
        socket.off('imposter_vote_update');
        socket.off('imposter_game_over');
    };
  }, [socket]);

  const startGame = () => {
    if (players.length < 3) { alert("Minimo 3 giocatori!"); return; }
    socket.emit('imposter_start');
  };

  const startVoting = () => socket.emit('imposter_force_voting');
  const exitGame = () => { socket.emit('host_back_to_menu'); navigate('/host'); };

  // 1. LOBBY
  if (phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-10 font-sans">
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 mb-8">IMPOSTORE</h1>
        
        <div className="flex flex-wrap justify-center gap-6 mb-12">
            {players.map((p, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center min-w-[120px]">
                    <div className="text-5xl mb-2">{p.avatar}</div>
                    <div className="font-bold">{p.name}</div>
                </motion.div>
            ))}
             {players.length === 0 && <p className="text-slate-500 italic">In attesa...</p>}
        </div>
        
        <div className="flex gap-4">
            <button onClick={exitGame} className="px-8 py-4 bg-slate-700 rounded-xl font-bold">Indietro</button>
            <button onClick={startGame} disabled={players.length < 3} className="px-12 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-2xl shadow-lg disabled:opacity-50">INIZIA</button>
        </div>
      </div>
    );
  }

  // 2. GAME
  if (phase === 'GAME') {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-10 text-center">
            <h1 className="text-6xl font-black mb-12">DISCUSSIONE</h1>
            <div className="text-9xl mb-12 animate-pulse">🗣️</div>
            <p className="text-2xl text-slate-400 mb-12">Fate domande e trovate l'intruso!</p>
            <button onClick={startVoting} className="bg-red-600 hover:bg-red-500 px-10 py-5 rounded-2xl text-3xl font-black uppercase shadow-xl">
                SI VOTA
            </button>
        </div>
      );
  }

  // 3. VOTING
  if (phase === 'VOTING') {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-10 text-center">
            <h1 className="text-5xl font-black text-yellow-500 mb-12 uppercase">Votazione in corso</h1>
            
            <div className="flex flex-wrap gap-6 justify-center max-w-5xl">
                {players.map((p, i) => {
                    const count = Object.values(votes).filter(id => id === p.id).length;
                    return (
                        <div key={i} className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative min-w-[150px]">
                            <div className="text-5xl mb-2">{p.avatar}</div>
                            <div className="font-bold">{p.name}</div>
                            {count > 0 && (
                                <div className="absolute -top-3 -right-3 bg-red-600 w-10 h-10 flex items-center justify-center rounded-full font-bold shadow-lg">
                                    {count}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      );
  }

  // 4. GAME OVER
  if (phase === 'GAME_OVER') {
      const imposterWins = resultData?.winner === 'IMPOSTER';
      return (
          <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-10 text-center">
              <h1 className={`text-7xl font-black mb-6 uppercase ${imposterWins ? 'text-red-500' : 'text-green-500'}`}>
                  {imposterWins ? 'VINCE L\'IMPOSTORE!' : 'VINCONO I CIVILI!'}
              </h1>
              
              <div className="bg-slate-800 p-8 rounded-2xl border-2 border-slate-600 mb-10 w-full max-w-2xl">
                  <div className="mb-6">
                      <p className="text-slate-400 uppercase text-xs font-bold mb-1">L'Impostore era</p>
                      <p className="text-4xl font-black text-red-400">{resultData?.imposterName}</p>
                  </div>
                  <div className="mb-6">
                      <p className="text-slate-400 uppercase text-xs font-bold mb-1">Parola Segreta</p>
                      <p className="text-4xl font-black text-green-400">{resultData?.secretWord}</p>
                  </div>
                  <div>
                      <p className="text-slate-400 uppercase text-xs font-bold mb-1">Eliminato</p>
                      <p className="text-2xl font-bold text-white">{resultData?.eliminatedName}</p>
                  </div>
              </div>

              <button onClick={exitGame} className="bg-slate-700 px-8 py-4 rounded-xl font-bold">Menu Principale</button>
          </div>
      );
  }

  return null;
}