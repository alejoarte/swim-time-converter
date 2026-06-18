import type { ReactNode } from 'react'

type IconProps = {
  className?: string
  size?: number
}

function IconBase({
  className,
  size = 18,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconPencil({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </IconBase>
  )
}

export function IconCalendar({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </IconBase>
  )
}

export function IconSwimmer({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <circle cx="10" cy="5" r="2" />
      <path d="m14 12 3 2-2 4" />
      <path d="M6 16l4-2 4 2 4-3" />
      <path d="M4 20c2-1 4-1 6 0s4 1 6 0" />
    </IconBase>
  )
}

export function IconSearch({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  )
}

export function IconInfo({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </IconBase>
  )
}

export function IconChevronDown({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  )
}
