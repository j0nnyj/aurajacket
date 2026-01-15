import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import io from 'socket.io-client';

// PAGINE HOST
import HostMenu from './pages/HostMenu';
import ImposterGame from './games/ImposterGame';
import LiarsBarGame from './games/LiarsBarGame';

// PAGINE TELEFONO
import ImposterMobile from './mobile/ImposterMobile';
import LiarsBarMobile from './mobile/LiarsBarMobile';

// CONNESSIONE SOCKET
const SERVER_URL = window.location.hostname === 'localhost' 
  ? `http://${window.location.hostname}:3000` 
  : window.location.origin;

const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });

const AVATARS = ['😎', '👻', '🤖', '💩', '👽', '🐶', '🐱', '🦄', '🐯', '🐼', '🦊', '🦁', '💀', '🤡', '🤠', '🎃'];

// ==============================================
// 📱 COMPONENTE GIOCATORE (Mobile)
// ==============================================
function PlayerManager() {
  const [isConnected, setIsConnected] = useState(false);
  const [view, setView] = useState('LOGIN'); 
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😎');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    
    // Check memoria (aggiornato a AURAGIOCHET)
    const savedName = localStorage.getItem('auragiochet_name');
    const savedAvatar = localStorage.getItem('auragiochet_avatar');
    if (savedName && savedAvatar) {
        setName(savedName);
        setSelectedAvatar(savedAvatar);
    }

    socket.on('set_view', (v) => setView(v));
    socket.on('force_name_change', (n) => {
        setName(n);
        localStorage.setItem('auragiochet_name', n);
    });
    
    socket.on('force_reset_to_login', () => { 
        localStorage.removeItem('auragiochet_name');
        localStorage.removeItem('auragiochet_avatar');
        setView('LOGIN'); 
        setName(''); 
    });
    
    socket.on('login_error', (msg) => {
        alert(msg); 
        setErrorMsg(msg);
        setView('LOGIN');
    });

    return () => { 
        socket.off('connect'); 
        socket.off('set_view'); 
        socket.off('force_name_change');
        socket.off('force_reset_to_login');
        socket.off('login_error'); 
    };
  }, []);

  const goToAvatarSelection = () => {
      if (!name) return;
      setErrorMsg('');
      setView('AVATAR_SELECT');
  };

  const handleJoin = () => {
    localStorage.setItem('auragiochet_name', name);
    localStorage.setItem('auragiochet_avatar', selectedAvatar);
    socket.emit('join_game', { name, avatar: selectedAvatar });
  };

  // --- VISTE ---

  // 1. LOGIN (NUOVO DESIGN AURAGIOCHET)
  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        
        {/* Sfondo Ambientale */}
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]"></div>

        <div className="relative z-10 w-full max-w-sm">
            {/* Titolo */}
            <div className="text-center mb-12">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] tracking-tighter mb-2">
                    AURAGIOCHET
                </h1>
                <p className="text-indigo-200/50 text-xs font-bold tracking-[0.5em] uppercase">Enter the Game</p>
            </div>

            {/* Card Login */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                <label className="text-xs uppercase font-bold text-indigo-300 ml-1 mb-2 block tracking-wider">Il tuo Nickname</label>
                
                <input 
                  type="text" 
                  placeholder="Scrivi qui..." 
                  className="w-full p-4 rounded-xl text-xl font-bold text-center bg-black/40 text-white border-2 border-indigo-500/30 focus:border-indigo-500 outline-none transition placeholder-white/20"
                  value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && name && goToAvatarSelection()} 
                />
                
                <button 
                  onClick={goToAvatarSelection}
                  disabled={!name} 
                  className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-black text-xl shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                >
                  Avanti
                </button>
                
                {errorMsg && <p className="text-red-400 text-center font-bold mt-4 text-sm">{errorMsg}</p>}
            </div>
        </div>
      </div>
    );
  }

  // 1.5 SCELTA AVATAR (AGGIORNATO)
  if (view === 'AVATAR_SELECT') {
      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px]"></div>
            
            <div className="relative z-10 w-full max-w-sm text-center">
                <h2 className="text-3xl font-black text-white mb-8 tracking-tight">SCEGLI AVATAR</h2>
                
                <div className="grid grid-cols-4 gap-4 mb-10">
                    {AVATARS.map((av) => (
                        <button 
                            key={av}
                            onClick={() => setSelectedAvatar(av)}
                            className={`text-4xl p-4 rounded-2xl border-2 transition-all duration-300 ${selectedAvatar === av ? 'bg-indigo-600 border-white scale-110 shadow-[0_0_20px_rgba(79,70,229,0.5)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                            {av}
                        </button>
                    ))}
                </div>

                <div className="flex gap-4">
                    <button onClick={() => setView('LOGIN')} className="flex-1 py-4 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition">Indietro</button>
                    <button onClick={handleJoin} className="flex-[2] py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg hover:shadow-green-500/30 text-xl uppercase tracking-widest transition transform active:scale-95">GIOCA</button>
                </div>
            </div>
        </div>
      );
  }

  // 2. LOBBY GENERALE
  if (view === 'GLOBAL_LOBBY') {
      return (
          <div className="h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#050505] to-[#050505]"></div>
              
              <div className="relative z-10">
                  <div className="text-8xl mb-6 inline-block p-6 rounded-full bg-white/5 border-4 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                      {selectedAvatar}
                  </div>
                  <h2 className="text-5xl font-black mb-2 text-white tracking-tighter">{name}</h2>
                  <p className="text-indigo-400 font-bold uppercase tracking-widest mb-16 text-sm">Connesso a Auragiochet</p>
                  
                  <div className="bg-white/5 backdrop-blur border border-white/10 px-10 py-6 rounded-2xl animate-pulse flex flex-col gap-2">
                      <span className="text-4xl">📺</span>
                      <span className="text-xs font-bold uppercase text-slate-400 tracking-widest">Guarda lo schermo principale</span>
                  </div>
              </div>
          </div>
      );
  }

  // 3. GIOCHI & FALLBACK
  if (view.startsWith('IMPOSTER_') || view === 'GAME_OVER') return <ImposterMobile socket={socket} view={view} setView={setView} playerName={name} />;
  if (view.startsWith('LIARS_')) return <LiarsBarMobile socket={socket} view={view} setView={setView} />;
  return <div className="text-white bg-slate-900 h-screen flex items-center justify-center font-bold">Connessione...</div>;
}

// ==============================================
// 🌍 APP PRINCIPALE
// ==============================================
export default function App() {
  return (
    <BrowserRouter>
      {/* FIRMA JONNY */}
      <div className="fixed top-3 right-3 z-[9999] font-mono text-[10px] font-bold uppercase tracking-widest pointer-events-none select-none text-white/30">
          made by jonny <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] ml-1">beta 0.01</span>
      </div>

      <Routes>
        <Route path="/host" element={<HostMenu socket={socket} />} />
        <Route path="/host/imposter" element={<ImposterGame socket={socket} />} />
        <Route path="/host/liarsbar" element={<LiarsBarGame socket={socket} />} />
        <Route path="*" element={<PlayerManager />} />
      </Routes>
    </BrowserRouter>
  );
}