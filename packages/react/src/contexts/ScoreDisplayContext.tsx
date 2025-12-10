import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ScoreDisplayMode = 'score' | 'breakdown';

interface ScoreDisplayContextValue {
  mode: ScoreDisplayMode;
  toggleMode: () => void;
}

const ScoreDisplayContext = createContext<ScoreDisplayContextValue | null>(null);

export function ScoreDisplayProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ScoreDisplayMode>(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('threadkit_score_display');
      if (saved === 'score' || saved === 'breakdown') {
        return saved;
      }
    }
    return 'score';
  });

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'score' ? 'breakdown' : 'score';
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('threadkit_score_display', next);
      }
      return next;
    });
  }, []);

  return (
    <ScoreDisplayContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ScoreDisplayContext.Provider>
  );
}

export function useScoreDisplay(): ScoreDisplayContextValue {
  const context = useContext(ScoreDisplayContext);
  if (!context) {
    // Default fallback if used outside provider
    return { mode: 'score', toggleMode: () => {} };
  }
  return context;
}
