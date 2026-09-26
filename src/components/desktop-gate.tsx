import { useEffect, useState } from "react"
import { Smartphone } from "lucide-react"

/** Desktop = precise pointer that can hover (mouse/trackpad) and no touch as primary input. */
const DESKTOP_QUERY = "(hover: hover) and (pointer: fine)"

export const isDesktop = () => matchMedia(DESKTOP_QUERY).matches

/** This app is phone-only. On desktop we show a hand-off screen instead of the app. */
export function DesktopGate() {
  const [qr, setQr] = useState<string>()
  useEffect(() => {
    import("qrcode").then((QR) => QR.toDataURL(location.href, { margin: 1, width: 240 }).then(setQr))
  }, [])
  return (
    <div className="grid min-h-full place-items-center bg-leather p-8 text-leather-foreground">
      <div className="max-w-sm text-center">
        <Smartphone className="mx-auto mb-6 size-10 opacity-80" />
        <h1 className="mb-3 text-4xl">Open on your phone</h1>
        <p className="mb-8 text-sm opacity-80">
          Journal is designed only for mobile. Scan this code with your phone's camera, then use <b>Add to Home Screen</b> to
          install it.
        </p>
        {qr && <img src={qr} alt="QR code linking to this app" className="mx-auto size-60 rounded-xl bg-white p-2" />}
      </div>
    </div>
  )
}
