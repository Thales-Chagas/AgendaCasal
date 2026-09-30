import { cropRect, maxOffset } from './avatar-crop';

describe('recorte da foto de perfil', () => {
  const landscape = { imageWidth: 4000, imageHeight: 3000, viewport: 300 };

  it('sem zoom e sem arrastar, pega o quadrado central do lado menor', () => {
    expect(cropRect({ ...landscape, zoom: 1, tx: 0, ty: 0 })).toEqual({
      originX: 500,
      originY: 0,
      width: 3000,
      height: 3000,
    });
  });

  it('com zoom 2, pega metade do lado, ainda centralizado', () => {
    expect(cropRect({ ...landscape, zoom: 2, tx: 0, ty: 0 })).toEqual({
      originX: 1250,
      originY: 750,
      width: 1500,
      height: 1500,
    });
  });

  it('arrastar a foto para a direita mostra a parte da esquerda', () => {
    const rect = cropRect({ ...landscape, zoom: 1, tx: 50, ty: 0 });
    // 50 px na tela = 500 px na foto (escala 0,1)
    expect(rect.originX).toBe(0);
  });

  it('nunca sai da foto, mesmo arrastando além do limite', () => {
    const rect = cropRect({ ...landscape, zoom: 3, tx: -10_000, ty: 10_000 });
    expect(rect.originX + rect.width).toBeLessThanOrEqual(4000);
    expect(rect.originY).toBe(0);
    expect(rect.width).toBe(1000);
  });

  it('o limite de arraste cresce com o zoom', () => {
    expect(maxOffset(4000, 3000, 300, 1)).toEqual({ x: 50, y: 0 });
    expect(maxOffset(4000, 3000, 300, 2)).toEqual({ x: 250, y: 150 });
  });

  it('funciona com foto em pé', () => {
    expect(cropRect({ imageWidth: 3000, imageHeight: 4000, viewport: 300, zoom: 1, tx: 0, ty: 0 })).toEqual({
      originX: 0,
      originY: 500,
      width: 3000,
      height: 3000,
    });
  });
});
