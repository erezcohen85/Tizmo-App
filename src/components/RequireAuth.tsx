import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname }} />

  return <Outlet />
}
