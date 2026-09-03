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
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <span className="font-semibold">{t('app.name')}</span>
      </header>

      <nav className="hidden border-b md:block">
        <ul className="mx-auto flex max-w-6xl gap-1 px-4">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm',
                    isActive
                      ? 'border-primary font-medium text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )
                }
              >
                <item.icon className="size-4" />
                {t(item.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-4 md:pb-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background md:hidden">
        <ul className="flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn('flex flex-col items-center gap-0.5 py-2 text-xs', isActive ? 'text-primary' : 'text-muted-foreground')
                }
              >
                <item.icon className="size-5" />
                {t(item.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
