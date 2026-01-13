
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Upload, Trash2, Database, AlertCircle, CheckCircle2, FileText, AlertTriangle, LogOut, Key, Loader2, BookOpen, X, Download, FileUp } from 'lucide-react';
import { Lesson, StudyLog } from '../types';
import { parseDurationToSeconds, formatDateLocal } from '../utils';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../imageUtils';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface ConfigViewProps {
  onSaveData: (lessons: Lesson[]) => Promise<void>;
  onClearData: () => Promise<void>;
  onDeleteCourse: (courseName: string) => Promise<void>;
  lessons: Lesson[];
  currentDataCount: number;
  logs: StudyLog[];
  userMetadata: any;
  userEmail?: string;
}

const ConfigView: React.FC<ConfigViewProps> = ({ onSaveData, onClearData, onDeleteCourse, lessons, currentDataCount, logs, userMetadata, userEmail }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Profile & Password state
  const [displayName, setDisplayName] = useState(userMetadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(userMetadata?.avatar_url || '');
  const [newPassword, setNewPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(userMetadata?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Cropper State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);

  // Real-time Stats
  const [realTimeLessons, setRealTimeLessons] = useState(currentDataCount);
  const [realTimeLogs, setRealTimeLogs] = useState(logs.filter(l => l.status === 'completed').length);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count: lessonsCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: logsCount } = await supabase
        .from('study_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      setRealTimeLessons(lessonsCount || 0);
      setRealTimeLogs(logsCount || 0);
    } catch (e) {
      // Silent fail - não é crítico
    }
  };

  useEffect(() => {
    let timeout: number;
    if (isConfirmingDelete) {
      timeout = window.setTimeout(() => setIsConfirmingDelete(false), 4000);
    }
    return () => clearTimeout(timeout);
  }, [isConfirmingDelete]);

  useEffect(() => {
    if (userMetadata) {
      setDisplayName(userMetadata.full_name || '');
      setAvatarUrl(userMetadata.avatar_url || '');
      setPreviewUrl(userMetadata.avatar_url || null);
    }
    fetchStats();
  }, [userMetadata, lessons, logs]);

  useEffect(() => {
    fetchStats();
    const handleFocus = () => fetchStats();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setCroppingImage(imageUrl);
      setShowCropper(true);
    }
  };

  const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleConfirmCrop = async () => {
    if (!croppingImage || !croppedAreaPixels) return;
    setLoading(true);
    const toastId = toast.loading('Processando imagem...');

    try {
      const croppedImageBlob = await getCroppedImg(croppingImage, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error('Falha ao processar imagem.');

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado.');

      const userPath = userData.user.id;
      const fileName = `${userPath}/${Date.now()}.jpg`;

      toast.loading('Enviando para o servidor...', { id: toastId });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedImageBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      setPreviewUrl(publicUrl);

      // 3. ATUALIZAR METADADOS DO PERFIL AUTOMATICAMENTE
      toast.loading('Salvando perfil...', { id: toastId });
      const { error: metaError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (metaError) throw metaError;

      setShowCropper(false);
      setCroppingImage(null);

      toast.success('Foto de perfil atualizada com sucesso!', {
        id: toastId,
        duration: 3000
      });
    } catch (e: any) {
      toast.error('Erro ao processar imagem.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const a = document.createElement('a');
    a.href = '/template_plano.xlsx';
    a.download = 'template_plano.xlsx';
    a.click();
    toast.success('Template baixado com sucesso!', { duration: 2000 });
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        console.log('📊 Total de linhas no Excel:', jsonData.length);
        console.log('📊 Dados brutos:', jsonData);

        // Lista de erros e dados válidos
        const erros: string[] = [];
        const processedLines: string[] = [];
        const temLetras = /[a-zA-Z]/; // Regex para proibir texto no tempo

        // Processar linhas (pular APENAS o cabeçalho - linha 0)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const numeroLinha = i + 1; // Linha real no Excel (para mensagens)

          console.log(`Processando linha ${numeroLinha}:`, row);

          // Ignorar linhas completamente vazias
          if (!row || row.length === 0 || (row.every((cell: any) => !cell))) {
            console.log(`⚠️ Linha ${numeroLinha}: Vazia (ignorada)`);
            continue;
          }

          const meta = String(row[0] || '').trim();
          const materia = String(row[1] || '').trim();
          const assunto = String(row[2] || '').trim();
          const tempoRaw = row[3]; // Não converter ainda para validar corretamente

          console.log(`Linha ${numeroLinha} - Meta: "${meta}", Matéria: "${materia}", Assunto: "${assunto}", Tempo: "${tempoRaw}"`);

          // 1. Validação de Campos Obrigatórios
          if (!meta) {
            erros.push(`Linha ${numeroLinha}: Campo 'Meta' está vazio.`);
            console.log(`❌ Linha ${numeroLinha}: Meta vazia`);
            continue;
          }
          if (!materia) {
            erros.push(`Linha ${numeroLinha}: Campo 'Matéria' está vazio.`);
            console.log(`❌ Linha ${numeroLinha}: Matéria vazia`);
            continue;
          }
          if (!assunto) {
            erros.push(`Linha ${numeroLinha}: Campo 'Assunto' está vazio.`);
            console.log(`❌ Linha ${numeroLinha}: Assunto vazio`);
            continue;
          }

          // 2. Validação Rigorosa de Tempo
          if (!tempoRaw && tempoRaw !== 0) {
            erros.push(`Linha ${numeroLinha}: Campo 'Tempo' está vazio.`);
            console.log(`❌ Linha ${numeroLinha}: Tempo vazio`);
            continue;
          }

          // Converte para string para validação
          const tempoStr = String(tempoRaw).trim();

          // Proibir letras no campo de tempo
          if (temLetras.test(tempoStr)) {
            erros.push(`Linha ${numeroLinha}: Campo 'Tempo' inválido ('${tempoStr}'). Use apenas números ou formato HH:MM:SS.`);
            console.log(`❌ Linha ${numeroLinha}: Tempo contém letras`);
            continue;
          }

          // Normalizar o tempo para HH:MM:SS
          let tempoFinal: string;

          if (/^\d+$/.test(tempoStr)) {
            // Apenas números = minutos
            const minutes = parseInt(tempoStr, 10);
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            tempoFinal = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
            console.log(`🔄 Linha ${numeroLinha}: Tempo convertido de ${tempoStr}min para ${tempoFinal}`);
          } else if (/^\d{1,2}:\d{2}$/.test(tempoStr)) {
            // Formato MM:SS
            tempoFinal = `00:${tempoStr}:00`;
            console.log(`🔄 Linha ${numeroLinha}: Tempo convertido de ${tempoStr} para ${tempoFinal}`);
          } else if (/^\d{1,2}:\d{2}:\d{2}$/.test(tempoStr)) {
            // Já está em HH:MM:SS
            tempoFinal = tempoStr;
          } else {
            // Formato inválido
            erros.push(`Linha ${numeroLinha}: Formato de tempo inválido ('${tempoStr}'). Use: minutos (30), MM:SS (45:00) ou HH:MM:SS (01:30:00).`);
            console.log(`❌ Linha ${numeroLinha}: Formato de tempo inválido`);
            continue;
          }

          // Se passou em todas as validações, adiciona aos dados válidos
          const line = `${meta} | ${materia} | ${assunto} | ${tempoFinal}`;
          processedLines.push(line);
          console.log(`✅ Linha ${numeroLinha} válida:`, line);
        }

        console.log('📊 Total de linhas processadas:', processedLines.length);
        console.log('📊 Total de erros:', erros.length);
        console.log('📊 Linhas finais:', processedLines);

        // Se houver erros, mostrar TODOS de uma vez
        if (erros.length > 0) {
          const mensagemErro = `Encontrados ${erros.length} erro(s) no arquivo:\n\n${erros.slice(0, 5).join('\n')}${erros.length > 5 ? `\n\n... e mais ${erros.length - 5} erro(s).` : ''}`;
          toast.error(mensagemErro, {
            duration: 8000,
            style: {
              maxWidth: '600px',
              whiteSpace: 'pre-line'
            }
          });
          console.error('❌ Erros encontrados:', erros);
          return;
        }

        // Se não houver dados válidos
        if (processedLines.length === 0) {
          toast.error('Nenhum dado válido encontrado no Excel. Verifique se o arquivo contém linhas preenchidas após o cabeçalho.', {
            duration: 4000
          });
          return;
        }

        // Sucesso! Inserir texto processado na textarea
        const finalText = processedLines.join('\n');
        console.log('✅ Texto final para textarea:', finalText);
        setInput(finalText);

        toast.success(`✅ ${processedLines.length} linha(s) importada(s) com sucesso! Revise e clique em "Adicionar ao Plano".`, {
          duration: 4000,
          icon: '📊'
        });

      } catch (error: any) {
        toast.error('Erro ao processar arquivo Excel. Verifique se o formato está correto.', {
          duration: 4000
        });
        console.error('Erro ao processar Excel:', error);
      }
    };

    reader.readAsArrayBuffer(file);

    // Limpar o input para permitir reenvio do mesmo arquivo
    e.target.value = '';
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const lines = input.trim().split('\n');
      const parsed: Lesson[] = [];

      lines.forEach((line, idx) => {
        const parts = line.includes('|') ? line.split('|') : line.split('\t');
        if (parts.length >= 4) {
          const meta = parts[0].trim();
          const materia = parts[1].trim();
          const title = parts[2].trim();
          const durationStr = parts[3].trim();
          if (!durationStr.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) return;

          parsed.push({
            id: `TMP-${Date.now()}-${idx}`,
            meta,
            materia,
            title,
            durationStr,
            durationSec: parseDurationToSeconds(durationStr)
          });
        }
      });

      if (parsed.length === 0) {
        setError('Nenhuma aula válida encontrada. Formato esperado: Tema | Módulo | Aula | 00:15:00');
      } else {
        await onSaveData(parsed);
        setInput('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        await fetchStats();
      }
    } catch (e: any) {
      setError(`Erro ao processar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const data = { lessons, logs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-planner-backup-${formatDateLocal(new Date())}.json`;
    a.click();
  };

  const handleDeleteAll = async () => {
    if (isConfirmingDelete) {
      await onClearData();
      setIsConfirmingDelete(false);
    } else {
      setIsConfirmingDelete(true);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    setProfileError('');
    setProfileSuccess(false);

    try {
      // 1. Atualizar metadados do perfil (Nome e Foto)
      const { error: profileError } = await supabase.auth.updateUser({
        data: { full_name: displayName, avatar_url: avatarUrl }
      });
      if (profileError) throw profileError;

      // 2. Tentar atualizar senha SÓ SE o campo tiver valor digitado manualmente
      const passwordToSet = newPassword.trim();
      if (passwordToSet !== '') {
        if (passwordToSet.length < 6) {
          throw new Error('A senha deve ter no mínimo 6 caracteres.');
        }
        const { error: authError } = await supabase.auth.updateUser({ password: passwordToSet });
        if (authError) {
          // Se for erro de "senha igual", avisa mas NÃO cancela a atualização do perfil
          if (authError.message.includes('different')) {
            toast.success('Perfil atualizado! A senha foi mantida (pois era igual à anterior).', {
              duration: 4000,
            });
          } else {
            throw authError; // Outros erros de senha param o processo
          }
        } else {
          toast.success('Perfil e senha atualizados com sucesso!', {
            duration: 3000,
            icon: '✅',
          });
        }
      } else {
        toast.success('Perfil atualizado com sucesso!', {
          duration: 3000,
          icon: '✅',
        });
      }

      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar dados.', {
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-indigo-500" /> Perfil e Conta
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex flex-col gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail</label>
                <input type="email" value={userEmail || ''} readOnly className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm opacity-70 cursor-not-allowed dark:text-slate-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome</label>
                <input type="text" className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Foto</label>
                <div className="flex items-center gap-4 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 text-[10px] font-bold border border-dashed border-slate-300 dark:border-slate-600 text-center">
                      SEM FOTO
                    </div>
                  )}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-xs font-bold transition-all border border-indigo-100 dark:border-indigo-800/50"
                    >
                      Trocar Foto
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alterar Senha (opcional)</label>
                <input
                  type="password"
                  id="new-password-field"
                  name="new-password-field"
                  autoComplete="new-password"
                  placeholder="Nova senha (deixe em branco para manter)"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white placeholder:text-slate-400"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <button onClick={handleUpdateProfile} disabled={loading} className="w-full mt-2 py-3 bg-slate-800 dark:bg-slate-600 hover:bg-slate-900 dark:hover:bg-slate-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-100 dark:shadow-none">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar Dados'}
              </button>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> Sair</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-indigo-500" /> Importação do Plano de Estudo
        </h2>
        <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-2xl mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Formato Esperado</p>
          <p className="text-xs text-indigo-800 dark:text-indigo-300 font-mono">Meta | Matéria | Título da Aula | 00:15:00</p>
        </div>
        <textarea
          className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-slate-300"
          placeholder="Meta 1 | Direito Constitucional | Direitos Fundamentais - Art. 5º da Constituição Federal | 00:45:00"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        {/* Opção de Excel - Logo abaixo da textarea */}
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">Ou preencha automaticamente via planilha:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all"
            >
              <Download className="w-4 h-4" />
              Baixar Modelo
            </button>
            <button
              onClick={() => excelInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all"
            >
              <FileUp className="w-4 h-4" />
              Carregar Excel
            </button>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {error && <div className="flex items-center gap-2 text-red-500 text-xs font-medium"><AlertCircle className="w-4 h-4" /> {error}</div>}
          {success && <div className="flex items-center gap-2 text-emerald-500 text-xs font-medium"><CheckCircle2 className="w-4 h-4" /> Importado com sucesso!</div>}
          <button onClick={handleImport} disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ADICIONAR AO PLANO'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><Database className="w-4 h-4" /> Estatísticas</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-slate-500">Aulas no Banco:</span><span className="font-bold dark:text-white">{realTimeLessons}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500">Aulas Concluídas:</span><span className="font-bold dark:text-white">{realTimeLogs}</span></div>
            <button onClick={handleExportData} className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all"><FileText className="w-4 h-4" /> Backup JSON</button>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-red-100/50 p-6 shadow-sm flex flex-col justify-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Zona Crítica</h3>
          <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">O botão abaixo é o ÚNICO que apaga dados. Use com cuidado.</p>
          <button onClick={handleDeleteAll} className={`w-full py-3 rounded-2xl text-sm font-black transition-all ${isConfirmingDelete ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
            {isConfirmingDelete ? 'Confirmar EXCLUIR TUDO' : 'Limpar Todo o Plano'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-500" /> Cursos Ativos</h3>
        {Array.from(new Set(lessons.map(l => l.meta))).length === 0 ? <p className="text-center py-8 text-sm text-slate-400">Nenhum curso.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from(new Set(lessons.map(l => l.meta))).sort().map((course) => (
              <div key={course} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-700 group transition-all">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{course}</span>
                  <span className="text-[10px] text-slate-400">{lessons.filter(l => l.meta === course).length} aulas</span>
                </div>
                <button
                  onClick={async () => {
                    toast((t) => (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Apagar curso "{course}"?</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Isso removerá todas as aulas e registros deste curso.</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toast.dismiss(t.id)}
                            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={async () => {
                              toast.dismiss(t.id);
                              await onDeleteCourse(course);
                              fetchStats();
                            }}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ), {
                      duration: Infinity,
                      style: {
                        minWidth: '300px',
                        background: '#fff',
                        color: '#000',
                      },
                    });
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE RECORTE (CROPPER) */}
      {showCropper && croppingImage && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-700">
            {/* Header do Modal */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Ajustar Foto</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Arraste e use o zoom para enquadrar</p>
              </div>
              <button
                onClick={() => { setShowCropper(false); setCroppingImage(null); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {/* Área do Cropper */}
            <div className="relative h-80 bg-slate-950">
              <Cropper
                image={croppingImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round"
                showGrid={false}
              />
            </div>

            {/* Controle de Zoom */}
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowCropper(false); setCroppingImage(null); }}
                  className="flex-1 py-4 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-all border border-slate-200 dark:border-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmCrop}
                  disabled={loading}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Recorte'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigView;
