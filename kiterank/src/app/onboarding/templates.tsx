// Template system: 10 options per industry
// Colors capture the *feeling* of the industry — not the tools of the trade.

export type Layout =
  | 'centered' | 'split' | 'editorial' | 'heritage' | 'luxury'
  | 'showcase' | 'direct' | 'compact' | 'magazine' | 'team'

export type TemplateColors = {
  bg:  string   // page background
  nav: string   // navigation bar
  h:   string   // heading / primary text
  a:   string   // accent: buttons, highlights
  s:   string   // secondary / subtitle text
  b:   string   // block / card fill
}

export type Template = {
  id:      string
  name:    string
  tagline: string
  layout:  Layout
  colors:  TemplateColors
}

/* ── SVG thumbnail layouts ──────────────────────────────────────────────────
   Five distinct structures. Colors are swapped in per template.
   All thumbnails: viewBox 0 0 180 116
─────────────────────────────────────────────────────────────────────────── */

type TP = { c: TemplateColors; active: boolean }

function Centered({ c, active }: TP) {
  return (
    <svg viewBox="0 0 180 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="116" fill={c.bg}/>
      <rect width="180" height="18" fill={c.nav}/>
      <rect x="10" y="6"  width="22" height="6"  rx="1" fill={c.h} fillOpacity="0.9"/>
      <rect x="118" y="8" width="14" height="3"  rx="1" fill={c.s} fillOpacity="0.6"/>
      <rect x="136" y="8" width="14" height="3"  rx="1" fill={c.s} fillOpacity="0.6"/>
      <rect x="154" y="5" width="16" height="8"  rx="4" fill={c.a}/>
      <rect x="38"  y="30" width="104" height="9"  rx="1" fill={c.h}/>
      <rect x="55"  y="45" width="70"  height="3"  rx="1" fill={c.s} fillOpacity="0.7"/>
      <rect x="68"  y="53" width="44"  height="10" rx="5" fill={c.a}/>
      <rect x="8"   y="76" width="50"  height="32" rx="4" fill={c.b}/>
      <rect x="65"  y="76" width="50"  height="32" rx="4" fill={c.b}/>
      <rect x="122" y="76" width="50"  height="32" rx="4" fill={c.b}/>
      {active && <rect width="180" height="116" stroke="#f59e0b" strokeWidth="3" fill="none"/>}
    </svg>
  )
}

function Split({ c, active }: TP) {
  return (
    <svg viewBox="0 0 180 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="116" fill={c.bg}/>
      <rect width="180" height="18" fill={c.nav}/>
      <rect x="10" y="6"  width="22" height="6"  rx="1" fill={c.h} fillOpacity="0.9"/>
      <rect x="130" y="8" width="12" height="3"  rx="1" fill={c.s} fillOpacity="0.6"/>
      <rect x="146" y="8" width="12" height="3"  rx="1" fill={c.s} fillOpacity="0.6"/>
      <rect x="8"   y="28" width="82" height="9"  rx="1" fill={c.h}/>
      <rect x="8"   y="43" width="70" height="3"  rx="1" fill={c.h}/>
      <rect x="8"   y="50" width="60" height="3"  rx="1" fill={c.s} fillOpacity="0.6"/>
      <rect x="8"   y="60" width="38" height="10" rx="5" fill={c.a}/>
      <rect x="98"  y="22" width="74" height="86" rx="6" fill={c.b}/>
      <rect x="108" y="32" width="54" height="36" rx="4" fill={c.a} fillOpacity="0.12"/>
      {active && <rect width="180" height="116" stroke="#f59e0b" strokeWidth="3" fill="none"/>}
    </svg>
  )
}

function Editorial({ c, active }: TP) {
  return (
    <svg viewBox="0 0 180 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="116" fill={c.bg}/>
      <rect width="180" height="16" fill={c.nav}/>
      <rect x="8"  y="5"  width="20" height="6" rx="0" fill={c.a}/>
      <rect x="148" y="6" width="22" height="4" rx="0" fill={c.s} fillOpacity="0.5"/>
      <rect x="8"  y="26" width="164" height="13" rx="0" fill={c.h}/>
      <rect x="8"  y="45" width="124" height="13" rx="0" fill={c.h}/>
      <rect x="8"  y="64" width="90"  height="3"  rx="0" fill={c.s} fillOpacity="0.6"/>
      <rect x="8"  y="71" width="130" height="3"  rx="0" fill={c.s} fillOpacity="0.3"/>
      <rect x="8"  y="84" width="44"  height="12" rx="0" fill={c.a}/>
      <rect x="60" y="84" width="44"  height="12" rx="0" fill={c.h} fillOpacity="0.1"/>
      {active && <rect width="180" height="116" stroke="#f59e0b" strokeWidth="3" fill="none"/>}
    </svg>
  )
}

