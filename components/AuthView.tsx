
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { showFeedbackCard } from '../utils/feedbackUtils';

const AuthView: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'signup') {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                showFeedbackCard({
                    type: 'success',
                    title: 'Cadastro realizado',
                    description: 'Verifique seu e-mail para ativar sua conta.'
                }, {
                    duration: 6000
                });
            } else if (mode === 'login') {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
            } else if (mode === 'forgot-password') {
                const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                });
                if (resetError) throw resetError;
                setMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro na autenticação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[32px] shadow-xl shadow-indigo-100 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">

                {/* Header */}
                <div className="bg-indigo-600 p-8 text-center">
                    <div className="inline-block bg-white/20 p-3 rounded-2xl mb-4">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight mb-1">CoursePlanner AI</h1>
                    <p className="text-indigo-100/80 text-sm font-medium">Planeje, estude e domine seu conteúdo.</p>
                </div>

                <div className="p-8">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 text-center">
                        {mode === 'login' && 'Bem-vindo de volta!'}
                        {mode === 'signup' && 'Crie sua conta'}
                        {mode === 'forgot-password' && 'Recuperar senha'}
                    </h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p>{message}</p>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                                    placeholder="exemplo@email.com"
                                    required
                                />
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            </div>
                        </div>

                        {mode !== 'forgot-password' && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Senha</label>
                                    {mode === 'login' && (
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot-password')}
                                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-widest"
                                        >
                                            Esqueci minha senha
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Processando...</span>
                                </>
                            ) : (
                                <>
                                    {mode === 'login' && 'Entrar'}
                                    {mode === 'signup' && 'Criar Conta'}
                                    {mode === 'forgot-password' && 'Enviar e-mail de recuperação'}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm font-medium text-slate-500">
                            {mode === 'login' ? 'Não tem uma conta?' : mode === 'signup' ? 'Já tem uma conta?' : ''}
                            {mode !== 'forgot-password' ? (
                                <button
                                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                                    className="ml-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                                >
                                    {mode === 'login' ? 'Cadastre-se' : 'Fazer Login'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setMode('login')}
                                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                                >
                                    Voltar para o Login
                                </button>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthView;
