import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import HomePage from '@/pages/HomePage'
import EnsemblePage from '@/pages/EnsemblePage'
import SessionsPage from '@/pages/SessionsPage'
import StudentsPage from '@/pages/StudentsPage'
import SettingsPage from '@/pages/SettingsPage'
import SharePage from '@/pages/SharePage'
import NotFound from '@/pages/NotFound'

export const router = createBrowserRouter([
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
  { path: '/share/:token', element: <SharePage /> },
])
