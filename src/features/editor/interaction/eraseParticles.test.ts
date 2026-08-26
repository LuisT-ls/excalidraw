import { describe, expect, it } from "vitest";
import {
  createEraseParticles,
  MAX_ERASE_PARTICLES,
  spawnEraseParticles,
  updateEraseParticles,
  type EraseParticle,
} from "./eraseParticles";
import { exampleElements } from "../model/exampleScene";

describe("erase particles", () => {
  it("cria partículas na bbox, com a cor do elemento e tamanho pequeno", () => {
    const element = exampleElements.find(
      (candidate) => candidate.type === "rectangle",
    );

    if (!element) {
      throw new Error("Elemento de exemplo não encontrado");
    }

    const particles = createEraseParticles(element, () => 0.5);

    expect(particles.length).toBeGreaterThanOrEqual(8);
    expect(particles.length).toBeLessThanOrEqual(20);
    expect(particles.every((particle) => particle.color === element.strokeColor)).toBe(
      true,
    );
    expect(particles.every((particle) => particle.size >= 2 && particle.size <= 4)).toBe(
      true,
    );
    expect(
      particles.every(
        (particle) =>
          particle.x >= element.x && particle.x <= element.x + element.width &&
          particle.y >= element.y && particle.y <= element.y + element.height,
      ),
    ).toBe(true);
  });

  it("aplica movimento, gravidade, rotação e expira partículas", () => {
    const particle: EraseParticle = {
      x: 0,
      y: 0,
      vx: 1,
      vy: 0,
      size: 3,
      rotation: 0,
      angularVelocity: 0.1,
      life: 100,
      maxLife: 100,
      color: "#000",
    };
    const [updated] = updateEraseParticles([particle], 50);

    expect(updated.x).toBe(50);
    expect(updated.y).toBe(0);
    expect(updated.vy).toBeGreaterThan(0);
    expect(updated.rotation).toBe(5);
    expect(updateEraseParticles([particle], 100)).toEqual([]);
  });

  it("limita o total de partículas ativas", () => {
    const existing = Array.from({ length: MAX_ERASE_PARTICLES }, (_, index) => ({
      x: index,
      y: index,
      vx: 0,
      vy: 0,
      size: 2,
      rotation: 0,
      angularVelocity: 0,
      life: 500,
      maxLife: 500,
      color: "#000",
    }));

    expect(spawnEraseParticles(existing, exampleElements[1], () => 0.5)).toBe(
      existing,
    );
  });
});
