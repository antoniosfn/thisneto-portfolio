import type { SampledForm } from "./particle-shapes";

/**
 * Precomputed particle forms. Sampling six meshes evenly costs about 2 s of
 * CPU, so scripts/build-particle-forms.mts runs it once and ships the result:
 * positions quantised to 16 bits over [−1, 1] (step 3·10⁻⁵, far below a pixel)
 * and colours to 8 bits. Layout: magic, form count, point count, then per form
 * the positions (Uint16 × 3) followed by the colours (Uint8 × 3).
 */
export const FORMS_URL = "/particles/forms.bin";
const MAGIC = 0x31524650; // "PFR1"
const HEADER = 12;

export function encodeForms(forms: SampledForm[]) {
  const count = forms[0].points.length / 3;
  const perForm = count * 3 * 2 + count * 3;
  const buffer = new ArrayBuffer(HEADER + perForm * forms.length);
  const view = new DataView(buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, forms.length, true);
  view.setUint32(8, count, true);
  forms.forEach((form, k) => {
    const base = HEADER + k * perForm;
    const positions = new Uint16Array(buffer, base, count * 3);
    const colors = new Uint8Array(buffer, base + count * 6, count * 3);
    form.points.forEach((v, i) => {
      positions[i] = Math.round(
        ((Math.max(-1, Math.min(1, v)) + 1) / 2) * 65535,
      );
    });
    form.colors.forEach((v, i) => {
      colors[i] = Math.round(Math.max(0, Math.min(1, v)) * 255);
    });
  });
  return new Uint8Array(buffer);
}

export function decodeForms(buffer: ArrayBuffer): SampledForm[] {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC) throw new Error("Unknown forms file");
  const forms = view.getUint32(4, true),
    count = view.getUint32(8, true);
  const perForm = count * 3 * 2 + count * 3;
  return Array.from({ length: forms }, (_, k) => {
    const base = HEADER + k * perForm;
    const positions = new Uint16Array(buffer, base, count * 3);
    const colors = new Uint8Array(buffer, base + count * 6, count * 3);
    return {
      points: Float32Array.from(positions, (q) => (q / 65535) * 2 - 1),
      colors: Float32Array.from(colors, (c) => c / 255),
    };
  });
}

export async function loadForms(signal?: AbortSignal) {
  const response = await fetch(FORMS_URL, { signal });
  if (!response.ok) throw new Error(`Forms file: HTTP ${response.status}`);
  return decodeForms(await response.arrayBuffer());
}