function Heritage({ c, active }: TP) {
  return (
    <svg viewBox="0 0 180 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="116" fill={c.bg}/>
      <rect width="180" height="20" fill={c.nav}/>
      <rect x="75" y="6"  width="30"  height="8"  rx="1" fill={c.a} fillOpacity="0.85"/>
      <rect x="16" y="9"  width="12"  height="3"  rx="1" fill={c.nav === c.bg ? c.h : '#ffffff'} fillOpacity="0.7"/>
      <rect x="32" y="9"  width="12"  height="3"  rx="1" fill={c.nav === c.bg ? c.h : '#ffffff'} fillOpacity="0.7"/>
      <rect width="180" height="1" y="20" fill={c.h} fillOpacity="0.08"/>
      <rect y="20" width="180" height="40" fill={c.b}/>
      <rect x="50" y="30" width="80" height="7" rx="1" fill={c.h}/>
      <rect x="62" y="42" width="56" height="3" rx="1" fill={c.s} fillOpacity="0.7"/>
      <rect x="8"  y="68" width="78"  height="40" rx="4" fill={c.b}/>
      <rect x="94" y="68" width="78"  height="40" rx="4" fill={c.b}/>
      <rect x="16" y="76" width="40" height="4" rx="1" fill={c.h} fillOpacity="0.7"/>
      <rect x="16" y="84" width="30" height="2.5" rx="1" fill={c.s} fillOpacity="0.5"/>
      <rect x="102" y="76" width="40" height="4" rx="1" fill={c.h} fillOpacity="0.7"/>
      <rect x="102" y="84" width="30" height="2.5" rx="1" fill={c.s} fillOpacity="0.5"/>
      {active && <rect width="180" height="116" stroke="#f59e0b" strokeWidth="3" fill="none"/>}
    </svg>
  )
}

function Luxury({ c, active }: TP) {
  return (
    <svg viewBox="0 0 180 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="116" fill={c.bg}/>
      <rect width="180" height="18" fill={c.bg}/>
      <rect x="78" y="6" width="24" height="7" rx="0" fill={c.h} fillOpacity="0.9"/>
      <rect x="12" y="9" width="10" height="2" rx="0" fill={c.s} fillOpacity="0.4"/>
      <rect x="26" y="9" width="10" height="2" rx="0" fill={c.s} fillOpacity="0.4"/>
      <rect x="142" y="9" width="10" height="2" rx="0" fill={c.s} fillOpacity="0.4"/>
      <rect x="156" y="9" width="12" height="2" rx="0" fill={c.s} fillOpacity="0.4"/>
      <line x1="0" y1="20" x2="180" y2="20" stroke={c.a} strokeWidth="0.6"/>
      <rect x="52" y="30" width="76" height="4" rx="0" fill={c.s} fillOpacity="0.5"/>
      <rect x="20" y="40" width="140" height="10" rx="0" fill={c.h}/>
      <rect x="45" y="56" width="90"  height="2"  rx="0" fill={c.s} fillOpacity="0.4"/>
      <rect x="64" y="64" width="52"  height="12" rx="0" fill="none" stroke={c.a} strokeWidth="1"/>
      <rect x="69" y="68" width="42"  height="4"  rx="0" fill={c.a} fillOpacity="0.6"/>
      <line x1="0" y1="86" x2="180" y2="86" stroke={c.a} strokeWidth="0.4"/>
      <rect x="55" y="92" width="70" height="3" rx="0" fill={c.s} fillOpacity="0.3"/>
      <rect x="72" y="99" width="36" height="2.5" rx="0" fill={c.s} fillOpacity="0.2"/>
      {active && <rect width="180" height="116" stroke="#f59e0b" strokeWidth="3" fill="none"/>}
    </svg>
  )
}

function Showcase({ c, active }: TP) {
  return (
    <svg viewBox="0 0 180 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="116" fill={c.bg}/>
      {/* photo mosaic covering the hero */}
      <rect x="0"   y="0" width="59" height="44" fill={c.a} fillOpacity="0.35"/>
      <rect x="61"  y="0" width="58" height="44" fill={c.b}/>
      <rect x="121" y="0" width="59" height="44" fill={c.a} fillOpacity="0.2"/>
      <rect x="0"   y="46" width="59" height="34" fill={c.b}/>
      <rect x="61"  y="46" width="58" height="34" fill={c.a} fillOpacity="0.28"/>
      <rect x="121" y="46" width="59" height="34" fill={c.b}/>
      <rect x="0" y="0" width="180" height="80" fill="#000000" fillOpacity="0.35"/>
      <rect x="45" y="30" width="90" height="9" rx="1" fill="#ffffff"/>
      <rect x="66" y="46" width="48" height="10" rx="5" fill={c.a}/>
      <rect x="20" y="92" width="40" height="4" rx="1" fill={c.h} fillOpacity="0.7"/>
      <rect x="70" y="92" width="40" height="4" rx="1" fill={c.h} fillOpacity="0.7"/>
      <rect x="120" y="92" width="40" height="4" rx="1" fill={c.h} fillOpacity="0.7"/>
      {active && <rect width="180" height="116" stroke="#f59e0b" strokeWidth="3" fill="none"/>}
    </svg>
  )
}

