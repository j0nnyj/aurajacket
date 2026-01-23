// Gestione dei file audio (SOLO SFX ESSENZIALI)
const sounds = {
    click: new Audio('/sounds/click.mp3'),
    bang: new Audio('/sounds/bang.mp3'),
    spin: new Audio('/sounds/spin.mp3'),
    win: new Audio('/sounds/win.mp3')
};

// Configurazione Volumi (Alti per essere sicuri si sentano)
sounds.bang.volume = 1.0;
sounds.click.volume = 1.0;
sounds.spin.volume = 1.0;
if(sounds.win) sounds.win.volume = 0.8;

export const playSound = (name) => {
    const sound = sounds[name];
    if (sound) {
        sound.currentTime = 0;
        // Tentativo di play con catch per evitare errori in console
        sound.play().catch(e => console.log("Audio FX block:", e));
    }
};

// Funzioni vuote per non rompere le importazioni in LiarsBarGame.jsx
export const playRandomMusic = () => {}; 
export const stopMusic = () => {};

export const stopAll = () => {
    Object.values(sounds).forEach(s => {
        s.pause();
        s.currentTime = 0;
    });
};