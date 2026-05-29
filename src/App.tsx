import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Keyboard, AlertCircle, CheckCircle2, Cpu, Hash, X } from 'lucide-react';

// --- CONSTANTS ---
const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;
const GRID_SIZE = 11;

interface Clue {
  id: string;
  number: number;
  direction: 'across' | 'down';
  clue: string;
  answer: string; // All must be 5 chars for the Wordle mechanic
  row: number;
  col: number;
}

const CLUES: Clue[] = [
  { id: '1a', number: 1, direction: 'across', clue: 'Modern UI framework', answer: 'REACT', row: 1, col: 1 },
  { id: '4a', number: 4, direction: 'across', clue: 'Fastest JS builder', answer: 'VITES', row: 4, col: 1 },
  { id: '6a', number: 6, direction: 'across', clue: 'Data storage unit', answer: 'BLOCK', row: 7, col: 4 },
  { id: '1d', number: 1, direction: 'down', clue: 'Logic unit array', answer: 'ROBOT', row: 1, col: 1 },
  { id: '2d', number: 2, direction: 'down', clue: 'Server-side runtime', answer: 'NODES', row: 1, col: 4 },
  { id: '3d', number: 3, direction: 'down', clue: 'Cloud infrastructure', answer: 'STACK', row: 1, col: 7 },
  { id: '5d', number: 5, direction: 'down', clue: 'Entry sequence', answer: 'INPUT', row: 4, col: 5 },
];

type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

interface Guess {
  word: string;
  statuses: LetterStatus[];
}

