import {
  animate,
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "motion/react"

/**
 * Binder page turn, built on Motion.
 *
 * - The page follows the finger while you drag (it hinges on its left edge and
 *   darkens as it lifts), and eases back if you let go early.
 * - Turning forward: the current page swings over the spine, revealing the next
 *   page settling underneath. Turning back: the previous page swings in on top.
 *
 * Fixed-duration tweens (not springs) so the outgoing page finishes and
 * unmounts at a predictable moment — no lingering layer at the end.
 */
const EASE = [0.32, 0.72, 0, 1] as const
const DURATION = 0.42

const turn: Variants = {
  enter: (dir: number) =>
    dir > 0
      ? { rotateY: 0, scale: 0.96, opacity: 0.5, zIndex: 0 }
      : { rotateY: -100, scale: 1, opacity: 1, zIndex: 2 },
  center: { rotateY: 0, scale: 1, opacity: 1, zIndex: 1, transition: { duration: DURATION, ease: EASE } },
  exit: (dir: number) =>
    dir > 0
      ? { rotateY: -100, zIndex: 2, transition: { duration: DURATION, ease: EASE } }
      : { scale: 0.96, opacity: 0, zIndex: 0, transition: { duration: DURATION, ease: EASE } },
}

const fade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

/** Elements that own horizontal gestures themselves. */
const NO_DRAG = "[data-no-swipe],input,textarea,select,canvas,audio,[role=slider],[role=radiogroup]"

function Leaf({ children, onTurn }: { children: React.ReactNode; onTurn: (dir: 1 | -1) => void }) {
  const controls = useDragControls()
  const x = useMotionValue(0)
  const lift = useTransform(x, [-320, 0, 320], [-38, 0, 8])
  const shade = useTransform(x, [-320, 0], [0.22, 0])
  return (
    <motion.div
      drag="x"
      dragListener={false}
      dragControls={controls}
      dragDirectionLock
      dragMomentum={false}
      onPointerDown={(e) => {
        const t = e.target as HTMLElement
        // Leave the screen's left edge to the OS back gesture.
        if (e.clientX < 20 || t.closest(NO_DRAG)) return
        controls.start(e)
      }}
      onDragEnd={(_, info) => {
        const dir = info.offset.x < -70 || info.velocity.x < -450 ? 1 : info.offset.x > 70 || info.velocity.x > 450 ? -1 : 0
        if (dir) onTurn(dir)
        // Cancelled (or turning back): settle this page flat. A forward turn keeps
        // its lift so the exit continues from where the finger left it.
        if (dir !== 1) animate(x, 0, { duration: 0.3, ease: EASE })
      }}
      style={{ x, rotateY: lift, transformOrigin: "left center", touchAction: "pan-y" }}
      className="relative"
    >
      {children}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: shade }} />
    </motion.div>
  )
}

export function PageTurner({
  pageKey,
  direction,
  onTurn,
  children,
}: {
  pageKey: string
  direction: 1 | -1
  onTurn: (dir: 1 | -1) => void
  children: React.ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <div className="relative [perspective:1800px]">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={pageKey}
          custom={direction}
          variants={reduce ? fade : turn}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ transformOrigin: "left center", backfaceVisibility: "hidden", willChange: "transform" }}
          className="w-full bg-background"
        >
          <Leaf onTurn={onTurn}>{children}</Leaf>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
