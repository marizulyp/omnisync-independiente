"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon } from "./Icon"

export function NavLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string
  icon: string
  label: string
  badge?: number
}) {
  const pathname = usePathname()
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-[11px] rounded-lg px-3 py-2 text-[13.5px] transition-all ${
        isActive
          ? "bg-emerald-500 text-zinc-950 font-bold shadow-[0_0_20px_-4px_rgba(16,185,129,0.45)]"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
      }`}
    >
      <span className="flex items-center gap-[11px] min-w-0">
        <Icon
          name={icon}
          size={19}
          className={isActive ? "text-zinc-950" : "text-zinc-500"}
        />
        <span className="truncate">{label}</span>
      </span>
      {badge != null && badge > 0 && (
        <span
          className={`shrink-0 font-mono text-[11px] rounded px-1.5 py-px ${
            isActive
              ? "bg-zinc-950/20 text-zinc-950 font-semibold"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}