import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ScoreDisplayMode = 'score' | 'breakdown';

interface ScoreDisplayContextValue {
  mode: ScoreDisplayMode;
  toggleMode: () => void;
}

const ScoreDisplayContext = createContext<ScoreDisplayContextValue | null>(null);

export function ScoreDisplayProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ScoreDisplayMode>('score');

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'score' ? 'breakdown' : 'score'));
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
