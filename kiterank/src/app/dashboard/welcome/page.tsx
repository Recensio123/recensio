import { redirect } from 'next/navigation'

// The welcome screen folded into the setup flow — the intake questions are
// now its first step, so everything lives in one place.
export default function WelcomePage() {
  redirect('/dashboard/setup')
}
