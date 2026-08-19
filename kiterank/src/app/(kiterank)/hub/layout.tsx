import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type ReactNode } from 'react'

export default async function HubLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <>{children}</>
}
