'use client'

/**
 * A link that leaves the dashboard.
 *
 * `target="_blank"` alone is not enough: some embedded browsers ignore it and
 * navigate in place, which drops the customer out of the dashboard entirely —
 * and coming back with the back button lands on a page that has to reload
 * before it works again. Opening the tab explicitly guarantees the dashboard
 * stays where it was, everywhere.
 *
 * The href is kept on the element so middle-click, right-click and screen
 * readers still behave normally.
 */
export function ExternalLink({
  href,
  className,
  title,
  children,
}: {
  href:       string
  className?: string
  title?:     string
  children:   React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      onClick={e => {
        // Let the browser handle modified clicks (new tab, new window, save)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        const opened = window.open(href, '_blank', 'noopener,noreferrer')
        // If popups are blocked we must still go somewhere — stranding the
        // customer on a link that does nothing is worse than leaving the page.
        if (!opened) window.location.href = href
      }}
    >
      {children}
    </a>
  )
}
