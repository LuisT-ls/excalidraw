import type { ReactNode } from "react";

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

export function ActionMenuDivider() {
  return <div className="my-2 border-t border-slate-200 dark:border-slate-700" />;
}
