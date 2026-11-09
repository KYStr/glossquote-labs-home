// Document engine adapter for the PDF Page Tools (SPEC section 5).
//
// The one and only PDF implementation is the vendored pdf-lib file in
// public/js/vendor/ (pinned by version and SHA-256 in THIRD-PARTY.md).
// This adapter is the only module that imports it. It reports facts
// and coded failures to the pure core and performs the four operations;
// it makes no policy decisions. No DOM access here either.

import {
  PDFArray,
  PDFDocument,
  decodePDFRawStream,
  degrees,
} from "../vendor/pdf-lib.esm.min.js";
import { PRODUCER, normaliseRotation } from "./pdftools.mjs";

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isEncryptedError(error) {
  return error?.constructor?.name === "EncryptedPDFError" ||
    /encrypted/i.test(String(error?.message ?? ""));
}

async function loadDocument(bytes) {
  try {
    // updateMetadata stays off: pdf-lib otherwise re-stamps the
    // Producer of the in-memory copy on every load, which would both
    // misreport stored facts and rewrite documents we only inspect.
    return await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
  } catch (error) {
    if (isEncryptedError(error)) fail("ENCRYPTED");
    fail("CORRUPT");
  }
}

// Facts the core validates: page count and per-page existing rotation
// (normalised to 0/90/180/270 space). Encrypted and unparseable files
// come back as { errorCode } facts, exactly as the core expects.
export async function inspectPdf(bytes) {
  let doc;
  try {
    doc = await loadDocument(bytes);
  } catch (error) {
    if (error && typeof error.code === "string") return { errorCode: error.code };
    return { errorCode: "CORRUPT" };
  }
  const rotations = doc.getPages().map((page) => {
    const angle = page.getRotation().angle;
    return ((angle % 360) + 360) % 360;
  });
  return { pageCount: doc.getPageCount(), rotations };
}

async function freshDocument() {
  const doc = await PDFDocument.create();
  // Fixed Producer (SPEC 4). No source metadata is copied: outputs
  // are brand-new documents and nothing reads the source's fields.
  // (pdf-lib stamps its own Producer at create() time; setting it
  // here, after creation, is what lands in the saved bytes.)
  doc.setProducer(PRODUCER);
  doc.setCreator(PRODUCER);
  return doc;
}

async function saveWithPages(sourceBytes, pageNumbers) {
  const source = await loadDocument(sourceBytes);
  const out = await freshDocument();
  const copied = await out.copyPages(source, pageNumbers.map((page) => page - 1));
  for (const page of copied) out.addPage(page);
  return out.save();
}

export async function mergePdfs(listOfBytes) {
  const out = await freshDocument();
  for (const bytes of listOfBytes) {
    const source = await loadDocument(bytes);
    const indices = source.getPages().map((_, index) => index);
    const copied = await out.copyPages(source, indices);
    for (const page of copied) out.addPage(page);
  }
  return out.save();
}

export async function extractPages(bytes, pageNumbers) {
  return saveWithPages(bytes, pageNumbers);
}

export async function rotatePages(bytes, pageNumbers, angle) {
  // Built as a fresh output file like every other output, so provenance
  // is uniform (fixed Producer, no source metadata carried over);
  // copyPages preserves each page's existing rotation, and the chosen
  // angle is applied on top of it in the output (SPEC 4).
  const source = await loadDocument(bytes);
  const out = await freshDocument();
  const all = source.getPages().map((_, index) => index);
  const copied = await out.copyPages(source, all);
  for (const page of copied) out.addPage(page);
  for (const pageNumber of pageNumbers) {
    const page = out.getPages()[pageNumber - 1];
    const existing = ((page.getRotation().angle % 360) + 360) % 360;
    page.setRotation(degrees(normaliseRotation(existing, angle)));
  }
  return out.save();
}

// Verification helper (SPEC section 7): the text label drawn on each
// page, read back from the decoded content streams. Fixture text is
// drawn with a standard font, which pdf-lib writes as hex strings;
// literal strings are handled too. Returns one label (or null) per page.
export async function pageLabels(bytes) {
  const doc = await loadDocument(bytes);
  const labels = [];
  for (const page of doc.getPages()) {
    let contents = doc.context.lookup(page.node.Contents());
    const streams = contents instanceof PDFArray
      ? contents.asArray().map((entry) => doc.context.lookup(entry))
      : [contents];
    let text = "";
    for (const stream of streams) {
      if (!stream) continue;
      const decodedBytes = decodePDFRawStream(stream).decode();
      for (let i = 0; i < decodedBytes.length; i += 8192) {
        text += String.fromCharCode(...decodedBytes.subarray(i, i + 8192));
      }
    }
    labels.push(extractLabel(text));
  }
  return labels;
}

function extractLabel(contentStreamText) {
  const hex = contentStreamText.match(/<([0-9A-Fa-f]+)>\s*Tj/);
  if (hex) {
    let decoded = "";
    for (let i = 0; i + 1 < hex[1].length; i += 2) {
      decoded += String.fromCharCode(parseInt(hex[1].slice(i, i + 2), 16));
    }
    return decoded;
  }
  const literal = contentStreamText.match(/\(([^()]*)\)\s*Tj/);
  if (literal) return literal[1];
  return null;
}

export async function pageCountOf(bytes) {
  const doc = await loadDocument(bytes);
  return doc.getPageCount();
}

export async function producerOf(bytes) {
  const doc = await loadDocument(bytes);
  return doc.getProducer();
}
