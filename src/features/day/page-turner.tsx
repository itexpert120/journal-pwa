import { AnimatePresence, motion, useDragControls, useMotionValue, useReducedMotion, useTransform, type Variants } from "motion/react"

/**
 * Binder page turn, built on Motion.
 *
 * - The page follows the finger while you drag (it hinges on its left edge and
 *   darkens as it lifts), and springs back if you let go early.
 * - Turning forward: the current page swings over the spine and reveals the
 *   next page settling underneath. Turning back: the previous page swings in
 *   over the top. Flick velocity counts, not just distance.
 */
const SPRING = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 } as const

const turn: Variants = {
  enter: (dir: number) =>
    dir > 0
      ? { rotateY: 0, scale: 0.96, opacity: 0.4, zIndex: 0 }
      : { rotateY: -110, scale: 1, opacity: 1, zIndex: 2 },
  center: { rotateY: 0, scale: 1, opacity: 1, zIndex: 1, transition: SPRING },
  exit: (dir: number) =>
    dir > 0
      ? { rotateY: -110, opacity: 1, zIndex: 2, transition: { ...SPRING, stiffness: 200 } }
      : { rotateY: 0, scale: 0.96, opacity: 0.4, zIndex: 0, transition: SPRING },
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
  const shade = useTransform(x, [-320, 0], [0.28, 0])
  return (
    <motion.div
      drag="x"
      dragListener={false}
      dragControls={controls}
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.55}
      onPointerDown={(e) => {
        const t = e.target as HTMLElement
        // Leave the screen's left edge to the OS back gesture.
        if (e.clientX < 20 || t.closest(NO_DRAG)) return
        controls.start(e)
      }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -70 || info.velocity.x < -450) onTurn(1)
        else if (info.offset.x > 70 || info.velocity.x > 450) onTurn(-1)
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
          style={{ transformOrigin: "left center", backfaceVisibility: "hidden" }}
          className="w-full bg-background"
        >
          <Leaf onTurn={onTurn}>{children}</Leaf>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
