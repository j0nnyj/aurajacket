import React, { useState, useEffect, useRef } from 'react';

export default function IsItYouMobile({ socket, view, setView }) {
  const [task, setTask] = useState(null);
  const [players, setPlayers] = useState([]);
  const [bgImage, setBgImage] = useState(null);
  const [gallery, setGallery] = useState([]);

  // Refs
  const fileInputRef = useRef(null);
  const drawCanvasRef = useRef(null);
  
  // Drawing Settings
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#FF0000'); 

  useEffect(() => {
    // APPENA CARICATO, CHIEDI SYNC AGGRESSIVAMENTE
    socket.emit('isityou_sync');
    
    socket.on('update_player_list', setPlayers);
    socket.on('isityou_task', (data) => {
        setTask(data);
        if (data && data.bgImage) setBgImage(data.bgImage);
    });
    socket.on('isityou_gallery', setGallery);
    
    return () => {
        socket.off('update_player_list');
        socket.off('isityou_task');
        socket.off('isityou_gallery');
    };
  }, [socket]);

  // --- LOGICA DISEGNO ---
  useEffect(() => {
      if (view === 'ISITYOU_CANVAS' && bgImage && drawCanvasRef.current) {
          const canvas = drawCanvasRef.current;
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = bgImage;
      }
  }, [view, bgImage]);

  const startDraw = (e) => {
      const { offsetX, offsetY } = getPos(e);
      const ctx = drawCanvasRef.current.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      setIsDrawing(true);
  };
  const moveDraw = (e) => {
      if (!isDrawing) return;
      const { offsetX, offsetY } = getPos(e);
      const ctx = drawCanvasRef.current.getContext('2d');
      ctx.lineTo(offsetX, offsetY);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();
  };
  const endDraw = () => { setIsDrawing(false); };

  const getPos = (e) => {
      const rect = drawCanvasRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
          offsetX: clientX - rect.left,
          offsetY: clientY - rect.top
      };
  };

  const submitDrawing = () => {
      if (!drawCanvasRef.current) return;
      const dataUrl = drawCanvasRef.current.toDataURL('image/jpeg', 0.6);
      socket.emit('isityou_upload', { img: dataUrl, type: 'ROUND' });
      setView('ISITYOU_WAITING');
  };

  // --- LOGICA FOTO ---
  const handleFile = (e) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const MAX_SIZE = 600; 
                  let w = img.width;
                  let h = img.height;
                  if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE/w; w = MAX_SIZE; } }
                  else { if (h > MAX_SIZE) { w *= MAX_SIZE/h; h = MAX_SIZE; } }
                  canvas.width = w;
                  canvas.height = h;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, w, h);
                  
                  const resized = canvas.toDataURL('image/jpeg', 0.7);
                  const type = view === 'ISITYOU_SELFIE' ? 'PROFILE' : 'ROUND';
                  socket.emit('isityou_upload', { img: resized, type });
                  setView('ISITYOU_WAITING');
              };
              img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
      }
  };

  const votePoll = (target, joker) => {
      socket.emit('isityou_vote', { target, joker });
      setView('ISITYOU_WAITING');
  };

  // --- VISTE ---

  if (view === 'ISITYOU_SELFIE' || view === 'ISITYOU_CAMERA') {
      return (
          <div className="h-screen bg-[#333] flex flex-col items-center justify-center p-6 text-white text-center">
              <h1 className="text-2xl font-bold mb-4 uppercase">
                  {view === 'ISITYOU_SELFIE' ? 'SELFIE TIME!' : 'FOTO CHALLENGE'}
              </h1>
              {task && <p className="mb-6 text-yellow-400 italic">"{task.text}"</p>}
              <button onClick={() => fileInputRef.current.click()} className="w-40 h-40 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition">
                  <span className="text-5xl">📷</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFile} />
          </div>
      );
  }

  if (view === 'ISITYOU_CANVAS') {
      return (
          <div className="h-screen bg-gray-900 flex flex-col items-center pt-2 overflow-hidden touch-none">
              <div className="text-white text-sm font-bold mb-1">DISEGNA SU QUESTA FACCIA!</div>
              <canvas 
                  ref={drawCanvasRef} width={320} height={400} 
                  className="bg-white rounded shadow-lg touch-none"
                  onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
                  onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw}
              />
              <div className="flex gap-2 mt-2">
                  {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#000000', '#FFFFFF'].map(c => (
                      <button key={c} onClick={() => setColor(c)} style={{backgroundColor: c}} 
                        className={`w-8 h-8 rounded-full border-2 ${color===c ? 'border-white scale-125' : 'border-transparent'}`} />
                  ))}
              </div>
              <button onClick={submitDrawing} className="mt-3 bg-green-600 text-white px-8 py-3 rounded-full font-bold uppercase">INVIA</button>
          </div>
      );
  }

  if (view === 'ISITYOU_VOTE_POLL' || view === 'ISITYOU_VOTE_IMAGE') {
      return (
          <div className="h-screen bg-[#F5E6CA] p-4 flex flex-col">
              <div className="bg-white p-3 rounded-xl shadow mb-4 rotate-1 text-center">
                   <h2 className="text-sm font-black text-gray-800">{task?.text || "VOTA IL MIGLIORE"}</h2>
              </div>
              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pb-20">
                  {view === 'ISITYOU_VOTE_POLL' ? (
                      players.map(p => (
                          <button key={p.sessionId} onClick={() => votePoll(p.sessionId, false)} className="bg-white p-4 rounded-xl shadow flex flex-col items-center active:bg-yellow-200">
                              <div className="text-3xl mb-1">{p.avatar}</div>
                              <span className="font-bold text-xs uppercase">{p.name}</span>
                          </button>
                      ))
                  ) : (
                      gallery.map(g => (
                          <button key={g.id} onClick={() => votePoll(g.id, false)} className="relative aspect-square active:scale-95 transition">
                              <img src={g.image} className="w-full h-full object-cover rounded-lg border-2 border-white shadow" />
                              <span className="absolute bottom-0 left-0 bg-black/50 text-white text-xs px-2">{g.name}</span>
                          </button>
                      ))
                  )}
              </div>
              {view === 'ISITYOU_VOTE_POLL' && (
                  <button onClick={() => {}} className="fixed bottom-4 left-4 right-4 bg-purple-600 text-white py-3 rounded-xl font-black shadow border-2 border-yellow-400">
                      USA JOLLY (x2 Punti)
                  </button>
              )}
          </div>
      );
  }

  // --- LOADING / ATTESA (CON BOTTONE FIX) ---
  if (view === 'ISITYOU_WAITING') {
      return (
          <div className="h-screen bg-black text-white flex flex-col items-center justify-center font-bold">
              <p className="mb-4">ATTENDI...</p>
              <button 
                  onClick={() => socket.emit('isityou_sync')} 
                  className="px-6 py-2 bg-gray-800 rounded-full text-xs uppercase border border-white/20 hover:bg-white/10"
              >
                  🔄 Ricarica Stato
              </button>
          </div>
      );
  }

  return <div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
}