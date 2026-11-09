import { formatHex } from "./color.mjs";

function readColorArray(colors) {
  try {
    if (!Array.isArray(colors) || Object.getPrototypeOf(colors) !== Array.prototype) return null;
    const length = colors.length;
    if (!Number.isInteger(length) || length < 2 || length > 8) return null;

    const ownKeys = Reflect.ownKeys(colors);
    if (ownKeys.length !== length + 1 || !ownKeys.includes("length")) return null;

    const items = [];
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      if (!ownKeys.includes(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(colors, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
      items.push(descriptor.value);
    }
    return items;
  } catch {
    return null;
  }
}

export function exportCss(colors) {
  const items = readColorArray(colors);
  if (!items) throw new RangeError("Expected an array of 2 to 8 exact RGB records.");

  const declarations = items.map((rgb, index) => {
    let hex;
    try {
      hex = formatHex(rgb);
    } catch {
      throw new RangeError("Expected exact RGB records with integer channels from 0 to 255.");
    }
    return `  --color-${index + 1}: ${hex};`;
  });
  return `:root {\n${declarations.join("\n")}\n}\n`;
}

export function exportPairCss(foreground, background) {
  let textHex;
  let backgroundHex;
  try {
    textHex = formatHex(foreground);
    backgroundHex = formatHex(background);
  } catch {
    throw new RangeError("Expected exact RGB records with integer channels from 0 to 255.");
  }
  return `.color-pair {\n  color: ${textHex};\n  background-color: ${backgroundHex};\n}\n`;
}

// Only committed endpoints from one trusted reducer state form a pair snapshot.
export function pairCssForState(state) {
  try {
    const foreground = state.colors.find((color) => color.id === state.foregroundId);
    const background = state.colors.find((color) => color.id === state.backgroundId);
    const foregroundDraft = state.drafts[state.foregroundId];
    const backgroundDraft = state.drafts[state.backgroundId];
    if (!foreground || !background ||
      foregroundDraft?.dirty !== false || foregroundDraft.error !== null ||
      backgroundDraft?.dirty !== false || backgroundDraft.error !== null) return null;
    return exportPairCss(
      { r: foreground.r, g: foreground.g, b: foreground.b },
      { r: background.r, g: background.g, b: background.b },
    );
  } catch {
    return null;
  }
}
