import { useEffect, useRef, type ReactNode } from "react";

export const actionMenuItemClass =
  "flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm text-slate-700 transition-colors duration-300 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";

interface ActionMenuItemProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export function ActionMenuItem({
  children,
  onClick,
  disabled = false,
  destructive = false,
}: ActionMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`${actionMenuItemClass} ${
        destructive
          ? "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
          : ""
      } disabled:cursor-not-allowed disabled:text-slate-300 dark:disabled:text-slate-600`}
    >
      {children}
    </button>
  );
}

interface ActionMenuDisclosureProps {
  label: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  disabled?: boolean;
  contentClassName?: string;
  desktopFlyout?: boolean;
}

const DISCLOSURE_OPEN_DELAY_MS = 150;
const DISCLOSURE_CLOSE_DELAY_MS = 250;

export function ActionMenuDisclosure({
  label,
  open,
  onToggle,
  children,
  disabled = false,
  contentClassName = "ml-2 mt-1",
  desktopFlyout = false,
}: ActionMenuDisclosureProps) {
  const openTimeoutRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const clearOpenTimeout = () => {
    if (openTimeoutRef.current !== null) {
      window.clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
  };

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const isDesktopMouseEvent = (pointerType: string) =>
    desktopFlyout &&
    pointerType === "mouse" &&
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 640px)").matches;

  const scheduleOpen = (pointerType: string) => {
    if (!isDesktopMouseEvent(pointerType) || disabled || open) {
      return;
    }

    clearCloseTimeout();
    clearOpenTimeout();
    openTimeoutRef.current = window.setTimeout(() => {
      openTimeoutRef.current = null;
      onToggle();
    }, DISCLOSURE_OPEN_DELAY_MS);
  };

  const scheduleClose = (pointerType: string) => {
    if (!isDesktopMouseEvent(pointerType)) {
      return;
    }

    clearOpenTimeout();
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      if (open) {
        onToggle();
      }
    }, DISCLOSURE_CLOSE_DELAY_MS);
  };

  useEffect(() => {
    if (open) {
      clearOpenTimeout();
    }

    return () => {
      clearOpenTimeout();
      clearCloseTimeout();
    };
  }, [open]);

  const flyoutContentClassName = desktopFlyout
    ? `${contentClassName} max-h-[calc(100dvh-8rem)] max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain touch-pan-y sm:absolute sm:left-full sm:top-0 sm:z-50 sm:ml-2 sm:mt-0 sm:max-h-[80vh] sm:w-72 sm:rounded-xl sm:border sm:border-slate-200 sm:bg-white sm:p-2 sm:shadow-xl sm:dark:border-slate-700 sm:dark:bg-slate-900`
    : `${contentClassName} max-h-[calc(100dvh-8rem)] max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain touch-pan-y`;

  return (
    <div
      className={desktopFlyout ? "relative" : undefined}
      onPointerLeave={(event) => scheduleClose(event.pointerType)}
    >
      <button
        type="button"
        role="menuitem"
        aria-expanded={open}
        disabled={disabled}
        onPointerEnter={(event) => scheduleOpen(event.pointerType)}
        onClick={() => {
          clearOpenTimeout();
          clearCloseTimeout();
          onToggle();
        }}
        className={`${actionMenuItemClass} justify-between font-medium disabled:cursor-not-allowed disabled:text-slate-300 dark:disabled:text-slate-600`}
      >
        <span>{label}</span>
        <span aria-hidden="true" className="text-xs text-slate-400 dark:text-slate-500">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div
          className={flyoutContentClassName}
          onPointerEnter={(event) => {
            if (isDesktopMouseEvent(event.pointerType)) {
              clearCloseTimeout();
            }
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function ActionMenuDivider() {
  return <div className="my-2 border-t border-slate-200 dark:border-slate-700" />;
}
