"use client"

import { useState, useRef, useEffect } from "react"
import { Icon } from "./Icon"

interface Option {
  value: string
  label: string
  disabled?: boolean
}

interface SelectFieldProps {
  name: string
  options: Option[]
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  required?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function SelectField({
  name,
  options,
  defaultValue = "",
  value: controlledValue,
  onChange,
  required,
  disabled,
  placeholder,
  className = "",
}: SelectFieldProps) {
  const isControlled = controlledValue !== undefined
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const selected = isControlled ? controlledValue : internalValue
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const activeOption = options.find((o) => o.value === selected)
  const displayLabel = activeOption?.label ?? placeholder ?? "Seleccionar"
  const isPlaceholder = !activeOption

  function pick(val: string) {
    if (!isControlled) setInternalValue(val)
    onChange?.(val)
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selected} required={required} />

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`
          w-full flex items-center justify-between gap-2
          px-[13px] py-[9px] rounded-lg border text-sm text-left
          transition-colors
          ${disabled ? "bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed border-[#E2E8F0]" : "bg-white cursor-pointer border-[#CBD5E1] hover:border-[#1E3A6E]"}
          ${open ? "border-[#1E3A6E] ring-2 ring-[#1E3A6E] ring-offset-0" : ""}
          ${isPlaceholder ? "text-[#94A3B8]" : "text-[#0F1720]"}
        `}
      >
        <span className="truncate">{displayLabel}</span>
        <Icon
          name="expand_more"
          size={18}
          className={`shrink-0 text-[#7C8CA0] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-lg"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => !opt.disabled && pick(opt.value)}
              className={`
                w-full px-[13px] py-[8px] text-left text-sm transition-colors
                ${opt.disabled ? "text-[#94A3B8] cursor-not-allowed" : "text-[#0F1720] hover:bg-[#E8EEFB] hover:text-[#1E3A6E] cursor-pointer"}
                ${opt.value === selected ? "bg-[#E8EEFB] text-[#1E3A6E] font-medium" : ""}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
