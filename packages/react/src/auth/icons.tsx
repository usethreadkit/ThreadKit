import React from 'react';

interface IconProps {
  className?: string;
}

export function EmailIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12" y2="18" />
    </svg>
  );
}

export function GoogleIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GitHubIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}


export function LoadingSpinner({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="1s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

export function BackArrowIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function AnonymousIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 495 511.962"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M62.686 511.962h372.371l-36.089-62.816L495 366.77c-28.169-39.57-62.177-73.186-83.426-82.313 4.492-11.642 5.27-13.683 1.515-20.139 39.914-11.352 66.091-27.943 66.035-49.863-.059-23.9-34.387-46.861-85.543-54.849-12.249-51.822-24.432-92.624-39.938-119.402-2.82-4.867-5.749-9.275-8.811-13.195-46.162-59.204-62.34-2.606-95.067-2.672-37.938-.077-42.766-52.014-92.236-3.124-5.32 5.258-10.296 11.648-14.938 19.092-16.825 26.955-29.385 67.801-38.669 119.301-54.538 10.31-88.209 33.076-87.091 56.325 1.012 21.062 27.574 37.207 67.494 48.355-2.624 8.118-2.006 9.511 1.55 19.503C56.059 296.357 24.902 334.551 0 367.998l96.902 81.148-34.216 62.816zm184.129-101.745c8.695 0 15.746 7.053 15.746 15.748 0 8.693-7.051 15.746-15.746 15.746s-15.745-7.053-15.745-15.746c0-8.695 7.05-15.748 15.745-15.748zm-43.494-72.864c0-2.911.483-5.876 1.432-8.873 1.994-6.363 5.997-12.39 10.917-16.854 5.737-5.213 12.947-8.985 20.488-10.746 17.9-4.172 40.37.352 51 16.562l.13.219c6.033 9.281 7.471 22.053 2.16 31.982-3.503 6.559-7.651 10.311-12.944 15.198l-8.663 7.843-2.411 2.272c-3.162 3.131-4.364 4.935-5.562 9.672l-.796 3.524c-.68 3.494-2.097 6.189-4.242 8.059l-.207.165c-2.216 1.841-5.06 2.767-8.512 2.767-3.698 0-6.876-1.234-9.45-3.695-1.349-1.293-2.352-2.885-3.009-4.758-.612-1.757-.917-3.731-.917-5.914 0-8.881 2.663-16.615 8.725-23.186 4.405-4.781 9.548-9.13 14.42-13.45 3.604-3.29 7.683-6.95 7.683-12.207 0-8.204-7.05-12.6-14.532-12.6-7.61 0-11.106 2-14.668 8.642-1.131 2.121-2.166 4.573-3.089 7.352-1.125 3.674-2.805 6.494-5.033 8.44-8.662 7.557-22.92.622-22.92-10.414zM379.85 268.38l.538 3.545 3.092 20.384c30.035-5.503 9.778 69.444-14.87 65.515-4.251 13.322-7.139 39.976-10.879 49.934-34.937 93-184.185 87.349-219.85-6.156-3.527-9.243-6.82-35.042-10.903-46.838-26.757 6.684-43.251-69.348-13.819-62.836l3.373-20.225.574-3.447.305-1.819c83.026 18.029 182.824 16.091 262.214.455l.225 1.488zm-260.025-97.561l7.198-24.639c46.656 39.159 207.874 33.023 243.016 0l6.065 24.639c-40.982 43.351-212.466 37.461-256.279 0z" />
    </svg>
  );
}

// Import social icons from the new location
import { SOCIAL_ICONS as IMPORTED_SOCIAL_ICONS } from '../icons/social';

// Map of method IDs to icons
export const AUTH_ICONS: Record<string, React.ComponentType<IconProps>> = {
  email: EmailIcon,
  phone: PhoneIcon,
  google: GoogleIcon,
  github: GitHubIcon,
  anonymous: AnonymousIcon,
};

// Re-export social icons for backwards compatibility
export const SOCIAL_ICONS: Record<string, React.ComponentType<IconProps>> = IMPORTED_SOCIAL_ICONS;
