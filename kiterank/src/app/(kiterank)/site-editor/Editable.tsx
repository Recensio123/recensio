'use client'

export function E({
  value,
  onChange,
  multiline = false,
  className = '',
  style,
}: {
  value:      string
  onChange:   (v: string) => void
  multiline?: boolean
  className?: string
  style?:     React.CSSProperties
}) {
  const Tag = multiline ? 'div' : 'span'

  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      title="Click to edit"
      onKeyDown={e => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).blur()
        }
      }}
      onPaste={e => {
        e.preventDefault()
        const text = e.clipboardData?.getData('text/plain') ?? ''
        document.execCommand('insertText', false, text)
      }}
      onFocus={e => {
        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(147,197,253,0.5)'
        e.currentTarget.style.borderRadius = '3px'
      }}
      onBlur={e => {
        e.currentTarget.style.boxShadow = ''
        e.currentTarget.style.borderRadius = ''
        const text = (e.currentTarget as HTMLElement).innerText?.trim() ?? ''
        onChange(text || value)
      }}
      style={style}
      className={`cursor-text outline-none ${className}`}
    >
      {value}
    </Tag>
  )
}
