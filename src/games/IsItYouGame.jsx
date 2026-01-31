import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function IsItYouGame({ socket }) {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [task, setTask] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [results, setResults] = useState(null);

  // --- NARRATORE AVANZATO ---
  const speak = (text) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'it-IT';
      u.rate = 1.1; // Leggermente più veloce
      u.pitch = 1.0;

      // Selezione intelligente della voce
      const voices = window.speechSynthesis.getVoices();
      // Cerca "Google" o "Siri" o "Elsa" (voci solitamente migliori)
      const bestVoice = voices.find(v => v.lang.includes('it') && (v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Premium'))) 
                        || voices.find(v => v.lang.includes('it'));

      if (bestVoice) u.voice = bestVoice;
      window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    // Forza il caricamento delle voci (bug di Chrome)
    const loadVoices = () => { window.speechSynthesis.getVoices(); };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    socket.on('isityou_state', setState);
    
    socket.on('isityou_task', (data) => {
        setTask(data);
        setResults(null);
        let text = data.text;
        if (data.type === 'MIMIC') text += " Avete 10 secondi per scattare!";
        if (data.type === 'DRAW') text += ` Guardate la foto di ${data.targetName} e disegnateci sopra!`;
        speak(text);
    });

    socket.on('isityou_gallery', (imgs) => {
        setGallery(imgs);
        speak("Guardate che capolavori. Votate il migliore!");
    });

    socket.on('isityou_results', (data) => {
        setResults(data);
        speak(data.type === 'POLL' ? "Ecco cosa ne pensa il gruppo..." : "Ed ecco il vincitore!");
    });

    socket.on('isityou_game_over', () => speak("Il gioco è finito. Grazie a tutti!"));

    return () => {
        socket.off('isityou_state');
        socket.off('isityou_task');
        socket.off('isityou_gallery');
        socket.off('isityou_results');
        socket.off('isityou_game_over');
        window.speechSynthesis.cancel();
    };
  }, [socket]);

  // Funzioni Navigazione Host
  const exitToMenu = () => {
      socket.emit('host_back_to_menu');
      navigate('/host');
  };

  const forceEndGame = () => {
      if(window.confirm("Vuoi davvero terminare la partita ora?")) {
          socket.emit('isityou_force_end');
      }
  };

  if (!state) return <div className="bg-black h-screen text-white flex items-center justify-center">Loading Show...</div>;

  // --- UI COMUNE (BOTTONI CONTROLLO) ---
  const HostControls = () => (
      <>
          {state.gameState === 'SELFIE' ? (
               <button onClick={exitToMenu} className="fixed top-4 left-4 z-50 bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded-full font-bold backdrop-blur-md uppercase text-xs border border-white/30">
                   ← Torna al Menu
               </button>
          ) : (
               <button onClick={forceEndGame} className="fixed bottom-4 right-4 z-50 bg-red-500/20 hover:bg-red-500/80 text-white px-4 py-2 rounded-full font-bold backdrop-blur-md uppercase text-[10px] border border-red-500/30">
                   Termina Partita ☠️
               </button>
          )}
      </>
  );

  // --- FASE 0: SELFIE ---
  if (state.gameState === 'SELFIE') {
      return (
          <div className="h-screen bg-[#FFCC00] flex flex-col items-center justify-center p-10 text-black text-center relative overflow-hidden">
              <HostControls />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] opacity-10"></div>
              <h1 className="text-6xl font-black mb-4 uppercase tracking-tighter">Passaporto</h1>
              <p className="text-2xl font-bold mb-8 max-w-xl">
                  Per iniziare, dobbiamo vedere le vostre facce.
                  <br/>Scattatevi un selfie col telefono!
              </p>
              <div className="bg-white border-4 border-black px-10 py-5 rounded-full text-4xl font-black shadow-[8px_8px_0_black]">
                  {state.uploadedCount} Pronti
              </div>
          </div>
      );
  }

  // --- FASE TASK ---
  if ((state.gameState === 'POLL' || state.gameState === 'MIMIC' || state.gameState === 'DRAW') && task) {
      return (
          <div className="h-screen bg-[#22a6b3] flex flex-col items-center justify-center p-10 text-white relative">
              <HostControls />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              
              <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="bg-white text-black p-12 rounded-lg shadow-[20px_20px_0_rgba(0,0,0,0.2)] max-w-5xl text-center transform -rotate-1"
              >
                  <span className="bg-black text-white px-3 py-1 text-sm font-bold uppercase tracking-widest mb-4 inline-block">
                      {task.type === 'POLL' ? 'Sondaggio' : task.type === 'MIMIC' ? 'Imitazione' : 'Arte'}
                  </span>
                  <h2 className="text-6xl font-black uppercase leading-none">{task.text}</h2>
                  
                  {task.type === 'DRAW' && (
                      <p className="mt-4 text-xl font-bold text-blue-600">Vittima: {task.targetName}</p>
                  )}
              </motion.div>
          </div>
      );
  }

  // --- FASE GALLERIA ---
  if (state.gameState === 'VOTING_IMAGES') {
      return (
          <div className="h-screen bg-[#130f40] p-8 grid grid-cols-3 gap-6 relative">
              <HostControls />
              {gallery.map((g, i) => (
                  <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.2 }}
                      key={g.id} className="bg-white p-2 pb-10 relative shadow-lg transform rotate-1 hover:rotate-0 transition-transform">
                      <img src={g.image} alt="Art" className="w-full h-64 object-cover bg-gray-200" />
                      <div className="absolute bottom-2 left-0 w-full text-center font-black uppercase text-xl text-black">
                          {g.name}
                      </div>
                  </motion.div>
              ))}
              <div className="absolute bottom-10 left-0 w-full text-center text-white font-black text-3xl animate-bounce pointer-events-none">
                  Votate il vostro preferito!
              </div>
          </div>
      );
  }

  // --- FASE RISULTATI ---
  if (state.gameState === 'RESULTS' && results) {
      return (
          <div className="h-screen bg-[#6ab04c] flex flex-col items-center justify-center p-10 text-white relative">
              <HostControls />
              <h1 className="text-5xl font-black mb-10 uppercase drop-shadow-md">Risultati Round</h1>
              <div className="flex gap-4 flex-wrap justify-center">
                  {results.results.sort((a,b) => b.roundPoints - a.roundPoints).map((p, i) => (
                      <div key={p.id} className={`bg-white text-black p-6 rounded-2xl shadow-xl flex flex-col items-center w-48 ${i===0 ? 'scale-110 border-4 border-yellow-400 z-10' : 'opacity-90'}`}>
                          <div className="text-xl font-black uppercase mb-2">{p.name}</div>
                          <div className="text-5xl font-black text-green-600">+{p.roundPoints}</div>
                          <div className="text-xs text-gray-500 font-bold mt-2">TOT: {p.score}</div>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  if (state.gameState === 'GAME_OVER') {
      return (
        <div className="h-screen bg-black text-white flex flex-col items-center justify-center font-black text-6xl relative">
            <HostControls />
            FINE PARTITA
            <button onClick={exitToMenu} className="mt-8 px-8 py-4 bg-yellow-400 text-black rounded-full text-xl hover:scale-105 transition-transform">
                Torna al Menu
            </button>
        </div>
      );
  }

  return <div className="h-screen bg-black"></div>;
}