/**
 * Matemática do recorte da foto de perfil (sem React, testável).
 *
 * A foto aparece dentro de um quadrado de lado `viewport` (com o círculo inscrito).
 * Com zoom 1 ela cobre o quadrado inteiro (`baseScale`). A pessoa arrasta (tx, ty = deslocamento
 * do centro da foto em relação ao centro do quadrado) e dá zoom (`zoom` ≥ 1).
 */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;
/** Lado da foto enviada (px). */
export const AVATAR_OUTPUT_SIZE = 512;

export type CropInput = {
  imageWidth: number;
  imageHeight: number;
  viewport: number;
  zoom: number;
  tx: number;
  ty: number;
};

/** Escala em que a foto cobre exatamente o quadrado (lado menor = viewport). */
export function baseScale(imageWidth: number, imageHeight: number, viewport: number): number {
  'worklet';
  return Math.max(viewport / imageWidth, viewport / imageHeight);
}

export function clampZoom(zoom: number): number {
  'worklet';
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Maior deslocamento possível sem mostrar "buraco" dentro do quadrado. */
export function maxOffset(
  imageWidth: number,
  imageHeight: number,
  viewport: number,
  zoom: number,
): { x: number; y: number } {
  'worklet';
  const scale = baseScale(imageWidth, imageHeight, viewport) * zoom;
  return {
    x: Math.max(0, (imageWidth * scale - viewport) / 2),
    y: Math.max(0, (imageHeight * scale - viewport) / 2),
  };
}

export function clampOffset(value: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(-max, value));
}

/** Retângulo (em pixels da foto original) do que está visível no quadrado. */
export function cropRect(input: CropInput): {
  originX: number;
  originY: number;
  width: number;
  height: number;
} {
  const { imageWidth, imageHeight, viewport } = input;
  const zoom = clampZoom(input.zoom);
  const scale = baseScale(imageWidth, imageHeight, viewport) * zoom;
  const max = maxOffset(imageWidth, imageHeight, viewport, zoom);
  const tx = clampOffset(input.tx, max.x);
  const ty = clampOffset(input.ty, max.y);

  const side = Math.min(Math.round(viewport / scale), imageWidth, imageHeight);
  const left = (imageWidth * scale - viewport) / 2 - tx;
  const top = (imageHeight * scale - viewport) / 2 - ty;
  const originX = Math.min(Math.max(0, Math.round(left / scale)), imageWidth - side);
  const originY = Math.min(Math.max(0, Math.round(top / scale)), imageHeight - side);
  return {
    originX,
    originY,
    width: side,
    height: side,
  };
}