function Direct({ c, active }: TP) {
  return (
    <svg viewBox="0 0 180 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="116" fill={c.bg}/>
      <rect width="180" height="14" fill={c.nav}/>
      <rect x="8" y="5" width="20" height="4" rx="1" fill={c.h} fillOpacity="0.9"/>
      <rect x="152" y="4" width="20" height="7" rx="3" fill={c.a}/>
      {/* left: headline + phone */}
      <rect x="12" y="30" width="66" height="8" rx="1" fill={c.h}/>
      <rect x="12" y="42" width="58" height="3" rx="1" fill={c.s} fillOpacity="0.6"/>
      <rect x="12" y="48" width="50" height="3" rx="1" fill={c.s} fillOpacity="0.6"/>
      <rect x="12" y="58" width="34" height="6" rx="1" fill={c.a}/>
      {/* right: booking card with price rows */}
      <rect x="94" y="24" width="74" height="70" rx="5" fill={c.b}/>
      {[32, 41, 50, 59].map(y => (
        <g key={y}>
          <rect x="100" y={y} width="34" height="3" rx="1" fill={c.h} fillOpacity="0.8"/>
          <rect x="146" y={y} width="16" height="3" rx="1" fill={c.a}/>
        </g>
      ))}
      <rect x="100" y="72" width="62" height="12" rx="4" fill={c.a}/>
      {active && <rect width="180" height="116" stroke="#f59e0b" strokeWidth="3" fill="none"/>}
    </svg>
  )
}

function Compact({ c, active }: TP) {
  return (
    <svg viewBox="0 0 180 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="116" fill={c.bg}/>
      <rect x="55" y="22" width="70" height="9" rx="1" fill={c.h}/>
      <rect x="70" y="37" width="40" height="3" rx="1" fill={c.a} fillOpacity="0.8"/>
      <rect x="82" y="46" width="16" height="2" rx="1" fill={c.a}/>
      <rect x="58" y="54" width="64" height="3" rx="1" fill={c.s} fillOpacity="0.6"/>
      <rect x="34" y="66" width="36" height="11" rx="5" fill={c.a}/>
      <rect x="74" y="66" width="32" height="11" rx="5" fill="none" stroke={c.s} strokeWidth="1"/>
      <rect x="110" y="66" width="36" height="11" rx="5" fill="none" stroke={c.s} strokeWidth="1"/>
      <rect x="48" y="88" width="52" height="3" rx="1" fill={c.h} fillOpacity="0.7"/>
      <rect x="116" y="88" width="16" height="3" rx="1" fill={c.a}/>
      <rect x="48" y="96" width="46" height="3" rx="1" fill={c.h} fillOpacity="0.7"/>
      <rect x="116" y="96" width="16" height="3" rx="1" fill={c.a}/>
      {active && <rect width="180" height="116" stroke="#f59e0b" strokeWidth="3" fill="none"/>}
    </svg>
  )
}

function Magazine({ c, active }: TP) {
  return (
    <svg viewBox="0 0 180 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="116" fill={c.bg}/>
      {/* masthead */}
      <rect x="55" y="8" width="70" height="10" rx="1" fill={c.h}/>
      <line x1="10" y1="24" x2="170" y2="24" stroke={c.h} strokeWidth="1.5"/>
      <rect x="52" y="28" width="16" height="2.5" rx="1" fill={c.s} fillOpacity="0.6"/>
      <rect x="76" y="28" width="16" height="2.5" rx="1" fill={c.s} fillOpacity="0.6"/>
      <rect x="100" y="28" width="16" height="2.5" rx="1" fill={c.s} fillOpacity="0.6"/>
      {/* lead story + side column */}
      <rect x="10" y="38" width="102" height="44" fill={c.a} fillOpacity="0.25"/>
      <rect x="10" y="88" width="80" height="6" rx="1" fill={c.h}/>
      <rect x="10" y="98" width="96" height="3" rx="1" fill={c.s} fillOpacity="0.6"/>
      <line x1="120" y1="38" x2="120" y2="104" stroke={c.s} strokeOpacity="0.3"/>
      {[40, 58, 76, 94].map(y => (
        <g key={y}>
          <rect x="128" y={y} width="14" height="2" rx="1" fill={c.a}/>
          <rect x="128" y={y + 5} width="42" height="4" rx="1" fill={c.h} fillOpacity="0.85"/>
        </g>
      ))}
      {active && <rect width="180" height="116" stroke="#f59e0b" strokeWidth="3" fill="none"/>}
    </svg>
  )
}

