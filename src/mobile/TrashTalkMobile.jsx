import React, { useState, useEffect } from 'react';

export default function TrashTalkMobile({ socket, view, setView }) {
  const [prompt, setPrompt] = useState("");
  const [myAnswer, setMyAnswer] = useState("");
  const [battle, setBattle] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    // 1. APPENA ARRIVO, CHIEDO I DATI AL SERVER (SYNC FORZATO)
    socket.emit('trashtalk_sync'); 

    // 2. Ascolto i dati
    socket.on('trashtalk_prompt', (newPrompt) => {
        // --- FIX PULIZIA TESTO ---
        // Se il prompt cambia (nuovo round), svuota la risposta.
        // Se è lo stesso (refresh), non toccare la risposta (così se stavi scrivendo non perdi tutto al volo)
        setPrompt((prevPrompt) => {
            if (prevPrompt !== newPrompt) {
                setMyAnswer(""); // PULISCE LA TEXTBOX PER IL NUOVO ROUND
            }
            return newPrompt;
        });
    });
    
    socket.on('trashtalk_battle_start', (data) => {
        setBattle(data);
        setHasVoted(false);
    });

    socket.on('set_view', (v) => {
       // Se il server ci manda in attesa, puliamo per sicurezza
       if (v === 'TRASHTALK_WAITING') {
           // Opzionale
       }
    });

    return () => {
        socket.off('trashtalk_prompt');
        socket.off('trashtalk_battle_start');
        socket.off('set_view');
    };
  }, [socket]);

  const submitAnswer = () => {
      if (!myAnswer.trim()) return;
      socket.emit('trashtalk_answer', myAnswer);
  };

  const vote = (targetId) => {
      if (hasVoted) return;
      setHasVoted(true);
      socket.emit('trashtalk_vote', targetId);
  };

  // --- RENDERING ---

  if (view === 'TRASHTALK_LOBBY') return <div className="h-screen bg-purple-900 flex items-center justify-center text-white font-black text-3xl">PREPARATI</div>;
  if (view === 'TRASHTALK_WAITING') return <div className="h-screen bg-black flex items-center justify-center text-white p-6 text-center text-xl font-bold animate-pulse">ATTENDI GLI ALTRI...</div>;
  if (view === 'TRASHTALK_RESULT') return <div className="h-screen bg-black text-white flex items-center justify-center font-bold text-2xl">GUARDA LA TV 👀</div>;

  if (view === 'TRASHTALK_WRITING') {
      return (
          <div className="min-h-screen bg-[#111] p-6 flex flex-col">
              <div className="bg-yellow-400 text-black p-4 rounded-xl border-4 border-white mb-6">
                  <p className="text-xs font-bold uppercase mb-1">COMPLETA:</p>
                  <p className="text-lg font-black leading-tight">
                      {prompt || <span className="animate-pulse opacity-50">Caricamento frase...</span>}
                  </p>
              </div>
              <textarea 
                  className="w-full h-32 bg-white/10 text-white p-4 rounded-xl border-2 border-white/20 text-xl font-bold mb-4 focus:border-yellow-400 outline-none resize-none uppercase"
                  value={myAnswer} 
                  onChange={(e) => setMyAnswer(e.target.value)} 
                  maxLength={50}
                  placeholder="SCRIVI QUI..."
              />
              <button onClick={submitAnswer} disabled={!myAnswer.trim()} className="w-full py-4 bg-green-500 text-white font-black text-xl uppercase rounded-xl disabled:opacity-50">INVIA</button>
          </div>
      );
  }

  if (view === 'TRASHTALK_VOTE' && battle) {
      const isMyBattle = battle.type === '1VS1' && (battle.p1.id === socket.id || battle.p2.id === socket.id);
      
      if (isMyBattle) {
          return (
              <div className="h-screen bg-orange-600 flex flex-col items-center justify-center text-white p-4 text-center">
                  <div className="text-6xl mb-4">⚔️</div>
                  <h1 className="text-3xl font-black uppercase mb-2">SEI IN GARA!</h1>
                  <p className="text-lg font-bold opacity-80">Non puoi votare per te stesso.</p>
              </div>
          );
      }

      if (hasVoted) return <div className="h-screen bg-black flex items-center justify-center text-white font-black text-2xl">VOTO INVIATO 👍</div>;

      if (battle.type === '1VS1') {
          return (
              <div className="min-h-screen bg-blue-700 p-4 flex flex-col gap-4 justify-center">
                  <button onClick={() => vote(battle.p1.id)} className="flex-1 bg-white text-black rounded-2xl border-4 border-black p-4 flex items-center justify-center active:scale-95 transition-all shadow-xl">
                      <p className="text-xl font-black uppercase">{battle.p1.answer}</p>
                  </button>
                  <div className="text-center text-white font-black">VS</div>
                  <button onClick={() => vote(battle.p2.id)} className="flex-1 bg-black text-white rounded-2xl border-4 border-white p-4 flex items-center justify-center active:scale-95 transition-all shadow-xl">
                      <p className="text-xl font-black uppercase">{battle.p2.answer}</p>
                  </button>
              </div>
          );
      }

      if (battle.type === 'ALL_VS_ALL') {
          return (
              <div className="min-h-screen bg-red-900 p-4 flex flex-col">
                  {/* Prompt Visibile anche qui */}
                  <div className="bg-black/40 p-3 rounded-lg mb-4 text-center border border-white/10">
                      <p className="text-xs text-white/60 uppercase">Domanda:</p>
                      <p className="text-white font-bold leading-tight">{battle.prompt}</p>
                  </div>

                  <h2 className="text-center text-white font-black text-2xl mb-4">VOTA IL MIGLIORE</h2>
                  <div className="grid grid-cols-1 gap-3 overflow-y-auto pb-10">
                      {battle.candidates.filter(c => c.id !== socket.id).map(c => (
                          <button key={c.id} onClick={() => vote(c.id)} className="bg-white text-black p-4 rounded-xl border-4 border-black font-bold uppercase active:scale-95 shadow-lg">
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