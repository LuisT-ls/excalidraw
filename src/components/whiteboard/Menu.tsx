"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { parseScene, removeSavedScene } from "@/features/editor/persistence/sceneStorage";
import {
  exportSceneAsJson,
  exportSceneAsPng,
} from "@/features/editor/persistence/sceneTransfer";
import {
  convertExcalidrawScene,
  getExcalidrawBackgroundColor,
} from "@/features/editor/persistence/excalidrawImport";
import {
  createShareLink,
  SHARE_LINK_WARNING_LENGTH,
} from "@/features/editor/persistence/shareLink";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useTheme, type Theme } from "@/components/theme/ThemeProvider";
import { useWhiteboardStore } from "@/features/editor/store/useWhiteboardStore";
import {
  ActionMenuDivider,
  ActionMenuItem,
} from "@/components/ui/ActionMenu";

interface MenuProps {
  onEnterPresentation: () => void;
}

const BACKGROUND_PRESETS = [
  { label: "Branco", value: "#ffffff" },
  { label: "Cinza claro", value: "#f1f5f9" },
  { label: "Azul claro", value: "#dbeafe" },
  { label: "Amarelo claro", value: "#fef3c7" },
  { label: "Rosa claro", value: "#fce7f3" },
];

const SHORTCUTS = [
  ["V / 1", "Selecionar"],
  ["R", "Retângulo"],
  ["O", "Elipse"],
  ["L", "Linha"],
  ["A", "Seta"],
  ["T", "Texto"],
  ["P", "Lápis"],
  ["E", "Borracha"],
  ["Ctrl/Cmd + Z", "Desfazer"],
  ["Ctrl/Cmd + Shift + Z ou Y", "Refazer"],
  ["Ctrl/Cmd + D", "Duplicar"],
  ["Ctrl/Cmd + C / V", "Copiar / colar"],
  ["Ctrl/Cmd + A", "Selecionar tudo"],
  ["Ctrl/Cmd + Shift + ] / [", "Trazer para frente / enviar para trás"],
  ["Delete / Backspace", "Remover selecionado"],
  ["Shift ao rotacionar", "Ajustar em incrementos de 15°"],
];