function TeamThumb({ c, active }: TP) {
  return (
    <svg viewBox="0 0 180 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="116" fill={c.bg}/>
      <rect width="180" height="14" fill={c.nav}/>
      <rect x="8" y="5" width="20" height="4" rx="1" fill={c.h} fillOpacity="0.9"/>
      <rect x="60" y="22" width="60" height="6" rx="1" fill={c.h}/>
      {[22, 74, 126].map(x => (
        <g key={x}>
          <rect x={x} y="36" width="32" height="52" rx="4" fill={c.b}/>
          <circle cx={x + 16} cy="50" r="9" fill={c.a} fillOpacity="0.45"/>
          <rect x={x + 7} y="64" width="18" height="3" rx="1" fill={c.h} fillOpacity="0.85"/>
          <rect x={x + 9} y="70" width="14" height="2" rx="1" fill={c.s} fillOpacity="0.6"/>
          <rect x={x + 6} y="76" width="20" height="7" rx="3" fill="none" stroke={c.a} strokeWidth="1"/>
        </g>
      ))}
      <rect x="55" y="98" width="70" height="4" rx="1" fill={c.s} fillOpacity="0.4"/>
      {active && <rect width="180" height="116" stroke="#f59e0b" strokeWidth="3" fill="none"/>}
    </svg>
  )
}

export function TemplateThumbnail({ template, active }: { template: Template; active: boolean }) {
  const props = { c: template.colors, active }
  switch (template.layout) {
    case 'centered':  return <Centered  {...props}/>
    case 'split':     return <Split     {...props}/>
    case 'editorial': return <Editorial {...props}/>
    case 'heritage':  return <Heritage  {...props}/>
    case 'luxury':    return <Luxury    {...props}/>
    case 'showcase':  return <Showcase  {...props}/>
    case 'direct':    return <Direct    {...props}/>
    case 'compact':   return <Compact   {...props}/>
    case 'magazine':  return <Magazine  {...props}/>
    case 'team':      return <TeamThumb {...props}/>
  }
}

/* ── Template data ──────────────────────────────────────────────────────────
   10 per industry. Design rules:
   - Feel and structure appropriate for the industry, zero literal iconography
   - Wide spread: light/dark, minimal/ornate, modern/classic, feminine/masculine
─────────────────────────────────────────────────────────────────────────── */

/* One template per layout. Palettes are the customer's own controls now, so a
   template earns its card by STRUCTURE — the retired color twins live on as
   ready-made palettes in PALETTE_PRESETS below. */
const salon: Template[] = [
  { id:'s-atelier',  name:'Atelier',   tagline:'Exklusiv & editorial',      layout:'luxury',    colors:{ bg:'#0d0d0d', nav:'#0d0d0d', h:'#ffffff', a:'#c9a96e', s:'#888888', b:'#1a1a1a' } },
  { id:'s-studio',   name:'Studio',    tagline:'Modern & luftig',            layout:'centered',  colors:{ bg:'#f5f5f5', nav:'#ffffff', h:'#111111', a:'#111111', s:'#888888', b:'#e8e8e8' } },
  { id:'s-barber',   name:'Barber',    tagline:'Klassisk & maskulin',        layout:'heritage',  colors:{ bg:'#f5f0e8', nav:'#2d4a2d', h:'#1a2e1a', a:'#c8a96e', s:'#5a4a3a', b:'#ede5d8' } },
  { id:'s-urban',    name:'Urban',     tagline:'Skarp & modern',             layout:'editorial', colors:{ bg:'#111111', nav:'#111111', h:'#ffffff', a:'#e03030', s:'#666666', b:'#1e1e1e' } },
  { id:'s-nordic',   name:'Nordic',    tagline:'Skandinavisk minimalism',    layout:'split',     colors:{ bg:'#f8f8f6', nav:'#f8f8f6', h:'#1a1a1a', a:'#1a1a1a', s:'#777777', b:'#eeede9' } },
]

const spa: Template[] = [
  { id:'sp-serenity', name:'Serenity', tagline:'Stilla & harmonisk',         layout:'centered',  colors:{ bg:'#f8faf6', nav:'#ffffff', h:'#2a3a2a', a:'#7a9a6a', s:'#8a9a80', b:'#edf2ea' } },
  { id:'sp-stone',    name:'Stone',    tagline:'Jordig & naturlig',           layout:'split',     colors:{ bg:'#f5f0e8', nav:'#f5f0e8', h:'#2a2520', a:'#8a6a50', s:'#7a6a58', b:'#ede5d8' } },
  { id:'sp-forest',   name:'Forest',   tagline:'Djup & återhämtande',        layout:'luxury',    colors:{ bg:'#0f1f0f', nav:'#0f1f0f', h:'#ffffff', a:'#8ab87a', s:'#5a7a5a', b:'#162016' } },
  { id:'sp-blossom',  name:'Blossom',  tagline:'Blommig & delikat',          layout:'editorial', colors:{ bg:'#faf8ff', nav:'#ffffff', h:'#2a1a3a', a:'#8a70b8', s:'#8a80a0', b:'#f0ecfa' } },
  { id:'sp-clay',     name:'Clay',     tagline:'Varm & hantverk',            layout:'heritage',  colors:{ bg:'#faf5f0', nav:'#c8704a', h:'#2a1a10', a:'#c8704a', s:'#8a6050', b:'#f2e8e0' } },
]

