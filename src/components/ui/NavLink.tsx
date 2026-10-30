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
      className={`flex items-center justify-between gap-[11px] rounded-[7px] px-3 py-2 text-[13.5px] transition-colors ${
        isActive
          ? "bg-[#1E3A6E] text-white font-semibold"
          : "text-[#334155] hover:bg-[#F1F5F9]"
      }`}
    >
      <span className="flex items-center gap-[11px] min-w-0">
        <Icon
          name={icon}
          size={19}
          className={isActive ? "text-white" : "text-[#7C8CA0]"}
        />
        <span className="truncate">{label}</span>
      </span>
      {badge != null && badge > 0 && (
        <span className="shrink-0 font-mono text-[11px] bg-[#FEF3C7] text-[#B45309] rounded px-1.5 py-px">
          {badge}
        </span>
      )}
    </Link>
  )
}
