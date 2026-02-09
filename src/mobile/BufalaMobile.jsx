import React, { useState, useEffect } from 'react';

export default function BufalaMobile({ socket, view, setView }) {
  const [prompt, setPrompt] = useState("");
  const [input, setInput] = useState("");
  const [options, setOptions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    socket.emit('bufala_sync'); // Richiedi lo stato aggiornato appena montato

    socket.on('bufala_prompt', (data) => {
        setPrompt(data.text);
        setInput("");
        setError("");
        // Non forziamo la vista qui, lasciamo che sia il sync/view principale a farlo,
        // ma aggiorniamo i dati
    });

    socket.on('bufala_voting_start', (data) => {
        setOptions(data.options);
    });

    socket.on('bufala_error', (msg) => setError(msg));

    return () => {
        socket.off('bufala_prompt');
        socket.off('bufala_voting_start');
        socket.off('bufala_error');
    };
  }, [socket]);

  const sendLie = () => {
      if(!input.trim()) return;
      socket.emit('bufala_lie', input);
      setView('BUFALA_WAITING');
  };

  const sendVote = (opt) => {
      socket.emit('bufala_vote', opt);
      setView('BUFALA_WAITING');
  };

  // --- LOBBY ---
  if (view === 'BUFALA_LOBBY') {
      return (
          <div className="h-screen bg-[#e8e4d3] text-black flex flex-col items-center justify-center p-6 text-center font-serif relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/old-mathematics.png')] opacity-10 pointer-events-none"></div>
              <h1 className="text-6xl font-black uppercase mb-6 tracking-tighter bg-red-600 text-white px-8 py-3 -rotate-2 shadow-[8px_8px_0_black] border-4 border-black z-10">
                  LA BUFALA
              </h1>
              <div className="text-9xl my-8 animate-bounce z-10 drop-shadow-xl">📰</div>
              <div className="bg-black text-white px-8 py-4 border-4 border-white shadow-[8px_8px_0_rgba(0,0,0,0.3)] z-10 transform rotate-1">
                  <p className="text-lg font-bold uppercase tracking-widest animate-pulse">In attesa dell'Host...</p>
              </div>
          </div>
      );
  }

  // --- ATTESA ---
  if (view === 'BUFALA_WAITING') {
      return (
          <div className="h-screen bg-black text-white flex flex-col items-center justify-center font-bold p-6 text-center">
              <div className="text-7xl mb-6 animate-spin">⏳</div>
              <h2 className="text-2xl uppercase tracking-widest text-red-500 mb-2">SILENZIO STAMPA</h2>
              <p className="text-sm text-gray-400">Attendi gli altri...</p>
          </div>
      );
  }

  // --- INPUT ---
  if (view === 'BUFALA_INPUT') {
      const parts = prompt.split('_____');
      return (
          <div className="h-screen bg-[#1a1a1a] text-white p-6 flex flex-col justify-center font-sans">
              <div className="mb-8 opacity-90 text-center font-serif text-xl leading-relaxed bg-[#333] p-4 rounded-lg border-l-4 border-red-600 shadow-lg">
                  {parts[0]} <span className="text-red-500 font-black bg-black px-2 mx-1">_____</span> {parts[1]}
              </div>
              
              <input 
                  type="text" 
                  value={input} 
                  onChange={(e) => {setInput(e.target.value); setError("");}}
                  className="bg-transparent border-b-4 border-white text-3xl text-center py-4 mb-4 outline-none font-bold uppercase placeholder-gray-600 focus:border-red-600 transition-colors"
                  placeholder="SCRIVI LA BUGIA"
                  maxLength={40}
              />
              
              {error && <p className="text-red-500 text-center font-black mb-6 animate-bounce bg-black py-1 px-2">{error}</p>}
              
              <button 
                  onClick={sendLie} 
                  className="bg-red-600 py-5 text-xl font-black uppercase tracking-widest shadow-[0_5px_0_#991b1b] active:shadow-none active:translate-y-1 transition-all rounded-sm border-2 border-white"
              >
                  INVIA NOTIZIA
              </button>
              <div className="text-center mt-4 text-xs text-gray-500 uppercase tracking-widest">Non scrivere la verità!</div>
          </div>
      );
  }

  // --- VOTO ---
  if (view === 'BUFALA_VOTE_MOBILE') {
      return (
          <div className="h-screen bg-[#e8e4d3] text-black p-4 flex flex-col font-sans">
              <h2 className="text-center font-black text-2xl mb-6 border-b-4 border-black pb-4 uppercase bg-white py-2 shadow-sm">
                  QUAL È LA VERITÀ?
              </h2>
              <div className="flex-1 overflow-y-auto grid gap-4 pb-4">
                  {options.map((opt, i) => (
                      <button 
                          key={i} 
                          onClick={() => sendVote(opt)} 
                          className="bg-white p-5 border-4 border-black font-bold uppercase shadow-[6px_6px_0_black] active:translate-y-1 active:shadow-none active:translate-x-1 transition-all text-left text-lg leading-tight hover:bg-yellow-100"
                      >
                          {opt}
                      </button>
                  ))}
              </div>
          </div>
      );
  }

  return <div className="h-screen bg-black flex items-center justify-center text-white">Caricamento...</div>;
}