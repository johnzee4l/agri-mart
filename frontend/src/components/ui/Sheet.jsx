import { Drawer } from "@base-ui/react/drawer";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";

/* Bottom sheet for mobile summaries, the install prompt and notification opt-in
   (designtokens.md 11, 15). Base UI Drawer adds drag-to-dismiss, focus trap and
   Escape; swipe direction is down. */
export default function Sheet({ open, onClose, title, children, className, ...rest }) {
  return (
    <Drawer.Root
      open={open}
      swipeDirection="down"
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--overlay)]" />
        <Drawer.Viewport className="fixed inset-0 z-[var(--z-sheet)] flex items-end justify-center">
          <Drawer.Popup
            className={cn(
              "max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-float",
              className,
            )}
            {...rest}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <Drawer.Title className="text-heading-sm text-fg">{title}</Drawer.Title>
              <Drawer.Close
                aria-label="Close sheet"
                className="rounded-full p-2 text-fg-muted hover:bg-muted"
              >
                <X size={20} aria-hidden="true" />
              </Drawer.Close>
            </div>
            {children}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
