export type ServiceEntry   = { name: string; desc: string; duration?: string; price: string; hidePrice?: boolean; hideDuration?: boolean }
export type ServiceCategory = { category: string; items: ServiceEntry[] }

/** "Skägg & konturering" → "skagg-konturering" — the URL carries the keyword. */
export function slugifyService(name: string): string {
  return name
    .toLowerCase()
    .replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const SERVICES: Record<string, ServiceCategory[]> = {
  salon: [
    {
      category: 'Klippning',
      items: [
        { name: 'Klippning dam',        desc: 'Tvätt, klippning och enkel inläggning',          duration: '45 min',  price: '650 kr'   },
        { name: 'Klippning herr',        desc: 'Klippning med sax eller maskin, exkl. tvätt',   duration: '30 min',  price: '450 kr'   },
        { name: 'Klippning barn <12 år', desc: 'Snabb och enkel klippning för de minsta',        duration: '20 min',  price: '290 kr'   },
        { name: 'Skägg & konturering',   desc: 'Formning och klippning av skägg och mustach',   duration: '20 min',  price: '250 kr'   },
      ],
    },
    {
      category: 'Färgning & slingor',
      items: [
        { name: 'Helhelsfärgning',       desc: 'Täcker grått och ger jämn, fyllig färg',         duration: '90 min',  price: 'från 1 200 kr' },
        { name: 'Slingor (halvhuvud)',    desc: 'Naturliga reflexer för mer djup och rörelse',    duration: '120 min', price: 'från 1 500 kr' },
        { name: 'Slingor (helhuvud)',     desc: 'Fullständig ljusare eller multifärgseffekt',     duration: '150 min', price: 'från 1 900 kr' },
        { name: 'Balayage',              desc: 'Handmålad teknik för solkyssad gradientkänsla',  duration: '150 min', price: 'från 2 200 kr' },
        { name: 'Toning',                desc: 'Neutraliserar gula toner, adderar glans och kyla', duration: '30 min', price: '450 kr'   },
      ],
    },
    {
      category: 'Behandlingar',
      items: [
        { name: 'Keratin-behandling',    desc: 'Glättar, närer och reducerar frisering i 3 mån', duration: '120 min', price: 'från 2 500 kr' },
        { name: 'Djupnärande mask',      desc: 'Intensiv återfuktning för torrt eller skadat hår', duration: '30 min', price: '450 kr'   },
        { name: 'Hårbottenbehandling',   desc: 'Exfoliering och stimulering för skalpen',         duration: '30 min', price: '350 kr'   },
      ],
    },
    {
      category: 'Styling',
      items: [
        { name: 'Läggning & blow-dry',   desc: 'Professionell inläggning med borste och fön',    duration: '45 min',  price: '550 kr'   },
        { name: 'Uppsättning',           desc: 'För bröllop, student eller fest',                 duration: '60 min',  price: 'från 900 kr'  },
        { name: 'Lockning',              desc: 'Lösa lockar eller waves med järn eller diffuser', duration: '45 min',  price: '600 kr'   },
      ],
    },
  ],
  spa: [
    {
      category: 'Massage',
      items: [
        { name: 'Klassisk massage 30 min', desc: 'Avslappnande delkroppsmassage, axlar och rygg', duration: '30 min', price: '650 kr'    },
        { name: 'Klassisk massage 60 min', desc: 'Helkroppsmassage för djup avslappning',         duration: '60 min', price: '950 kr'    },
        { name: 'Klassisk massage 90 min', desc: 'Utökad helkroppsmassage med extra fokus',        duration: '90 min', price: '1 350 kr'  },
        { name: 'Hotstone massage',         desc: 'Varma basaltstenar löser upp djupa spänningar', duration: '75 min', price: '1 350 kr'  },
        { name: 'Aromaterapi massage',      desc: 'Med noggrant valda eteriska oljor',             duration: '60 min', price: '1 050 kr'  },
        { name: 'Djupmassage (sports)',     desc: 'Fokuserar på muskler och återhämtning',         duration: '60 min', price: '1 100 kr'  },
        { name: 'Huvudmassage',            desc: 'Skalp, nacke och axlar — minskar huvudvärk',    duration: '30 min', price: '550 kr'    },
      ],
    },
    {
      category: 'Ansiktsbehandlingar',
      items: [
        { name: 'Classic Facial 60 min',   desc: 'Djuprengöring, exfoliering och återfuktning',   duration: '60 min', price: '1 050 kr'  },
        { name: 'Anti-age behandling',      desc: 'Kollagen och peptider för fastare hy',           duration: '75 min', price: '1 450 kr'  },
        { name: 'LED-ljusterapi',           desc: 'Rödljus som minskar rynkor och inflammationer', duration: '30 min', price: '650 kr'    },
        { name: 'Peelingbehandling',        desc: 'Kemisk exfoliering för slätare och klarare hud', duration: '45 min', price: '850 kr'    },
      ],
    },
    {
      category: 'Kropp & välmående',
      items: [
        { name: 'Kroppsinpackning',        desc: 'Avgiftande lera eller mjölk och honung',        duration: '60 min', price: '1 150 kr'  },
        { name: 'Scrub & exfoliering',     desc: 'Salt- eller sockerscrub för mjuk hud',          duration: '45 min', price: '850 kr'    },
        { name: 'Reflexologi (fötter)',     desc: 'Tryckteknik på fotsulans reflexzoner',          duration: '45 min', price: '750 kr'    },
      ],
    },
    {
      category: 'Paket',
      items: [
        { name: 'Spa-dag Harmony',         desc: 'Massage 60 min + ansiktsbehandling + fika',     duration: '3 tim',  price: '2 250 kr'  },
        { name: 'Presentkort valfritt belopp', desc: 'Giltigt 12 månader. Kan kombineras med alla tjänster.', price: 'Välj belopp' },
      ],
    },
  ],
  restaurant: [
    {
      category: 'Lunch (måndag–fredag 11–14)',
      items: [
        { name: 'Veckans lunchrätter',    desc: 'Tre rätter roterar varje dag — alltid ett vegetariskt alternativ', price: '155 kr' },
        { name: 'Soppa med bröd',          desc: 'Husmanskost från grunden, serveras med levainbröd',               price: '125 kr' },
        { name: 'Salladsbar',              desc: 'Bygg din egen sallad med varma tillbehör, ingår dryck',            price: '139 kr' },
      ],
    },
    {
      category: 'À la carte (middag)',
      items: [
        { name: 'Förrätt',                desc: 'Säsongsanpassade förrätter — fråga personalen om dagens val',     price: '145–195 kr' },
        { name: 'Varmrätt',               desc: 'Kött, fisk eller vegetariskt — allt serveras med tillbehör',     price: '295–395 kr' },
        { name: 'Dessert',                desc: 'Husmanskost-klassiker och hantverksost med tillbehör',             price: '125–155 kr' },
        { name: 'Menyn (3 rätter)',        desc: 'Förrätt, varmrätt och dessert — väljs ur kvällens utbud',        price: '595 kr'     },
      ],
    },
    {
      category: 'Dryck',
      items: [
        { name: 'Vinlista',               desc: 'Naturviner och klassiker curated av vår sommelier',               price: 'från 98 kr / glas' },
        { name: 'Alkoholfritt sortiment',  desc: 'Husets kombucha, pressad juice och mocktails',                   price: 'från 65 kr'        },
        { name: 'Kaffe & te',             desc: 'Specialrostade bönor från Koppi, Helsingborg',                   price: '45–65 kr'          },
      ],
    },
    {
      category: 'Sällskapsbokningar',
      items: [
        { name: 'Privat sällskap',        desc: 'Restaurangen kan bokas exklusivt för 20–60 gäster',              price: 'Offert'  },
        { name: 'Kick-off & konferens',   desc: 'Menypaket från 350 kr/person, AV-utrustning ingår',              price: 'Offert'  },
        { name: 'Bröllop & fest',         desc: 'Anpassad meny och dekor — prata med oss tidigt',                 price: 'Offert'  },
      ],
    },
  ],
  beauty: [
    {
      category: 'Fransar & bryn',
      items: [
        { name: 'Fransförlängning — Classic',  desc: 'En extension per naturlig frans. Naturlig look.',             duration: '120 min', price: '1 200 kr'  },
        { name: 'Fransförlängning — Volume',   desc: 'Handmade fans för fylligare look. 2D–6D',                    duration: '150 min', price: '1 600 kr'  },
        { name: 'Fransförlängning — påfyll',   desc: 'Rekommenderas var 3:e vecka',                                duration: '60 min',  price: '600 kr'    },
        { name: 'Lash lift & tint',            desc: 'Permanentar och tonar dina egna fransar. Håller 6–8 v.',     duration: '60 min',  price: '750 kr'    },
        { name: 'Bryn styling & formning',     desc: 'Vaxning/pincett, formning och borsting',                     duration: '30 min',  price: '350 kr'    },
        { name: 'Bryn henna & färgning',       desc: 'Naturlig henna eller vegetabilisk färg — håller 4–6 v.',    duration: '45 min',  price: '450 kr'    },
        { name: 'Brow lamination',             desc: 'Permanentar brynen i önskat läge för full, bushy look',      duration: '60 min',  price: '650 kr'    },
      ],
    },
    {
      category: 'Naglar',
      items: [
        { name: 'Manikyr klassisk',            desc: 'Nagelform, nagelbandsvård och lack',                          duration: '45 min',  price: '450 kr'    },
        { name: 'Gel-lack (händer)',            desc: 'Hållbart gel-lack — torkar under UV-lampa, håller 2–3 v.',  duration: '60 min',  price: '600 kr'    },
        { name: 'Acrylnaglar',                 desc: 'Förlänger och förstärker med akryl. Inkl. form och lack.',  duration: '90 min',  price: 'från 850 kr' },
        { name: 'Pedikyr klassisk',            desc: 'Fotvård, nagelform och lack — inkl. mjukgörande fotscrub',  duration: '60 min',  price: '550 kr'    },
        { name: 'Gel-lack (fötter)',            desc: 'Som ovan, anpassat för tånaglar',                            duration: '60 min',  price: '600 kr'    },
        { name: 'Avtagning gel/akryl',         desc: 'Noggrann och skonsam borttagning utan skador',               duration: '30 min',  price: '250 kr'    },
      ],
    },
    {
      category: 'Vaxning',
      items: [
        { name: 'Överlapp & ögonbryn',        desc: 'Snabb och exakt hårborttagning i ansiktet',                   duration: '20 min',  price: '200 kr'    },
        { name: 'Underarmar',                  desc: 'Varmvax för ett hållbart resultat',                           duration: '20 min',  price: '250 kr'    },
        { name: 'Ben (halvbenet)',              desc: 'Från knäet ned, inkl. fötter',                               duration: '30 min',  price: '350 kr'    },
        { name: 'Ben (helbenet)',               desc: 'Från höft till fot — inkl. fötter',                          duration: '45 min',  price: '550 kr'    },
        { name: 'Bikinilinjen',                desc: 'Klassisk bikinilinje — anpassas efter önskemål',              duration: '30 min',  price: '350 kr'    },
      ],
    },
  ],
  fitness: [
    {
      category: 'Gruppass',
      items: [
        { name: 'HIIT 45 min',           desc: 'Högintensiva intervaller — alla nivåer, alltid modifikationer',    duration: '45 min',  price: '200 kr / pass'       },
        { name: 'Yoga Flow 60 min',       desc: 'Rörlighet, andning och balans — perfekt återhämtning',            duration: '60 min',  price: '200 kr / pass'       },
        { name: 'Styrkelyft 60 min',      desc: 'Basövningar med skivstång — vi lär dig rätt teknik',              duration: '60 min',  price: '200 kr / pass'       },
        { name: 'BoxFit 45 min',          desc: 'Boxningsinspirerade cardio-pass med fokus och glädje',            duration: '45 min',  price: '200 kr / pass'       },
        { name: 'Pilates (mat) 60 min',   desc: 'Core, stabilitet och kroppskontroll',                             duration: '60 min',  price: '200 kr / pass'       },
        { name: 'Klippkort 10 pass',      desc: 'Valfria gruppass under 3 månader',                                price: '1 600 kr'    },
        { name: 'Månadsabonnemang obegränsat', desc: 'Obegränsade gruppass — boka via appen',                      price: '699 kr / mån'  },
      ],
    },
    {
      category: 'Personlig träning',
      items: [
        { name: 'PT-session 60 min',      desc: 'Individuellt träningsprogram med din personliga coach',           duration: '60 min',  price: '850 kr / tillfälle'  },
        { name: 'PT-paket 5 sessioner',   desc: '5 sessioner — används inom 2 månader',                            price: '3 750 kr'    },
        { name: 'PT-paket 10 sessioner',  desc: '10 sessioner — används inom 3 månader',                           price: '6 900 kr'    },
        { name: 'Online-coaching 4 v.',   desc: 'Program, uppföljning och chatstöd — 100% på distans',             price: '2 400 kr'    },
      ],
    },
    {
      category: 'Kost & hälsa',
      items: [
        { name: 'Kostgenomgång',          desc: 'Analys av matvanor och mål med konkreta rekommendationer',        duration: '60 min',  price: '750 kr'              },
        { name: 'Kroppsmätning',          desc: 'Fettprocent, muskelmassa och VO2-estimat',                        duration: '30 min',  price: '350 kr'              },
        { name: 'Löpanalys',              desc: 'Gånganalys i löpband — optimera steget och undvik skador',        duration: '45 min',  price: '650 kr'              },
      ],
    },
  ],
  craftsman: [
    {
      category: 'Snickeri & inredning',
      items: [
        { name: 'Köksinredning',           desc: 'Planering, tillverkning och montering av anpassade köksluckor',  price: 'Offert' },
        { name: 'Garderob & förvaring',    desc: 'Skräddarsydda lösningar efter er planlösning och stil',          price: 'Offert' },
        { name: 'Uteplatser & altaner',    desc: 'Trädäck, pergola och uterum i tryckimpregnerat virke eller ThermoWood', price: 'Offert' },
        { name: 'Inredningssnickeri',      desc: 'Hyllor, beslag, panel, fönster- och dörrrenoveringar',           price: 'från 950 kr/h' },
      ],
    },
    {
      category: 'Målning & puts',
      items: [
        { name: 'Invändig målning',        desc: 'Väggar, tak och snickerier — grundning, slipning och färdigmålning', price: 'från 650 kr/h' },
        { name: 'Utvändig fasadmålning',   desc: 'Puts, putsfärg eller träfasad — med korrekta primer och täckfärger', price: 'Offert' },
        { name: 'Kakelrenovering',         desc: 'Fogning, lagning och nytt kakel i badrum och kök',               price: 'från 750 kr/h' },
      ],
    },
    {
      category: 'Montering & installation',
      items: [
        { name: 'Köksinstallation',        desc: 'Montering av kök från Ikea, Marbodal eller skräddarsytt',        price: 'från 550 kr/h' },
        { name: 'Möbelmontering',          desc: 'Ikea, Bolia eller annan platta. Inga medföljer utan anm.',      price: '650 kr / 2 h'  },
        { name: 'Badrumsmöbler & spegelskåp', desc: 'Väggmonterade möbler, speglar och belysning',                price: 'från 550 kr/h' },
        { name: 'Fönsterbyte',             desc: 'Befintliga fönster byts mot energieffektiva treglasfönster',    price: 'Offert' },
      ],
    },
    {
      category: 'ROT-avdrag',
      items: [
        { name: 'ROT gäller för',          desc: 'Reparation, ombyggnad och tillbyggnad av bostadshus. Vi hanterar ansökan åt dig.', price: '30% avdrag upp till 50 000 kr/år' },
      ],
    },
  ],
  cleaning: [
    {
      category: 'Hemstäd',
      items: [
        { name: 'Hemstädning — liten (upp till 60 m²)',  desc: 'Badrum, kök, dammsugning och moppning',                                 duration: '2 tim',  price: 'från 799 kr' },
        { name: 'Hemstädning — standard (60–120 m²)',   desc: 'Komplett städning av hela bostaden',                                    duration: '3 tim',  price: 'från 1 195 kr' },
        { name: 'Hemstädning — stor (120–180 m²)',      desc: 'Komplett städning av större bostad',                                    duration: '4 tim',  price: 'från 1 595 kr' },
        { name: 'Storstädning',                         desc: 'Grundlig städning inklusive ugn, kyl, fönster invändigt och garderober', duration: '5–6 tim', price: 'från 2 995 kr' },
        { name: 'Inflytt- & utflyttsstädning',          desc: 'Godkänd standard för hyresrätt och bostadsrätt, med intyg',            duration: 'Heldag', price: 'från 3 495 kr' },
      ],
    },
    {
      category: 'Kontorsstäd',
      items: [
        { name: 'Kontorsstäd — löpande',   desc: 'Regelbunden städning 1–5 ggr/vecka, anpassat till era lokaler', price: 'Offert' },
        { name: 'Kontorsstorstäd',         desc: 'Grundlig genomgång en gång per kvartal eller säsong',            price: 'Offert' },
        { name: 'Trappstäd & gemensamma',  desc: 'Trapphus, entré och gemensamma utrymmen i fastighet',            price: 'Offert' },
      ],
    },
    {
      category: 'Tilläggstjänster',
      items: [
        { name: 'Fönsterputs — lägenhet',  desc: 'In- och utsida, inkl. speglar och glaspartier',  duration: '1–2 tim', price: 'från 495 kr' },
        { name: 'Fönsterputs — villa',     desc: 'Utvändigt med teleskopstång, in- och utsida',    duration: '2–3 tim', price: 'från 895 kr' },
        { name: 'Kyl & frys',              desc: 'Avtining, rengöring och torkning',               duration: '45 min',  price: 'från 295 kr' },
        { name: 'Ugn & spis',              desc: 'Avfettning och grundrengöring av ugn och plåtar', duration: '45 min',  price: 'från 295 kr' },
      ],
    },
  ],
  other: [
    {
      category: 'Tjänster',
      items: [
        { name: 'Tjänst ett',   desc: 'Beskriv vad tjänsten innebär och vilket värde kunden får.',  price: 'Offert' },
        { name: 'Tjänst två',   desc: 'Beskriv vad tjänsten innebär och vilket värde kunden får.',  price: 'Offert' },
        { name: 'Tjänst tre',   desc: 'Beskriv vad tjänsten innebär och vilket värde kunden får.',  price: 'Offert' },
        { name: 'Tjänst fyra',  desc: 'Beskriv vad tjänsten innebär och vilket värde kunden får.',  price: 'Offert' },
        { name: 'Tjänst fem',   desc: 'Beskriv vad tjänsten innebär och vilket värde kunden får.',  price: 'Offert' },
      ],
    },
  ],
}
