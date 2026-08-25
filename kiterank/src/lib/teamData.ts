import type { createAdminClient } from '@/lib/supabase/admin'

/*
 * Salongens inloggningar.
 *
 * Ligger för sig så att både sidan och rutten kan läsa dem: sidan vid
 * rendering, rutten vid omläsningen efter att någon lagts till eller tagits
 * bort. Fliken hämtade tidigare sin egen lista efter att sidan redan renderat,
 * vilket gav en tom ruta i en halv sekund varje gång den öppnades.
 */

type Admin = ReturnType<typeof createAdminClient>

export type TeamMedlem = {
  id:         string
  user_id:    string | null
  email:      string
  name:       string | null
  role:       'admin' | 'schema' | 'staff'
  staff_id:   string | null
  created_at: string
}

export async function teamData(admin: Admin, companyId: string, ägare: string | null) {
  const { data, error } = await admin
    .from('company_members')
    .select('id, user_id, email, name, role, staff_id, created_at')
    .eq('company_id', companyId)
    .order('created_at')

  /* Databas utan migrationen: salongen har helt enkelt inga extra konton än. */
  if (error) return { members: [] as TeamMedlem[], owner: ägare, migrated: false }
  return { members: (data ?? []) as unknown as TeamMedlem[], owner: ägare, migrated: true }
}
