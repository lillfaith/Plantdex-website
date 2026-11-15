import type { IconName } from '@/lib/boss-presentation';

/**
 * THE SMALL PICTURE BESIDE A KNOWLEDGE CHOICE, in inline SVG. It repeats the words next to it, so
 * it is `aria-hidden` and never the only carrier of meaning. One set serves every plant.
 */
export function ChoiceIcon({ name, tint }: { name: IconName; tint?: string }) {
  const common = { 'aria-hidden': true as const, viewBox: '0 0 32 32', className: 'h-8 w-8', shapeRendering: 'crispEdges' as const };
  switch (name) {
    case 'drop':
      return (
        <svg {...common}>
          <path d="M16 3l9 14a10 10 0 11-18 0z" fill={tint ?? '#8fd0ff'} />
          <rect x="11" y="16" width="3" height="7" fill="#ffffff" opacity="0.45" />
        </svg>
      );
    case 'wind':
      return (
        <svg {...common}>
          <path d="M3 11h18v3H3zM3 18h24v3H3zM9 25h14v3H9z" fill="#d3c5ff" />
          <circle cx="26" cy="9" r="4" fill="#fff4d6" />
        </svg>
      );
    case 'paw':
      return (
        <svg {...common} fill="#d3c5ff">
          <circle cx="9" cy="11" r="3" />
          <circle cx="16" cy="8" r="3" />
          <circle cx="23" cy="11" r="3" />
          <rect x="9" y="16" width="14" height="9" rx="4" />
        </svg>
      );
    case 'dry':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="11" fill="none" stroke="#d3c5ff" strokeWidth="3" />
          <path d="M8 24L24 8" stroke="#d3c5ff" strokeWidth="3" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="7" fill="#ffd77a" />
          {[0, 45, 90, 135].map((a) => (
            <g key={a} transform={`rotate(${a} 16 16)`} fill="#ffd77a">
              <rect x="15" y="1" width="2" height="5" />
              <rect x="15" y="26" width="2" height="5" />
            </g>
          ))}
        </svg>
      );
    case 'yes':
      return (
        <svg {...common}>
          <path d="M6 17l7 7 13-14" fill="none" stroke="#ffd77a" strokeWidth="4" />
        </svg>
      );
    case 'no':
      return (
        <svg {...common}>
          <path d="M8 8l16 16M24 8L8 24" fill="none" stroke="#d3c5ff" strokeWidth="4" />
        </svg>
      );
    case 'tree':
      return (
        <svg {...common}>
          <rect x="14" y="16" width="4" height="12" fill="#8a5a2c" />
          <path d="M16 3l10 14H6z" fill="#7fae3b" />
        </svg>
      );
  }
}
