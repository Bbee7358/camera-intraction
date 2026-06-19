import type {
  CharacterObject,
  HandInteraction,
  WordObject,
  WordSceneSettings,
} from "./types";
import { applyWordInteractions } from "./wordInteraction";

const INITIAL_WORDS = [
  "わからない",
  "たすけて",
  "ありがとう",
  "ほんとう？",
  "さみしい",
  "きいて",
  "ここにいる",
  "まだ言えない",
];

const WORD_FONT_SIZE = 44;
const CHARACTER_FONT_SIZE = 40;

export class WordWorld {
  readonly words: WordObject[] = [];
  readonly characters: CharacterObject[] = [];

  private nextId = 1;

  constructor() {
    this.reset();
  }

  reset(width = 1280, height = 720): void {
    this.words.length = 0;
    this.characters.length = 0;
    this.nextId = 1;

    INITIAL_WORDS.forEach((word, index) => {
      const x = width * (0.18 + (index % 4) * 0.21) + random(-24, 24);
      const y = height * (0.24 + Math.floor(index / 4) * 0.32) + random(-34, 34);

      this.words.push(createWord(this.getId("word"), word, x, y));
    });
  }

  addWord(text: string, width: number, height: number): void {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    this.words.push(
      createWord(
        this.getId("word"),
        trimmed,
        width * 0.5 + random(-80, 80),
        height * 0.5 + random(-60, 60),
      ),
    );
  }

  update(
    deltaSeconds: number,
    width: number,
    height: number,
    interactions: HandInteraction[],
    settings: WordSceneSettings,
  ): void {
    updateMetrics(this.words, this.characters);

    const result = applyWordInteractions(
      this.words,
      this.characters,
      interactions,
      settings,
      deltaSeconds,
    );

    result.splitWordIds.forEach((id) => {
      this.splitWord(id);
    });

    this.words.forEach((word) => {
      updateWord(word, deltaSeconds, width, height, settings);
    });
    this.characters.forEach((character) => {
      updateCharacter(character, deltaSeconds, width, height, settings);
    });
  }

  draw(context: CanvasRenderingContext2D): void {
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";

    this.words.forEach((word) => drawWord(context, word));
    this.characters.forEach((character) => drawCharacter(context, character));

    context.restore();
  }

  private splitWord(id: string): void {
    const index = this.words.findIndex((word) => word.id === id);

    if (index === -1) {
      return;
    }

    const word = this.words[index];
    const chars = [...word.text];
    const spacing = Math.max(28, word.width / Math.max(chars.length, 1));

    chars.forEach((char, charIndex) => {
      const offset = charIndex - (chars.length - 1) / 2;
      const angle = word.rotation + random(-0.8, 0.8);
      const burst = 180 + Math.hypot(word.vx, word.vy) * 0.22;

      this.characters.push({
        id: this.getId("char"),
        char,
        x: word.x + Math.cos(word.rotation) * spacing * offset,
        y: word.y + Math.sin(word.rotation) * spacing * offset,
        vx: word.vx + Math.cos(angle) * burst * random(0.3, 1),
        vy: word.vy + Math.sin(angle) * burst * random(0.3, 1),
        rotation: word.rotation + random(-0.28, 0.28),
        angularVelocity: word.angularVelocity + random(-2.2, 2.2),
        mass: Math.max(0.55, word.mass * 0.55),
        grabbedBy: null,
        deformationAmount: Math.min(1, word.deformationAmount + 0.25),
        lastForce: word.lastForce,
        width: CHARACTER_FONT_SIZE,
        height: CHARACTER_FONT_SIZE * 1.3,
      });
    });

    this.words.splice(index, 1);
  }

  private getId(prefix: string): string {
    const id = `${prefix}-${this.nextId}`;
    this.nextId += 1;
    return id;
  }
}

