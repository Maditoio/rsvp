/** Compact brand marks for calendar connect controls (~18px). */

export function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 18 18"
      width={18}
      height={18}
      aria-hidden
      className={className}
    >
      <path
        fill="#4285F4"
        d="M16.2 9.18c0-.55-.05-1.08-.14-1.59H9v3.01h4.04a3.46 3.46 0 0 1-1.5 2.27v1.88h2.43c1.42-1.31 2.23-3.24 2.23-5.57Z"
      />
      <path
        fill="#34A853"
        d="M9 16.5c2.03 0 3.73-.67 4.97-1.82l-2.43-1.88c-.67.45-1.53.72-2.54.72-1.95 0-3.6-1.32-4.19-3.09H2.3v1.94A7.5 7.5 0 0 0 9 16.5Z"
      />
      <path
        fill="#FBBC05"
        d="M4.81 10.43A4.5 4.5 0 0 1 4.57 9c0-.5.09-.98.24-1.43V5.63H2.3A7.5 7.5 0 0 0 1.5 9c0 1.21.29 2.35.8 3.37l2.51-1.94Z"
      />
      <path
        fill="#EA4335"
        d="M9 4.48c1.1 0 2.09.38 2.87 1.12l2.15-2.15A7.45 7.45 0 0 0 9 1.5 7.5 7.5 0 0 0 2.3 5.63l2.51 1.94C5.4 5.8 7.05 4.48 9 4.48Z"
      />
    </svg>
  );
}

export function OutlookCalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 18 18"
      width={18}
      height={18}
      aria-hidden
      className={className}
    >
      <path fill="#0078D4" d="M9.75 2.25h6v13.5h-6a.75.75 0 0 1-.75-.75V3a.75.75 0 0 1 .75-.75Z" />
      <path fill="#28A8EA" d="M9 3v12H3.75A.75.75 0 0 1 3 14.25V3.75A.75.75 0 0 1 3.75 3H9Z" />
      <path
        fill="#fff"
        d="M6.55 11.4c-1.35 0-2.35-.95-2.35-2.4S5.2 6.6 6.55 6.6c1.34 0 2.33.95 2.33 2.4s-.99 2.4-2.33 2.4Zm0-3.75c-.72 0-1.22.55-1.22 1.35s.5 1.35 1.22 1.35 1.2-.55 1.2-1.35-.48-1.35-1.2-1.35Z"
      />
      <path fill="#50D9FF" d="M9.75 2.25H15a.75.75 0 0 1 .75.75v1.5H9.75V2.25Z" />
    </svg>
  );
}
