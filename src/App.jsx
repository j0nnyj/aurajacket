import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import io from 'socket.io-client';

import HostMenu from './pages/HostMenu';
import ImposterGame from './games/ImposterGame';
import ImposterMobile from './mobile/ImposterMobile';

const socket = io();
const AVATARS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐙", "🦄"];

export default function App() {
  const isHost = window.location.pathname.startsWith('/host');
  if (isHost) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/host" element={<HostMenu socket={socket} />} />
          <Route path="/host/imposter" element={<ImposterGame socket={socket} />} />
        </Routes>
      </BrowserRouter>
    );
  } 
  return <PlayerManager />;
}

function PlayerManager() {
  const [view, setView] = useState('LOADING'); 
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  useEffect(() => {
    // 1. Ascolta cambi vista
    socket.on('set_view', (v) => setView(v));

    // 2. Ascolta cambi nome forzati (duplicati)
    socket.on('force_name_change', (newName) => {
        setName(newName);
        const saved = JSON.parse(sessionStorage.getItem('aura_player') || '{}');
        sessionStorage.setItem('aura_player', JSON.stringify({ ...saved, name: newName }));
    });

    // 3. ASCOLTA IL RESET DELL'HOST (NUOVO)
    socket.on('force_reset_to_login', () => {
        console.log("🛑 Reset ricevuto.");
        sessionStorage.removeItem('aura_player'); // Cancella memoria
        setName('');
        setView('LOGIN');
    });

    // 4. AUTO-LOGIN ALL'AVVIO
    const savedSession = sessionStorage.getItem('aura_player');
    if (savedSession) {
        const { name: savedName, avatar: savedAvatar } = JSON.parse(savedSession);
        setName(savedName);
        setSelectedAvatar(savedAvatar);
        socket.emit('join_game', { name: savedName, avatar: savedAvatar });
        setView('RECONNECTING'); 
    } else {
        setView('LOGIN');
    }

    return () => {
        socket.off('set_view');
        socket.off('force_name_change');
        socket.off('force_reset_to_login');
    };
  }, []);

  const goToAvatar = () => { if (name.trim()) setView('AVATAR_SELECT'); };

  const joinGame = () => { 
    // Salva sessione
    sessionStorage.setItem('aura_player', JSON.stringify({ name, avatar: selectedAvatar }));
    socket.emit('join_game', { name: name, avatar: selectedAvatar }); 
  };

  // --- ROUTING MODULO GIOCO ---
  if (view.startsWith('IMPOSTER_') || view === 'GAME_OVER') {
      return <ImposterMobile socket={socket} view={view} setView={setView} playerName={name} />;
  }

  // --- UI BASE (GRAFICA DARK) ---

  if (view === 'RECONNECTING' || view === 'LOADING') {
      return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white animate-pulse text-xl">♻️ Riconnessione...</div>;
  }

  if (view === 'LOGIN') {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans">
            <div className="w-full max-w-sm bg-slate-800 p-8 rounded-3xl shadow-2xl border-t-4 border-purple-500">
                <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">BENVENUTO</h1>
                <p className="text-slate-400 mb-8 text-sm uppercase font-bold tracking-widest">Inserisci il tuo nome</p>
                <input 
                    className="w-full bg-slate-700 text-white p-4 rounded-xl text-center text-xl font-bold border-2 border-transparent focus:border-purple-500 focus:outline-none transition-all mb-6 placeholder-slate-500" 
                    placeholder="Nome Giocatore" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    maxLength={12}
                    onKeyDown={e => e.key === 'Enter' && goToAvatar()}
                />
                <button 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-xl font-bold text-xl shadow-lg active:scale-95 transition-transform hover:shadow-purple-500/20" 
                    onClick={goToAvatar}
                >
                    AVANTI ➜
                </button>
            </div>
        </div>
      );
  }

  if (view === 'AVATAR_SELECT') {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 pt-8">
          <h2 className="text-white text-2xl font-bold mb-6">Scegli il tuo volto</h2>
          <div className="grid grid-cols-4 gap-3 mb-24 w-full max-w-md">
            {AVATARS.map(emoji => (
              <button 
                key={emoji} 
                onClick={() => setSelectedAvatar(emoji)} 
                className={`text-4xl aspect-square flex items-center justify-center rounded-2xl transition-all duration-200 
                  ${selectedAvatar === emoji ? 'bg-green-500 scale-110 shadow-lg border-2 border-white z-10' : 'bg-slate-700 hover:bg-slate-600 border border-slate-600'}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="fixed bottom-0 left-0 w-full bg-slate-800 p-4 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col items-center">
             <div className="flex items-center gap-3 mb-4 bg-slate-900 px-6 py-2 rounded-full border border-slate-700">
                <span className="text-3xl animate-bounce-short">{selectedAvatar}</span>
                <span className="text-xl text-white font-bold truncate max-w-[150px]">{name}</span>
             </div>
             <button className="w-full max-w-md bg-green-500 text-white p-4 rounded-xl font-bold text-xl shadow-lg active:scale-95 transition-transform" onClick={joinGame}>
                ENTRA IN PARTITA
             </button>
          </div>
        </div>
      );
  }

  if (view === 'WAITING') {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-center p-6">
          <div className="relative">
             <div className="text-7xl mb-6 animate-bounce">{selectedAvatar}</div>
             <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-slate-900"></div>
          </div>
          <h2 className="text-white text-3xl font-black mb-2 tracking-tight">SEI DENTRO!</h2>
          <p className="text-slate-400 text-lg font-medium">Non toccare il telefono...</p>
        </div>
      );
  }

  return null;
}