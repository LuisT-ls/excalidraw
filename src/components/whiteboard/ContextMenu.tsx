"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  ActionMenuDivider,
  ActionMenuItem,
} from "@/components/ui/ActionMenu";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuProps {
  position: ContextMenuPosition;
  onClose: () => void;
  children: ReactNode;
}

export function ContextMenu({
  position,
  onClose,
  children,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu contextual"
      className="absolute z-40 min-w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900"
      style={{ left: position.x, top: position.y }}
    >
      {children}
    </div>
  );
}