function createWord(id: string, text: string, x: number, y: number): WordObject {
  const personality = getPersonality(text);
  const width = estimateWordWidth(text);
  const height = WORD_FONT_SIZE * 1.35;

  return {
    id,
    text,
    characters: [...text],
    x,
    y,
    vx: random(-18, 18),
    vy: random(-14, 14),
    ax: 0,
    ay: 0,
    rotation: random(-0.08, 0.08),
    angularVelocity: random(-0.16, 0.16),
    mass: personality === "bouncy" ? 0.82 : personality === "lonely" ? 1.25 : 1,
    softness: personality === "nervous" ? 1.25 : 1,
    elasticity: personality === "bouncy" ? 1.35 : 1,
    grabbedBy: null,
    isSplit: false,
    deformationAmount: 0,
    lastForce: 0,
    width,
    height,
    personality,
  };
}

function updateWord(
  word: WordObject,
  deltaSeconds: number,
  width: number,
  height: number,
  settings: WordSceneSettings,
): void {
  addPersonalityMotion(word, deltaSeconds);
  integrateObject(word, deltaSeconds, width, height, settings, 0.988);
  word.deformationAmount = approach(
    word.deformationAmount,
    0,
    deltaSeconds * (2.2 + settings.elasticity * word.elasticity * 2.4),
  );
  word.lastForce = Math.max(0, word.lastForce - deltaSeconds * 620);
}

function updateCharacter(
  character: CharacterObject,
  deltaSeconds: number,
  width: number,
  height: number,
  settings: WordSceneSettings,
): void {
  integrateObject(character, deltaSeconds, width, height, settings, 0.984);
  character.deformationAmount = approach(
    character.deformationAmount,
    0,
    deltaSeconds * (2.8 + settings.elasticity * 2.1),
  );
  character.lastForce = Math.max(0, character.lastForce - deltaSeconds * 680);
}

function integrateObject(
  object: WordObject | CharacterObject,
  deltaSeconds: number,
  width: number,
  height: number,
  settings: WordSceneSettings,
  damping: number,
): void {
  const halfWidth = object.width * 0.5;
  const halfHeight = object.height * 0.5;
  const centerPull = object.grabbedBy ? 0 : 0.24;

  object.vx += ("ax" in object ? object.ax : 0) * deltaSeconds;
  object.vy += ("ay" in object ? object.ay : 0) * deltaSeconds;
  object.vx += (width * 0.5 - object.x) * centerPull * deltaSeconds;
  object.vy += (height * 0.5 - object.y) * centerPull * deltaSeconds;
  object.x += object.vx * deltaSeconds;
  object.y += object.vy * deltaSeconds;
  object.rotation += object.angularVelocity * deltaSeconds;
  object.vx *= Math.pow(damping, deltaSeconds * 60);
  object.vy *= Math.pow(damping, deltaSeconds * 60);
  object.angularVelocity *= Math.pow(0.988, deltaSeconds * 60);

  if (object.x < halfWidth) {
    object.x = halfWidth;
    object.vx = Math.abs(object.vx) * settings.elasticity * 0.72;
  } else if (object.x > width - halfWidth) {
    object.x = width - halfWidth;
    object.vx = -Math.abs(object.vx) * settings.elasticity * 0.72;
  }

  if (object.y < halfHeight) {
    object.y = halfHeight;
    object.vy = Math.abs(object.vy) * settings.elasticity * 0.72;
  } else if (object.y > height - halfHeight) {
    object.y = height - halfHeight;
    object.vy = -Math.abs(object.vy) * settings.elasticity * 0.72;
  }

  if ("ax" in object) {
    object.ax = 0;
    object.ay = 0;
  }
}

