export const MAX_STATIC_ASSET_BYTES = 25 * 1024 ** 2;
export const DECODER_PATH = '/models/whisper-base/64da57285918e20ea79ea5c88eed7197933abaa8/onnx/decoder_model_merged_quantized.onnx';
export const DECODER_BYTES = 53707539;
export const DECODER_SHA256 = 'a6beb6baabb66f00b6a686d828c95ffca6146d51900cbad0266cad38f64cf861';
export const DECODER_MIME = 'application/octet-stream';
const parts = [
  [0, 20971520, '1fea536e721bfb5767316fef388d147287834485706326204f6cb290d1ad6bce'],
  [20971520, 20971520, '4887b177b8f5782442613313a9785395be5eab2f27251fdfaa026bc75e501a0f'],
  [41943040, 11764499, '111aedef8f0120320f184ff5b9bd419605c09fbc486cfce07f637d740b2cefc0'],
].map(([offset, bytes, sha256], index) => Object.freeze({
  path: `${DECODER_PATH}.part-${index + 1}.bin`, offset, bytes, sha256, mime: DECODER_MIME,
}));
export const DECODER_DISTRIBUTION = Object.freeze({
  version: 1, logicalPath: DECODER_PATH, parts: Object.freeze(parts),
});

export function physicalAssets(manifest) {
  return manifest.files.flatMap(file =>
    manifest.decoderDistribution && file.path === DECODER_PATH ? manifest.decoderDistribution.parts : [file]);
}
