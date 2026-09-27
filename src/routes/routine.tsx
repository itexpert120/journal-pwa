import { useState } from "react"
import { CircleMinus, CirclePlus } from "lucide-react"
import { Page } from "@/components/app-shell"
import { Group } from "@/components/ios"
import { useDraft } from "@/hooks/use-draft"
import { uid } from "@/lib/id"
import { updateSettings, useSettings } from "@/lib/profile"

function Item({ id, text }: { id: string; text: string }) {
  const d = useDraft(text, (v) =>
    updateSettings((x) => {
      const y = x.routine.find((z) => z.id === id)
      if (y) y.text = v
    }),
  )
  return (
    <div className="flex min-h-[3.25rem] items-center gap-3 pl-3">
      <button
        type="button"
        aria-label={`Remove ${text}`}
        onClick={() => updateSettings((x) => void (x.routine = x.routine.filter((z) => z.id !== id)))}
        className="grid size-8 place-items-center text-destructive active:scale-90"
      >
        <CircleMinus className="size-[1.375rem] fill-destructive text-white" />
      </button>
      <input
        value={d.draft}
        onChange={(e) => d.change(e.target.value)}
        onBlur={d.flush}
        enterKeyHint="done"
        className="min-w-0 flex-1 bg-transparent py-3 pr-4 text-[1.0625rem] outline-none"
      />
    </div>
  )
}

export function Component() {
  const s = useSettings()
  const [draft, setDraft] = useState("")
  const add = () => {
    const t = draft.trim()
    if (t) updateSettings((x) => void x.routine.push({ id: uid(), text: t }))
    setDraft("")
  }
  return (
    <Page title="Daily Routine" back="/more" backLabel="Settings">
      <Group footer="These non-negotiables appear as a checklist on every day's page.">
        {s?.routine.map((r) => <Item key={r.id} id={r.id} text={r.text} />)}
        <form
          className="flex min-h-[3.25rem] items-center gap-3 pl-3"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <CirclePlus className="m-[0.3125rem] size-[1.375rem] fill-success text-white" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={add}
            placeholder="Add routine item"
            enterKeyHint="done"
            className="min-w-0 flex-1 bg-transparent py-3 pr-4 text-[1.0625rem] outline-none placeholder:text-muted-foreground/60"
          />
        </form>
      </Group>
    </Page>
  )
}
