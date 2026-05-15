'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

const authSchema = z.object({
  nickname: z.string().min(1, 'O nickname é obrigatório'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 dígitos'),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const route = activeTab === 'login' ? '/login' : '/signup';
    const endpoint = `${process.env.NEXT_PUBLIC_API_URL}${route}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Ocorreu um erro');
      }

      if (activeTab === 'login') {
        Cookies.set('access_token', result.access_token, { expires: 1 });
        router.push('/setup-room');
        router.refresh();
      } else {
        setSuccess('Usuário criado com sucesso! Faça login para continuar.');
        setActiveTab('login');
        reset();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-4 font-sans">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Connect Four Login
          </h1>
          <p className="text-gray-500 mt-2">Acesse sua conta para continuar</p>
        </div>
        <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => { setActiveTab('login'); setError(null); setSuccess(null); reset(); }}
              className={`flex-1 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'login' ? 'text-white border-b-2 border-indigo-500 bg-white/5' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <LogIn size={18} />
              Entrar
            </button>
            <button
              onClick={() => { setActiveTab('signup'); setError(null); setSuccess(null); reset(); }}
              className={`flex-1 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'signup' ? 'text-white border-b-2 border-indigo-500 bg-white/5' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <UserPlus size={18} />
              Criar Conta
            </button>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
                <ShieldCheck size={18} />
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2" htmlFor="nickname">
                  Nickname
                </label>
                <input
                  {...register('nickname')}
                  type="text"
                  id="nickname"
                  autoComplete="username"
                  className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                    errors.nickname ? 'border-red-500/50' : 'border-white/10 focus:border-indigo-500/50'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 text-white placeholder:text-gray-600`}
                  placeholder="Seu apelido"
                />
                {errors.nickname && (
                  <p className="mt-1.5 text-xs text-red-400 ml-1">{errors.nickname.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2" htmlFor="password">
                  Senha
                </label>
                <input
                  {...register('password')}
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                    errors.password ? 'border-red-500/50' : 'border-white/10 focus:border-indigo-500/50'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 text-white placeholder:text-gray-600`}
                  placeholder="Min. 6 caracteres"
                />
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-400 ml-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    {activeTab === 'login' ? 'Entrar' : 'Registrar'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-8 text-gray-600 text-sm">
          &copy; {new Date().getFullYear()} Connect Four. Todos os direitos reservados.
        </p>
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
        @keyframes slide-in-from-top-2 {
          from { transform: translateY(-0.5rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: 0.3s ease-out forwards;
        }
        .fade-in { animation-name: fade-in; }
        .zoom-in { animation-name: zoom-in; }
        .slide-in-from-top-2 { animation-name: slide-in-from-top-2; }
      `}</style>
    </div>
  );
}