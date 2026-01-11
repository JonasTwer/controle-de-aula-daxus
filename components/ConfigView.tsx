
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Upload, Trash2, Database, AlertCircle, CheckCircle2, FileText, AlertTriangle, LogOut, Key, Loader2 } from 'lucide-react';
import { Lesson, StudyLog } from '../types';
import { parseDurationToSeconds, formatDateLocal } from '../utils';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../imageUtils';

interface ConfigViewProps {
  onSaveData: (lessons: Lesson[]) => Promise<void>;
  onClearData: () => Promise<void>;
  lessons: Lesson[];
  currentDataCount: number;
  logs: StudyLog[];
  userMetadata: any;
  userEmail?: string;
}

const ConfigView: React.FC<ConfigViewProps> = ({ onSaveData, onClearData, lessons, currentDataCount, logs, userMetadata, userEmail }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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

      // Count Lessons
      const { count: lessonsCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Count Active/Completed Logs
      const { count: logsCount } = await supabase
        .from('study_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      setRealTimeLessons(lessonsCount || 0);
      setRealTimeLogs(logsCount || 0);
    } catch (e) {
      console.error('Erro ao buscar estatísticas:', e);
    }
  };

  // Reset confirmation state when leaving view or after a timeout
  useEffect(() => {
    let timeout: number;
    if (isConfirmingDelete) {
      timeout = window.setTimeout(() => setIsConfirmingDelete(false), 4000);
    }
    return () => clearTimeout(timeout);
  }, [isConfirmingDelete]);

  // Update local state if userMetadata changes (from refresh)
  useEffect(() => {
    if (userMetadata) {
      setDisplayName(userMetadata.full_name || '');
      setAvatarUrl(userMetadata.avatar_url || '');
      setPreviewUrl(userMetadata.avatar_url || null);
    }
    // Refresh stats when user data changes
    fetchStats();
  }, [userMetadata, lessons, logs]);

  // Handle Focus and Mount
  useEffect(() => {
    fetchStats();

    // Add focus listener to refresh when returning to tab
    const handleFocus = () => fetchStats();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCroppingImage(reader.result as string);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleConfirmCrop = async () => {
    if (!croppingImage || !croppedAreaPixels) return;

    setLoading(true);
    setProfileError('');
    try {
      const croppedImageBlob = await getCroppedImg(croppingImage, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error('Falha ao processar imagem.');

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado.');

      const fileName = `${userData.user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedImageBlob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      setPreviewUrl(publicUrl);
      setSelectedFile(null); // No longer needed for manual upload in handleUpdateProfile
      setShowCropper(false);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e: any) {
      setProfileError(e.message || 'Erro ao processar imagem.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
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
        // We call onSaveData which will now handle Supabase persistence in App.tsx
        await onSaveData(parsed);
        setInput('');
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) {
      setError('Erro ao processar os dados.');
    }
  };

  const handleExportData = () => {
    const data = {
      lessons: lessons,
      logs: logs
    };
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
        data: {
          full_name: displayName,
          avatar_url: avatarUrl,
        }
      });

      if (profileError) throw profileError;

      // 2. Tentar atualizar senha SÓ SE o campo tiver valor digitado manualmente
      const passwordToSet = newPassword.trim();
      if (passwordToSet !== '') {
        if (passwordToSet.length < 6) {
          throw new Error('A senha deve ter no mínimo 6 caracteres.');
        }

        const { error: authError } = await supabase.auth.updateUser({
          password: passwordToSet
        });

        if (authError) {
          // Se for erro de "senha igual", avisa mas NÃO cancela a atualização do perfil
          if (authError.message.includes('different')) {
            alert('O perfil foi atualizado, mas a senha foi mantida (pois era igual à anterior).');
          } else {
            throw authError; // Outros erros de senha param o processo
          }
        }
      }

      setProfileSuccess(true);
      setNewPassword('');

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Erro ao atualizar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Account Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-indigo-500" /> Gestão de Conta
        </h2>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <Key className="w-4 h-4" /> Informações do Perfil
            </h3>
            <div className="flex flex-col gap-3">
              {/* Email (Read Only) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail</label>
                <input
                  type="email"
                  value={userEmail || ''}
                  readOnly
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm opacity-70 cursor-not-allowed dark:text-slate-400"
                />
              </div>

              {/* Display Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome de Exibição</label>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Foto de Perfil</label>
                <div className="flex items-center gap-4 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover object-center border-2 border-indigo-500" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                      S/ FOTO
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <span className="inline-block px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 transition-all">
                      {selectedFile ? 'Trocar Foto' : 'Escolher Foto'}
                    </span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Alterar Senha (opcional)</label>
                <input
                  type="password"
                  id="new-password-field"
                  name="new-password-field"
                  autoComplete="new-password"
                  placeholder="Nova senha (deixe em branco para manter)"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="w-full mt-2 py-3 bg-slate-800 dark:bg-slate-600 hover:bg-slate-900 dark:hover:bg-slate-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-100 dark:shadow-none"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar Dados'}
              </button>
              {profileError && <p className="text-[10px] text-red-500 font-bold ml-1">{profileError}</p>}
              {profileSuccess && <p className="text-[10px] text-emerald-500 font-bold ml-1">Dados atualizados com sucesso!</p>}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sair da Conta
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-indigo-500" /> Importar Plano de Estudos
        </h2>
        <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-2xl mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Formato Esperado</p>
          <p className="text-xs text-indigo-800 dark:text-indigo-300 font-mono">Tema | Módulo | Aula | 00:15:00</p>
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
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-md shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98]"
          >
            Processar e Salvar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data Stats Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Database className="w-4 h-4" /> Dados Atuais
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">Aulas cadastradas</span>
              <span className="font-bold dark:text-white">{realTimeLessons}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">Registros de estudo</span>
              <span className="font-bold dark:text-white">{realTimeLogs}</span>
            </div>
            <button
              onClick={handleExportData}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <FileText className="w-4 h-4" /> Exportar JSON
            </button>
          </div>
        </div>

        {/* Manage Data Card (Old Risk Zone) */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-red-100/50 dark:border-red-900/30 p-6 shadow-sm flex flex-col justify-center transition-all duration-300">
          <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> GERENCIAR DADOS
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-300 mb-4 leading-relaxed">
            Apagar todos os dados removerá permanentemente seu Plano de Estudos e todo o progresso acumulado.
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

      {/* Image Cropper Modal */}
      {showCropper && croppingImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Ajustar Foto</h3>
              <button
                onClick={() => setShowCropper(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cancelar
              </button>
            </div>

            <div className="relative h-80 bg-slate-100 dark:bg-slate-900">
              <Cropper
                image={croppingImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-8 space-y-6">
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
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCropper(false)}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs text-slate-500 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmCrop}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Recorte'}
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
