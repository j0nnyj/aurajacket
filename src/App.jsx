import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

// PAGINE HOST
import HostMenu from './pages/HostMenu';
import ImposterGame from './games/ImposterGame';
import LiarsBarGame from './games/LiarsBarGame';
import TrashTalkGame from './games/TrashTalkGame';

// PAGINE MOBILE
import ImposterMobile from './mobile/ImposterMobile';
import LiarsBarMobile from './mobile/LiarsBarMobile';
import TrashTalkMobile from './mobile/TrashTalkMobile';

// CONNESSIONE SOCKET
const SERVER_URL = window.location.hostname === 'localhost' 
  ? `http://${window.location.hostname}:3000` 
  : window.location.origin;

const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });

// --- CONFIGURAZIONE AVATAR ---
const AVATARS = ['😎', '👻', '🤖', '💩', '👽', '🐶', '🐱', '🦄', '🐯', '🐼', '🦊', '🦁', '💀', '🤡', '🤠', '🎃'];

// --- COLORI NEON ---
const NEON_COLORS = [
    '#ff0055', // Rosso Neon
    '#00ff99', // Verde Cyber
    '#00ccff', // Blu Elettrico
    '#cc00ff', // Viola
    '#ffaa00', // Arancio
    '#ffff00', // Giallo
    '#ffffff', // Bianco
];

const renderAvatar = (avatarValue, size = 'text-4xl') => {
    if (avatarValue.includes('/') || avatarValue.includes('.')) {
        return <img src={avatarValue} alt="avatar" className="w-full h-full object-contain drop-shadow-md" />;
    }
    return <span className={size}>{avatarValue}</span>;
};

