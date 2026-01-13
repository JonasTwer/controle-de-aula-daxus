import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, X } from 'lucide-react';

export interface FeedbackError {
    location: string;    // Ex: "Linha 3"
    field: string;       // Ex: "Tempo"
    issue: string;       // Ex: "o campo Tempo está inválido"
    value?: string;      // Ex: "f" (valor informado)
    instruction: string; // Ex: "Use apenas números ou o formato HH:MM:SS (ex.: 00:17:55)."
    action?: string;     // Ex: "Corrija e tente novamente."
}

export interface FeedbackCardProps {
    type: 'error' | 'success';
    title: string;
    description?: string;
    errors?: FeedbackError[];
    onClose?: () => void;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({
    type,
    title,
    description,
    errors = [],
    onClose
}) => {
    const isError = type === 'error';

    return (
        <div
            className="
        relative
        w-full max-w-[520px] 
        bg-gradient-to-br from-slate-800 to-slate-900 
        rounded-2xl 
        border border-slate-700/50 
        shadow-2xl shadow-slate-900/50
        p-6 
        space-y-4
        animate-in fade-in zoom-in-95 duration-300
      "
            role="alert"
            aria-live="polite"
        >
            {/* BOTÃO DE FECHAR (X) - Canto Superior Direito */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="
                        absolute 
                        top-6 
                        right-6 
                        w-6 
                        h-6 
                        flex 
                        items-center 
                        justify-center 
                        text-slate-400 
                        opacity-60 
                        hover:opacity-100 
                        hover:text-white 
                        transition-all 
                        duration-200 
                        cursor-pointer
                        focus:outline-none
                        focus:ring-2
                        focus:ring-slate-500
                        rounded
                    "
                    aria-label="Fechar notificação"
                    type="button"
                >
                    <X className="w-5 h-5" strokeWidth={2} />
                </button>
            )}

            {/* CABEÇALHO */}
            <div className="flex items-start gap-3 pr-8">
                {isError ? (
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-amber-500" strokeWidth={2.5} />
                    </div>
                ) : (
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-emerald-500" strokeWidth={2.5} />
                    </div>
                )}

                <div className="flex-1">
                    <h3 className="text-white font-semibold text-base leading-tight">
                        {title}
                    </h3>
                </div>
            </div>

            {/* CORPO */}
            <div className="space-y-3 pl-11">
                {/* MENSAGENS DE ERRO ESTRUTURADAS */}
                {isError && errors.length > 0 && (
                    <div className="space-y-4">
                        {errors.map((error, index) => (
                            <div key={index} className="space-y-2">
                                {/* Linha 1: Ícone + Localização + Descrição do Problema */}
                                <div className="flex items-start gap-2.5">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                                            <XCircle className="w-3.5 h-3.5 text-red-400" strokeWidth={2.5} />
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-slate-100 text-sm leading-relaxed">
                                            <span className="font-bold text-white">{error.location}</span>
                                            {': '}
                                            {error.issue}
                                            {error.value && (
                                                <>
                                                    <br />
                                                    <span className="text-slate-400 text-xs">
                                                        Valor informado: <span className="text-red-300 font-mono font-semibold">"{error.value}"</span>
                                                    </span>
                                                </>
                                            )}
                                        </p>

                                        {/* Linha 2: Instrução de Correção */}
                                        <p className="text-slate-300 text-xs leading-relaxed">
                                            {error.instruction}
                                        </p>

                                        {/* Linha 3: Ação (se houver) */}
                                        {error.action && (
                                            <p className="text-slate-400 text-xs italic">
                                                {error.action}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* DESCRIÇÃO PARA SUCESSO */}
                {!isError && description && (
                    <p className="text-slate-200 text-sm leading-relaxed">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
};

export default FeedbackCard;