export default function App() {
  // Navigation & Flow
  const [gameState, setGameState] = useState<'home' | 'playing' | 'complete'>('home');
  const [solvingClue, setSolvingClue] = useState<Clue | null>(null);
  
  // Crossword State
  const [solvedWords, setSolvedWords] = useState<string[]>([]);
  
  // Wordle State (Internal to Modal)
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // --- CROSSWORD HELPERS ---
  const isCellPartOfClue = (r: number, c: number) => {
    return CLUES.some(clue => {
      for (let i = 0; i < clue.answer.length; i++) {
        const row = clue.row + (clue.direction === 'down' ? i : 0);
        const col = clue.col + (clue.direction === 'across' ? i : 0);
        if (row === r && col === c) return true;
      }
      return false;
    });
  };

  const getLetterAt = (r: number, c: number) => {
    const clueProvidingLetter = CLUES.find(clue => {
      if (!solvedWords.includes(clue.id)) return false;
      for (let i = 0; i < clue.answer.length; i++) {
        const row = clue.row + (clue.direction === 'down' ? i : 0);
        const col = clue.col + (clue.direction === 'across' ? i : 0);
        if (row === r && col === c) return true;
      }
      return false;
    });

    if (!clueProvidingLetter) return '';
    const index = clueProvidingLetter.direction === 'down' 
      ? r - clueProvidingLetter.row 
      : c - clueProvidingLetter.col;
    return clueProvidingLetter.answer[index];
  };

  const getNumberAt = (r: number, c: number) => {
    const clue = CLUES.find(clue => clue.row === r && clue.col === c);
    return clue ? clue.number : null;
  };

  // --- WORDLE LOGIC ---
  const solveClue = (clue: Clue) => {
    if (solvedWords.includes(clue.id)) return;
    setSolvingClue(clue);
    setGuesses([]);
    setCurrentGuess('');
  };

  const checkGuess = (guess: string, target: string): LetterStatus[] => {
    const statuses: LetterStatus[] = Array(WORD_LENGTH).fill('absent');
    const targetArr = target.toUpperCase().split('');
    const guessArr = guess.toUpperCase().split('');

    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessArr[i] === targetArr[i]) {
        statuses[i] = 'correct';
        targetArr[i] = '';
      }
    }

    for (let i = 0; i < WORD_LENGTH; i++) {
      if (statuses[i] !== 'correct') {
        const targetIndex = targetArr.indexOf(guessArr[i]);
        if (targetIndex !== -1) {
          statuses[i] = 'present';
          targetArr[targetIndex] = '';
        }
      }
    }
    return statuses;
  };

  const handleWordleSubmit = () => {
    if (!solvingClue) return;
    if (currentGuess.length !== WORD_LENGTH) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setToast('Too short');
      setTimeout(() => setToast(null), 2000);
      return;
    }

    const statuses = checkGuess(currentGuess, solvingClue.answer);
    const newGuesses = [...guesses, { word: currentGuess.toUpperCase(), statuses }];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (currentGuess.toUpperCase() === solvingClue.answer.toUpperCase()) {
      setTimeout(() => {
        setSolvedWords(prev => [...prev, solvingClue.id]);
        setSolvingClue(null);
      }, 1000);
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setToast(`System Reset: ${solvingClue.answer}`);
      setTimeout(() => setSolvingClue(null), 2000);
    }
  };

  useEffect(() => {
    if (solvedWords.length === CLUES.length && gameState === 'playing') {
      setTimeout(() => setGameState('complete'), 1500);
    }
  }, [solvedWords, gameState]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!solvingClue) return;
      if (e.key === 'Enter') handleWordleSubmit();
      else if (e.key === 'Backspace') setCurrentGuess(prev => prev.slice(0, -1));
      else if (/^[a-zA-Z]$/.test(e.key) && currentGuess.length < WORD_LENGTH) {
        setCurrentGuess(prev => (prev + e.key).toUpperCase());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [solvingClue, currentGuess, guesses]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden selection:bg-indigo-100">
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-100 rounded-full blur-[150px] opacity-20 pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-sky-100 rounded-full blur-[180px] opacity-20 pointer-events-none" />

      <AnimatePresence mode="wait">
        {gameState === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-2xl text-center z-10"
          >
            <div className="bg-white rounded-[3.5rem] p-16 md:p-24 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] rounded-full mb-8">
                Hybrid Engine v4.0
              </div>
              <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter mb-4 leading-none">
                CROSS<span className="text-indigo-600 font-serif italic ml-2">GUESS</span>
              </h1>
              <p className="text-slate-500 mb-12 text-lg md:text-xl font-medium max-w-sm mx-auto">
                Solve the crossword by winning individual decrypt challenges.
              </p>
              <button
                onClick={() => { setGameState('playing'); setSolvedWords([]); }}
                className="group relative inline-flex items-center gap-4 px-14 py-6 bg-slate-900 text-white font-bold text-xl rounded-2xl shadow-2xl hover:bg-indigo-600 transition-all hover:scale-[1.05] active:scale-[0.95]"
              >
                Access System
                <Play className="w-6 h-6 fill-current" />
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl flex flex-col xl:grid xl:grid-cols-[1fr_450px] gap-12 items-start relative z-10"
          >
            <div className="w-full flex flex-col items-center justify-center xl:sticky xl:top-8">
              <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-8">
                <div 
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(32px, 48px))` }}
                >
                  {Array.from({ length: GRID_SIZE }).map((_, r) => (
                    Array.from({ length: GRID_SIZE }).map((_, c) => {
                      const active = isCellPartOfClue(r, c);
                      const letter = getLetterAt(r, c);
                      const number = getNumberAt(r, c);
                      
                      return (
                        <div 
                          key={`${r}-${c}`}
                          onClick={() => {
                            const clue = CLUES.find(clue => clue.row === r && clue.col === c);
                            if (clue) solveClue(clue);
                          }}
                          className={`relative aspect-square rounded-lg border-2 transition-all flex items-center justify-center cursor-default ${
                            active 
                              ? 'bg-white border-slate-100 hover:border-indigo-400 hover:shadow-lg' 
                              : 'bg-slate-50 border-transparent opacity-20'
                          }`}
                        >
                          {number && <span className="absolute top-1 left-1.5 text-[8px] font-black text-slate-300">{number}</span>}
                          {letter && (
                            <motion.span 
                              initial={{ scale: 0, rotate: -20 }}
                              animate={{ scale: 1, rotate: 0 }}
                              className="text-xl md:text-2xl font-black text-slate-900"
                            >
                              {letter}
                            </motion.span>
                          )}
                        </div>
                      );
                    })
                  ))}
                </div>
                
                <div className="flex border-t border-slate-50 pt-8 gap-4 justify-between items-center px-2">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Solved</p>
                        <p className="text-sm font-black text-slate-800 italic font-serif">
                          {solvedWords.length} / {CLUES.length} Modules
                        </p>
                      </div>
                   </div>
                   <button onClick={() => setGameState('home')} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors">
                      <X className="w-5 h-5" />
                   </button>
                </div>
              </div>
            </div>

            <div className="w-full space-y-10 pl-4">
               <div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 mb-2">Navigation</h2>
                  <h3 className="text-5xl font-black text-slate-900 tracking-tight italic font-serif">The Logic List</h3>
               </div>

               <div className="space-y-12 h-[calc(100vh-280px)] overflow-y-auto pr-4 custom-scrollbar">
                  <section>
                    <div className="flex items-center gap-4 mb-6 opacity-30">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">Memory Matrix</span>
                      <div className="flex-1 h-[1px] bg-slate-200" />
                    </div>
                    <div className="grid gap-3">
                      {CLUES.map(clue => (
                        <motion.div
                          key={clue.id}
                          whileHover={{ x: 8 }}
                          onClick={() => solveClue(clue)}
                          className={`group flex items-center justify-between p-6 rounded-3xl border transition-all cursor-pointer ${
                            solvedWords.includes(clue.id)
                              ? 'bg-emerald-50 border-emerald-100'
                              : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-xl'
                          }`}
                        >
                          <div className="flex items-center gap-5">
                            <span className={`text-3xl font-serif italic font-black transition-colors ${solvedWords.includes(clue.id) ? 'text-emerald-500' : 'text-slate-200 group-hover:text-indigo-200'}`}>
                              {clue.number}
                            </span>
                            <div>
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{clue.direction}</p>
                               <p className={`text-base font-bold transition-colors ${solvedWords.includes(clue.id) ? 'text-emerald-900 line-through' : 'text-slate-600 group-hover:text-slate-900'}`}>{clue.clue}</p>
                            </div>
                          </div>
                          {solvedWords.includes(clue.id) && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        </motion.div>
                      ))}
                    </div>
                  </section>
               </div>
            </div>
          </motion.div>
        )}

        {gameState === 'complete' && (
          <motion.div
             key="win"
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="z-50 text-center bg-white p-24 rounded-[4rem] shadow-2xl border border-slate-100"
          >
             <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-xl shadow-emerald-100">
                <Trophy className="w-12 h-12 text-white" />
             </div>
             <h1 className="text-7xl font-black text-slate-900 tracking-tighter mb-4 italic font-serif">MASTER<span className="text-indigo-600 font-sans not-italic">SOLVED</span></h1>
             <p className="text-xl font-medium text-slate-400 mb-12">All logic gates successfully bypassed.</p>
             <button
               onClick={() => setGameState('home')}
               className="px-14 py-6 bg-slate-900 text-white font-bold text-xl rounded-3xl hover:bg-emerald-600 transition-all shadow-xl"
             >
               Reboot Session
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {solvingClue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50, opacity: 0 }}
              className="bg-white rounded-[3.5rem] w-full max-w-lg p-12 shadow-2xl relative overflow-hidden flex flex-col items-center"
            >
              <button 
                onClick={() => setSolvingClue(null)}
                className="absolute top-8 right-10 p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-10 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 mb-2">Module Decrypt</p>
                <h3 className="text-3xl font-black text-slate-900 italic font-serif max-w-xs">{solvingClue.clue}</h3>
              </div>

              <div className="grid gap-3 w-full max-w-[320px] mb-10">
                {[...Array(MAX_ATTEMPTS)].map((_, rIdx) => {
                  const isCurrent = rIdx === guesses.length;
                  const guess = guesses[rIdx];
                  
                  return (
                    <motion.div 
                      key={rIdx} 
                      animate={isCurrent && shake ? { x: [-4, 4, -4, 4, 0] } : {}}
                      className="grid grid-cols-5 gap-3"
                    >
                      {[...Array(WORD_LENGTH)].map((_, cIdx) => {
                        let char = '';
                        let status: LetterStatus = 'empty';
                        if (guess) {
                          char = guess.word[cIdx];
                          status = guess.statuses[cIdx];
                        } else if (isCurrent) {
                          char = currentGuess[cIdx] || '';
                        }

                        return (
                          <motion.div
                            key={cIdx}
                            initial={false}
                            animate={status !== 'empty' ? { rotateX: [0, 90, 0] } : {}}
                            className={`aspect-square flex items-center justify-center text-2xl font-black rounded-xl border-2 transition-all ${
                              status === 'correct' ? 'bg-emerald-500 border-emerald-600 text-white' :
                              status === 'present' ? 'bg-amber-400 border-amber-500 text-white' :
                              status === 'absent' ? 'bg-slate-400 border-slate-500 text-white' :
                              isCurrent && currentGuess[cIdx] ? 'bg-white border-indigo-300 scale-105 shadow-lg' : 'bg-white border-slate-100'
                            }`}
                          >
                            {char}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  );
                })}
              </div>

              <AnimatePresence>
                 {toast && (
                   <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-32 bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/10">
                      {toast}
                   </motion.div>
                 )}
              </AnimatePresence>

              <div className="w-full flex justify-between items-center bg-slate-50 rounded-3xl p-6 border border-slate-100">
                 <div className="flex items-center gap-3">
                    <Keyboard className="w-5 h-5 text-slate-300" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Input Mode</p>
                 </div>
                 <button 
                  onClick={handleWordleSubmit}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors"
                 >
                   Verify
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}

