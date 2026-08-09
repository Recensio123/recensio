'use client'
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTooltips } from './TooltipProvider'

interface TooltipProps {
  text: string
  children: React.ReactNode
}

/**
 * Wrap any inline element. After the mouse rests briefly a floating
 * explanation card appears near the cursor. Disappears immediately on mouse-out.
 * Can be disabled globally from Settings.
 */
const SHOW_DELAY_MS = 600
export function Tooltip({ text, children }: TooltipProps) {
  const { enabled } = useTooltips()
  const [show, setShow]     = useState(false)
  const [pos,  setPos]      = useState({ x: 0, y: 0 })
  const timerRef            = useRef<ReturnType<typeof setTimeout> | null>(null)
  const posRef              = useRef({ x: 0, y: 0 })

  if (!enabled) return <>{children}</>

  function onEnter(e: React.MouseEvent) {
    posRef.current = { x: e.clientX, y: e.clientY }
    timerRef.current = setTimeout(() => {
      setPos({ ...posRef.current })
      setShow(true)
    }, SHOW_DELAY_MS)
  }

  function onMove(e: React.MouseEvent) {
    posRef.current = { x: e.clientX, y: e.clientY }
    // keep position fresh so tooltip follows cursor while waiting
  }

  function onLeave() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setShow(false)
  }

  return (
    <span
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ display: 'contents' }}
    >
      {children}
      {show && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: pos.x + 14, top: pos.y + 14 }}
        >
          <div className="bg-navy-950 border border-navy-600 rounded-xl px-3 py-2.5 shadow-2xl max-w-[220px]">
            <p className="text-xs text-slate-200 leading-relaxed">{text}</p>
          </div>
        </div>,
        document.body
      )}
    </span>
  )
}
