import React, { useEffect, useState } from 'react';

export default function QuizGame({ socket }) {
  const [lastAnswer, setAnswer] = useState(null);

  useEffect(() => {
    // Ascolta le risposte dai telefoni
    socket.on('action_received', (data) => {
      setAnswer(data); // data potrebbe essere "Mario: A"
    });
  }, []);

  return (
    <div className="min-h-screen bg-indigo-900 text-white p-10 text-center">
      <h1 className="text-4xl mb-10">DOMANDA: Di che colore è il cavallo bianco?</h1>
      
      <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
        <div className="bg-red-500 p-10 rounded text-2xl">A: Bianco</div>
        <div className="bg-blue-500 p-10 rounded text-2xl">B: Nero</div>
      </div>

      <div className="mt-10 p-5 bg-black/30 rounded">
        Ultima risposta ricevuta: {lastAnswer}
      </div>
    </div>
  );
}