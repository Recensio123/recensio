import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'recensio' })

export async function scheduleSms(customerId: string, companyId: string, scheduledFor: string) {
  return inngest.send({
    name: 'sms/scheduled',
    data: { customerId, companyId, scheduledFor },
  })
}
