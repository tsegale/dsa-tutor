import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'

/**
 * Any URL the router does not recognise.
 *
 * There was no catch-all route, so a mistyped or stale link rendered
 * nothing at all: a blank white page with no explanation and no way back.
 */
export default function NotFound() {
  const { pathname } = useLocation()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <div className="flex max-w-md flex-col gap-2 text-center">
        <h1 className="text-h2 text-ink">There is nothing at this address</h1>
        <p className="text-small text-ink-2">
          The page you asked for does not exist. It may have moved, or the link may be out of date.
        </p>
        <p className="font-mono text-micro font-normal break-all text-ink-3">{pathname}</p>
      </div>
      <Button asChild>
        <Link to="/">Go to the curriculum</Link>
      </Button>
    </main>
  )
}
