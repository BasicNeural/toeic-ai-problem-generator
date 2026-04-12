import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, XCircle, AlertCircle, Trash2, Send, Key, Plus, X, CheckCircle2, Database } from 'lucide-react';
import { ApiKeyManager } from '../../lib/apiKeyManager';
import { ConfigManager } from '../../lib/configManager';
import { reinitializeFirebase } from '../../firebase';
import { cn } from '../../lib/utils';

interface SettingsModalProps {
  onClose: () => void;
  onReset: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfigReset: () => void;
}

export function SettingsModal({ onClose, onReset, onFileUpload, onConfigReset }: SettingsModalProps) {
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [newKey, setNewKey] = useState('');

  const updateState = () => {
    const keys = ApiKeyManager.getAllKeys();
    setAllKeys(keys);
    setCurrentIndex(ApiKeyManager.getIndex() % Math.max(1, keys.length));
  };

  useEffect(() => {
    updateState();
    window.addEventListener('apiKeysUpdated', updateState);
    window.addEventListener('apiKeyChanged', updateState);
    window.addEventListener('apiKeyRotated', updateState);
    return () => {
      window.removeEventListener('apiKeysUpdated', updateState);
      window.removeEventListener('apiKeyChanged', updateState);
      window.removeEventListener('apiKeyRotated', updateState);
    };
  }, []);

  const handleAddKey = () => {
    if (newKey.trim()) {
      ApiKeyManager.addKey(newKey.trim());
      setNewKey('');
    }
  };

  const handleRemoveKey = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ApiKeyManager.removeKey(key);
  };

  const handleSelectKey = (index: number) => {
    ApiKeyManager.setIndex(index);
  };

  const handleConfigReset = () => {
    ConfigManager.clearFirebaseConfig();
    reinitializeFirebase();
    onConfigReset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">설정</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <XCircle className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <Key className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Gemini API 키 관리</span>
            </div>
            
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                API 키의 한도(Rate Limit)가 초과될 경우, 등록된 키를 순차적으로 사용하여 학습 흐름이 끊기지 않게 합니다.
              </p>
              
              <div className="flex gap-2">
                <input 
                  type="password" 
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button 
                  onClick={handleAddKey}
                  disabled={!newKey.trim()}
                  className="bg-emerald-500 text-white p-2 rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {allKeys.length > 0 && (
                <div className="space-y-2 mt-4">
                  {allKeys.map((key, index) => {
                    const isActive = index === currentIndex;
                    return (
                      <div 
                        key={index} 
                        onClick={() => handleSelectKey(index)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all",
                          isActive ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-slate-50 hover:border-emerald-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {isActive ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Key className="w-4 h-4 text-slate-400" />
                          )}
                          <span className={cn(
                            "text-xs font-mono",
                            isActive ? "text-emerald-700 font-bold" : "text-slate-600"
                          )}>
                            {`${key.substring(0, 8)}...${key.substring(key.length - 4)}`}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => handleRemoveKey(key, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Send className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">데이터 가져오기</span>
            </div>
            
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  onFileUpload(e);
                  onClose();
                }}
                className="hidden"
                id="csv-upload-settings"
              />
              <label
                htmlFor="csv-upload-settings"
                className="w-full group relative overflow-hidden bg-white p-4 rounded-2xl border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-center flex flex-col items-center justify-center cursor-pointer"
              >
                <Send className="w-5 h-5 text-slate-400 mb-1 group-hover:text-blue-500 transition-colors" />
                <span className="text-sm font-bold text-slate-700">단어장 CSV 업로드</span>
                <span className="text-xs text-slate-500 mt-1">새로운 단어를 목록에 추가합니다</span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">위험 구역</span>
            </div>
            
            <div className="bg-rose-50 p-4 rounded-2xl space-y-3">
              <p className="text-xs text-rose-700 leading-relaxed">
                데이터를 초기화하면 모든 단어와 학습 진행 상황이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <button 
                onClick={onReset}
                className="w-full py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                학습 데이터 초기화
              </button>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl space-y-3">
              <p className="text-xs text-amber-700 leading-relaxed">
                Firebase 및 API 키 설정을 초기화하고 초기 설정 화면으로 돌아갑니다.
              </p>
              <button 
                onClick={handleConfigReset}
                className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-100 hover:bg-amber-700 transition-all flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4" />
                앱 설정 초기화
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all"
          >
            닫기
          </button>
        </div>
      </motion.div>
    </div>
  );
}
