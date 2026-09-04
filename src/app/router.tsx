import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { RequireAuth } from '@/components/RequireAuth'
import HomePage from '@/pages/HomePage'
import EnsemblePage from '@/pages/EnsemblePage'
import SessionsPage from '@/pages/SessionsPage'
import StudentsPage from '@/pages/StudentsPage'
import SettingsPage from '@/pages/SettingsPage'
import SharePage from '@/pages/SharePage'
import AuthPage from '@/pages/AuthPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import NotFound from '@/pages/NotFound'

export const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/ensemble/:ensembleId', element: <EnsemblePage /> },
          { path: '/sessions', element: <SessionsPage /> },
          { path: '/students', element: <StudentsPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  { path: '/auth', element: <AuthPage /> },
  { path: '/auth/reset', element: <ResetPasswordPage /> },
  { path: '/share/:token', element: <SharePage /> },
])
