import { useEffect, useRef, useState } from 'react';
import { SentenceToken } from '../../types';
import { cn } from '../../lib/utils';

interface SentenceTokensProps {
    tokens: SentenceToken[];
}

export function SentenceTokens({ tokens }: SentenceTokensProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(event.target as Node)) {
                setActiveIndex(null);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, []);

    if (tokens.length === 0) {
        return null;
    }

    return (
        <div ref={rootRef} className="flex flex-wrap items-center leading-[2] text-lg text-slate-800">
            {tokens.map((token, index) => {
                const active = activeIndex === index;

                return (
                    <span key={`${token.word}-${index}`} className="relative inline-flex mr-0.5 mb-1.5">
                        <button
                            type="button"
                            onClick={() => setActiveIndex(active ? null : index)}
                            className={cn(
                                'rounded-lg px-2.5 py-0.5 transition-all',
                                active
                                    ? 'bg-blue-100 text-blue-900 ring-2 ring-blue-200'
                                    : 'bg-transparent text-slate-800 hover:bg-slate-100 hover:text-slate-950'
                            )}
                        >
                            {token.word}
                        </button>

                        {active && (
                            <span className="absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 w-max max-w-[85vw] whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-medium leading-none text-white shadow-lg">
                                {token.meaning}
                            </span>
                        )}
                    </span>
                );
            })}
        </div>
    );
}