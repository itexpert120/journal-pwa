import { isRouteErrorResponse, useRouteError } from "react-router"
import { Button } from "@/components/ui/button"

export function RouteError() {
  const err = useRouteError()
  // A new deploy can remove old lazy chunks; a reload picks up the new ones.
  const stale = err instanceof TypeError && /dynamically imported module|Importing a module script/i.test(err.message)
  return (
    <div className="grid h-dvh place-items-center p-8 text-center">
      <div className="grid gap-4">
        <h1 className="text-4xl">{stale ? "App updated" : "Something went wrong"}</h1>
        <p className="text-sm text-muted-foreground">
          {stale
            ? "A newer version is available."
            : isRouteErrorResponse(err)
              ? err.statusText
              : err instanceof Error
                ? err.message
                : "Unknown error"}
        </p>
        <Button size="lg" onClick={() => location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  )
}
