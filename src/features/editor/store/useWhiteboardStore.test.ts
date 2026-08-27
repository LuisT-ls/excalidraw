import { beforeEach, describe, expect, it } from "vitest";
import { exampleElements } from "../model/exampleScene";
import { useWhiteboardStore } from "./useWhiteboardStore";

beforeEach(() => {
  useWhiteboardStore.getState().setElements(exampleElements);
  useWhiteboardStore.getState().setSelectedElementIds([]);
  useWhiteboardStore.getState().setActiveTool("select");
  useWhiteboardStore.getState().setToolLocked(false);
  useWhiteboardStore.getState().setStyle({
    strokeColor: "#1f2937",
    strokeWidth: 2.5,
    fillColor: null,
    fillStyle: "none",
  });
  useWhiteboardStore.getState().setViewport({
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  });
  useWhiteboardStore.setState({ pastStates: [], futureStates: [] });
});

describe("useWhiteboardStore", () => {
  it("mantém e atualiza elementos pela API central", () => {
    const store = useWhiteboardStore.getState();
    const original = store.elements[0];

    store.removeElement(original.id);
    expect(useWhiteboardStore.getState().elements).not.toContain(original);

    store.addElement(original);
    store.updateElement(original.id, { opacity: 0.5 });

    expect(useWhiteboardStore.getState().elements.at(-1)?.opacity).toBe(0.5);
  });

  it("expõe viewport, estilo e ações de controle", () => {
    const store = useWhiteboardStore.getState();

    store.setViewport((current) => ({ ...current, zoom: 2 }));
    store.setStyle({ strokeWidth: 4 });
    store.setSelectedElementIds(["example-text"]);
    store.setActiveTool("pencil");
    store.setActiveTool("hand");
    store.toggleToolLocked();

    expect(useWhiteboardStore.getState().viewport.zoom).toBe(2);
    expect(useWhiteboardStore.getState().style.strokeWidth).toBe(4);
    expect(useWhiteboardStore.getState().selectedElementIds).toEqual(["example-text"]);
    expect(useWhiteboardStore.getState().activeTool).toBe("hand");
    expect(useWhiteboardStore.getState().toolLocked).toBe(true);
  });

  it("registra uma entrada por gesto e restaura com undo/redo", () => {
    const store = useWhiteboardStore.getState();
    const element = store.elements[0];
    const initialX = element.x;

    store.commitHistoryEntry();
    store.updateElement(element.id, { x: initialX + 20 });
    store.updateElement(element.id, { x: initialX + 40 });

    expect(useWhiteboardStore.getState().pastStates).toHaveLength(1);
    expect(useWhiteboardStore.getState().elements[0].x).toBe(initialX + 40);

    store.undo();
    expect(useWhiteboardStore.getState().elements[0].x).toBe(initialX);
    expect(useWhiteboardStore.getState().futureStates).toHaveLength(1);

    store.redo();
    expect(useWhiteboardStore.getState().elements[0].x).toBe(initialX + 40);
    expect(useWhiteboardStore.getState().pastStates).toHaveLength(1);
    expect(useWhiteboardStore.getState().futureStates).toHaveLength(0);
  });

  it("restaura vários elementos movidos com um único snapshot", () => {
    const store = useWhiteboardStore.getState();
    const selected = store.elements.slice(0, 2);
    const initialPositions = selected.map((element) => ({
      id: element.id,
      x: element.x,
      y: element.y,
    }));

    store.commitHistoryEntry();
    for (const element of selected) {
      store.updateElement(element.id, {
        x: element.x + 40,
        y: element.y + 15,
      });
    }

    expect(useWhiteboardStore.getState().pastStates).toHaveLength(1);

    store.undo();

    expect(
      initialPositions.map(({ id }) => {
        const restored = useWhiteboardStore
          .getState()
          .elements.find((element) => element.id === id);

        return { id, x: restored?.x, y: restored?.y };
      }),
    ).toEqual(initialPositions);
  });

  it("invalida redo quando uma nova ação começa após undo", () => {
    const store = useWhiteboardStore.getState();
    const element = store.elements[0];
    const initialX = element.x;

    store.commitHistoryEntry();
    store.updateElement(element.id, { x: initialX + 10 });
    store.undo();
    expect(useWhiteboardStore.getState().futureStates).toHaveLength(1);

    store.commitHistoryEntry();
    store.updateElement(element.id, { x: initialX + 20 });

    expect(useWhiteboardStore.getState().futureStates).toHaveLength(0);
    store.redo();
    expect(useWhiteboardStore.getState().elements[0].x).toBe(initialX + 20);
  });

  it("reordena elementos para frente e para trás sem mutar o array anterior", () => {
    const store = useWhiteboardStore.getState();
    const originalOrder = store.elements.map((element) => element.id);
    const targetId = originalOrder[1];

    store.commitHistoryEntry();
    store.moveElementToFront(targetId);

    expect(useWhiteboardStore.getState().elements.map((element) => element.id)).toEqual([
      originalOrder[0],
      ...originalOrder.slice(2),
      targetId,
    ]);
    expect(originalOrder).toEqual(store.elements.map((element) => element.id));

    store.setElements(exampleElements);
    store.moveElementToBack(targetId);

    expect(useWhiteboardStore.getState().elements.map((element) => element.id)).toEqual([
      targetId,
      originalOrder[0],
      ...originalOrder.slice(2),
    ]);
  });

  it("agrupa e desagrupa os elementos selecionados", () => {
    const store = useWhiteboardStore.getState();
    const ids = store.elements.slice(0, 2).map((element) => element.id);

    store.groupElements(ids, "group-test");
    expect(
      useWhiteboardStore
        .getState()
        .elements.filter((element) => ids.includes(element.id))
        .every((element) => element.groupId === "group-test"),
    ).toBe(true);

    store.ungroupElements([ids[0]]);
    expect(
      useWhiteboardStore
        .getState()
        .elements.filter((element) => ids.includes(element.id))
        .every((element) => element.groupId === null),
    ).toBe(true);
  });

  it("restaura todas as remoções de um gesto de borracha com um undo", () => {
    const store = useWhiteboardStore.getState();
    const removedIds = store.elements.slice(0, 3).map((element) => element.id);

    store.commitHistoryEntry();
    for (const id of removedIds) {
      store.removeElement(id);
    }

    expect(useWhiteboardStore.getState().pastStates).toHaveLength(1);
    expect(
      useWhiteboardStore
        .getState()
        .elements.some((element) => removedIds.includes(element.id)),
    ).toBe(false);

    store.undo();

    expect(
      removedIds.every((id) =>
        useWhiteboardStore
          .getState()
          .elements.some((element) => element.id === id),
      ),
    ).toBe(true);
  });

  it("remove o elemento selecionado como uma ação desfazível", () => {
    const store = useWhiteboardStore.getState();
    const selectedId = store.elements[0].id;

    store.setSelectedElementIds([selectedId]);
    store.commitHistoryEntry();
    store.removeElement(selectedId);
    store.setSelectedElementIds([]);

    expect(useWhiteboardStore.getState().elements).not.toContainEqual(
      expect.objectContaining({ id: selectedId }),
    );

    store.undo();

    expect(useWhiteboardStore.getState().elements).toContainEqual(
      expect.objectContaining({ id: selectedId }),
    );
  });

  it("agrupa movimento e remoção de múltiplos elementos em uma entrada cada", () => {
    const store = useWhiteboardStore.getState();
    const selected = store.elements.slice(0, 2);
    const initialPositions = selected.map(({ id, x, y }) => ({ id, x, y }));

    store.setSelectedElementIds(selected.map((element) => element.id));
    store.commitHistoryEntry();
    for (const element of selected) {
      store.updateElement(element.id, { x: element.x + 30, y: element.y + 15 });
    }

    expect(useWhiteboardStore.getState().pastStates).toHaveLength(1);
    store.undo();
    expect(
      initialPositions.map(({ id }) => {
        const element = useWhiteboardStore.getState().elements.find(
          (candidate) => candidate.id === id,
        );
        return { id, x: element?.x, y: element?.y };
      }),
    ).toEqual(initialPositions);

    store.commitHistoryEntry();
    for (const element of selected) {
      store.removeElement(element.id);
    }

    expect(useWhiteboardStore.getState().pastStates).toHaveLength(1);
    expect(
      selected.every(
        (element) =>
          !useWhiteboardStore
            .getState()
            .elements.some((candidate) => candidate.id === element.id),
      ),
    ).toBe(true);
  });

  it("não altera elementos quando não há histórico para desfazer/refazer", () => {
    const before = useWhiteboardStore.getState().elements;

    useWhiteboardStore.getState().undo();
    useWhiteboardStore.getState().redo();

    expect(useWhiteboardStore.getState().elements).toBe(before);
  });
});
