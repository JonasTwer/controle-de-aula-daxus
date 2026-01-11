
import React, { useState, useEffect } from 'react';

import { supabase } from '../services/supabase';
import { Upload, Trash2, Database, AlertCircle, CheckCircle2, FileText, AlertTriangle, LogOut } from 'lucide-react';
import { Lesson, StudyLog } from '../types';
import { parseDurationToSeconds, formatDateLocal } from '../utils';

interface ConfigViewProps {
  onSaveData: (lessons: Lesson[]) => void;
  onClearData: () => void;
  currentDataCount: number;
  logs: StudyLog[];
}

const ConfigView: React.FC<ConfigViewProps> = ({ onSaveData, onClearData, currentDataCount, logs }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Reset confirmation state when leaving view or after a timeout
  useEffect(() => {
    let timeout: number;
    if (isConfirmingDelete) {
      timeout = window.setTimeout(() => setIsConfirmingDelete(false), 4000);
    }
    return () => clearTimeout(timeout);
  }, [isConfirmingDelete]);

  const handleImport = () => {
    try {
      const lines = input.trim().split('\n');
      const parsed: Lesson[] = [];

      lines.forEach((line, idx) => {
        const parts = line.includes('|') ? line.split('|') : line.split('\t');
        if (parts.length >= 4) {
          const theme = parts[0].trim();
          const module = parts[1].trim();
          const title = parts[2].trim();
          const durationStr = parts[3].trim();

          if (!durationStr.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) return;

          parsed.push({
            id: `L-${Date.now()}-${idx}`,
            theme,
            module,
            title,
            durationStr,
            durationSec: parseDurationToSeconds(durationStr)
          });
        }
      });

      if (parsed.length === 0) {
        setError('Nenhuma aula válida encontrada. Siga o formato: Tema | Módulo | Título | HH:MM:SS');
      } else {
        setError('');
        setSuccess(true);
        onSaveData(parsed);
        setInput('');
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) {
      setError('Erro ao processar os dados.');
    }
  };

  const handleExportData = () => {
    const data = {
      lessons: JSON.parse(localStorage.getItem('study_lessons') || '[]'),
      logs: JSON.parse(localStorage.getItem('study_logs') || '[]')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-tracker-backup-${formatDateLocal(new Date())}.json`;
    a.click();
  };

  const handleDeleteAll = () => {
    if (isConfirmingDelete) {
      onClearData();
      setIsConfirmingDelete(false);
    } else {
      setIsConfirmingDelete(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
          <LogOut className="w-5 h-5 text-red-500" /> Conta
        </h2>
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sair da Conta
        </button>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-indigo-500" /> Importar Currículo
        </h2>
        <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-2xl mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Formato Esperado</p>
          <p className="text-xs text-indigo-800 dark:text-indigo-300 font-mono">Curso | Módulo | Aula | 00:15:00</p>
        </div>

        <textarea
          className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-slate-300"
          placeholder="Exemplo:&#10;React JS | Hooks | useEffect | 00:20:00&#10;React JS | Hooks | useState | 00:15:00"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <div className="mt-4 flex flex-col gap-3">
          {error && <div className="flex items-center gap-2 text-red-500 text-xs font-medium"><AlertCircle className="w-4 h-4" /> {error}</div>}
          {success && <div className="flex items-center gap-2 text-emerald-500 text-xs font-medium"><CheckCircle2 className="w-4 h-4" /> Importado com sucesso!</div>}

          <button
            onClick={handleImport}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98]"
          >
            Processar e Salvar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Database className="w-4 h-4" /> Dados Atuais
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">Aulas cadastradas</span>
              <span className="font-bold dark:text-white">{currentDataCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">Registros de estudo</span>
              <span className="font-bold dark:text-white">{logs.length}</span>
            </div>
            <button
              onClick={handleExportData}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <FileText className="w-4 h-4" /> Exportar JSON
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-red-100/50 dark:border-red-900/30 p-6 shadow-sm flex flex-col justify-center transition-all duration-300">
          <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Zona de Risco
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-300 mb-4 leading-relaxed">
            Apagar todos os dados removerá permanentemente seu currículo e todo o progresso acumulado.
          </p>

          <button
            onClick={handleDeleteAll}
            className={`w-full py-3 rounded-2xl text-sm font-black transition-all transform active:scale-95 flex items-center justify-center gap-2 ${isConfirmingDelete
              ? 'bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none animate-pulse'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
              }`}
          >
            {isConfirmingDelete ? (
              <>
                <AlertTriangle className="w-4 h-4" /> Confirmar Exclusão
              </>
            ) : (
              'Excluir Tudo'
            )}
          </button>

          {isConfirmingDelete && (
            <p className="text-[9px] text-red-400 mt-2 text-center font-bold animate-in fade-in slide-in-from-top-1">
              Clique novamente para confirmar a exclusão permanente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigView;
