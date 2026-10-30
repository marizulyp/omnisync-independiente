"use client"

export function DownloadLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className: string
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() =>
        window.dispatchEvent(new CustomEvent("show-toast", { detail: "downloaded" }))
      }
    >
      {children}
    </a>
  )
}
