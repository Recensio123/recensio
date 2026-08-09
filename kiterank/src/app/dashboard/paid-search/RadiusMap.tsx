'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/*
 * The ad-targeting radius on a real map — the campaign builder shows the
 * customer exactly which area their budget will cover. Loaded with ssr:false
 * (Leaflet needs window), so this module is browser-only by contract.
 */

export default function RadiusMap({ lat, lng, radiusKm }: { lat: number; lng: number; radiusKm: number }) {
  const holder = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const circleRef = useRef<L.Circle | null>(null)

  useEffect(() => {
    if (!holder.current || mapRef.current) return
    const map = L.map(holder.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    })
    // CARTO's light tiles keep the dashboard aesthetic; attribution per their terms
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style="color:#666">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer" style="color:#666">CARTO</a>',
    }).addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; circleRef.current = null }
  }, [])

  // Re-center and redraw whenever the chosen point or radius changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    circleRef.current?.remove()
    const circle = L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: '#eab308',
      weight: 2,
      fillColor: '#eab308',
      fillOpacity: 0.12,
    }).addTo(map)
    circleRef.current = circle
    map.fitBounds(circle.getBounds(), { padding: [16, 16] })
  }, [lat, lng, radiusKm])

  return <div ref={holder} className="w-full rounded-xl overflow-hidden border border-navy-700" style={{ height: 224 }} />
}