const restaurant: Template[] = [
  { id:'r-brasserie', name:'Brasserie', tagline:'Klassisk & stämningsfull',  layout:'heritage',  colors:{ bg:'#1a0f0a', nav:'#1a0f0a', h:'#ffffff', a:'#d4891a', s:'#aa8a6a', b:'#251510' } },
  { id:'r-light',     name:'Fresh',     tagline:'Ljus & inbjudande',          layout:'centered',  colors:{ bg:'#fefefe', nav:'#ffffff', h:'#111111', a:'#2a7a4a', s:'#666666', b:'#f2f2f2' } },
  { id:'r-blackgold', name:'Prestige',  tagline:'Mörk & glamourös',           layout:'luxury',    colors:{ bg:'#0a0806', nav:'#0a0806', h:'#ffffff', a:'#c9a044', s:'#7a6a4a', b:'#140f08' } },
  { id:'r-coastal',   name:'Coastal',   tagline:'Ljus & havsnära',            layout:'split',     colors:{ bg:'#f8fbff', nav:'#ffffff', h:'#1a2a3a', a:'#2a6aaa', s:'#6a8aaa', b:'#eaf2fa' } },
  { id:'r-modern',    name:'Modern',    tagline:'Skarp & samtida',            layout:'editorial', colors:{ bg:'#fdfdfd', nav:'#fdfdfd', h:'#0a0a0a', a:'#e63030', s:'#666666', b:'#f5f5f5' } },
]

const beauty: Template[] = [
  { id:'b-pearl',    name:'Pearl',     tagline:'Mjuk & delikat',             layout:'centered',  colors:{ bg:'#fdfbfa', nav:'#ffffff', h:'#2a2030', a:'#c87090', s:'#9a8090', b:'#f8f2f5' } },
  { id:'b-rosegold', name:'Rose Gold', tagline:'Lyxig & feminin',            layout:'luxury',    colors:{ bg:'#1a0f14', nav:'#1a0f14', h:'#ffffff', a:'#c8907a', s:'#8a6070', b:'#241520' } },
  { id:'b-clean',    name:'Studio',    tagline:'Ren & professionell',        layout:'editorial', colors:{ bg:'#fdfdfd', nav:'#fdfdfd', h:'#0a0a0a', a:'#0a0a0a', s:'#666666', b:'#f5f5f5' } },
  { id:'b-glow',     name:'Glow',      tagline:'Varm & inbjudande',          layout:'split',     colors:{ bg:'#fff9f0', nav:'#ffffff', h:'#2a1a0a', a:'#e0a050', s:'#8a7060', b:'#f8f0e0' } },
  { id:'b-plum',     name:'Plum',      tagline:'Djup & sofistikerad',        layout:'heritage',  colors:{ bg:'#0e0814', nav:'#0e0814', h:'#ffffff', a:'#c090e0', s:'#6a508a', b:'#160e1e' } },
]

const fitness: Template[] = [
  { id:'f-energy',   name:'Energy',    tagline:'Kraftfull & modig',          layout:'editorial', colors:{ bg:'#0a0a0a', nav:'#111111', h:'#ffffff', a:'#ff6020', s:'#666666', b:'#181818' } },
  { id:'f-clean',    name:'Form',      tagline:'Ren & disciplinerad',        layout:'centered',  colors:{ bg:'#f8f8f8', nav:'#ffffff', h:'#111111', a:'#111111', s:'#666666', b:'#eeeeee' } },
  { id:'f-power',    name:'Power',     tagline:'Mörk & fokuserad',           layout:'luxury',    colors:{ bg:'#0f0f08', nav:'#0f0f08', h:'#ffffff', a:'#d4b020', s:'#6a6040', b:'#181808' } },
  { id:'f-navy',     name:'Team',      tagline:'Sammanhållen & seriös',      layout:'split',     colors:{ bg:'#f0f5ff', nav:'#0a1a3a', h:'#0a1a3a', a:'#e03030', s:'#3a4a6a', b:'#e5eafa' } },
  { id:'f-white',    name:'Flow',      tagline:'Lugn & meditativ',           layout:'heritage',  colors:{ bg:'#ffffff', nav:'#ffffff', h:'#0a0a0a', a:'#0a0a0a', s:'#888888', b:'#f5f5f5' } },
]

