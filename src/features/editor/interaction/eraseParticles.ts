import { getBoundingBox } from "./hitTesting";
import type { SceneElement } from "../model/types";

export interface EraseParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  angularVelocity: number;
  life: number;
  maxLife: number;
  color: string;
}

export const MAX_ERASE_PARTICLES = 200;
const MIN_PARTICLES_PER_ELEMENT = 8;
const MAX_PARTICLES_PER_ELEMENT = 20;
const MIN_LIFE_MS = 400;
const MAX_LIFE_MS = 700;
const GRAVITY = 0.00012;

type RandomSource = () => number;

function randomBetween(random: RandomSource, min: number, max: number): number {
  return min + random() * (max - min);
}

export function createEraseParticles(
  element: SceneElement,
  random: RandomSource = Math.random,
): EraseParticle[] {
  const bounds = getBoundingBox(element);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const count =
    MIN_PARTICLES_PER_ELEMENT +
    Math.floor(
      random() *
        (MAX_PARTICLES_PER_ELEMENT - MIN_PARTICLES_PER_ELEMENT + 1),
    );

  return Array.from({ length: count }, () => {
    const x = randomBetween(random, bounds.x, bounds.x + bounds.width);
    const y = randomBetween(random, bounds.y, bounds.y + bounds.height);
    const radialX = x - centerX;
    const radialY = y - centerY;
    const radialLength = Math.hypot(radialX, radialY);
    const fallbackAngle = random() * Math.PI * 2;
    const directionX =
      radialLength > 0 ? radialX / radialLength : Math.cos(fallbackAngle);
    const directionY =
      radialLength > 0 ? radialY / radialLength : Math.sin(fallbackAngle);
    const speed = randomBetween(random, 0.025, 0.09);
    const maxLife = randomBetween(random, MIN_LIFE_MS, MAX_LIFE_MS);

    return {
      x,
      y,
      vx: directionX * speed + randomBetween(random, -0.02, 0.02),
      vy: directionY * speed + randomBetween(random, -0.02, 0.02),
      size: randomBetween(random, 2, 4),
      rotation: randomBetween(random, 0, Math.PI * 2),
      angularVelocity: randomBetween(random, -0.008, 0.008),
      life: maxLife,
      maxLife,
      color: element.strokeColor,
    };
  });
}

export function spawnEraseParticles(
  particles: EraseParticle[],
  element: SceneElement,
  random: RandomSource = Math.random,
): EraseParticle[] {
  const availableSlots = MAX_ERASE_PARTICLES - particles.length;

  if (availableSlots <= 0) {
    return particles;
  }

  return [
    ...particles,
    ...createEraseParticles(element, random).slice(0, availableSlots),
  ];
}

export function updateEraseParticles(
  particles: EraseParticle[],
  elapsedMs: number,
): EraseParticle[] {
  const realElapsed = Math.max(0, elapsedMs);
  const elapsed = Math.min(realElapsed, 64);

  return particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * elapsed,
      y: particle.y + particle.vy * elapsed,
      vy: particle.vy + GRAVITY * elapsed,
      rotation: particle.rotation + particle.angularVelocity * elapsed,
      // A física usa um delta limitado para evitar saltos, mas a vida usa o
      // tempo real para que partículas não sobrevivam além do seu prazo após
      // uma pausa de renderização ou troca de aba.
      life: particle.life - realElapsed,
    }))
    .filter((particle) => particle.life > 0);
}

export function drawEraseParticles(
  context: CanvasRenderingContext2D,
  particles: EraseParticle[],
): void {
  context.save();

  for (const particle of particles) {
    context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    context.fillStyle = particle.color;
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);
    context.fillRect(
      -particle.size / 2,
      -particle.size / 2,
      particle.size,
      particle.size,
    );
    context.rotate(-particle.rotation);
    context.translate(-particle.x, -particle.y);
  }

  context.restore();
}
