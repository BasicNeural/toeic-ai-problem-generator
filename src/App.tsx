import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Toast } from './components/ui/Toast';
import { HomeView } from './components/views/HomeView';
import { MemorizeView } from './components/views/MemorizeView';
import { SolveView } from './components/views/SolveView';
import { VocabQuizView } from './components/views/VocabQuizView';
import { SetupView } from './components/views/SetupView';
import { SettingsModal } from './components/modals/SettingsModal';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { MemorizedWordsModal } from './components/modals/MemorizedWordsModal';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { ConfigManager } from './lib/configManager';
import { ApiKeyManager } from './lib/apiKeyManager';

export default function App() {
  const [isConfigured, setIsConfigured] = useState(() => 
    ConfigManager.isConfigured() && ApiKeyManager.getAllKeys().length > 0
  );

  if (!isConfigured) {
    return (
      <ErrorBoundary>
        <div className="min-h-dvh bg-slate-50 flex flex-col items-center">
          <SetupView onComplete={() => setIsConfigured(true)} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <TOEICApp onConfigReset={() => setIsConfigured(false)} />
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

interface TOEICAppProps {
  onConfigReset: () => void;
}

function TOEICApp({ onConfigReset }: TOEICAppProps) {
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showMemorizedList, setShowMemorizedList] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);

  const { vocabulary } = useAppContext();
  const { words, uploadCSV, resetData } = vocabulary;
  
  useEffect(() => {
    const handleRotation = () => {
      setToast({ message: 'API 한도 초과로 다음 키로 자동 전환되었습니다.', type: 'success' });
    };
    window.addEventListener('apiKeyRotated', handleRotation);
    return () => window.removeEventListener('apiKeyRotated', handleRotation);
  }, []);

  const actuallyMemorizedWords = words.filter(w => w.memorized && w.lastRating !== 'Again');

  useEffect(() => {
    if (toast && toast.type !== 'loading') {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadCSV(
      file,
      () => setToast({ message: '단어 업로드 중...', type: 'loading' }),
      (count) => setToast({ message: `${count}개의 단어가 성공적으로 업로드되었습니다!`, type: 'success' }),
      () => setToast({ message: '단어 업로드에 실패했습니다.', type: 'error' })
    );
  };

  const handleResetData = () => {
    resetData(
      () => setToast({ message: '모든 데이터 초기화 중...', type: 'loading' }),
      () => {
        setToast({ message: '데이터가 성공적으로 초기화되었습니다!', type: 'success' });
        setShowResetConfirm(false);
        setShowSettings(false);
      },
      () => setToast({ message: '데이터 초기화에 실패했습니다.', type: 'error' })
    );
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col items-center">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <HomeView 
              onOpenSettings={() => setShowSettings(true)}
              onOpenMemorizedList={() => setShowMemorizedList(true)}
            />
          } />
          <Route path="/memorize" element={<MemorizeView />} />
          <Route path="/vocab-quiz" element={<VocabQuizView />} />
          <Route path="/solve" element={<SolveView />} />
        </Routes>
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsModal 
            key="settings"
            onClose={() => setShowSettings(false)}
            onReset={() => setShowResetConfirm(true)}
            onFileUpload={handleFileUpload}
            onConfigReset={onConfigReset}
          />
        )}

        {showResetConfirm && (
          <ConfirmModal 
            key="confirm-reset"
            title="모든 데이터 초기화"
            message="모든 단어와 학습 진행 상황이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
            onConfirm={handleResetData}
            onCancel={() => setShowResetConfirm(false)}
          />
        )}

        {showMemorizedList && (
          <MemorizedWordsModal
            key="memorized-list"
            words={actuallyMemorizedWords}
            onClose={() => setShowMemorizedList(false)}
          />
        )}

        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