const craftsman: Template[] = [
  { id:'cr-trust',   name:'Trust',     tagline:'Klassisk & pålitlig',        layout:'heritage',  colors:{ bg:'#f0f2f8', nav:'#0a1a3a', h:'#0a1a3a', a:'#d4891a', s:'#3a4a6a', b:'#e5e8f5' } },
  { id:'cr-steel',   name:'Steel',     tagline:'Industriell & skarp',        layout:'editorial', colors:{ bg:'#0f1418', nav:'#141820', h:'#ffffff', a:'#e07a20', s:'#607080', b:'#181c22' } },
  { id:'cr-craft',   name:'Craft',     tagline:'Varm & hantverksmässig',     layout:'centered',  colors:{ bg:'#f8f3ec', nav:'#3a2010', h:'#2a1508', a:'#c86020', s:'#7a5a3a', b:'#f0e8d8' } },
  { id:'cr-nordic',  name:'Nordic',    tagline:'Skandinavisk & stilren',     layout:'split',     colors:{ bg:'#f8f8f6', nav:'#f8f8f6', h:'#1a1a1a', a:'#3060a0', s:'#5a5a5a', b:'#eeeeea' } },
  { id:'cr-stone',   name:'Foundation',tagline:'Gedigen & solid',            layout:'luxury',    colors:{ bg:'#f5f2ee', nav:'#3a3530', h:'#1a1510', a:'#8a7560', s:'#6a5f55', b:'#ece8e2' } },
]

const cleaning: Template[] = [
  { id:'cl-fresh',   name:'Fresh',     tagline:'Ren & fräsch',               layout:'centered',  colors:{ bg:'#f5fbff', nav:'#ffffff', h:'#0a1a2a', a:'#1a8acc', s:'#4a7a9a', b:'#e5f2fb' } },
  { id:'cl-pro',     name:'Pro',       tagline:'Professionell & pålitlig',   layout:'split',     colors:{ bg:'#f8fafc', nav:'#ffffff', h:'#0a1520', a:'#0a6080', s:'#4a6070', b:'#e8f0f5' } },
  { id:'cl-trust',   name:'Trust',     tagline:'Trygg & noggrann',           layout:'heritage',  colors:{ bg:'#f8f8fa', nav:'#1a2a4a', h:'#1a2a4a', a:'#4a8acc', s:'#3a4a6a', b:'#eeeff5' } },
  { id:'cl-bold',    name:'Bold',      tagline:'Tydlig & modern',            layout:'editorial', colors:{ bg:'#ffffff', nav:'#ffffff', h:'#0a0a0a', a:'#0060cc', s:'#555555', b:'#f0f4f8' } },
  { id:'cl-lux',     name:'Premium',   tagline:'Exklusiv städservice',       layout:'luxury',    colors:{ bg:'#080a0c', nav:'#080a0c', h:'#ffffff', a:'#88ccee', s:'#446677', b:'#0e1218' } },
]

const other: Template[] = [
  { id:'o-white',    name:'Blank',     tagline:'Universell & neutral',       layout:'centered',  colors:{ bg:'#ffffff', nav:'#ffffff', h:'#111111', a:'#111111', s:'#888888', b:'#f5f5f5' } },
  { id:'o-dark',     name:'Onyx',      tagline:'Mörk & modern',              layout:'editorial', colors:{ bg:'#0a0a0a', nav:'#111111', h:'#ffffff', a:'#ffffff', s:'#666666', b:'#181818' } },
  { id:'o-warm',     name:'Warm',      tagline:'Varm & välkomnande',         layout:'split',     colors:{ bg:'#faf7f2', nav:'#ffffff', h:'#2a1a0a', a:'#c87030', s:'#8a7060', b:'#f2ece0' } },
  { id:'o-navy',     name:'Classic',   tagline:'Klassisk & trygg',           layout:'heritage',  colors:{ bg:'#f5f7ff', nav:'#0a1a3a', h:'#0a1a3a', a:'#1a5aaa', s:'#3a4a6a', b:'#e5eafa' } },
  { id:'o-gold',     name:'Prestige',  tagline:'Lyxig & exklusiv',           layout:'luxury',    colors:{ bg:'#080608', nav:'#080608', h:'#ffffff', a:'#c9a030', s:'#6a5a30', b:'#120f08' } },
]

/* The five newer compositions, offered to every industry. The structure is
   the theme — the accent just gives each industry a sensible starting hue. */
function newCompositions(prefix: string, accent: string, darkAccent: string): Template[] {
  return [
    { id:`${prefix}-showcase`, name:'Showcase', tagline:'Bilderna först',           layout:'showcase', colors:{ bg:'#0e0e10', nav:'#0e0e10', h:'#ffffff', a:accent,     s:'#8a8a8a', b:'#17171a' } },
    { id:`${prefix}-direkt`,   name:'Direkt',   tagline:'Bokningen över allt annat', layout:'direct',   colors:{ bg:'#ffffff', nav:'#ffffff', h:'#111111', a:darkAccent, s:'#666666', b:'#f4f4f2' } },
    { id:`${prefix}-kompakt`,  name:'Kompakt',  tagline:'Allt på en skärm',          layout:'compact',  colors:{ bg:'#f7f6f3', nav:'#f7f6f3', h:'#141414', a:darkAccent, s:'#707070', b:'#ecebe7' } },
    { id:`${prefix}-magasin`,  name:'Magasin',  tagline:'Artiklarna i framsätet',    layout:'magazine', colors:{ bg:'#fdfdfb', nav:'#fdfdfb', h:'#0d0d0d', a:darkAccent, s:'#606060', b:'#f2f1ec' } },
    { id:`${prefix}-team`,     name:'Team',     tagline:'Personerna i centrum',      layout:'team',     colors:{ bg:'#faf7f2', nav:'#ffffff', h:'#241a12', a:darkAccent, s:'#7a6a5c', b:'#f0e9df' } },
  ]
}

