import { useState, useEffect } from 'react';

interface AvatarProps {
  src?: string;
  alt: string;
  className?: string;
  seed?: string; // fallback seed (usually username)
}

export function Avatar({ src, alt, className, seed }: AvatarProps) {
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);

  useEffect(() => {
    setCurrentSrc(src);
    setError(false);
  }, [src]);

  if (error || !currentSrc) {
    return (
      <div className={`${className} threadkit-avatar-placeholder`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--threadkit-bg-secondary)', color: 'var(--threadkit-text-secondary)', borderRadius: '50%' }}>
        <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
