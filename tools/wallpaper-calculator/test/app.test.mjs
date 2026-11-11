import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { run } from "../public/js/core/wallpaper.mjs";

// A minimal in-memory DOM for exercising the shipped form/controller wiring.
// It observes calls to focus; native keyboard and browser focus are separate gates.
class Element {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.textContent = "";
    this.value = "";
    this.checked = false;
    this.focusCount = 0;
  }

  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); }
  replaceChildren() { this.children = []; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  focus() { this.focusCount += 1; }

  addEventListener(name, callback) { this.listeners.set(name, callback); }
  fire(name) { this.listeners.get(name)?.({ preventDefault() {} }); }

  querySelectorAll(selector) {
    const matches = (child) => {
      if (selector === "input") return child.type === "text";
      if (selector === ".field-error") return child.className === "field-error";
      if (selector === "[data-remove-row]") return child.dataset.removeRow !== undefined;
      return selector === '[data-role="' + child.dataset.role + '"]';
    };
    return this.children.flatMap((child) => [
      ...(matches(child) ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

function testPage(html, lang) {
  const elements = new Map();
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
    elements.set(id, Object.assign(new Element(), { id }));
  }
  const find = (id) => elements.get(id) ?? null;
  const makeRadios = (name) => [...html.matchAll(
    new RegExp('name="' + name + '" value="([^"]+)"( checked)?', "g"),
  )].map(([, value, checked]) => Object.assign(new Element(), { value, checked: Boolean(checked) }));
  const radios = {
    'input[name="wallMode"]': makeRadios("wallMode"),
    'input[name="openingsMode"]': makeRadios("openingsMode"),
  };
  for (const kind of ["wall", "opening"]) {
    const row = new Element();
    for (const [field, value] of [["widthM", kind === "wall" ? "4" : "0.9"], ["heightM", kind === "wall" ? "2.5" : "2.1"]]) {
      const input = find("field-" + kind + "-1-" + field);
      input.type = "text";
      input.dataset.role = field;
      input.value = value;
      const error = find("error-" + kind + "-1-" + field);
      error.className = "field-error";
      row.append(input, error);
    }
    const remove = new Element();
    remove.dataset.removeRow = kind;
    row.append(remove);
    find(kind === "wall" ? "walls-rows" : "openings-rows").append(row);
  }
  const allDescendants = (parent) => parent.children.flatMap((child) => [child, ...allDescendants(child)]);
  const getElementById = (id) =>
    find(id) ?? [...allDescendants(find("walls-rows")), ...allDescendants(find("openings-rows"))]
      .find((element) => element.id === id) ?? null;
  const document = {
    documentElement: { lang },
    getElementById,
    querySelectorAll: (selector) => radios[selector],
    createElement: () => new Element(),
  };
  return { document, radios };
}

class LocalWorker {
  postMessage({ snapshot, generation }) {
    this.onmessage({ data: { generation, ...run(snapshot) } });
  }
  terminate() {}
}

for (const scenario of [
  { lang: "zh-Hant", page: "index.html", label: "開口 2 高", error: "開口高度不可超過牆高。" },
  { lang: "en", page: "en/index.html", label: "Opening 2 height", error: "Enter an opening height at or below the wall height." },
]) {
  test("submitted opening-height error targets row 2 in " + scenario.lang, async (t) => {
    const html = await readFile(new URL("../dist-preview/" + scenario.page, import.meta.url), "utf8");
    const { document, radios } = testPage(html, scenario.lang);
    t.mock.method(URL, "createObjectURL", () => "blob:offline-test");
    t.mock.method(URL, "revokeObjectURL", () => {});
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const originalWorker = globalThis.Worker;
    globalThis.document = document;
    globalThis.window = new Element();
    globalThis.Worker = LocalWorker;
    t.after(() => {
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
      globalThis.Worker = originalWorker;
    });
    await import("../dist-preview/js/app.js?lang=" + scenario.lang);
    const get = document.getElementById;
    const form = get("wallpaper-form");
    for (const radio of radios['input[name="openingsMode"]']) radio.checked = radio.value === "list";
    form.fire("change");
    get("add-opening-btn").fire("click");
    get("field-opening-2-widthM").value = "1";
    const openingHeight = get("field-opening-2-heightM");
    openingHeight.value = "3";
    form.fire("input");
    form.fire("submit");
    assert.equal(openingHeight.focusCount, 1);
    assert.equal(get("field-heightM").focusCount, 0);
    assert.equal(get("field-heightM").attributes.has("aria-invalid"), false);
    assert.equal(openingHeight.attributes.get("aria-invalid"), "true");
    assert.equal(openingHeight.attributes.get("aria-errormessage"), "error-opening-2-heightM");
    assert.equal(get("error-opening-2-heightM").textContent, scenario.error);
    assert.ok(get("status").textContent.includes(scenario.label));
    assert.equal(get("download-btn").hidden, true);
    assert.equal(get("results").hidden, true);

    openingHeight.value = "2.5";
    form.fire("input");
    assert.equal(openingHeight.attributes.has("aria-invalid"), false);
    form.fire("submit");
    assert.equal(get("download-btn").hidden, false);
    assert.equal(get("results").hidden, false);
  });
}

