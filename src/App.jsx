import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'; 
import io from 'socket.io-client';

// PAGINE HOST
import HostMenu from './pages/HostMenu';
import ImposterGame from './games/ImposterGame';
import LiarsBarGame from './games/LiarsBarGame';
import TrashTalkGame from './games/TrashTalkGame';


// IMPORT MODIFICATO: PUNTIAMO ALLA CARTELLA MOBILE
import PlayerManager from './mobile/PlayerManager';

const SERVER_URL = window.location.hostname === 'localhost' 
  ? `http://${window.location.hostname}:3000` 
  : window.location.origin;

const socket = io(SERVER_URL, { 
    transports: ['websocket', 'polling'],
    reconnection: true,             
    reconnectionAttempts: 50        
});

// --- LAYOUT IBRIDO SICURO ---
function HostLayout({ children }) {
    const [isPlayerMode, setIsPlayerMode] = useState(false);

    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* 1. VISTA HOST (TV) */}
            <div className={`w-full h-full transition-opacity duration-300 ${isPlayerMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {children}
            </div>

            {/* 2. VISTA PLAYER (CONTROLLER) */}
            {/* Nascosta con CSS (translate) invece di essere smontata */}
            <div 
                className={`absolute inset-0 z-50 bg-black transition-transform duration-300 ${
                    isPlayerMode ? 'translate-y-0' : 'translate-y-full'
                }`}
            >
                <PlayerManager socket={socket} />
            </div>

            {/* 3. BOTTONE FLOTTANTE */}
            <button 
                onClick={() => setIsPlayerMode(!isPlayerMode)}
                className={`
                    fixed bottom-4 right-4 z-[9999] p-4 rounded-full shadow-2xl border-4 transition-all active:scale-90
                    ${isPlayerMode 
                        ? 'bg-yellow-400 border-black text-black animate-pulse shadow-[0_0_20px_yellow]' 
                        : 'bg-white border-gray-200 text-black opacity-50 hover:opacity-100'
                    }
                `}
                title={isPlayerMode ? "Torna alla TV" : "Gioca anche tu"}
            >
                {isPlayerMode ? <span className="text-2xl font-black">📺</span> : <span className="text-2xl">🎮</span>}
            </button>
            
            {!isPlayerMode && (
                <div className="fixed bottom-6 right-24 z-[9990] bg-black/80 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest pointer-events-none border border-white/20">
                    Entra in partita
                </div>
            )}
        </div>
    );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="fixed top-3 right-3 z-[9999] font-mono text-[10px] font-bold uppercase tracking-widest pointer-events-none select-none text-white/20">
          made by jonny <span className="text-white ml-1 opacity-50">beta 0.05</span>
      </div>
      <Routes>
        <Route path="/host" element={<HostLayout><HostMenu socket={socket} /></HostLayout>} />
        <Route path="/host/imposter" element={<HostLayout><ImposterGame socket={socket} /></HostLayout>} />
        <Route path="/host/liarsbar" element={<HostLayout><LiarsBarGame socket={socket} /></HostLayout>} />
        <Route path="/host/trashtalk" element={<HostLayout><TrashTalkGame socket={socket} /></HostLayout>} />
        
        <Route path="*" element={<PlayerManager socket={socket} />} />
      </Routes>
    </BrowserRouter>
  );
}