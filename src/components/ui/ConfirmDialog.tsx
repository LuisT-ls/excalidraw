"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConfirmVariant = "neutral" | "destructive";

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

type PendingConfirmation = Required<ConfirmOptions>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue["confirm"] {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm precisa estar dentro de ConfirmDialogProvider.");
  }

  return context.confirm;
}

interface ConfirmDialogViewProps {
  request: PendingConfirmation;
  onResolve: (confirmed: boolean) => void;
}

function ConfirmDialogView({ request, onResolve }: ConfirmDialogViewProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const isDestructive = request.variant === "destructive";

  useEffect(() => {
    const focusTarget = isDestructive
      ? cancelButtonRef.current
      : confirmButtonRef.current;

    focusTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onResolve(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );

      if (!focusable || focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDestructive, onResolve]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onResolve(false);
        }
      }}
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="motion-safe:animate-[confirm-dialog-in_160ms_ease-out] w-full max-w-md rounded-[19px_23px_21px_25px] border-2 border-slate-800 bg-[#fffefa] p-6 shadow-2xl"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
          {request.title}
        </h2>
        <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">
          {request.description}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={() => onResolve(false)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            {request.cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={() => onResolve(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDestructive
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                : "bg-slate-800 hover:bg-slate-900 focus:ring-slate-500"
            }`}
          >
            {request.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PendingConfirmation | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const resolveConfirmation = useCallback((confirmed: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolver?.(confirmed);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    if (resolverRef.current) {
      resolverRef.current(false);
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setRequest({
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? "Confirmar",
        cancelLabel: options.cancelLabel ?? "Cancelar",
        variant: options.variant ?? "neutral",
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialogHost request={request} onResolve={resolveConfirmation} />
    </ConfirmContext.Provider>
  );
}

export function ConfirmDialogHost({
  request,
  onResolve,
}: {
  request: PendingConfirmation | null;
  onResolve: (confirmed: boolean) => void;
}) {
  if (!request) {
    return null;
  }

  return <ConfirmDialogView request={request} onResolve={onResolve} />;
}
