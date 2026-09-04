import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Home, Settings, Users } from 'lucide-react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', key: 'nav.home' as const, icon: Home, end: true },
  { to: '/sessions', key: 'nav.sessions' as const, icon: CalendarDays, end: false },
  { to: '/students', key: 'nav.students' as const, icon: Users, end: false },
  { to: '/settings', key: 'nav.settings' as const, icon: Settings, end: false },
]

export function AppShell() {
  const { t } = useI18n()

  return (
    <div className="relative flex min-h-dvh flex-col bg-stage">
      <header className="sticky top-0 z-20 flex items-center gap-2 px-5 py-4">
        <span className="size-[5px] shrink-0 rounded-full bg-lamp" aria-hidden />
        <span className="font-ui text-[16px] font-normal tracking-[-.01em] text-score">{t('app.name')}</span>
      </header>

      <nav className="hidden shadow-separator md:block">
        <ul className="mx-auto flex max-w-6xl gap-6 px-5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-1.5 py-2.5 font-ui text-[13px] font-light transition-colors',
                    isActive ? 'text-lamp' : 'text-dim hover:text-score',
                  )
                }
              >
                <item.icon className="size-3.5" strokeWidth={1.4} />
                {t(item.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="relative z-[1] mx-auto w-full max-w-6xl flex-1 px-5 pb-24 pt-2 md:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 bg-stage shadow-[0_-1px_0_0_hsl(var(--hairline)/var(--hairline-a))] md:hidden">
        <ul className="flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 py-2.5 font-alt text-[10px] tracking-[.08em]',
                    isActive ? 'text-lamp' : 'text-faint',
                  )
                }
              >
                <item.icon className="size-[19px]" strokeWidth={1.4} />
                {t(item.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
