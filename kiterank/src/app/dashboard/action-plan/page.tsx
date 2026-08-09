import { ActionPlanPanel } from './ActionPlanPanel'
import { MonthlyCalendar } from './MonthlyCalendar'
import { ActionPlanSwitch } from './ActionPlanSwitch'

export default function ActionPlanPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Action Plan</h1>
        <p className="text-slate-400 text-sm mt-1">
          A prioritised list of exactly what to improve next, based on your data
        </p>
      </div>

      <ActionPlanSwitch>
        <ActionPlanPanel />
        <MonthlyCalendar />
      </ActionPlanSwitch>
    </div>
  )
}
