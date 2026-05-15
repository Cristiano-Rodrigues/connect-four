'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Bot, Copy, ArrowRight, Check } from 'lucide-react';

export default function SetupRoom() {
  const [opponentType, setOpponentType] = useState<'player' | 'robot' | null>(null);
  const [difficulty, setDifficulty] = useState<'basic' | 'medium' | 'advanced'>('medium');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleSelectPlayer = async () => {
    setOpponentType('player');
    if (!roomId) {
      setIsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/create`);
        const data = await res.json();
        setRoomId(data.roomId);
      } catch (err) {
        console.error('Failed to create room:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const copyToClipboard = () => {
    if (roomId) {
      const link = `${window.location.origin}/game/${roomId}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    if (opponentType === 'robot') {
      router.push(`/game/robot?difficulty=${difficulty}`);
    } else if (opponentType === 'player' && roomId) {
      router.push(`/game/${roomId}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-4 font-sans">
      <div className="w-full max-w-lg animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Configuração da Sala
          </h1>
          <p className="text-gray-500 mt-2">Escolha seu adversário e prepare-se para o jogo</p>
        </div>

        <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-8 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleSelectPlayer}
              className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all duration-200 cursor-pointer ${
                opponentType === 'player' 
                  ? 'border-indigo-500 bg-indigo-500/10' 
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <User size={32} className={`mb-3 ${opponentType === 'player' ? 'text-indigo-400' : 'text-gray-400'}`} />
              <span className="font-semibold">Jogar com Amigo</span>
            </button>
            <button
              onClick={() => setOpponentType('robot')}
              className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all duration-200 cursor-pointer ${
                opponentType === 'robot' 
                  ? 'border-indigo-500 bg-indigo-500/10' 
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <Bot size={32} className={`mb-3 ${opponentType === 'robot' ? 'text-indigo-400' : 'text-gray-400'}`} />
              <span className="font-semibold">Jogar contra Robô</span>
            </button>
          </div>

          {opponentType === 'robot' && (
            <div className="animate-in slide-in-from-top-4 fade-in duration-300">
              <label className="block text-sm font-medium text-gray-400 mb-3">
                Dificuldade do Robô
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                {(['basic', 'medium', 'advanced'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                      difficulty === level
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {level === 'basic' ? 'Básica' : level === 'medium' ? 'Média' : 'Avançada'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {opponentType === 'player' && (
            <div className="animate-in slide-in-from-top-4 fade-in duration-300">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Link de Convite
              </label>
              {isLoading ? (
                <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 animate-pulse h-12 flex items-center">
                  <div className="h-2 bg-gray-600 rounded w-1/2"></div>
                </div>
              ) : roomId ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/game/${roomId}`}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center group"
                    title="Copiar link"
                  >
                    {copied ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} className="text-gray-400 group-hover:text-white" />}
                  </button>
                </div>
              ) : null}
              <p className="text-xs text-gray-500 mt-2">
                Partilhe este link com o seu amigo para ele se juntar à partida.
              </p>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!opponentType || (opponentType === 'player' && !roomId)}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            Continuar para a Sala
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in {
          from { transform: scale(0.95); }
          to { transform: scale(1); }
        }
        @keyframes slide-in-from-top-4 {
          from { transform: translateY(-1rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: 0.3s ease-out forwards;
        }
        .fade-in { animation-name: fade-in; }
        .zoom-in { animation-name: zoom-in; }
        .slide-in-from-top-4 { animation-name: slide-in-from-top-4; }
      `}</style>
    </div>
  );
}