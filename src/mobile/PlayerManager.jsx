import React, { useState, useEffect } from 'react';

// IMPORT GIOCHI MOBILE
import ImposterMobile from './ImposterMobile';
import LiarsBarMobile from './LiarsBarMobile';
import TrashTalkMobile from './TrashTalkMobile';
import BufalaMobile from './BufalaMobile';


const AVATARS = ['😎', '👻', '🤖', '💩', '👽', '🐶', '🐱', '🦄', '🐯', '🐼', '🦊', '🦁', '💀', '🤡', '🤠', '🎃'];
const NEON_COLORS = ['#ff0055', '#00ff99', '#00ccff', '#cc00ff', '#ffaa00', '#ffff00', '#ffffff'];

const renderAvatar = (avatarValue, size = 'text-4xl') => {
    if (avatarValue && (avatarValue.includes('/') || avatarValue.includes('.'))) {
        return <img src={avatarValue} alt="avatar" className="w-full h-full object-contain drop-shadow-md" />;
    }
    return <span className={size}>{avatarValue}</span>;
};

// --- ROUTER INTERNO PER I GIOCHI ---
function MobileGameRouter({ socket, view, setView, playerName }) {
    if (view.startsWith('LIARS_')) return <LiarsBarMobile socket={socket} view={view} setView={setView} />;
    if (view.startsWith('TRASHTALK_')) return <TrashTalkMobile socket={socket} view={view} setView={setView} />;
    if (view.startsWith('BUFALA_')) return <BufalaMobile socket={socket} view={view} setView={setView} />;
    
   
    
    // Default fallback (Imposter)
    return <ImposterMobile socket={socket} view={view} setView={setView} playerName={playerName} />;
}

