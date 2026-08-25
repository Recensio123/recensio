import type { Plan } from '@/lib/plan'
import { hasBooking } from '@/lib/plan'
import type { Steg } from '@/lib/komIgang'

/*
 * Vägen in i plattformen för någon som just köpt den.
 *
 * Ordningen är inte godtycklig utan följer vad kunden betalat för och vad som
 * låser upp vad. Hemsidan först: den är det de köpte, den är synlig för deras
 * kunder samma dag, och den är det enda steget som ger något tillbaka utan att
 * något annat är gjort. Bokningen därefter, för den som har den — en tidbok
 * utan tjänster tar inte emot en enda tid. Google sist av de tre stora, för
 * det är mätningen: den säger hur det går, inte vad som händer.
 *
 * Stegen räknas fram ur salongens faktiska uppgifter och sparas aldrig. En
 * sparad bock ljuger i samma stund någon tömmer ett fält — och en checklista
 * som säger att hemsidan är klar när den inte är det är sämre än ingen
 * checklista.
 *
 * Ingenting spärras. En kund som vill hoppa till bokningen innan hemsidan är
 * klar ska få göra det; guiden är en ordning vi rekommenderar, inte en grind.
 */

export type GuideSteg = {
  id:     string
  rubrik: string
  /** En mening om varför steget är värt att göra. */
  varför: string
  klart:  boolean
  href:   string
  /** Det som återstår inom steget, för de som består av flera saker. */
  delar?: { rubrik: string; klart: boolean }[]
  /** Steget finns bara för den som köpt tidboken. */
  kräverBokning?: boolean
}

export type GuideFakta = {
  /** Hemsidans egna steg, från sajtSteg — samma räkning som startsidans notis,
   *  så de två aldrig kan säga olika saker om samma sida. */
  sajt: Steg[]
  harTjänster:   boolean
  harPersonal:   boolean
  googleKopplat: boolean
  /** Något utskick påslaget — bekräftelsen räcker. */
  meddelandenPå: boolean
  omdömeslänk:   boolean
  egenDomän:     boolean
}

export function guideSteg(f: GuideFakta): GuideSteg[] {
  const sajtKlar = f.sajt.length > 0 && f.sajt.every(s => s.klart)

  const steg: GuideSteg[] = [
    {
      id:     'hemsida',
      rubrik: 'Gör hemsidan till din',
      varför: 'Det är den dina kunder ser. Tills namnet, priserna och bilderna är dina beskriver den mallen och inte dig.',
      klart:  sajtKlar,
      href:   '/dashboard/webbplats',
      delar:  f.sajt.map(s => ({ rubrik: s.rubrik, klart: s.klart })),
    },
  ]

  /* Bokningsstegen byggs alltid men märks. Vilket upplägg kunden kör vet bara
     webbläsaren — servern har ingen plan att fråga efter — så listan räknas
     fram hel och sållas där svaret finns. Alternativet vore ett anrop till för
     att veta vad som ska ritas, och guiden skulle börja med att ladda. */
  steg.push(
    {
      id:     'bokning',
      rubrik: 'Öppna tidboken',
      varför: 'Utan tjänster och medarbetare finns inga tider att välja på, och bokningssidan tar inte emot något.',
      klart:  f.harTjänster && f.harPersonal,
      href:   '/dashboard/bokningar',
      kräverBokning: true,
      delar: [
        { rubrik: 'Lägg in dina behandlingar med tid och pris', klart: f.harTjänster },
        { rubrik: 'Lägg in dig själv och din personal',         klart: f.harPersonal },
      ],
    },
    {
      id:     'meddelanden',
      rubrik: 'Slå på beskeden till kunden',
      varför: 'Bekräftelse, påminnelse och frågan om omdöme. Påminnelsen är det enskilt billigaste sättet att slippa uteblivna kunder.',
      klart:  f.meddelandenPå && f.omdömeslänk,
      href:   '/dashboard/bokningar',
      kräverBokning: true,
      delar: [
        { rubrik: 'Välj om du når kunderna på SMS eller e-post', klart: f.meddelandenPå },
        { rubrik: 'Klistra in din länk för omdömen',             klart: f.omdömeslänk  },
      ],
    },
  )

  steg.push(
    {
      id:     'google',
      rubrik: 'Koppla Google',
      varför: 'Härifrån kommer de flesta som söker efter dig. Utan kopplingen mäts ingenting, och fyra av sidorna här står tomma.',
      klart:  f.googleKopplat,
      href:   '/dashboard/connections',
    },
    {
      id:     'doman',
      rubrik: 'Peka ut din egen adress',
      varför: 'Sidan fungerar redan på adressen du fick. Din egen domän gör den till ditt företags, i länkar och i sökresultat.',
      klart:  f.egenDomän,
      href:   '/dashboard/webbplats',
    },
  )

  return steg
}


/**
 * Stegen som gäller för det här upplägget.
 *
 * Sållningen sker här och inte när listan byggs, eftersom bara webbläsaren vet
 * vilket upplägg kunden kör. Servern räknar fram listan hel; den här körs där
 * svaret finns. En hantverkare som tar emot förfrågningar har ingen kalender
 * att fylla, och ett steg som pekar på en sida de inte har är ett fel de inte
 * kan åtgärda.
 */
export function synligaSteg(steg: GuideSteg[], plan: Plan): GuideSteg[] {
  return hasBooking(plan) ? steg : steg.filter(s => !s.kräverBokning)
}
