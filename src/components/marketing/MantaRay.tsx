const MANTA_PATH =
  "M200 16 C186 16 176 24 170 36 C160 30 148 32 138 40 C120 54 92 68 60 80 C34 90 14 100 4 112 C14 124 34 134 60 144 C92 156 120 170 138 184 C148 192 160 194 170 188 C176 200 186 208 200 208 C214 208 224 200 230 188 C240 194 252 192 262 184 C280 170 308 156 340 144 C366 134 386 124 396 112 C386 100 366 90 340 80 C308 68 280 54 262 40 C252 32 240 30 230 36 C224 24 214 16 200 16 Z M194 206 C194 230 197 265 200 306 C203 265 206 230 206 206 Z"

type MantaRayProps = {
  className?: string
  variant?: "fill" | "line"
  title?: string
}

export function MantaRay({
  className,
  variant = "line",
  title,
}: MantaRayProps) {
  return (
    <svg
      viewBox="0 0 400 320"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      fill="none"
    >
      {title ? <title>{title}</title> : null}
      <path
        d={MANTA_PATH}
        fill={variant === "fill" ? "currentColor" : "none"}
        stroke={variant === "line" ? "currentColor" : "none"}
        strokeWidth={variant === "line" ? 1.4 : undefined}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
