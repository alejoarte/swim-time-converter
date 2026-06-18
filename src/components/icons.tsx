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

export function IconTarget({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </IconBase>
  )
}

export function IconStopwatch({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M10 2h4" />
      <path d="M12 2v2" />
    </IconBase>
  )
}

export function IconBarChart({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-6" />
      <path d="M22 20V8" />
    </IconBase>
  )
}

export function IconHeart({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M12 21s-6.5-4.35-9-7.5C1.5 11.5 2 7 5.5 5.5 8 4.5 10 5.5 12 7.5 14 5.5 16 4.5 18.5 5.5 22 7 22 11.5 21 13.5 12 21Z" />
    </IconBase>
  )
}

export function IconPulse({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </IconBase>
  )
}

export function IconGauge({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </IconBase>
  )
}

export function IconFlag({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M4 22V4" />
      <path d="M4 4h11l-2 4 2 4H4" />
    </IconBase>
  )
}

export function IconLink({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </IconBase>
  )
}

export function IconPrint({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V3h12v6" />
      <rect x="6" y="14" width="12" height="7" />
    </IconBase>
  )
}

export function IconDownload({ className, size }: IconProps) {
  return (
    <IconBase className={className} size={size}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </IconBase>
  )
}
