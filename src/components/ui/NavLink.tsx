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
          ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950 font-bold shadow-[0_0_18px_-4px_rgba(16,185,129,0.45)]"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
      }`}
    >
      <span className="flex items-center gap-[11px] min-w-0">
        <Icon
          name={icon}
          size={19}
          className={isActive ? "text-white dark:text-zinc-950" : "text-slate-400 dark:text-zinc-500"}
        />
        <span className="truncate">{label}</span>
      </span>
      {badge != null && badge > 0 && (
        <span
          className={`shrink-0 font-mono text-[11px] rounded px-1.5 py-px ${
            isActive
              ? "bg-black/15 text-white dark:bg-zinc-950/20 dark:text-zinc-950 font-semibold"
              : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 dark:border dark:border-amber-500/20"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}