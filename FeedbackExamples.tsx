import React from 'react';
import { showFeedbackCard } from './utils/feedbackUtils';

/**
 * DEMONSTRAÇÃO DO SISTEMA DE FEEDBACK PADRONIZADO
 * 
 * Este arquivo contém exemplos de como usar o novo sistema de feedback
 * em diferentes cenários da aplicação.
 * 
 * Para testar, basta importar showFeedbackCard e chamar com os parâmetros adequados.
 */

// ========================================
// EXEMPLO 1: ERRO ÚNICO (CONFORME IMAGEM 9)
// ========================================
export const showSingleErrorExample = () => {
    showFeedbackCard({
        type: 'error',
        title: '1 erro encontrado',
        errors: [{
            location: 'Linha 3',
            field: 'Tempo',
            issue: 'o campo Tempo está inválido.',
            value: '"f"',
            instruction: 'Use apenas números ou o formato HH:MM:SS (ex.: 00:17:55).',
            action: 'Corrija e tente novamente.'
        }]
    }, {
        duration: 10000
    });
};

// ========================================
// EXEMPLO 2: MÚLTIPLOS ERROS
// ========================================
export const showMultipleErrorsExample = () => {
    showFeedbackCard({
        type: 'error',
        title: '3 erros encontrados',
        errors: [
            {
                location: 'Linha 2',
                field: 'Meta',
                issue: 'o campo Meta está vazio.',
                instruction: 'Preencha o campo Meta com um valor válido.',
                action: 'Corrija e tente novamente.'
            },
            {
                location: 'Linha 5',
                field: 'Tempo',
                issue: 'o campo Tempo está inválido.',
                value: '90x',
                instruction: 'Use apenas números ou o formato HH:MM:SS (ex.: 00:17:55).',
                action: 'Corrija e tente novamente.'
            },
            {
                location: 'Linha 8',
                field: 'Assunto',
                issue: 'o campo Assunto está vazio.',
                instruction: 'Preencha o campo Assunto com um valor válido.',
                action: 'Corrija e tente novamente.'
            }
        ]
    }, {
        duration: 12000
    });
};

// ========================================
// EXEMPLO 3: SUCESSO NA IMPORTAÇÃO
// ========================================
export const showSuccessExample = () => {
    showFeedbackCard({
        type: 'success',
        title: '15 linhas importadas com sucesso',
        description: 'Revise os dados abaixo e clique em "Adicionar ao Plano".'
    }, {
        duration: 5000
    });
};

// ========================================
// EXEMPLO 4: ARQUIVO VAZIO
// ========================================
export const showEmptyFileExample = () => {
    showFeedbackCard({
        type: 'error',
        title: 'Nenhum dado válido encontrado',
        description: 'Verifique se o arquivo contém linhas preenchidas após o cabeçalho.'
    }, {
        duration: 6000
    });
};

// ========================================
// EXEMPLO 5: ERRO GENÉRICO
// ========================================
export const showGenericErrorExample = () => {
    showFeedbackCard({
        type: 'error',
        title: 'Falha ao processar arquivo',
        description: 'Verifique se o formato está correto (.xlsx).'
    }, {
        duration: 6000
    });
};

// ========================================
// EXEMPLO 6: SUCESSO GENÉRICO
// ========================================
export const showGenericSuccessExample = () => {
    showFeedbackCard({
        type: 'success',
        title: 'Operação concluída',
        description: 'Os dados foram salvos com sucesso.'
    }, {
        duration: 4000
    });
};

// ========================================
// EXEMPLO 7: CAMPO VAZIO
// ========================================
export const showEmptyFieldExample = () => {
    showFeedbackCard({
        type: 'error',
        title: '1 erro encontrado',
        errors: [{
            location: 'Linha 7',
            field: 'Matéria',
            issue: 'o campo Matéria está vazio.',
            instruction: 'Preencha o campo Matéria com um valor válido.',
            action: 'Corrija e tente novamente.'
        }]
    }, {
        duration: 8000
    });
};

// ========================================
// BOTÕES DE TESTE (OPCIONAL)
// ========================================
export const FeedbackTestButtons = () => {
    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
            <button
                onClick={showSingleErrorExample}
                className="block w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
            >
                Teste: 1 Erro
            </button>
            <button
                onClick={showMultipleErrorsExample}
                className="block w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
            >
                Teste: 3 Erros
            </button>
            <button
                onClick={showSuccessExample}
                className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700"
            >
                Teste: Sucesso
            </button>
            <button
                onClick={showEmptyFileExample}
                className="block w-full px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700"
            >
                Teste: Arquivo Vazio
            </button>
        </div>
    );
};

export default FeedbackTestButtons;
