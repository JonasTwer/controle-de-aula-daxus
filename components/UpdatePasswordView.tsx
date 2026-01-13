
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Lock, Loader2, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

const UpdatePasswordView: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Update page title
    useEffect(() => {
        const originalTitle = document.title;
        document.title = 'CoursePlanner AI - Redefinir Senha';
        return () => {
            document.title = originalTitle;
        };
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (password.length < 6) {
                throw new Error('A senha deve ter no mínimo 6 caracteres.');
            }

            if (password !== confirmPassword) {
                throw new Error('As senhas não coincidem. Por favor, verifique.');
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;
            setSuccess(true);

            // Sign out the user and redirect to login after 3 seconds
            setTimeout(async () => {
                await supabase.auth.signOut();
                window.location.href = window.location.origin;
            }, 3000);

        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar senha');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[32px] shadow-xl shadow-indigo-100 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">

                <div className="bg-indigo-600 p-8 text-center">
                    <div className="inline-block bg-white/20 p-3 rounded-2xl mb-4">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight mb-1">CoursePlanner AI</h1>
                    <p className="text-indigo-100/80 text-sm font-medium">Recuperação de Senha</p>
                </div>

                <div className="p-8">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 text-center">
                        Definir nova senha
                    </h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium animate-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {success ? (
                        <div className="text-center space-y-4 animate-in fade-in duration-500">
                            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Senha atualizada!</h3>
                            <p className="text-sm text-slate-500">Você será redirecionado para o login em instantes...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nova Senha</label>
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

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirmar Nova Senha</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    'Salvar'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpdatePasswordView;
