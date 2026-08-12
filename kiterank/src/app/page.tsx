import Link from 'next/link'
import { Nav } from '@/components/marketing/Nav'

/*
 * The landing page.
 *
 * The pitch leads with what a small business owner actually wakes up wanting
 * — a finished website — and lets the growth engine be the reason it beats
 * every other website builder: the site arrives pre-filled, built the way
 * Google rewards, and comes with a weekly plan for getting found.
 */

// ─── Website preview mockup ───────────────────────────────────────────────────
// A miniature of what a customer's finished site looks like: filled in,
// polished, bookable. This is the product promise in one picture.

function WebsiteMockup() {
  const rows = [
    { name: 'Klippning & styling',  price: 'från 650 kr' },
    { name: 'Färgning & slingor',   price: 'från 1 200 kr' },
    { name: 'Balayage',             price: 'från 2 200 kr' },
  ]
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-mustard/8 blur-3xl rounded-full scale-90 pointer-events-none" />
      <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
        {/* Browser chrome */}
        <div className="bg-[#111c2e] px-4 py-3 flex items-center gap-3 border-b border-white/5">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 bg-white/5 rounded px-3 py-1 text-[10px] text-white/20 text-center max-w-[180px] mx-auto">
            kiterank.se/s/din-salong
          </div>
        </div>
        {/* The site itself */}
        <div className="bg-[#151210]" style={{ height: 330 }}>
          {/* Site nav */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <span className="text-white text-xs font-bold">Studio Söder</span>
            <div className="flex items-center gap-3">
              {['Tjänster', 'Om oss', 'Artiklar', 'Kontakt'].map(l => (
                <span key={l} className="text-white/35 text-[9px]">{l}</span>
              ))}
              <span className="bg-[#f0b429] text-[#151210] text-[9px] font-bold px-2.5 py-1 rounded">Boka tid</span>
            </div>
          </div>
          {/* Hero */}
          <div className="text-center pt-7 pb-6">
            <p className="text-[#f0b429] text-[8px] tracking-[0.25em] uppercase mb-2">Professionell hårvård</p>
            <p className="text-white text-xl font-bold leading-tight">En upplevelse utöver<br />det vanliga</p>
            <span className="inline-block mt-3 border border-[#f0b429] text-[#f0b429] text-[9px] tracking-widest uppercase px-4 py-1.5">Boka din tid</span>
          </div>
          {/* Price list */}
          <div className="mx-8 border-t border-white/8 pt-3">
            <p className="text-center text-[#f0b429] text-[8px] tracking-[0.25em] uppercase mb-2">Prislista</p>
            {rows.map(r => (
              <div key={r.name} className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-white/75 text-[10px]">{r.name}</span>
                <span className="text-[#f0b429] text-[10px] font-semibold">{r.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* The claim the picture makes, said out loud */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#f0b429] text-[#080f1e] text-xs font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
        Färdig från start — texter, priser och artiklar ifyllda
      </div>
    </div>
  )
}

// ─── Dashboard mockup — the engine behind the site ────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative">
      <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
        <div className="bg-[#111c2e] px-4 py-3 flex items-center gap-3 border-b border-white/5">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 bg-white/5 rounded px-3 py-1 text-[10px] text-white/20 text-center max-w-[180px] mx-auto">
            kiterank.se/dashboard
          </div>
        </div>
        <div className="bg-[#0d1829] flex" style={{ height: 300 }}>
          <div className="w-32 shrink-0 border-r border-white/5 p-3 flex flex-col gap-0.5">
            <p className="text-white text-xs font-bold px-2 py-2 mb-1">Kiterank</p>
            {['Hem', 'Google-profil', 'Synlighet', 'Hemsida', 'Bokningar'].map((item, i) => (
              <div key={item} className={`px-2 py-1.5 rounded text-[10px] ${i === 0 ? 'bg-[#f0b429]/15 text-[#f0b429]' : 'text-white/25'}`}>
                {item}
              </div>
            ))}
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-hidden">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Plats på Google', value: '#2',   sub: '↑ från #4',      color: '#4ade80' },
                { label: 'Omdömen',         value: '4,7★', sub: '31 omdömen',     color: '#f0b429' },
                { label: 'Sidbesök',        value: '+18%', sub: 'denna månad',    color: '#4ade80' },
              ].map(c => (
                <div key={c.label} className="bg-white/5 rounded-lg p-2.5">
                  <p className="text-white/30 text-[8px] uppercase tracking-wide">{c.label}</p>
                  <p className="text-base font-bold leading-tight mt-0.5" style={{ color: c.color }}>{c.value}</p>
                  <p className="text-white/20 text-[8px] mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs font-medium text-white/40 mb-2">Veckans att göra</p>
              <div className="space-y-1.5">
                {[
                  { done: true,  text: 'Publicera ett inlägg på Google-profilen' },
                  { done: false, text: 'Svara på 3 obesvarade omdömen' },
                  { done: false, text: 'Lägg upp foton — 12 under snittet i området' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded flex items-center justify-center shrink-0 text-[7px] ${a.done ? 'bg-green-500/25 text-green-400' : 'border border-white/15'}`}>
                      {a.done ? '✓' : ''}
                    </div>
                    <span className={`text-[10px] ${a.done ? 'text-white/20 line-through' : 'text-white/60'}`}>{a.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[8px] text-white/25 mb-2">Synlighet på Google — 12 veckor</p>
              <div className="flex items-end gap-1" style={{ height: 36 }}>
                {[38, 45, 42, 55, 52, 61, 58, 68, 64, 76, 72, 84].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: `${h * 0.42}px`, backgroundColor: i >= 9 ? '#f0b429' : 'rgba(240,180,41,0.2)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-5 hover:border-white/15 transition-colors">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-white text-sm font-semibold mb-1.5">{title}</h3>
      <p className="text-white/45 text-sm leading-relaxed">{body}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="bg-[#080f1e] text-white min-h-screen">

      <Nav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-20 grid md:grid-cols-2 gap-16 items-center">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 bg-[#f0b429]/10 border border-[#f0b429]/20 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f0b429]" />
            <span className="text-[#f0b429] text-xs font-medium">Hemsida & marknadsföring för salonger och lokala tjänsteföretag</span>
          </div>

          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight">
            En hemsida till<br />din salong. Och<br />
            <span className="text-[#f0b429]">fler kunder till den.</span>
          </h1>

          <p className="text-white/55 text-lg leading-relaxed max-w-md">
            Välj en design — och hemsidan kommer färdig ifylld med texter, priser och artiklar
            för din salong. Sedan sköter Kiterank marknadsföringen som ger fler kunder:
            Google, omdömen och synligheten i ditt område.
          </p>

          {/* The two halves of the offer, visible before anyone scrolls */}
          <div className="flex flex-wrap gap-2.5">
            {['Färdig hemsida från start', 'Marknadsföring på Google', 'Fler kunder varje vecka', 'Omdömen & Google-profil'].map(p => (
              <span key={p} className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white/60">
                <span className="text-[#f0b429]">✓</span>{p}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/auth/login"
              className="bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Välj design för din hemsida →
            </Link>
            <span className="text-white font-semibold text-sm">7 dagar gratis</span>
          </div>
          <p className="text-white/25 text-xs">Ingen kortuppgift · Klar på 5 minuter · Avsluta när du vill</p>
        </div>

        <WebsiteMockup />
      </section>

      {/* ── Industry strip ────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 py-5">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-white/30 text-sm">
          <span className="text-white/20 text-xs uppercase tracking-widest">Byggd för</span>
          {['Frisörer', 'Skönhetssalonger', 'Spa', 'Gym & PT', 'Restauranger', 'Hantverkare', 'Städfirmor'].map(t => (
            <span key={t} className="text-white/40">{t}</span>
          ))}
        </div>
      </section>

      {/* ── The two halves of the offer ───────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Hemsidan får din salong att se rätt ut.<br />Marknadsföringen ger dig fler kunder.</h2>
          <p className="text-white/45 max-w-xl mx-auto">
            En hemsidebyggare slutar när hemsidan är klar. Det är där Kiterank börjar.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/3 border border-white/10 rounded-2xl p-8 space-y-4">
            <p className="text-[#f0b429] text-xs font-bold tracking-widest uppercase">Del 1 — Hemsidan</p>
            <h3 className="text-white text-xl font-bold">Välj design — resten är ifyllt</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Du väljer designen. Texter, priser, artiklar och en egen sida för varje behandling
              står redan på plats, skrivna för salonger. Klicka på det du vill ändra, direkt på hemsidan.
            </p>
            <ul className="space-y-2 text-sm text-white/60">
              {['Prislista, bokning, omdömen och artiklar', 'Egna färger, typsnitt och logga', 'Ser rätt ut i mobilen'].map(f => (
                <li key={f} className="flex items-start gap-2.5"><span className="text-[#f0b429] mt-0.5 text-xs">✓</span>{f}</li>
              ))}
            </ul>
          </div>
          <div className="bg-[#f0b429]/5 border border-[#f0b429]/25 rounded-2xl p-8 space-y-4">
            <p className="text-[#f0b429] text-xs font-bold tracking-widest uppercase">Del 2 — Marknadsföringen</p>
            <h3 className="text-white text-xl font-bold">Fler kunder, vecka för vecka</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Marknadsföring utan byrå: Kiterank bevakar din Google-profil, dina omdömen och
              salongens synlighet i området — och säger varje vecka exakt vad som ger fler kunder just nu.
            </p>
            <ul className="space-y-2 text-sm text-white/60">
              {['Din plats på Google, sökord för sökord', 'Omdömesbevakning med svarsförslag', 'Veckans att göra-lista i klarspråk'].map(f => (
                <li key={f} className="flex items-start gap-2.5"><span className="text-[#f0b429] mt-0.5 text-xs">✓</span>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Från ingen hemsida till publicerad hemsida. I dag.</h2>
          <p className="text-white/45 max-w-lg mx-auto">Ingen teknik. Ingen webbyrå. Ingen tom sida att stirra på.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Välj design för din hemsida',
              body: 'Fem genomarbetade designer per bransch — byggda för salonger, spa, hantverkare och fler. Egna färger, eget typsnitt och egen logga om du vill.',
            },
            {
              step: '02',
              title: 'Hemsidan kommer ifylld',
              body: 'Prislista, texter, om oss, vanliga frågor och sex artiklar står redan på plats, skrivna för din bransch. Du byter ut orden mot dina egna — i stället för att börja från noll.',
            },
            {
              step: '03',
              title: 'Publicera — och låt marknadsföringen börja',
              body: 'Hemsidan byggs som Google vill ha den: en egen sida per tjänst, rätt struktur och en sitemap som skickas in automatiskt. Sedan tar veckoplanen vid — och jobbar för fler kunder.',
            },
          ].map(s => (
            <div key={s.step} className="space-y-3">
              <div className="text-[#f0b429] text-4xl font-bold opacity-40">{s.step}</div>
              <h3 className="text-white text-lg font-semibold">{s.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Website features ──────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">En hemsida din salong sköter själv.</h2>
          <p className="text-white/45 max-w-xl mx-auto">Klicka på det du vill ändra, direkt på hemsidan. Inga menyer att leta i.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FeatureCard
            icon="✎"
            title="Klicka och redigera"
            body="Klicka på en rubrik, en bild eller prislistan — direkt på sidan — och ändra den där den står. Ser du det, kan du ändra det."
          />
          <FeatureCard
            icon="⌕"
            title="En sida per tjänst"
            body="Varje tjänst får en egen sida — det är sådana sidor som dyker upp när någon söker på din behandling och din ort."
          />
          <FeatureCard
            icon="✦"
            title="Prislista & bokning"
            body="Hela prislistan på sidan, eller några utvalda tjänster som leder till din bokningssida. Alla boka-knappar går dit du vill."
          />
          <FeatureCard
            icon="✵"
            title="Artiklar med foton"
            body="Sex färdiga artiklar från start, och en enkel redigerare för egna — text och bildserier om vartannat, precis som du vill visa ditt arbete."
          />
          <FeatureCard
            icon="★"
            title="Dina Google-omdömen"
            body="Välj vilka omdömen som visas på sidan. Riktiga röster från riktiga kunder — det starkaste säljargumentet du har."
          />
          <FeatureCard
            icon="◈"
            title="Ditt varumärke"
            body="Egna färger, eget typsnitt, egen logga, eget sidnamn i adressen. Sidan ser ut som du — inte som en mall."
          />
        </div>
      </section>

      {/* ── The engine — growth ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#f0b429]/10 border border-[#f0b429]/20 rounded-full px-4 py-1.5">
              <span className="text-[#f0b429] text-xs font-medium">Marknadsföringen — det som skiljer Kiterank från en hemsidebyggare</span>
            </div>
            <h2 className="text-3xl font-bold leading-snug">
              Hemsidan är bara början.<br />Marknadsföringen ger fler kunder.
            </h2>
            <p className="text-white/50 leading-relaxed">
              En hemsida ingen hittar är ett skyltfönster i en källare. Kiterank kopplar
              ihop hemsidan med din Google-profil, dina omdömen och salongens synlighet i
              området — och ger dig varje vecka en kort lista med det som ger fler kunder just nu.
            </p>
            <ul className="space-y-3 text-sm text-white/60">
              {[
                'Din plats på Google i ditt område — och vad som krävs för att klättra',
                'Alla omdömen på ett ställe, med färdiga svarsförslag',
                'Veckans att göra-lista: tre konkreta saker, klara på tio minuter',
                'Sidbesök och bokningar — så du ser att det fungerar',
              ].map(f => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="text-[#f0b429] mt-0.5 shrink-0 text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <DashboardMockup />
        </div>

        {/* The platform's own feature grid — same weight as the website's */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-12">
          <FeatureCard
            icon="✦"
            title="Din Google-profil"
            body="Foton, inlägg och frågor — och hur din profil står sig mot den bästa i ditt område. Det är profilen som avgör vem som får samtalet."
          />
          <FeatureCard
            icon="◎"
            title="Synlighet i området"
            body="Var du rankar för varje sökord som betyder något — och vilka konkurrenter som ligger före, så du vet exakt vad du tävlar mot."
          />
          <FeatureCard
            icon="★"
            title="Omdömen"
            body="Varje nytt omdöme fångas upp med ett färdigt svarsförslag. Obesvarade omdömen är den vanligaste missen — och den enklaste att fixa."
          />
          <FeatureCard
            icon="✓"
            title="Veckans att göra-lista"
            body="Tre konkreta saker varje vecka, sorterade efter effekt. Inte teori — uppgifter, klara på tio minuter var."
          />
          <FeatureCard
            icon="◈"
            title="Annonser i klarspråk"
            body="Vad annonserna kostar, vad de ger och var pengar läcker — utan att du behöver förstå annonssystemet."
          />
          <FeatureCard
            icon="✺"
            title="Syns du i AI-svaren?"
            body="Allt fler frågar ChatGPT i stället för Google. Kiterank testar frågorna varje vecka och visar om det är du eller konkurrenten som rekommenderas."
          />
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '5 min',  label: 'till en färdig hemsida',        sub: 'Ifylld för din salong — du byter ut orden' },
            { value: '1 sida', label: 'per behandling du erbjuder',    sub: 'Det som syns när någon söker behandling + ort' },
            { value: '6',      label: 'artiklar från start',           sub: 'Skrivna för din bransch, redo att göras till dina' },
            { value: 'Varje vecka', label: 'marknadsföring som verkar', sub: 'Tre saker att göra. Klarspråk. Fler kunder.' },
          ].map(s => (
            <div key={s.label} className="text-center space-y-1">
              <p className="text-3xl font-bold text-[#f0b429]">{s.value}</p>
              <p className="text-white text-sm font-medium">{s.label}</p>
              <p className="text-white/30 text-xs leading-snug">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Hemsida och marknadsföring. Ett pris, inga överraskningar.</h2>
          <p className="text-white/45">7 dagar gratis · Ingen bindningstid · Avsluta när du vill</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Starter */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-8 space-y-6">
            <div>
              <p className="text-white/50 text-sm font-medium mb-1">Hemsida</p>
              <p className="text-4xl font-bold text-white">495 kr<span className="text-lg font-normal text-white/40">/mån</span></p>
              <p className="text-white/30 text-xs mt-1">Allt du behöver för att synas rätt</p>
            </div>
            <ul className="space-y-2.5 text-sm text-white/60">
              {[
                'Färdig hemsida, ifylld för din bransch',
                'En egen sida per tjänst — byggt för Google',
                'Prislista, artiklar, omdömen och bokningsknappar',
                'Egna färger, typsnitt och logga',
                'Din Google-profil kopplad och bevakad',
                'Veckans att göra-lista',
              ].map(f => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="text-[#f0b429] mt-0.5 shrink-0 text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/login"
              className="block text-center border border-white/15 hover:border-white/30 text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Prova gratis i 7 dagar
            </Link>
          </div>

          {/* Growth */}
          <div className="bg-[#f0b429]/5 border border-[#f0b429]/25 rounded-2xl p-8 space-y-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#f0b429] text-[#080f1e] text-xs font-bold px-3 py-1 rounded-full">
              Populärast
            </div>
            <div>
              <p className="text-[#f0b429] text-sm font-medium mb-1">Hemsida + Fler kunder</p>
              <p className="text-4xl font-bold text-white">795 kr<span className="text-lg font-normal text-white/40">/mån</span></p>
              <p className="text-white/30 text-xs mt-1">För dig som vill växa aktivt</p>
            </div>
            <ul className="space-y-2.5 text-sm text-white/60">
              {[
                'Allt i Hemsida',
                'Synlighet i ditt område — plats för plats, sökord för sökord',
                'Annonser på Google, bevakade i klarspråk',
                'Omdömesbevakning med färdiga svarsförslag',
                'Sidbesök, samtal och bokningar i en vy',
                'Prioriterad support',
              ].map(f => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="text-[#f0b429] mt-0.5 shrink-0 text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/login"
              className="block text-center bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              Prova gratis i 7 dagar
            </Link>
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-white/25 text-sm">7 dagar gratis på båda · Ingen kortuppgift för att börja</p>
          <Link href="/pricing" className="text-[#f0b429]/60 hover:text-[#f0b429] text-xs transition-colors">
            Se hela jämförelsen →
          </Link>
        </div>
      </section>

      {/* ── AI highlight ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-[#f0b429]/8 to-transparent border border-[#f0b429]/15 rounded-2xl p-10 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <h2 className="text-2xl font-bold">
              Allt fler frågar en AI i stället för att googla. Syns du där?
            </h2>
            <p className="text-white/50 leading-relaxed">
              &ldquo;Vilken är bästa frisören på Södermalm?&rdquo; ställs i dag lika gärna till
              ChatGPT som till Google. Kiterank testar frågorna som betyder något för dig varje
              vecka och visar var du dyker upp — och var dina konkurrenter gör det i stället.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { platform: 'ChatGPT',      color: '#10a37f', mentioned: true,  pos: 3 },
              { platform: 'Perplexity',   color: '#20b2aa', mentioned: true,  pos: 2 },
              { platform: 'Gemini',       color: '#8b5cf6', mentioned: false, pos: null },
              { platform: 'AI Overviews', color: '#4285f4', mentioned: true,  pos: 4 },
            ].map(p => (
              <div key={p.platform} className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-sm font-medium text-white">{p.platform}</span>
                </div>
                {p.mentioned
                  ? <span className="text-xs font-semibold" style={{ color: p.color }}>✓ omnämnd som #{p.pos}</span>
                  : <span className="text-white/25 text-xs">omnämns inte</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-[#f0b429]/10 via-transparent to-transparent border border-white/8 rounded-2xl px-10 py-16 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-[#f0b429]/10 border border-[#f0b429]/20 rounded-full px-4 py-1.5">
            <span className="text-[#f0b429] text-xs font-bold">7 dagar gratis — ingen kortuppgift</span>
          </div>
          <h2 className="text-3xl font-bold max-w-xl mx-auto leading-snug">
            Välj en design för din salongs hemsida.<br />Prova allt gratis i 7 dagar.
          </h2>
          <p className="text-white/45 max-w-md mx-auto">
            Hemsidan kommer färdig ifylld — och marknadsföringen som ger fler kunder ingår från första dagen.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/auth/login"
              className="bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] font-semibold px-8 py-3.5 rounded-xl transition-colors"
            >
              Välj din design →
            </Link>
            <p className="text-white/25 text-xs">7 dagar gratis · Ingen kortuppgift · Avsluta när du vill</p>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 mt-4">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-white font-bold text-sm">Kiterank</p>
            <p className="text-white/25 text-xs mt-0.5">Hemsida, marknadsföring och fler kunder — för salonger och lokala företag</p>
          </div>
          <div className="flex items-center gap-8 text-white/30 text-sm">
            <Link href="/features" className="hover:text-white/60 transition-colors">Funktioner</Link>
            <Link href="/pricing"  className="hover:text-white/60 transition-colors">Priser</Link>
            <Link href="/auth/login" className="hover:text-white/60 transition-colors">Logga in</Link>
          </div>
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} Kiterank. Alla rättigheter förbehållna.</p>
        </div>
      </footer>

    </div>
  )
}
