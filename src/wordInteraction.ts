import type {
  CanvasPoint,
  CharacterObject,
  HandInteraction,
  WordObject,
  WordSceneSettings,
} from "./types";

export interface InteractionResult {
  splitWordIds: string[];
}

const PUSH_RADIUS = 120;
const GRAB_RADIUS = 105;
const RELEASE_THROW_SCALE = 0.34;

export function applyWordInteractions(
  words: WordObject[],
  characters: CharacterObject[],
  interactions: HandInteraction[],
  settings: WordSceneSettings,
  deltaSeconds: number,
): InteractionResult {
  const splitWordIds = new Set<string>();
  const activePinches = new Set(
    interactions.filter((hand) => hand.isPinching).map((hand) => hand.id),
  );
  const targets = [...words, ...characters];

  targets.forEach((target) => {
    if (target.grabbedBy && !activePinches.has(target.grabbedBy)) {
      const release = interactions.find((hand) => hand.id === target.grabbedBy);

      if (release) {
        target.vx += release.velocity.x * RELEASE_THROW_SCALE;
        target.vy += release.velocity.y * RELEASE_THROW_SCALE;
        target.lastForce = Math.max(target.lastForce, release.speed);
      }

      target.grabbedBy = null;
    }
  });

  interactions.forEach((hand) => {
    pushNearbyObjects(targets, hand, settings, deltaSeconds);

    if (hand.isPinching) {
      const alreadyGrabbed = targets.find((target) => target.grabbedBy === hand.id);
      const target = alreadyGrabbed ?? findNearestGrabbable(targets, hand.pinchPoint);

      if (target) {
        grabObject(target, hand, settings, deltaSeconds);
      }
    }
  });

  words.forEach((word) => {
    const throwThreshold = 1120 / settings.splitSensitivity;
    const forceThreshold = 960 / settings.splitSensitivity;
    const isStronglyThrown = Math.hypot(word.vx, word.vy) > throwThreshold;

    if (
      !word.isSplit &&
      !word.grabbedBy &&
      (isStronglyThrown || word.lastForce > forceThreshold)
    ) {
      splitWordIds.add(word.id);
    }
  });

  return {
    splitWordIds: [...splitWordIds],
  };
}

function pushNearbyObjects(
  targets: Array<WordObject | CharacterObject>,
  hand: HandInteraction,
  settings: WordSceneSettings,
  deltaSeconds: number,
): void {
  targets.forEach((target) => {
    if (target.grabbedBy) {
      return;
    }

    const distanceToSurface = distanceToObject(target, hand.indexFingerTip);
    const dx = target.x - hand.indexFingerTip.x;
    const dy = target.y - hand.indexFingerTip.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const influence = 1 - Math.min(distanceToSurface / PUSH_RADIUS, 1);

    if (influence <= 0 && distanceToSurface > 0) {
      return;
    }

    const impulse =
      (220 + hand.speed * 0.42) *
      influence *
      settings.softness /
      Math.max(target.mass * settings.mass, 0.3);
    const nx = dx / distance;
    const ny = dy / distance;

    target.vx += nx * impulse * deltaSeconds * 60;
    target.vy += ny * impulse * deltaSeconds * 60;
    target.angularVelocity += (nx * hand.velocity.y - ny * hand.velocity.x) * 0.0005;
    target.deformationAmount = Math.min(
      1,
      target.deformationAmount + influence * settings.softness * 0.42,
    );
    target.lastForce = Math.max(target.lastForce, impulse + hand.speed * influence);
  });
}

function grabObject(
  target: WordObject | CharacterObject,
  hand: HandInteraction,
  settings: WordSceneSettings,
  deltaSeconds: number,
): void {
  target.grabbedBy = hand.id;

  const stiffness = 18 / Math.max(settings.mass * target.mass, 0.35);
  const follow = Math.min(1, stiffness * deltaSeconds);
  const dx = hand.pinchPoint.x - target.x;
  const dy = hand.pinchPoint.y - target.y;

  target.vx = dx / Math.max(deltaSeconds, 1 / 120);
  target.vy = dy / Math.max(deltaSeconds, 1 / 120);
  target.x += dx * follow;
  target.y += dy * follow;
  target.rotation += clamp(hand.velocity.x * 0.00002, -0.045, 0.045);
  target.deformationAmount = Math.min(1, target.deformationAmount + 0.08);
  target.lastForce = Math.max(target.lastForce, hand.speed * 0.55);
}

function findNearestGrabbable(
  targets: Array<WordObject | CharacterObject>,
  point: CanvasPoint,
): WordObject | CharacterObject | null {
  let nearest: WordObject | CharacterObject | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  targets.forEach((target) => {
    if (target.grabbedBy) {
      return;
    }

    const distance = distanceToObject(target, point);

    if (distance < GRAB_RADIUS && distance < nearestDistance) {
      nearest = target;
      nearestDistance = distance;
    }
  });

  return nearest;
}

function nearestPointOnObject(
  target: WordObject | CharacterObject,
  point: CanvasPoint,
): CanvasPoint {
  const halfWidth = target.width * 0.5;
  const halfHeight = target.height * 0.5;

  return {
    x: clamp(point.x, target.x - halfWidth, target.x + halfWidth),
    y: clamp(point.y, target.y - halfHeight, target.y + halfHeight),
  };
}

function distanceToObject(
  target: WordObject | CharacterObject,
  point: CanvasPoint,
): number {
  const nearest = nearestPointOnObject(target, point);
  return Math.hypot(point.x - nearest.x, point.y - nearest.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
