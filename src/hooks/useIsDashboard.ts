import { useEffect, useState } from 'react'

/** True when the URL is the always-on monitor view (?view=dashboard or #dashboard). */
export function useIsDashboard(): boolean {
  const read = () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('view') === 'dashboard' || window.location.hash.replace('#', '') === 'dashboard'
  }
  const [isDash, setIsDash] = useState(read)
  useEffect(() => {
    const onChange = () => setIsDash(read())
    window.addEventListener('popstate', onChange)
    window.addEventListener('hashchange', onChange)
    return () => {
      window.removeEventListener('popstate', onChange)
      window.removeEventListener('hashchange', onChange)
    }
  }, [])
  return isDash
}
