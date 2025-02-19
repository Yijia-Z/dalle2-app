import type React from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  side: "left" | "right"
}

export function MobileDrawer({ isOpen, onClose, children, side }: MobileDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side={side}>{children}</SheetContent>
    </Sheet>
  )
}

