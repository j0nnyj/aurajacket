import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HostMenu({ socket }) {
  const navigate = useNavigate();

  const startQuiz = () => {
    // 1. Diciamo al server: "Imposta il gioco su QUIZ"
    socket.emit('host_change_game', 'QUIZ');
    // 2. L'Host naviga alla pagina del quiz
    navigate('/host/quiz');
  };

  const startImposter = () => {
   // 1. Avvisa il server di preparare il modulo Imposter
   socket.emit('host_change_game', 'IMPOSTER'); 
   // 2. Naviga
   navigate('/host/imposter');
}

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold mb-10">SCEGLI UN GIOCO</h1>
      <div className="flex gap-10">
        <button 
          onClick={startQuiz}
          className="w-64 h-64 bg-purple-600 rounded-xl text-3xl font-bold hover:scale-105 transition shadow-xl"
        >
          SUPER QUIZ
        </button>

        
        <button 
        onClick={startImposter}
        className="w-64 h-64 bg-red-600 rounded-xl text-3xl font-bold hover:scale-105 transition shadow-xl p-4"
        >
        🕵️ IMPOSTORE
        </button>
        
        <button className="w-64 h-64 bg-gray-700 rounded-xl text-3xl font-bold opacity-50 cursor-not-allowed">
          ALTRO GIOCO (Presto)
        </button>
      </div>
    </div>
  );
}