// ==============================================
// 📱 COMPONENTE GIOCATORE (Mobile)
// ==============================================
function PlayerManager() {
  const [view, setView] = useState('LOGIN'); 
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(NEON_COLORS[1]); 
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('auragiochet_name');
    const savedAvatar = localStorage.getItem('auragiochet_avatar');
    const savedColor = localStorage.getItem('auragiochet_color');
    
    if (savedName) setName(savedName);
    if (savedAvatar) setSelectedAvatar(savedAvatar);
    if (savedColor) setSelectedColor(savedColor);

    socket.on('set_view', (v) => setView(v));
    
    socket.on('force_reset_to_login', () => { 
        localStorage.clear();
        setView('LOGIN'); 
        setName(''); 
    });
    
    socket.on('login_error', (msg) => {
        alert(msg); 
        setErrorMsg(msg);
        setView('LOGIN');
    });

    return () => { 
        socket.off('set_view'); 
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
    localStorage.setItem('auragiochet_color', selectedColor);
    socket.emit('join_game', { name, avatar: selectedAvatar, color: selectedColor });
  };

  // --- VISTA 1: LOGIN ---
  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden text-white">
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-sm text-center">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-8 tracking-tighter">AURAGIOCHET</h1>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                <input 
                    type="text" 
                    placeholder="NICKNAME" 
                    className="w-full p-4 rounded-xl text-xl font-black text-center bg-black/50 text-white border-2 border-white/10 focus:border-purple-500 outline-none mb-6 uppercase"
                    value={name} 
                    onChange={e => setName(e.target.value.toUpperCase())} 
                    maxLength={12} 
                />
                <button onClick={goToAvatarSelection} disabled={!name} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-black text-xl uppercase shadow-lg active:scale-95 transition-all disabled:opacity-50">AVANTI</button>
                {errorMsg && <p className="text-red-400 mt-4 font-bold text-sm animate-pulse">⚠️ {errorMsg}</p>}
            </div>
        </div>
      </div>
    );
  }

  // --- VISTA 2: AVATAR & COLORE (FIX RESPONSIVE) ---
  if (view === 'AVATAR_SELECT') {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-4 relative overflow-y-auto">
            {/* Contenitore centrale limitato in larghezza per non spanciare sui tablet */}
            <div className="w-full max-w-sm flex flex-col gap-6 py-6">
                
                {/* 1. SELEZIONE EMOJI */}
                <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4 text-center">1. Scegli il Volto</h2>
                    <div className="grid grid-cols-4 gap-3">
                        {AVATARS.map((av) => {
                            const isSelected = selectedAvatar === av;
                            return (
                                <button 
                                    key={av} 
                                    onClick={() => setSelectedAvatar(av)} 
                                    className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-200 border-2 ${isSelected ? 'bg-white/10 border-white scale-110 shadow-lg z-10' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                    {renderAvatar(av, 'text-3xl')}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. SELEZIONE COLORE (FIX GLOW TAGLIATO) */}
                <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4 text-center">2. Scegli il Colore</h2>
                    {/* Usa flex-wrap invece di overflow-x per evitare il taglio dell'ombra */}
                    <div className="flex flex-wrap justify-center gap-4 px-2 py-2">
                        {NEON_COLORS.map((col) => {
                            const isSelected = selectedColor === col;
                            return (
                                <button 
                                    key={col}
                                    onClick={() => setSelectedColor(col)}
                                    // Aggiunto margine per evitare che il glow venga tagliato dai vicini
                                    className={`w-10 h-10 rounded-full border-2 transition-all duration-300 relative ${isSelected ? 'scale-125 z-10' : 'scale-100 opacity-50'}`}
                                    style={{ 
                                        backgroundColor: col, 
                                        borderColor: isSelected ? 'white' : 'transparent',
                                        // Ombra molto più visibile e non tagliata
                                        boxShadow: isSelected ? `0 0 20px ${col}` : 'none'
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
                
                {/* BOTTONI AZIONE */}
                <div className="flex gap-4 mt-2">
                    <button onClick={() => setView('LOGIN')} className="flex-1 py-4 rounded-xl font-bold bg-white/10 uppercase text-sm">Indietro</button>
                    <button 
                        onClick={handleJoin} 
                        className="flex-[2] py-4 rounded-xl font-black text-xl uppercase shadow-lg text-black transition-transform active:scale-95"
                        style={{ backgroundColor: selectedColor, boxShadow: `0 0 25px ${selectedColor}60` }}
                    >
                        ENTRA
                    </button>
                </div>

                <div className="h-10"></div> {/* Spazio extra per lo scroll */}
            </div>
        </div>
      );
  }

  // --- VISTA 3: LOBBY ---
  if (view === 'GLOBAL_LOBBY') {
      return (
          <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 blur-[100px]" style={{ background: `radial-gradient(circle, ${selectedColor}, transparent 70%)` }}></div>
              <div className="relative z-10 flex flex-col items-center">
                  <div 
                    className="w-48 h-48 rounded-full border-[6px] flex items-center justify-center mb-8 bg-black/40 backdrop-blur-md animate-pulse-slow"
                    style={{ borderColor: selectedColor, boxShadow: `0 0 50px ${selectedColor}60, inset 0 0 20px ${selectedColor}30` }}
                  >
                      {renderAvatar(selectedAvatar, 'text-8xl drop-shadow-md')}
                  </div>
                  <h2 className="text-4xl font-black mb-3 uppercase tracking-wider drop-shadow-lg">{name}</h2>
                  <div className="bg-white/10 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: selectedColor }}></div>
                      <p className="text-white/60 font-bold uppercase text-xs tracking-[0.2em]">In attesa dell'Host...</p>
                  </div>
              </div>
          </div>
      );
  }

  return <MobileGameRouter socket={socket} view={view} setView={setView} playerName={name} />;
}

// 🔀 ROUTER GIOCHI
function MobileGameRouter({ socket, view, setView, playerName }) {
    if (view.startsWith('LIARS_')) return <LiarsBarMobile socket={socket} view={view} setView={setView} />;
   if (view.startsWith('TRASHTALK_')) return <TrashTalkMobile socket={socket} view={view} setView={setView} />;
    return <ImposterMobile socket={socket} view={view} setView={setView} playerName={playerName} />;
}

// 🌍 APP ROUTING
export default function App() {
  return (
    <BrowserRouter>
      <div className="fixed top-3 right-3 z-[9999] font-mono text-[10px] font-bold uppercase tracking-widest pointer-events-none select-none text-white/20">
          made by jonny <span className="text-white ml-1 opacity-50">beta 0.01</span>
      </div>
      <Routes>
        <Route path="/host" element={<HostMenu socket={socket} />} />
        <Route path="/host/imposter" element={<ImposterGame socket={socket} />} />
        <Route path="/host/liarsbar" element={<LiarsBarGame socket={socket} />} />
        <Route path="/host/trashtalk" element={<TrashTalkGame socket={socket} />} />
        <Route path="*" element={<PlayerManager />} />
      </Routes>
    </BrowserRouter>
  );
}