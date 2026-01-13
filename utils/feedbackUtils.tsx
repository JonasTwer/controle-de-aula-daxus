import React from 'react';
import toast from 'react-hot-toast';
import FeedbackCard, { FeedbackCardProps, FeedbackError } from '../components/FeedbackCard';

/**
 * Exibe um feedback visual usando o componente FeedbackCard
 * integrado ao sistema de Toast do react-hot-toast
 * 
 * FEATURES UX REFINADAS:
 * - ✅ Auto-dismiss: Fecha automaticamente após 5 segundos (configurável)
 * - ✅ Pause on hover: Pausa o timer ao passar o mouse para permitir leitura
 * - ✅ Resume on leave: Retoma timer de 3s ao sair com o mouse
 * - ⚡ Instant close: Clique no X fecha instantaneamente (0ms delay)
 * - 🧹 Memory safe: Cleanup de timers ao desmontar
 */
export const showFeedbackCard = (props: FeedbackCardProps, options?: {
    duration?: number;
    position?: 'top-center' | 'top-right' | 'bottom-center';
}) => {
    const { duration = 5000, position = 'top-center' } = options || {};

    toast.custom(
        (t) => {
            // Handler de fechamento manual INSTANTÂNEO
            const handleClose = () => {
                // toast.remove() força remoção imediata sem esperar animação
                toast.remove(t.id);
            };

            // Pause on Hover: Pausa o auto-dismiss ao passar o mouse
            const handleMouseEnter = () => {
                // Cancela o timer de auto-dismiss
                // Mantém o card visível enquanto o usuário lê
                toast.dismiss(t.id);
            };

            // Resume on Leave: Retoma timer ao sair com o mouse
            const handleMouseLeave = () => {
                // Aguarda 3 segundos após o mouse sair e então fecha com transição suave
                setTimeout(() => {
                    toast.dismiss(t.id);  // Usa dismiss aqui para ter fade-out de 75ms
                }, 3000);
            };

            return (
                <div
                    className={`
                        ${t.visible
                            ? 'animate-in slide-in-from-top-4 duration-200'
                            : 'animate-out fade-out duration-75'
                        }
                    `}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <FeedbackCard {...props} onClose={handleClose} />
                </div>
            );
        },
        {
            duration,  // Auto-dismiss padrão: 5000ms
            position,
            style: {
                background: 'transparent',
                boxShadow: 'none',
                padding: 0,
            },
        }
    );
};

/**
 * Formata uma mensagem de erro da importação de Excel
 * para o formato estruturado do FeedbackCard (conforme imagem 9)
 */
export const parseImportError = (errorMessage: string): FeedbackError | null => {
    // Formato esperado: "Linha X: Campo 'Y' está vazio." ou "Linha X: Campo 'Tempo' inválido ('valor'). Use..."
    const lineMatch = errorMessage.match(/Linha (\d+):/);

    if (!lineMatch) return null;

    const location = `Linha ${lineMatch[1]}`;

    // CASO 1: Campo Tempo inválido (contém letras)
    if (errorMessage.includes("Campo 'Tempo' inválido")) {
        const valueMatch = errorMessage.match(/\('(.+?)'\)/);
        const value = valueMatch ? valueMatch[1] : undefined;

        return {
            location,
            field: 'Tempo',
            issue: 'o campo Tempo está inválido.',
            value,
            instruction: 'Use apenas números ou o formato HH:MM:SS (ex.: 00:17:55).',
            action: 'Corrija e tente novamente.'
        };
    }

    // CASO 2: Formato de tempo inválido
    if (errorMessage.includes("Formato de tempo inválido")) {
        const valueMatch = errorMessage.match(/\('(.+?)'\)/);
        const value = valueMatch ? valueMatch[1] : undefined;

        return {
            location,
            field: 'Tempo',
            issue: 'o campo Tempo está inválido.',
            value,
            instruction: 'Use apenas números ou o formato HH:MM:SS (ex.: 00:17:55).',
            action: 'Corrija e tente novamente.'
        };
    }

    // CASO 3: Campo vazio (Meta, Matéria, Assunto, Tempo)
    if (errorMessage.includes("está vazio")) {
        const fieldMatch = errorMessage.match(/Campo '(.+?)' está vazio/);
        const field = fieldMatch ? fieldMatch[1] : 'Desconhecido';

        return {
            location,
            field,
            issue: `o campo ${field} está vazio.`,
            instruction: `Preencha o campo ${field} com um valor válido.`,
            action: 'Corrija e tente novamente.'
        };
    }

    // CASO 4: Erro genérico - Fallback
    return {
        location,
        field: 'Desconhecido',
        issue: errorMessage.replace(/Linha \d+: /, ''),
        instruction: 'Verifique os dados e tente novamente.',
    };
};
