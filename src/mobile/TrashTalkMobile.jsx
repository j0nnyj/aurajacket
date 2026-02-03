import React, { useState, useEffect } from 'react';

export default function TrashTalkMobile({ socket, view, setView }) {
  const [prompt, setPrompt] = useState("");
  const [myAnswer, setMyAnswer] = useState("");
  const [battle, setBattle] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    socket.emit('trashtalk_sync'); 

    socket.on('trashtalk_prompt', (data) => {
        setPrompt(data.text);
        setMyAnswer("");
        setHasVoted(false);
    });
    
    socket.on('trashtalk_battle_start', (data) => {
        setBattle(data);
        setHasVoted(false);
    });

    return () => {
        socket.off('trashtalk_prompt');
        socket.off('trashtalk_battle_start');
    };
  }, [socket]);

  const submitAnswer = () => {
      if (!myAnswer.trim()) return;
      socket.emit('trashtalk_answer', myAnswer.toUpperCase());
      setView('TRASHTALK_WAITING');
  };

  const vote = (targetId) => {
      if (hasVoted) return;
      setHasVoted(true);
      socket.emit('trashtalk_vote', targetId);
      setView('TRASHTALK_WAITING');
  };

  // --- UI COMPONENTS ---

  if (view === 'TRASHTALK_LOBBY') {
      return (
          <div className="h-screen bg-[#2e0249] flex flex-col items-center justify-center p-6 text-center font-sans">
              <h1 className="text-5xl font-black mb-4 text-yellow-300 italic -rotate-6 drop-shadow-md stroke-black">TRASH TALK</h1>
              <div className="w-24 h-24 border-4 border-black bg-pink-500 rounded-full flex items-center justify-center text-4xl mb-8 shadow-[5px_5px_0_black] animate-bounce">
                  🤬
              </div>
              <p className="text-white font-bold uppercase tracking-widest bg-black px-4 py-1 rotate-2">Attendi l'inizio...</p>
          </div>
      );
  }

  if (view === 'TRASHTALK_WAITING') {
      return (
          <div className="h-screen bg-black text-white flex flex-col items-center justify-center font-bold">
              <div className="text-7xl animate-bounce mb-6">🤐</div>
              <p className="uppercase tracking-widest text-pink-500 text-xl">SILENZIO...</p>
          </div>
      );
  }

  if (view === 'TRASHTALK_INPUT' || view === 'TRASHTALK_WRITING') {
      const parts = prompt.split('_____');
      return (
          <div className="min-h-screen bg-[#facc15] p-6 flex flex-col font-sans">
              <div className="flex-1 flex flex-col justify-center">
                  <div className="bg-white text-black p-6 border-4 border-black mb-6 shadow-[8px_8px_0_black]">
                      <p className="text-xs font-black uppercase mb-2 opacity-60">COMPLETA LA FRASE:</p>
                      <div className="text-xl font-black leading-relaxed uppercase">
                          {parts[0]}
                          <span className="inline-block border-b-4 border-black min-w-[50px] px-1 mx-1 text-red-600 bg-yellow-100">
                              {myAnswer || "..."}
                          </span>
                          {parts[1]}
                      </div>
                  </div>
                  
                  <textarea 
                      className="w-full h-40 bg-black text-white p-4 border-4 border-white text-2xl font-bold mb-4 focus:border-pink-500 outline-none resize-none uppercase shadow-lg placeholder-gray-500"
                      value={myAnswer} 
                      onChange={(e) => setMyAnswer(e.target.value)} 
                      maxLength={50}
                      placeholder="SCRIVI QUI..."
                  />
                  <div className="text-right text-black font-bold text-xs">{myAnswer.length}/50</div>
              </div>
              
              <button onClick={submitAnswer} disabled={!myAnswer.trim()} className="w-full py-5 bg-pink-600 text-white border-4 border-black font-black text-2xl uppercase shadow-[6px_6px_0_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all mb-4 disabled:opacity-50 disabled:shadow-none">
                  INVIA
              </button>
          </div>
      );
  }

  if (view === 'TRASHTALK_VOTE_MOBILE' || view === 'TRASHTALK_VOTE') {
      if (!battle) return <div>Caricamento...</div>;
      
      // --- FIX CRITICO: Controlla socketId, non ID ---
      const isMyBattle = battle.type === '1VS1' && (battle.p1.socketId === socket.id || battle.p2.socketId === socket.id);

      if (isMyBattle) {
          return (
              <div className="h-screen bg-red-600 flex flex-col items-center justify-center text-white p-6 text-center font-bold border-8 border-black">
                  <div className="text-8xl mb-6">⚔️</div>
                  <h1 className="text-4xl font-black uppercase mb-4 italic">SEI IN GARA!</h1>
                  <p className="text-xl font-bold bg-black px-6 py-2 rotate-1">Spera che non ti votino!</p>
              </div>
          );
      }

      if (battle.type === '1VS1') {
          return (
              <div className="min-h-screen bg-[#a855f7] p-6 flex flex-col gap-6 justify-center font-sans">
                  <h2 className="text-center text-white font-black uppercase text-2xl mb-2 drop-shadow-md">VOTA IL MIGLIORE</h2>
                  
                  <button onClick={() => vote(battle.p1.id)} className="flex-1 bg-white text-black border-4 border-black p-6 flex items-center justify-center active:scale-95 transition-all shadow-[8px_8px_0_black]">
                      <p className="text-2xl font-black uppercase break-words leading-tight">{battle.p1.answer}</p>
                  </button>
                  
                  <div className="text-center text-black font-black text-xl bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto border-2 border-black">VS</div>
                  
                  <button onClick={() => vote(battle.p2.id)} className="flex-1 bg-yellow-300 text-black border-4 border-black p-6 flex items-center justify-center active:scale-95 transition-all shadow-[8px_8px_0_black]">
                      <p className="text-2xl font-black uppercase break-words leading-tight">{battle.p2.answer}</p>
                  </button>
              </div>
          );
      } else {
          return (
              <div className="min-h-screen bg-red-900 p-4 flex flex-col">
                  <div className="bg-white text-black p-4 border-4 border-black mb-6 text-center shadow-lg">
                      <p className="font-bold leading-tight text-sm uppercase">{battle.prompt}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-4 pb-10">
                      {/* FIX: Filtra usando socketId per non mostrare il proprio bottone */}
                      {battle.candidates.filter(c => c.socketId !== socket.id).map(c => (
                          <button key={c.id} onClick={() => vote(c.id)} className="bg-black text-white p-5 border-4 border-white font-bold uppercase active:scale-95 transition-all text-xl shadow-lg">
                              {c.answer}
                          </button>
                      ))}
                  </div>
              </div>
          );
      }
  }

  return <div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
}