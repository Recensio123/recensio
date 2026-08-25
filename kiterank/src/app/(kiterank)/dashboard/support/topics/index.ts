import { type SupportTopic } from '../types'
import { hem }          from './hem'
import { googleProfil } from './google-profil'
import { synlighet }    from './synlighet'
import { annonser }     from './annonser'
import { hemsida }      from './hemsida'
import { bokningar }    from './bokningar'
import { sms }          from './sms'
import { webbplats }    from './webbplats'
import { kopplingar }   from './kopplingar'
import { installningar } from './installningar'

// Order here = order on the support index page (mirrors the menu).
export const SUPPORT_TOPICS: SupportTopic[] = [
  hem,
  googleProfil,
  synlighet,
  annonser,
  hemsida,
  bokningar,
  sms,
  webbplats,
  kopplingar,
  installningar,
]

export function getTopic(id: string): SupportTopic | undefined {
  return SUPPORT_TOPICS.find(t => t.id === id)
}
