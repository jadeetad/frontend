// Runs the exported Teachable Machine model in the browser on the Claim Summary Card image.
// Class names in the model must be exactly: Valid Claim, Invalid Claim, Manual Review.
const MOCK = import.meta.env.VITE_USE_MOCKS !== 'false';
let model;
export async function classify(url) {
  if (MOCK || !url) return null;
  try {
    const tm = await import('@teachablemachine/image');
    model = model || (await tm.load('/tm-model/model.json', '/tm-model/metadata.json'));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    await img.decode();
    const out = await model.predict(img);
    return Object.fromEntries(out.map((p) => [p.className, p.probability]));
  } catch {
    return null; // page shows "Model unavailable"; a result is never invented
  }
}
