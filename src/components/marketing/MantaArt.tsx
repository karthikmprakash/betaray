import type { CSSProperties } from "react"

const sources = {
  "hero-loop": "/brand/betaray/mantas/manta-hero-loop.webp",
  "ventral-loop": "/brand/betaray/mantas/manta-ventral-loop.webp",
  school: "/brand/betaray/mantas/manta-school.png",
  "bank-left": "/brand/betaray/mantas/manta-angle-bank-left.png",
  "bank-right": "/brand/betaray/mantas/manta-angle-bank-right.png",
  underside: "/brand/betaray/mantas/manta-angle-underside.png",
  small: "/brand/betaray/mantas/manta-angle-small.png",
  far: "/brand/betaray/mantas/manta-angle-far.png",
} as const

export type MantaArtVariant = keyof typeof sources

export function MantaArt({
  variant,
  className,
  alt = "",
  priority = false,
  style,
}: {
  variant: MantaArtVariant
  className?: string
  alt?: string
  priority?: boolean
  style?: CSSProperties
}) {
  return (
    <img
      src={sources[variant]}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={className}
      style={style}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
    />
  )
}
