import { INK, INK_SOFT, MARK, PAPER } from './palette'

export function Symbols() {
  return (
    <defs>
      <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.07 0" />
      </filter>
      <filter id="stains" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="3" seed="3" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.18  0 0 0 0.16 -0.02" />
      </filter>
      <filter id="watercolor" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
      </filter>

      <g id="g-peak">
        <path d="M-10 0C-6.5-4.5-3.2-9.6 0-14.5C3.2-9.6 6.5-4.5 10 0Z" fill={PAPER} />
        <path d="M0-14.5C1.2-9 2-4.6 1.2 0H10C6.5-4.5 3.2-9.6 0-14.5Z" fill={INK_SOFT} opacity="0.38" />
        <path d="M-10 0C-6.5-4.5-3.2-9.6 0-14.5C3.2-9.6 6.5-4.5 10 0" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-5.5-3.4L-3.6-5.6M-3.2-7.8L-1.8-9.4" stroke={INK} strokeWidth="0.5" strokeLinecap="round" opacity="0.6" />
      </g>
      <g id="g-hill">
        <path d="M-6.5 0C-4.5-4.2 4.5-4.2 6.5 0Z" fill={PAPER} />
        <path d="M0-3.2C2.4-3 4.8-2 6.5 0H1.2C1.4-1.2 1-2.4 0-3.2Z" fill={INK_SOFT} opacity="0.3" />
        <path d="M-6.5 0C-4.5-4.2 4.5-4.2 6.5 0" fill="none" stroke={INK} strokeWidth="0.8" strokeLinecap="round" />
      </g>
      <g id="g-tree">
        <path d="M0 0V-2.6" stroke={INK} strokeWidth="0.8" strokeLinecap="round" />
        <path d="M0-8.2C2.6-8.2 3.6-6.4 3.2-4.6C2.8-2.8 1.4-2.3 0-2.6C-1.4-2.3-2.8-2.8-3.2-4.6C-3.6-6.4-2.6-8.2 0-8.2Z" fill="#9fb97f" stroke={INK} strokeWidth="0.7" />
        <path d="M0.8-7C1.9-6.6 2.4-5.6 2.2-4.6" fill="none" stroke={INK} strokeWidth="0.45" opacity="0.55" />
      </g>
      <g id="g-pine">
        <path d="M0 0.4V-1.4" stroke={INK} strokeWidth="0.8" strokeLinecap="round" />
        <path d="M-2.8-1.2L0-8.4L2.8-1.2Z" fill="#93ad8e" stroke={INK} strokeWidth="0.65" strokeLinejoin="round" />
        <path d="M0.4-6.6L1.9-2" stroke={INK} strokeWidth="0.4" opacity="0.5" />
      </g>
      <g id="g-palm">
        <path d="M0 0C0.4-2.4 0.2-4.6-0.6-6.6" fill="none" stroke={INK} strokeWidth="0.8" strokeLinecap="round" />
        <path d="M-0.6-6.6C-2.6-7.6-4-6.8-4.4-5.4M-0.6-6.6C1.4-7.8 3.2-7 3.8-5.6M-0.6-6.6C-1.6-8.6-0.6-9.8 0.8-9.8M-0.6-6.6C0.8-8.2 2.6-8.6 3.6-8.2" fill="none" stroke="#4f6c45" strokeWidth="0.9" strokeLinecap="round" />
      </g>
      <g id="g-dune">
        <path d="M-6 0Q-1.5-3.4 3 0M0.6-1.6Q3.4-3.2 6.4-0.6" fill="none" stroke={INK_SOFT} strokeWidth="0.7" strokeLinecap="round" />
      </g>
      <g id="g-tuft">
        <path d="M-3 0H3M-1.8 0L-2.8-2.6M0 0V-3.2M1.8 0L2.8-2.6" fill="none" stroke="#5f7454" strokeWidth="0.6" strokeLinecap="round" />
      </g>

      <g id="g-town">
        <circle r="2.6" fill={PAPER} stroke={INK} strokeWidth="1.1" />
      </g>
      <g id="g-capital">
        <circle r="4.6" fill={PAPER} stroke={INK} strokeWidth="1.1" />
        <circle r="2.1" fill={INK} />
      </g>
      <g id="g-pin">
        <path d="M0 0C-1.2-3.6-5-5.4-5-9.2A5 5 0 0 1 5-9.2C5-5.4 1.2-3.6 0 0Z" fill={MARK} stroke="#fff6ea" strokeWidth="1" />
        <circle cy="-9.2" r="1.9" fill="#fff6ea" />
      </g>
    </defs>
  )
}