export default function PlayerManager({ socket }) {
  const [view, setView] = useState('LOGIN'); 
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(NEON_COLORS[1]); 
  const [errorMsg, setErrorMsg] = useState('');
  const [isAutoConnecting, setIsAutoConnecting] = useState(true); 

  useEffect(() => {
    // 1. RECUPERA DATI SALVATI
    const savedName = localStorage.getItem('auragiochet_name');
    const savedAvatar = localStorage.getItem('auragiochet_avatar');
    const savedColor = localStorage.getItem('auragiochet_color');
    const savedSessionId = localStorage.getItem('auragiochet_session_id'); 

    if (savedName) setName(savedName);
    if (savedAvatar) setSelectedAvatar(savedAvatar);
    if (savedColor) setSelectedColor(savedColor);

    // 2. TENTATIVO DI AUTO-LOGIN
    if (savedSessionId && savedName) {
        socket.emit('join_game', { 
            name: savedName, 
            avatar: savedAvatar || AVATARS[0], 
            sessionId: savedSessionId 
        });
    } else {
        setIsAutoConnecting(false); 
    }

    // LISTENER
    socket.on('set_view', (v) => {
        setView(v);
        setIsAutoConnecting(false); 
    });
    
    socket.on('login_success', (playerData) => {
        localStorage.setItem('auragiochet_session_id', playerData.sessionId);
        localStorage.setItem('auragiochet_name', playerData.name);
        
        if (view === 'LOGIN') setView('GLOBAL_LOBBY');
        setIsAutoConnecting(false);
    });

    socket.on('force_reset_to_login', () => { 
        handleLogout(); 
    });
    
    socket.on('login_error', (msg) => {
        alert(msg); 
        setErrorMsg(msg);
        setView('LOGIN');
        setIsAutoConnecting(false);
    });

    return () => { 
        socket.off('set_view'); 
        socket.off('login_success');
        socket.off('force_reset_to_login'); 
        socket.off('login_error'); 
    };
  }, []);

  const handleLogout = () => {
      socket.emit('leave_game'); 
      localStorage.removeItem('auragiochet_session_id');
      localStorage.removeItem('auragiochet_name');
      localStorage.removeItem('auragiochet_avatar');
      localStorage.removeItem('auragiochet_color');
      setName('');
      setSelectedAvatar(AVATARS[0]);
      setView('LOGIN');
      setIsAutoConnecting(false);
  };

  const goToAvatarSelection = () => {
      if (!name) return;
      setErrorMsg('');
      setView('AVATAR_SELECT');
  };

  const handleJoin = () => {
    localStorage.setItem('auragiochet_name', name);
    localStorage.setItem('auragiochet_avatar', selectedAvatar);
    localStorage.setItem('auragiochet_color', selectedColor);
    
    const savedSessionId = localStorage.getItem('auragiochet_session_id');
    
    socket.emit('join_game', { 
        name, 
        avatar: selectedAvatar, 
        color: selectedColor,
        sessionId: savedSessionId 
    });
  };

  // --- LOADING ---
  if (isAutoConnecting) {
      return (
          <div className="h-full min-h-screen bg-black flex flex-col items-center justify-center text-white">
              <div className="w-12 h-12 border-4 border-t-purple-500 border-white/20 rounded-full animate-spin mb-4"></div>
              <p className="font-bold uppercase tracking-widest animate-pulse">Riconnessione...</p>
              <button onClick={handleLogout} className="mt-8 text-xs text-white/30 underline">Annulla e Resetta</button>
          </div>
      );
  }

  // --- LOGIN ---
  if (view === 'LOGIN') {
    return (
      <div className="h-full min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden text-white">
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-sm text-center">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-8 tracking-tighter">AURAGIOCHET</h1>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                <input type="text" placeholder="NICKNAME" className="w-full p-4 rounded-xl text-xl font-black text-center bg-black/50 text-white border-2 border-white/10 focus:border-purple-500 outline-none mb-6 uppercase" value={name} onChange={e => setName(e.target.value.toUpperCase())} maxLength={12} />
                <button onClick={goToAvatarSelection} disabled={!name} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-black text-xl uppercase shadow-lg active:scale-95 transition-all disabled:opacity-50">AVANTI</button>
                {errorMsg && <p className="text-red-400 mt-4 font-bold text-sm animate-pulse">⚠️ {errorMsg}</p>}
            </div>
        </div>
      </div>
    );
  }

  // --- AVATAR ---
  if (view === 'AVATAR_SELECT') {
      return (
        <div className="h-full min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-4 relative overflow-y-auto">
            <div className="w-full max-w-sm flex flex-col gap-6 py-6">
                <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4 text-center">1. Scegli il Volto</h2>
                    <div className="grid grid-cols-4 gap-3">
                        {AVATARS.map((av) => {
                            const isSelected = selectedAvatar === av;
                            return (<button key={av} onClick={() => setSelectedAvatar(av)} className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-200 border-2 ${isSelected ? 'bg-white/10 border-white scale-110 shadow-lg z-10' : 'border-transparent opacity-60 hover:opacity-100'}`}>{renderAvatar(av, 'text-3xl')}</button>);
                        })}
                    </div>
                </div>
                <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4 text-center">2. Scegli il Colore</h2>
                    <div className="flex flex-wrap justify-center gap-4 px-2 py-2">
                        {NEON_COLORS.map((col) => {
                            const isSelected = selectedColor === col;
                            return (<button key={col} onClick={() => setSelectedColor(col)} className={`w-10 h-10 rounded-full border-2 transition-all duration-300 relative ${isSelected ? 'scale-125 z-10' : 'scale-100 opacity-50'}`} style={{ backgroundColor: col, borderColor: isSelected ? 'white' : 'transparent', boxShadow: isSelected ? `0 0 20px ${col}` : 'none' }} />);
                        })}
                    </div>
                </div>
                <div className="flex gap-4 mt-2">
                    <button onClick={() => setView('LOGIN')} className="flex-1 py-4 rounded-xl font-bold bg-white/10 uppercase text-sm">Indietro</button>
                    <button onClick={handleJoin} className="flex-[2] py-4 rounded-xl font-black text-xl uppercase shadow-lg text-black transition-transform active:scale-95" style={{ backgroundColor: selectedColor, boxShadow: `0 0 25px ${selectedColor}60` }}>ENTRA</button>
                </div>
                <div className="h-10"></div>
            </div>
        </div>
      );
  }

  // --- LOBBY ---
  if (view === 'GLOBAL_LOBBY') {
      return (
          <div className="h-full min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 blur-[100px]" style={{ background: `radial-gradient(circle, ${selectedColor}, transparent 70%)` }}></div>
              <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                  <div className="w-48 h-48 rounded-full border-[6px] flex items-center justify-center mb-8 bg-black/40 backdrop-blur-md animate-pulse-slow" style={{ borderColor: selectedColor, boxShadow: `0 0 50px ${selectedColor}60, inset 0 0 20px ${selectedColor}30` }}>
                      {renderAvatar(selectedAvatar, 'text-8xl drop-shadow-md')}
                  </div>
                  <h2 className="text-4xl font-black mb-3 uppercase tracking-wider drop-shadow-lg">{name}</h2>
                  <div className="bg-white/10 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-2 mb-12">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: selectedColor }}></div>
                      <p className="text-white/60 font-bold uppercase text-xs tracking-[0.2em]">In attesa dell'Host...</p>
                  </div>
                  <button onClick={handleLogout} className="px-6 py-3 rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-95">Cambia Profilo</button>
              </div>
          </div>
      );
  }

  return <MobileGameRouter socket={socket} view={view} setView={setView} playerName={name} />;
}