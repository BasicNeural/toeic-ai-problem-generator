import { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Key, Database, ChevronRight, AlertCircle } from 'lucide-react';
import { ConfigManager, FirebaseAppConfig, parseFirebaseInput } from '../../lib/configManager';
import { ApiKeyManager } from '../../lib/apiKeyManager';

interface SetupViewProps {
  onComplete: () => void;
}

const FIREBASE_FIELDS: { key: keyof FirebaseAppConfig; label: string; placeholder: string; required: boolean }[] = [
  { key: 'projectId', label: 'Project ID', placeholder: 'my-project-12345', required: true },
  { key: 'appId', label: 'App ID', placeholder: '1:123456789:web:abc123', required: true },
  { key: 'apiKey', label: 'API Key', placeholder: 'AIzaSy...', required: true },
  { key: 'authDomain', label: 'Auth Domain', placeholder: 'my-project.firebaseapp.com', required: true },
  { key: 'firestoreDatabaseId', label: 'Firestore Database ID', placeholder: '비워두면 (default) 사용', required: false },
  { key: 'storageBucket', label: 'Storage Bucket', placeholder: 'my-project.appspot.com', required: true },
  { key: 'messagingSenderId', label: 'Messaging Sender ID', placeholder: '123456789', required: true },
  { key: 'measurementId', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX', required: false },
];

export function SetupView({ onComplete }: SetupViewProps) {
  const [step, setStep] = useState<'firebase' | 'gemini'>('firebase');
  const [firebaseConfig, setFirebaseConfig] = useState<Record<string, string>>({});
  const [geminiKey, setGeminiKey] = useState('');
  const [configInput, setConfigInput] = useState('');
  const [parseError, setParseError] = useState('');
  const [inputMode, setInputMode] = useState<'paste' | 'fields'>('paste');

  const handleParse = () => {
    const parsed = parseFirebaseInput(configInput);
    if (!parsed) {
      setParseError('올바른 형식이 아닙니다. Firebase 콘솔에서 복사한 설정을 그대로 붙여넣으세요.');
      return;
    }
    const mapped: Record<string, string> = {};
    for (const field of FIREBASE_FIELDS) {
      if (parsed[field.key]) {
        mapped[field.key] = String(parsed[field.key]);
      }
    }
    setFirebaseConfig(mapped);
    setParseError('');
    setInputMode('fields');
  };

  const isFirebaseValid = FIREBASE_FIELDS
    .filter(f => f.required)
    .every(f => firebaseConfig[f.key]?.trim());

  const handleFirebaseSubmit = () => {
    if (!isFirebaseValid) return;
    ConfigManager.setFirebaseConfig(firebaseConfig as unknown as FirebaseAppConfig);
    setStep('gemini');
  };

  const handleGeminiSubmit = () => {
    if (!geminiKey.trim()) return;
    ApiKeyManager.addKey(geminiKey.trim());
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md p-6 space-y-6 pt-12"
    >
      <div className="space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-2">
          <Settings className="text-white w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">초기 설정</h1>
        <p className="text-slate-500 text-sm">앱을 사용하기 위해 설정이 필요합니다.</p>
      </div>

      <div className="flex gap-2">
        <div className={`flex-1 h-1.5 rounded-full transition-colors ${step === 'firebase' || step === 'gemini' ? 'bg-blue-600' : 'bg-slate-200'}`} />
        <div className={`flex-1 h-1.5 rounded-full transition-colors ${step === 'gemini' ? 'bg-blue-600' : 'bg-slate-200'}`} />
      </div>

      {step === 'firebase' && (
        <motion.div
          key="firebase"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 text-blue-600">
            <Database className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Firebase 설정</span>
          </div>

          {inputMode === 'paste' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Firebase 콘솔에서 복사한 <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono">firebaseConfig</code>을 그대로 붙여넣으세요. JSON과 JS 형식 모두 지원합니다.
              </p>
              <textarea
                value={configInput}
                onChange={(e) => { setConfigInput(e.target.value); setParseError(''); }}
                placeholder={'const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "my-project.firebaseapp.com",\n  projectId: "my-project",\n  storageBucket: "my-project.appspot.com",\n  messagingSenderId: "123456789",\n  appId: "1:123:web:abc"\n};'}
                rows={10}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
              {parseError && (
                <div className="flex items-center gap-2 text-rose-600 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {parseError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleParse}
                  disabled={!configInput.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  설정 파싱
                </button>
                <button
                  onClick={() => setInputMode('fields')}
                  className="py-3 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
                >
                  직접 입력
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setInputMode('paste')}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                ← 붙여넣기로 돌아가기
              </button>
              {FIREBASE_FIELDS.map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    {field.label}
                    {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                  </label>
                  <input
                    type="text"
                    value={firebaseConfig[field.key] || ''}
                    onChange={(e) => setFirebaseConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              ))}
              <button
                onClick={handleFirebaseSubmit}
                disabled={!isFirebaseValid}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                다음 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {step === 'gemini' && (
        <motion.div
          key="gemini"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 text-emerald-600">
            <Key className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Gemini API 키</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">Google AI Studio</a>에서 발급받은 Gemini API 키를 입력하세요. 추가 키는 나중에 설정에서 등록할 수 있습니다.
          </p>

          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setStep('firebase')}
              className="py-3 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
            >
              이전
            </button>
            <button
              onClick={handleGeminiSubmit}
              disabled={!geminiKey.trim()}
              className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              설정 완료
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
