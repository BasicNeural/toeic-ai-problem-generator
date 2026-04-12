import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'loading';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 50, x: '-50%' }}
      className={cn(
        "fixed bottom-8 left-1/2 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-[100]",
        type === 'success' ? "bg-emerald-600 text-white" : 
        type === 'error' ? "bg-rose-600 text-white" :
        "bg-slate-800 text-white"
      )}
    >
      {type === 'success' && <CheckCircle2 className="w-5 h-5" />}
      {type === 'error' && <AlertCircle className="w-5 h-5" />}
      {type === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
      
      <span className="text-sm font-bold">{message}</span>
      
      {type !== 'loading' && (
        <button onClick={onClose} className="ml-2 hover:opacity-70">
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