export const TEMPLATES_BY_INDUSTRY: Record<string, Template[]> = {
  salon:      [...salon,      ...newCompositions('s2',  '#c9a96e', '#a4762e')],
  spa:        [...spa,        ...newCompositions('sp2', '#8ab87a', '#4a7a3a')],
  restaurant: [...restaurant, ...newCompositions('r2',  '#d4891a', '#b05a1a')],
  beauty:     [...beauty,     ...newCompositions('b2',  '#e0a0c0', '#b05a80')],
  fitness:    [...fitness,    ...newCompositions('f2',  '#ff6020', '#d84a10')],
  craftsman:  [...craftsman,  ...newCompositions('cr2', '#e07a20', '#b05a10')],
  cleaning:   [...cleaning,   ...newCompositions('cl2', '#4ab8ee', '#1a6aaa')],
  other:      [...other,      ...newCompositions('o2',  '#e0b060', '#3a6a8a')],
}

/* ── Ready-made palettes ────────────────────────────────────────────────────
   The retired color-twin templates, reborn as one-click palettes under the
   editor's color controls. A rookie still gets a coherent look in one click;
   the template grid stays honest about what a template actually changes. */

export type PalettePreset = { name: string; colors: TemplateColors }

export const PALETTE_PRESETS: Record<string, PalettePreset[]> = {
  salon: [
    { name: 'Bloom',    colors: { bg:'#fef9f8', nav:'#ffffff', h:'#2d2d2d', a:'#c9847a', s:'#9a8a89', b:'#f8efee' } },
    { name: 'Ember',    colors: { bg:'#faf5ef', nav:'#ffffff', h:'#2a1f1a', a:'#c46a2d', s:'#8a7060', b:'#f2ebe0' } },
    { name: 'Noir',     colors: { bg:'#0a0a0a', nav:'#0a0a0a', h:'#ffffff', a:'#d4af37', s:'#666666', b:'#141414' } },
    { name: 'Fresh',    colors: { bg:'#ffffff', nav:'#ffffff', h:'#111111', a:'#2aa87c', s:'#777777', b:'#f0faf6' } },
    { name: 'Vintage',  colors: { bg:'#fdf6e3', nav:'#4a2040', h:'#2a1020', a:'#8b3a6b', s:'#6a4a58', b:'#f5e8d0' } },
  ],
  spa: [
    { name: 'Mist',     colors: { bg:'#f0f5fa', nav:'#ffffff', h:'#1a2a3a', a:'#4a7aaa', s:'#7a8a9a', b:'#e5eef7' } },
    { name: 'Onyx',     colors: { bg:'#080808', nav:'#080808', h:'#ffffff', a:'#c9a96e', s:'#5a5a5a', b:'#111111' } },
    { name: 'Arctic',   colors: { bg:'#f5f8fc', nav:'#f5f8fc', h:'#0a1a2a', a:'#2a5a8a', s:'#5a7a9a', b:'#e5ecf5' } },
    { name: 'Amber',    colors: { bg:'#fef9ef', nav:'#ffffff', h:'#2a1a0a', a:'#d4891a', s:'#8a7050', b:'#faf0d8' } },
    { name: 'Sage',     colors: { bg:'#f5f8f0', nav:'#ffffff', h:'#2a3020', a:'#6a8a5a', s:'#7a8a70', b:'#eaf0e5' } },
  ],
  restaurant: [
    { name: 'Rustic',   colors: { bg:'#faf3ec', nav:'#5a3a1a', h:'#2a1a0a', a:'#c86a2a', s:'#8a6a4a', b:'#f0e5d5' } },
    { name: 'Garden',   colors: { bg:'#f5faf0', nav:'#ffffff', h:'#1a2a1a', a:'#5a8a4a', s:'#6a8060', b:'#eaf5e5' } },
    { name: 'Midnight', colors: { bg:'#06040e', nav:'#06040e', h:'#ffffff', a:'#a070e0', s:'#5a4a7a', b:'#0e0818' } },
    { name: 'Bistro',   colors: { bg:'#fdf8f5', nav:'#8a1a2a', h:'#2a0a10', a:'#8a1a2a', s:'#6a4a4a', b:'#f5ece8' } },
    { name: 'Scandi',   colors: { bg:'#f9f9f7', nav:'#f9f9f7', h:'#1a1a16', a:'#1a1a16', s:'#7a7a6a', b:'#eeede8' } },
  ],
  beauty: [
    { name: 'Luxe',     colors: { bg:'#0a0610', nav:'#0a0610', h:'#ffffff', a:'#e0a0c0', s:'#6a4a5a', b:'#130a1a' } },
    { name: 'Fresh',    colors: { bg:'#f8fffc', nav:'#ffffff', h:'#0a2020', a:'#1a9a7a', s:'#4a7a6a', b:'#e5f5ef' } },
    { name: 'Violet',   colors: { bg:'#faf8ff', nav:'#ffffff', h:'#1a1030', a:'#7a50c0', s:'#7a70a0', b:'#f0ecfa' } },
    { name: 'Natural',  colors: { bg:'#f8f5ee', nav:'#7a6050', h:'#2a1a10', a:'#7a6050', s:'#8a7060', b:'#f0e8d8' } },
    { name: 'Vivid',    colors: { bg:'#ffffff', nav:'#ffffff', h:'#0a0a0a', a:'#f050a0', s:'#666666', b:'#f8f8f8' } },
  ],
  fitness: [
    { name: 'Vitality', colors: { bg:'#f5fbf5', nav:'#ffffff', h:'#0a200a', a:'#2a8a2a', s:'#4a6a4a', b:'#e5f5e5' } },
    { name: 'Premium',  colors: { bg:'#0a0808', nav:'#0a0808', h:'#ffffff', a:'#c9a030', s:'#7a6a40', b:'#141008' } },
    { name: 'Pulse',    colors: { bg:'#f0f8ff', nav:'#ffffff', h:'#0a1a3a', a:'#1a6aaa', s:'#4a6a8a', b:'#e0f0fa' } },
    { name: 'Rush',     colors: { bg:'#0a0a0a', nav:'#0a0a0a', h:'#ffffff', a:'#a0d020', s:'#5a5a5a', b:'#111111' } },
    { name: 'Zen',      colors: { bg:'#f8f8f5', nav:'#f8f8f5', h:'#2a2a20', a:'#8a8a70', s:'#7a7a68', b:'#efefe8' } },
  ],
  craftsman: [
    { name: 'Modern',   colors: { bg:'#f5f7f8', nav:'#ffffff', h:'#1a2530', a:'#2a6080', s:'#5a6a75', b:'#e8edf0' } },
    { name: 'Pro',      colors: { bg:'#0a1010', nav:'#0a1010', h:'#ffffff', a:'#20a080', s:'#407060', b:'#101a18' } },
    { name: 'Sharp',    colors: { bg:'#0a0a08', nav:'#0a0a08', h:'#ffffff', a:'#f0c820', s:'#5a5a48', b:'#141410' } },
    { name: 'Clean',    colors: { bg:'#ffffff', nav:'#ffffff', h:'#1a1a1a', a:'#1a1a1a', s:'#888888', b:'#f5f5f5' } },
    { name: 'Earth',    colors: { bg:'#f8f3ea', nav:'#6a5040', h:'#2a1a0a', a:'#a0703a', s:'#7a6050', b:'#f0e5d5' } },
  ],
  cleaning: [
    { name: 'Eco',      colors: { bg:'#f5faf5', nav:'#ffffff', h:'#0a200a', a:'#2a8a4a', s:'#4a7a5a', b:'#e5f2e8' } },
    { name: 'Night',    colors: { bg:'#0a0e14', nav:'#0a0e14', h:'#ffffff', a:'#00aaee', s:'#507090', b:'#10161e' } },
    { name: 'Home',     colors: { bg:'#faf8f5', nav:'#ffffff', h:'#2a1a0a', a:'#c87a30', s:'#8a7060', b:'#f2ece0' } },
  ],
  other: [
    { name: 'Nature',   colors: { bg:'#f5faf5', nav:'#ffffff', h:'#0a200a', a:'#3a7a3a', s:'#4a6a4a', b:'#e5f2e5' } },
    { name: 'Blush',    colors: { bg:'#fff9f8', nav:'#ffffff', h:'#2a1520', a:'#c87080', s:'#9a8090', b:'#f8eef2' } },
    { name: 'Solid',    colors: { bg:'#f5f7f8', nav:'#ffffff', h:'#1a2535', a:'#3a6a8a', s:'#5a6a78', b:'#e8edf2' } },
    { name: 'Breeze',   colors: { bg:'#f5fbfa', nav:'#f5fbfa', h:'#0a2020', a:'#1a8a7a', s:'#3a6a65', b:'#e5f5f2' } },
    { name: 'Impact',   colors: { bg:'#0f0f0f', nav:'#0f0f0f', h:'#ffffff', a:'#ffaa00', s:'#666666', b:'#1a1a1a' } },
  ],
}

export function getTemplatesForIndustry(industry: string | null): Template[] {
  return TEMPLATES_BY_INDUSTRY[industry ?? 'other'] ?? other
}
