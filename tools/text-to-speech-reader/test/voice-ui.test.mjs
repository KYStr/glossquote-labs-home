import assert from "node:assert/strict";
import test from "node:test";

class Element extends EventTarget {
  constructor(tag = "") {
    super();
    this.tag = tag;
    this.children = [];
    this.dataset = {};
    this.classList = { toggle() {} };
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.textContent = "";
  }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  querySelectorAll(tag) {
    return this.children.flatMap((child) => [
      ...(child.tag === tag ? [child] : []),
      ...child.querySelectorAll(tag),
    ]);
  }
  setAttribute() {}
  removeAttribute() {}
}

test("the voice selector and all playback entry points follow live voice availability", async (t) => {
  for (const lang of ["zh-Hant", "en"]) {
    await t.test(lang, async (context) => {
      const local = { voiceURI: "local", name: "Local", lang: "en-US", localService: true };
      const other = { voiceURI: "other", name: "Other", lang: "fr-FR", localService: true };
      const remote = { voiceURI: "remote", name: "Remote default", lang: "en-US", localService: false, default: true };
      let voices = [remote];
      let canceled = 0;
      const utterances = [];
      const synth = Object.assign(new EventTarget(), {
        getVoices: () => voices,
        cancel: () => { canceled += 1; },
        speak: (utterance) => utterances.push(utterance),
      });
      const page = Object.assign(new EventTarget(), {
        speechSynthesis: synth,
        SpeechSynthesisUtterance: class {
          constructor(text) { this.text = text; }
        },
        setTimeout() {},
      });
      const elements = new Map();
      const element = (id) => {
        if (!elements.has(id)) elements.set(id, new Element());
        return elements.get(id);
      };
      const restore = ["document", "window", "SpeechSynthesisUtterance"].map(
        (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)],
      );
      context.after(() => {
        for (const [key, descriptor] of restore) {
          if (descriptor) Object.defineProperty(globalThis, key, descriptor);
          else delete globalThis[key];
        }
      });
      Object.assign(globalThis, {
        window: page,
        SpeechSynthesisUtterance: page.SpeechSynthesisUtterance,
        document: {
          documentElement: { lang },
          querySelector: (selector) => element(selector.slice(1)),
          createElement: (tag) => new Element(tag),
        },
      });
      await import(`../public/js/app.mjs?test-language=${lang}`);

      const input = element("text-input");
      input.value = "One. Two.";
      input.dispatchEvent(new Event("input"));
      const voiceSelect = element("voice-select");
      const play = element("play-button");
      const sentenceButtons = element("sentence-list").querySelectorAll("button");
      assert.equal(voiceSelect.disabled, true);
      assert.equal(play.disabled, true);
      assert.ok(sentenceButtons.every((button) => button.disabled));
      assert.match(element("voices-status").textContent, lang === "en" ? /no local voices/ : /未提供本機聲音/);
      sentenceButtons[0].dispatchEvent(new Event("click"));
      assert.equal(utterances.length, 0);

      function changeVoices(next) {
        voices = next;
        synth.dispatchEvent(new Event("voiceschanged"));
      }
      changeVoices([local, remote]);
      assert.equal(voiceSelect.disabled, false);
      assert.deepEqual(voiceSelect.children.map((option) => option.value), ["local"]);
      assert.equal(play.disabled, false);
      sentenceButtons[0].dispatchEvent(new Event("click"));
      assert.equal(utterances[0].voice, local);
      assert.equal(utterances[0].text, "One.");

      changeVoices([other, remote]);
      assert.equal(canceled, 2);
      assert.equal(voiceSelect.value, "");
      assert.equal(play.disabled, true);
      assert.ok(sentenceButtons.every((button) => button.disabled));
      assert.match(element("error-box").textContent, lang === "en" ? /became unavailable/ : /已無法使用/);
      utterances[0].onend();
      assert.equal(utterances.length, 1);

      const restored = { ...local };
      changeVoices([restored, other, remote]);
      assert.equal(voiceSelect.value, "local");
      assert.equal(play.disabled, false);
      assert.equal(element("error-box").hidden, true);
      sentenceButtons[1].dispatchEvent(new Event("click"));
      assert.equal(utterances[1].voice, restored);
      assert.equal(utterances[1].text, "Two.");

      input.value = "Changed.";
      input.dispatchEvent(new Event("input"));
      assert.equal(canceled, 4);
      utterances[1].onend();
      assert.equal(utterances.length, 2);
    });
  }
});
