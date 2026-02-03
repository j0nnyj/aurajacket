import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function IsItYouGame({ socket }) {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [task, setTask] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [results, setResults] = useState(null);

  // --- NARRATORE ---
  const speak = (text) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'it-IT'; u.rate = 1.1; 
      const voices = window.speechSynthesis.getVoices();
      const itVoice = voices.find(v => v.lang.includes('it') && (v.name.includes('Google') || v.name.includes('Siri'))) || voices.find(v => v.lang.includes('it'));
      if (itVoice) u.voice = itVoice;
      window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    window.speechSynthesis.getVoices(); 

    socket.on('isityou_state', setState);
    
    socket.on('isityou_task', (data) => {
        setTask(data);
        setResults(null);
        let text = data.text;
        if (data.type === 'MIMIC') text += " 10 secondi per scattare!";
        if (data.type === 'DRAW') text += ` Disegnate sulla foto di ${data.targetName}!`;
        speak(text);
    });

    socket.on('isityou_gallery', (imgs) => {
        setGallery(imgs);
        speak("Votate l'opera migliore!");
    });

    socket.on('isityou_results', (data) => {
        setResults(data);
        speak(data.type === 'POLL' ? "Ecco i risultati..." : "Il vincitore è...");
    });

    socket.on('isityou_game_over', () => speak("Fine della partita."));

    return () => {
        socket.off('isityou_state');
        socket.off('isityou_task');
        socket.off('isityou_gallery');
        socket.off('isityou_results');
        socket.off('isityou_game_over');
        window.speechSynthesis.cancel();
    };
  }, [socket]);

  const exitToMenu = () => { socket.emit('host_back_to_menu'); navigate('/host'); };
  const forceEndGame = () => { if(window.confirm("Terminare?")) socket.emit('isityou_force_end'); };

  if (!state) return <div className="bg-black h-screen text-white flex items-center justify-center">Loading Show...</div>;

  // --- UI CONTROLS ---
  const HostControls = () => (
      <button onClick={state.gameState === 'SELFIE' ? exitToMenu : forceEndGame} className="fixed bottom-4 right-4 z-50 bg-white/20 text-white px-4 py-2 rounded-full font-bold uppercase text-[10px] border border-white/30 hover:bg-red-500">
          {state.gameState === 'SELFIE' ? 'Esci' : 'Termina'}
      </button>
  );

  if (state.gameState === 'SELFIE') {
      return (
          <div className="h-screen bg-[#FFCC00] flex flex-col items-center justify-center p-10 text-black text-center relative overflow-hidden">
              <HostControls />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] opacity-10"></div>
              <h1 className="text-6xl font-black mb-4 uppercase tracking-tighter">Passaporto</h1>
              <p className="text-2xl font-bold mb-8">Scattatevi un selfie col telefono!</p>
              <div className="bg-white border-4 border-black px-10 py-5 rounded-full text-4xl font-black shadow-[8px_8px_0_black]">
                  {state.uploadedCount} Pronti
              </div>
          </div>
      );
  }

  if ((state.gameState === 'POLL' || state.gameState === 'MIMIC' || state.gameState === 'DRAW') && task) {
      return (
          <div className="h-screen bg-[#22a6b3] flex flex-col items-center justify-center p-10 text-white relative">
              <HostControls />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white text-black p-12 rounded-lg shadow-[20px_20px_0_rgba(0,0,0,0.2)] max-w-5xl text-center transform -rotate-1">
                  <span className="bg-black text-white px-3 py-1 text-sm font-bold uppercase tracking-widest mb-4 inline-block">{task.type}</span>
                  <h2 className="text-6xl font-black uppercase leading-none">{task.text}</h2>
                  {task.type === 'DRAW' && <p className="mt-4 text-xl font-bold text-blue-600">Vittima: {task.targetName}</p>}
              </motion.div>
          </div>
      );
  }

  if (state.gameState === 'VOTING_IMAGES') {
      return (
          <div className="h-screen bg-[#130f40] p-8 grid grid-cols-3 gap-6 relative">
              <HostControls />
              {gallery.map((g, i) => (
                  <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.2 }} key={g.id} className="bg-white p-2 pb-10 relative shadow-lg transform rotate-1">
                      <img src={g.image} alt="Art" className="w-full h-64 object-cover bg-gray-200" />
                      <div className="absolute bottom-2 left-0 w-full text-center font-black uppercase text-xl text-black">{g.name}</div>
                  </motion.div>
              ))}
              <div className="absolute bottom-10 left-0 w-full text-center text-white font-black text-3xl animate-bounce">Votate!</div>
          </div>
      );
  }

  if (state.gameState === 'RESULTS' && results) {
      return (
          <div className="h-screen bg-[#6ab04c] flex flex-col items-center justify-center p-10 text-white relative">
              <HostControls />
              <h1 className="text-5xl font-black mb-10 uppercase drop-shadow-md">Risultati</h1>
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
      return <div className="h-screen bg-black text-white flex flex-col items-center justify-center font-black text-6xl"><HostControls />FINE PARTITA</div>;
  }

  return <div className="h-screen bg-black"></div>;
}