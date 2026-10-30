export function Icon({
  name,
  size = 19,
  className = "",
  style,
}: {
  name: string
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      className={`material-symbols-outlined leading-none ${className}`}
      style={{ fontSize: size, ...style }}
      aria-hidden
    >
      {name}
    </span>
  )
}