const THEME_OPTIONS: Array<{
  value: Theme;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function Menu({ onEnterPresentation }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [customColor, setCustomColor] = useState("");
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const elements = useWhiteboardStore((state) => state.elements);
  const isReadOnly = useWhiteboardStore((state) => state.isReadOnly);
  const backgroundColor = useWhiteboardStore(
    (state) => state.backgroundColor,
  );
  const setElements = useWhiteboardStore((state) => state.setElements);
  const setBackgroundColor = useWhiteboardStore(
    (state) => state.setBackgroundColor,
  );
  const setSelectedElementIds = useWhiteboardStore(
    (state) => state.setSelectedElementIds,
  );
  const commitHistoryEntry = useWhiteboardStore(
    (state) => state.commitHistoryEntry,
  );
  const confirm = useConfirm();

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (isOpen && !menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsShortcutsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    setCustomColor(backgroundColor);
  }, [backgroundColor]);

  const closeMenu = () => setIsOpen(false);

  const clearScene = async () => {
    if (isReadOnly) {
      return;
    }

    closeMenu();

    const confirmed = await confirm({
      title: "Limpar a tela?",
      description: "Todos os elementos do quadro serão removidos. Essa ação pode ser desfeita com Ctrl/Cmd+Z.",
      confirmLabel: "Limpar tudo",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    setElements([]);
    setSelectedElementIds([]);
    removeSavedScene();
  };

  const shareScene = async () => {
    if (elements.length === 0) {
      return;
    }

    closeMenu();

    try {
      const link = await createShareLink({
        type: "whiteboard-scene",
        version: 1,
        elements,
        backgroundColor,
      });

      await navigator.clipboard.writeText(link);
      setShareStatus(
        link.length > SHARE_LINK_WARNING_LENGTH
          ? "Link copiado. Ele é longo e pode ser truncado por algumas plataformas."
          : "Link compartilhável copiado!",
      );
    } catch (error) {
      console.warn("Não foi possível copiar o link compartilhável.", error);
      setShareStatus("Não foi possível copiar o link compartilhável.");
    }

    window.setTimeout(() => setShareStatus(null), 5000);
  };

  useEffect(() => {
    const handleClearSceneRequest = () => {
      void clearScene();
    };

    window.addEventListener("whiteboard:clear-scene", handleClearSceneRequest);

    return () => {
      window.removeEventListener(
        "whiteboard:clear-scene",
        handleClearSceneRequest,
      );
    };
  }, [clearScene]);

  const handleImportChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    let raw: string;

    try {
      raw = await file.text();
    } catch {
      window.alert("Não foi possível ler o arquivo JSON.");
      return;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      window.alert("O arquivo não contém uma cena válida.");
      return;
    }

    const sceneType =
      parsed && typeof parsed === "object" && "type" in parsed
        ? (parsed as { type?: unknown }).type
        : undefined;

    let importedScene = sceneType === "whiteboard-scene" ? parseScene(raw) : null;
    let skipped: ReturnType<typeof convertExcalidrawScene>["skipped"] = [];

    if (sceneType === "excalidraw") {
      const converted = convertExcalidrawScene(parsed);
      importedScene = {
        type: "whiteboard-scene",
        version: 1,
        elements: converted.elements,
        backgroundColor: getExcalidrawBackgroundColor(parsed),
      };
      skipped = converted.skipped;
    }

    if (!importedScene) {
      window.alert("O arquivo não contém uma cena válida.");
      return;
    }

    if (elements.length > 0) {
      closeMenu();

      const confirmed = await confirm({
        title: "Substituir o conteúdo atual?",
        description: "A importação substituirá todos os elementos atuais do quadro. Essa ação pode ser desfeita com Ctrl/Cmd+Z.",
        confirmLabel: "Substituir",
        variant: "destructive",
      });

      if (!confirmed) {
        return;
      }
    }

    commitHistoryEntry();
    setElements(importedScene.elements);
    setSelectedElementIds([]);

    if (importedScene.backgroundColor) {
      setBackgroundColor(importedScene.backgroundColor);
    }

    closeMenu();

    if (skipped.length > 0) {
      const skippedTotal = skipped.reduce(
        (total, item) => total + item.count,
        0,
      );
      const skippedSummary = skipped
        .map(({ type, count }) => `${count} ${type}`)
        .join(", ");

      window.alert(
        `Importado com sucesso. ${skippedTotal} elementos não suportados foram ignorados: ${skippedSummary}.`,
      );
    }
  };

  const openShortcuts = () => {
    setIsOpen(false);
    setIsShortcutsOpen(true);
  };

  const handleCustomColorChange = (value: string) => {
    setCustomColor(value);

    if (/^#[0-9a-f]{6}$/i.test(value)) {
      setBackgroundColor(value);
    }
  };

  const exportPng = () => {
    void exportSceneAsPng(elements, backgroundColor).catch(() => {
      window.alert("Não foi possível exportar a cena como PNG.");
    });
    closeMenu();
  };

  const exportJson = () => {
    exportSceneAsJson(elements, backgroundColor);
    closeMenu();
  };

  const openPresentationMode = () => {
    closeMenu();
    onEnterPresentation();
  };

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label="Abrir menu"
          aria-expanded={isOpen}
          title="Menu"
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-xl text-slate-700 shadow-lg backdrop-blur transition-colors duration-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <span aria-hidden="true">☰</span>
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label="Menu principal"
            className="absolute left-0 top-12 z-30 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900"
          >
            <ActionMenuItem
              onClick={() => importInputRef.current?.click()}
              disabled={isReadOnly}
            >
              Abrir
            </ActionMenuItem>
            <ActionMenuItem
              disabled={elements.length === 0}
              onClick={exportJson}
            >
              Salvar como...
            </ActionMenuItem>
            <ActionMenuItem
              disabled={elements.length === 0}
              onClick={exportPng}
            >
              Exportar imagem...
            </ActionMenuItem>
            <ActionMenuItem
              disabled={elements.length === 0}
              onClick={shareScene}
            >
              Copiar link compartilhável
            </ActionMenuItem>
            <ActionMenuItem
              onClick={clearScene}
              disabled={isReadOnly}
              destructive
            >
              Limpar a tela
            </ActionMenuItem>
            <ActionMenuItem
              onClick={openShortcuts}
            >
              Atalhos de teclado
            </ActionMenuItem>
            <ActionMenuItem onClick={openPresentationMode}>
              Modo apresentação
            </ActionMenuItem>

            <ActionMenuDivider />
            <div className="px-2 py-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Fundo da tela
              </p>
              <div className="grid grid-cols-5 gap-1">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    disabled={isReadOnly}
                    aria-label={`Fundo ${preset.label}`}
                    aria-pressed={backgroundColor === preset.value}
                    title={preset.label}
                    onClick={() => setBackgroundColor(preset.value)}
                    className={`h-7 rounded-md border-2 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 ${
                      backgroundColor === preset.value
                        ? "border-slate-900 ring-1 ring-slate-300 dark:border-white dark:ring-slate-600"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span>Hex</span>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={customColor || backgroundColor}
                  onChange={(event) => handleCustomColorChange(event.target.value)}
                  placeholder="#ffffff"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs uppercase outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-300"
                />
              </label>
            </div>
            <ActionMenuDivider />
            <div className="px-2 py-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Tema
              </p>
              <div className="grid grid-cols-3 gap-1">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`Tema ${label}`}
                    aria-pressed={theme === value}
                    title={label}
                    onClick={() => setTheme(value)}
                    className={`flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs transition-colors ${
                      theme === value
                        ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,.excalidraw,application/json"
              className="hidden"
              onChange={handleImportChange}
            />
          </div>
        )}
      </div>

      {shareStatus && (
        <div
          role="status"
          className="absolute left-0 top-12 z-40 mt-1 w-72 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 shadow-lg transition-colors duration-300 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200"
        >
          {shareStatus}
        </div>
      )}

      {isShortcutsOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4 dark:bg-black/50"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setIsShortcutsOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
          className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="shortcuts-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Atalhos de teclado
              </h2>
              <button
                type="button"
                aria-label="Fechar atalhos"
                onClick={() => setIsShortcutsOpen(false)}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {SHORTCUTS.map(([shortcut, description]) => (
                <div key={shortcut} className="contents">
                  <dt className="font-mono text-xs text-slate-500 dark:text-slate-400">{shortcut}</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{description}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </>
  );
}
