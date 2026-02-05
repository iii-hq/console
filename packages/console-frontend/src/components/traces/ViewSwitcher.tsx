import { Flame, List, Network } from 'lucide-react'

export type ViewType = 'waterfall' | 'flamegraph' | 'map'

interface ViewSwitcherProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const views: Array<{ id: ViewType; label: string; icon: typeof List }> = [
    { id: 'waterfall', label: 'Waterfall', icon: List },
    { id: 'flamegraph', label: 'Flame Graph', icon: Flame },
    { id: 'map', label: 'Trace Map', icon: Network },
  ]

  return (
    <div className="inline-flex items-center gap-1 bg-[#141414] rounded-lg p-1">
      {views.map(({ id, label, icon: Icon }) => {
        const isActive = currentView === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onViewChange(id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded transition-colors
              ${
                isActive
                  ? 'bg-[#F3F724] text-black font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
