"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Monitor,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { parseScene } from "@/features/editor/persistence/sceneStorage";
import {
  createBoard,
  DEFAULT_BOARD_BACKGROUND,
  DEFAULT_BOARD_VIEWPORT,
  deleteBoard,
  duplicateBoard,
  getMostRecentlyUpdatedBoard,
  loadBoardScene,
  renameBoard,
  saveBoardScene,
  saveCurrentBoardId,
  type BoardMetadata,
} from "@/features/editor/persistence/boardStorage";
import {
  exportSceneAsJson,
  exportSceneAsPng,
  exportSceneAsSvg,
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
import { useEditorPreferencesStore } from "@/features/editor/store/useEditorPreferencesStore";
import { useWhiteboardStore } from "@/features/editor/store/useWhiteboardStore";
import {
  ActionMenuDivider,
  ActionMenuDisclosure,
  ActionMenuItem,
} from "@/components/ui/ActionMenu";

interface MenuProps {
  isViewMode: boolean;
  isZenMode: boolean;
  onEnterPresentation: () => void;
  onToggleStats: () => void;
  onToggleViewMode: () => void;
  onToggleZen: () => void;
  showStats: boolean;
}

type MenuSection = "file" | "view" | "preferences";

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

export function Menu({
  isViewMode,
  isZenMode,
  onEnterPresentation,
  onToggleStats,
  onToggleViewMode,
  onToggleZen,
  showStats,
}: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<MenuSection | null>(
    null,
  );
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [customColor, setCustomColor] = useState("");
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardName, setEditingBoardName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const marqueeSelectionMode = useEditorPreferencesStore(
    (state) => state.marqueeSelectionMode,
  );
  const setMarqueeSelectionMode = useEditorPreferencesStore(
    (state) => state.setMarqueeSelectionMode,
  );
  const showGrid = useEditorPreferencesStore((state) => state.showGrid);
  const snapToGrid = useEditorPreferencesStore((state) => state.snapToGrid);
  const setShowGrid = useEditorPreferencesStore((state) => state.setShowGrid);
  const setSnapToGrid = useEditorPreferencesStore(
    (state) => state.setSnapToGrid,
  );
  const elements = useWhiteboardStore((state) => state.elements);
  const boards = useWhiteboardStore((state) => state.boards);
  const currentBoardId = useWhiteboardStore((state) => state.currentBoardId);
  const viewport = useWhiteboardStore((state) => state.viewport);
  const isReadOnly = useWhiteboardStore((state) => state.isReadOnly);
  const backgroundColor = useWhiteboardStore(
    (state) => state.backgroundColor,
  );
  const setElements = useWhiteboardStore((state) => state.setElements);
  const setBoards = useWhiteboardStore((state) => state.setBoards);
  const setCurrentBoardId = useWhiteboardStore(
    (state) => state.setCurrentBoardId,
  );
  const setViewport = useWhiteboardStore((state) => state.setViewport);
  const resetHistory = useWhiteboardStore((state) => state.resetHistory);
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

  const closeMenu = () => {
    setIsOpen(false);
    setExpandedSection(null);
    setIsExportMenuOpen(false);
    setEditingBoardId(null);
  };

  const toggleSection = (section: MenuSection) => {
    setExpandedSection((currentSection) =>
      currentSection === section ? null : section,
    );
    setIsExportMenuOpen(false);
  };

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
      return;
    }

    setIsOpen(true);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (isOpen && !menuRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
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
  };

  const persistCurrentBoard = () => {
    if (!currentBoardId) {
      return;
    }

    saveBoardScene(currentBoardId, {
      type: "whiteboard-scene",
      version: 1,
      elements,
      viewport,
      backgroundColor,
    });
  };

  const applyBoardScene = (
    boardId: string,
    scene: ReturnType<typeof loadBoardScene>,
  ) => {
    if (!scene) {
      return;
    }

    setCurrentBoardId(boardId);
    saveCurrentBoardId(boardId);
    setElements(scene.elements);
    setViewport(scene.viewport ?? DEFAULT_BOARD_VIEWPORT);
    setBackgroundColor(scene.backgroundColor ?? DEFAULT_BOARD_BACKGROUND);
    setSelectedElementIds([]);
    resetHistory();
  };

  const switchBoard = (board: BoardMetadata) => {
    if (isReadOnly || board.id === currentBoardId) {
      closeMenu();
      return;
    }

    persistCurrentBoard();
    applyBoardScene(board.id, loadBoardScene(board.id));
    closeMenu();
  };

  const nextUntitledBoardName = () => {
    const baseName = "Quadro sem título";
    const names = new Set(boards.map((board) => board.name));

    if (!names.has(baseName)) {
      return baseName;
    }

    let suffix = 2;
    while (names.has(`${baseName} ${suffix}`)) {
      suffix += 1;
    }

    return `${baseName} ${suffix}`;
  };

  const createNewBoard = () => {
    if (isReadOnly) {
      return;
    }

    persistCurrentBoard();
    const created = createBoard(nextUntitledBoardName());
    setBoards([...boards, created.metadata]);
    applyBoardScene(created.metadata.id, created.scene);
    closeMenu();
  };

  const startRenamingBoard = (board: BoardMetadata) => {
    if (isReadOnly) {
      return;
    }

    setEditingBoardId(board.id);
    setEditingBoardName(board.name);
  };

  const finishRenamingBoard = () => {
    if (!editingBoardId) {
      return;
    }

    const nextBoards = renameBoard(editingBoardId, editingBoardName);
    setBoards(nextBoards);
    setEditingBoardId(null);
  };

  const duplicateBoardFromMenu = (board: BoardMetadata) => {
    if (isReadOnly) {
      return;
    }

    persistCurrentBoard();
    const duplicated = duplicateBoard(board.id);
    if (!duplicated) {
      return;
    }

    setBoards([...boards, duplicated.metadata]);
    applyBoardScene(duplicated.metadata.id, duplicated.scene);
    closeMenu();
  };

  const deleteBoardFromMenu = async (board: BoardMetadata) => {
    if (isReadOnly) {
      return;
    }

    const confirmed = await confirm({
      title: `Excluir “${board.name}”?`,
      description: "O quadro e todo o conteúdo salvo nele serão removidos. Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir quadro",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    const wasActive = board.id === currentBoardId;
    if (wasActive) {
      persistCurrentBoard();
    }

    let nextBoards = deleteBoard(board.id);
    if (nextBoards.length === 0) {
      const created = createBoard();
      nextBoards = [created.metadata];
      setBoards(nextBoards);
      applyBoardScene(created.metadata.id, created.scene);
    } else {
      setBoards(nextBoards);

      if (wasActive) {
        const nextBoard = getMostRecentlyUpdatedBoard(nextBoards)!;
        applyBoardScene(nextBoard.id, loadBoardScene(nextBoard.id));
      }
    }

    closeMenu();
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
    closeMenu();
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

  const exportSvg = () => {
    exportSceneAsSvg(elements, backgroundColor);
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
          onClick={toggleMenu}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-xl text-slate-700 shadow-lg backdrop-blur transition-colors duration-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <span aria-hidden="true">☰</span>
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label="Menu principal"
            className="absolute left-0 top-12 z-30 max-h-[calc(100vh-5rem)] max-h-[calc(100dvh-5rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain touch-pan-y rounded-xl border border-slate-200 bg-white p-2 shadow-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900 sm:max-h-none sm:w-80 sm:max-w-none sm:overflow-visible"
          >
            <section className="mb-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70">
              <div className="mb-1 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Quadros
                </p>
                <button
                  type="button"
                  aria-label="Novo quadro"
                  title="Novo quadro"
                  disabled={isReadOnly}
                  onClick={createNewBoard}
                  className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="max-h-44 space-y-1 overflow-y-auto">
                {boards.map((board) => {
                  const isCurrent = board.id === currentBoardId;
                  const isEditing = board.id === editingBoardId;

                  return (
                    <div
                      key={board.id}
                      className={
                        isCurrent
                          ? "flex items-center gap-1 rounded-md bg-slate-200 px-1 dark:bg-slate-700"
                          : "flex items-center gap-1 rounded-md px-1 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                      }
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editingBoardName}
                          onChange={(event) => setEditingBoardName(event.target.value)}
                          onBlur={finishRenamingBoard}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              finishRenamingBoard();
                            }
                            if (event.key === "Escape") {
                              setEditingBoardId(null);
                            }
                          }}
                          className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 py-1 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          aria-label={`Renomear ${board.name}`}
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => switchBoard(board)}
                          onDoubleClick={() => startRenamingBoard(board)}
                          className="min-w-0 flex-1 truncate px-1.5 py-1.5 text-left text-sm text-slate-700 disabled:cursor-not-allowed dark:text-slate-200"
                          title={`${board.name} — duplo clique para renomear`}
                        >
                          {board.name}
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Renomear ${board.name}`}
                        title="Renomear"
                        disabled={isReadOnly || isEditing}
                        onClick={() => startRenamingBoard(board)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-600 dark:hover:text-slate-100"
                      >
                        <Pencil size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Duplicar ${board.name}`}
                        title="Duplicar"
                        disabled={isReadOnly}
                        onClick={() => duplicateBoardFromMenu(board)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-600 dark:hover:text-slate-100"
                      >
                        <span aria-hidden="true" className="text-xs">⧉</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${board.name}`}
                        title="Excluir"
                        disabled={isReadOnly}
                        onClick={() => void deleteBoardFromMenu(board)}
                        className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={createNewBoard}
                className="mt-2 flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-300 dark:hover:bg-blue-950/50"
              >
                <Plus size={14} aria-hidden="true" />
                Novo quadro
              </button>
            </section>
            <ActionMenuDisclosure
              label="Arquivo"
              open={expandedSection === "file"}
              onToggle={() => toggleSection("file")}
              desktopFlyout
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
              <ActionMenuDisclosure
                label="Exportar imagem..."
                open={isExportMenuOpen}
                disabled={elements.length === 0}
                onToggle={() => setIsExportMenuOpen((open) => !open)}
                contentClassName="ml-2 mt-1 rounded-md bg-slate-50 p-1 dark:bg-slate-800/70"
              >
                <ActionMenuItem onClick={exportPng}>PNG</ActionMenuItem>
                <ActionMenuItem onClick={exportSvg}>SVG</ActionMenuItem>
              </ActionMenuDisclosure>
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
            </ActionMenuDisclosure>

            <ActionMenuDisclosure
              label="Visualização"
              open={expandedSection === "view"}
              onToggle={() => toggleSection("view")}
              desktopFlyout
            >
              <ActionMenuItem
                onClick={() => {
                  closeMenu();
                  onToggleZen();
                }}
              >
                {isZenMode ? "Sair do modo Zen" : "Modo Zen"}
              </ActionMenuItem>
              <ActionMenuItem
                onClick={() => {
                  closeMenu();
                  onToggleViewMode();
                }}
              >
                {isViewMode ? "Sair do modo de visualização" : "Modo de visualização"}
              </ActionMenuItem>
              <ActionMenuItem
                onClick={() => {
                  closeMenu();
                  onToggleStats();
                }}
              >
                {showStats ? "Ocultar estatísticas" : "Estatísticas"}
              </ActionMenuItem>
              <ActionMenuItem onClick={openPresentationMode}>
                Modo apresentação
              </ActionMenuItem>
            </ActionMenuDisclosure>

            <ActionMenuItem onClick={openShortcuts}>
              Atalhos de teclado
            </ActionMenuItem>

            <ActionMenuDisclosure
              label="Preferências"
              open={expandedSection === "preferences"}
              onToggle={() => toggleSection("preferences")}
              desktopFlyout
            >
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
              <ActionMenuDivider />
              <div className="px-2 py-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Seleção por área
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {([
                    ["overlap", "Overlap"],
                    ["wrap", "Wrap"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`Seleção ${label}`}
                      aria-pressed={marqueeSelectionMode === value}
                      onClick={() => setMarqueeSelectionMode(value)}
                      className={`rounded-md px-2 py-2 text-xs transition-colors ${
                        marqueeSelectionMode === value
                          ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <ActionMenuDivider />
              <div className="space-y-1 px-2 py-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Grade
                </p>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  <span>Mostrar grade</span>
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(event) => setShowGrid(event.target.checked)}
                    className="h-4 w-4 accent-blue-600"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  <span>Encaixar na grade</span>
                  <input
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={(event) => setSnapToGrid(event.target.checked)}
                    className="h-4 w-4 accent-blue-600"
                  />
                </label>
              </div>
            </ActionMenuDisclosure>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,.excalidraw,application/json"
              className="hidden"
              onChange={handleImportChange}
            />
            <p className="mt-2 border-t border-slate-200 px-2 pt-2 text-center text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
              Desenvolvido por{" "}
              <a
                href="https://github.com/LuisT-ls/excalidraw"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-800 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-slate-200"
              >
                Luís Teixeira
              </a>
            </p>
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