function drawWord(context: CanvasRenderingContext2D, word: WordObject): void {
  const pulse = 1 + word.deformationAmount * 0.18;
  const squash = 1 - word.deformationAmount * 0.16;

  context.save();
  context.translate(word.x, word.y);
  context.rotate(word.rotation);
  context.scale(pulse, squash);
  context.font = `700 ${WORD_FONT_SIZE}px "Hiragino Sans", "Yu Gothic", system-ui, sans-serif`;

  drawSoftTextBody(context, word.text, word.width, word.height, word.deformationAmount);

  context.fillStyle = "rgba(250, 253, 255, 0.96)";
  context.fillText(word.text, 0, 0);
  context.restore();
}

function drawCharacter(context: CanvasRenderingContext2D, character: CharacterObject): void {
  const pulse = 1 + character.deformationAmount * 0.18;

  context.save();
  context.translate(character.x, character.y);
  context.rotate(character.rotation);
  context.scale(pulse, 1 / Math.max(0.78, pulse));
  context.font = `700 ${CHARACTER_FONT_SIZE}px "Hiragino Sans", "Yu Gothic", system-ui, sans-serif`;

  drawSoftTextBody(
    context,
    character.char,
    character.width,
    character.height,
    character.deformationAmount,
  );

  context.fillStyle = "rgba(250, 253, 255, 0.95)";
  context.fillText(character.char, 0, 0);
  context.restore();
}

function drawSoftTextBody(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  deformation: number,
): void {
  const radius = 18 + deformation * 12;
  const paddingX = 22;
  const paddingY = 12;
  const bodyWidth = width + paddingX * 2;
  const bodyHeight = height + paddingY;

  context.shadowColor = "rgba(35, 216, 255, 0.24)";
  context.shadowBlur = 24 + deformation * 18;
  context.fillStyle = `rgba(26, 37, 48, ${0.58 + deformation * 0.14})`;
  roundedRect(context, -bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, radius);
  context.fill();
  context.shadowBlur = 0;

  context.strokeStyle = `rgba(191, 238, 255, ${0.34 + deformation * 0.18})`;
  context.lineWidth = 1.4 + deformation * 1.6;
  context.stroke();

  context.strokeStyle = `rgba(255, 255, 255, ${0.18 + deformation * 0.16})`;
  context.lineWidth = 6;
  context.strokeText(text, 0, 0);
}

function updateMetrics(words: WordObject[], characters: CharacterObject[]): void {
  words.forEach((word) => {
    word.width = estimateWordWidth(word.text);
    word.height = WORD_FONT_SIZE * 1.35;
  });
  characters.forEach((character) => {
    character.width = CHARACTER_FONT_SIZE;
    character.height = CHARACTER_FONT_SIZE * 1.3;
  });
}

function estimateWordWidth(text: string): number {
  let width = 0;

  [...text].forEach((char) => {
    width += /[A-Za-z0-9?？!！]/.test(char) ? WORD_FONT_SIZE * 0.58 : WORD_FONT_SIZE;
  });

  return Math.max(WORD_FONT_SIZE, width);
}

function addPersonalityMotion(word: WordObject, deltaSeconds: number): void {
  if (word.personality === "nervous") {
    word.vx += random(-18, 18) * deltaSeconds;
    word.vy += random(-18, 18) * deltaSeconds;
  } else if (word.personality === "lonely") {
    word.vy += Math.sin(performance.now() * 0.001 + word.x * 0.01) * deltaSeconds * 8;
  } else if (word.personality === "evasive") {
    word.angularVelocity += Math.sin(performance.now() * 0.0013 + word.y * 0.01) * deltaSeconds * 0.06;
  }
}

function getPersonality(text: string): WordObject["personality"] {
  if (text.includes("たすけて")) {
    return "nervous";
  }

  if (text.includes("ありがとう")) {
    return "bouncy";
  }

  if (text.includes("さみしい")) {
    return "lonely";
  }

  if (text.includes("まだ言えない")) {
    return "evasive";
  }

  return "default";
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width * 0.5, height * 0.5);

  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
}

function approach(current: number, target: number, amount: number): number {
  if (current < target) {
    return Math.min(target, current + amount);
  }

  return Math.max(target, current - amount);
}

function random(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
