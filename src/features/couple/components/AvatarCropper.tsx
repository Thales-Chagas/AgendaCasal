import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, PressableScale, useTheme } from '@/design-system';
import { Minus, Plus, X, type Icon } from '@/design-system/icons';

import {
  AVATAR_OUTPUT_SIZE,
  baseScale,
  clampOffset,
  clampZoom,
  cropRect,
  MAX_ZOOM,
  maxOffset,
} from '../domain/avatar-crop';

type Props = {
  uri: string;
  onCancel: () => void;
  /** Recebe o arquivo JPEG local já recortado (512×512). */
  onConfirm: (croppedUri: string) => Promise<void>;
};

const ZOOM_STEP = 0.5;

/**
 * Ajuste da foto de perfil "estilo apps modernos": a foto aparece dentro de um círculo;
 * arraste para enquadrar, use dois dedos (ou os botões − / +) para dar zoom e toque duas
 * vezes para aproximar/afastar. A foto nunca deixa espaço vazio dentro do círculo.
 */
export function AvatarCropper({ uri, onCancel, onConfirm }: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const viewport = Math.min(screenWidth - spacing.xl * 2, 360);

  // A foto é decodificada uma vez (já com a rotação correta) e reaproveitada no recorte.
  const [source, setSource] = useState<{ ref: ImageRef; width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    ImageManipulator.manipulate(uri)
      .renderAsync()
      .then((ref) => active && setSource({ ref, width: ref.width, height: ref.height }))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [uri]);

  const imageWidth = source?.width ?? 1;
  const imageHeight = source?.height ?? 1;
  const base = baseScale(imageWidth, imageHeight, viewport);

  const zoom = useSharedValue(1);
  const savedZoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  /** Aplica um novo zoom mantendo o mesmo ponto no centro do círculo. */
  const applyZoom = (next: number, animated: boolean) => {
    'worklet';
    const target = clampZoom(next);
    const ratio = target / zoom.get();
    const max = maxOffset(imageWidth, imageHeight, viewport, target);
    const nx = clampOffset(tx.get() * ratio, max.x);
    const ny = clampOffset(ty.get() * ratio, max.y);
    if (animated) {
      zoom.set(withTiming(target, { duration: 200 }));
      tx.set(withTiming(nx, { duration: 200 }));
      ty.set(withTiming(ny, { duration: 200 }));
    } else {
      zoom.set(target);
      tx.set(nx);
      ty.set(ny);
    }
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedZoom.set(zoom.get());
    })
    .onUpdate((e) => {
      applyZoom(savedZoom.get() * e.scale, false);
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      savedTx.set(tx.get());
      savedTy.set(ty.get());
    })
    .onUpdate((e) => {
      const max = maxOffset(imageWidth, imageHeight, viewport, zoom.get());
      tx.set(clampOffset(savedTx.get() + e.translationX, max.x));
      ty.set(clampOffset(savedTy.get() + e.translationY, max.y));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      applyZoom(zoom.get() > 1.5 ? 1 : 2.5, true);
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: zoom.get() }],
  }));

  const displayWidth = imageWidth * base;
  const displayHeight = imageHeight * base;

  const confirm = async () => {
    if (!source) return;
    setSaving(true);
    try {
      const rect = cropRect({
        imageWidth,
        imageHeight,
        viewport,
        zoom: zoom.get(),
        tx: tx.get(),
        ty: ty.get(),
      });
      const rendered = await ImageManipulator.manipulate(source.ref)
        .crop(rect)
        .resize({ width: AVATAR_OUTPUT_SIZE, height: AVATAR_OUTPUT_SIZE })
        .renderAsync();
      const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
      await onConfirm(result.uri);
    } finally {
      setSaving(false);
    }
  };

  const ring = viewport; // espessura da máscara escura ao redor do círculo

  return (
    <View
      style={[
        styles.fill,
        {
          backgroundColor: '#0E0B0E',
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <DarkIconButton icon={X} label="Cancelar" onPress={onCancel} />
        <AppText variant="title3" style={[styles.flex, styles.light]} align="center">
          Ajustar foto
        </AppText>
        <View style={{ width: 44 }} />
      </View>

      <View style={[styles.center, styles.flex]}>
        {failed ? (
          <AppText style={styles.light} align="center">
            Não conseguimos abrir essa foto. Tente outra.
          </AppText>
        ) : !source ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <GestureDetector gesture={gesture}>
            <View
              style={{ width: viewport, height: viewport, overflow: 'hidden' }}
              accessible
              accessibilityLabel="Área de ajuste da foto. Arraste para enquadrar e use dois dedos para dar zoom.">
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    // Os toques ficam com a área de ajuste (no navegador, evita "arrastar a imagem").
                    pointerEvents: 'none',
                    width: displayWidth,
                    height: displayHeight,
                    left: (viewport - displayWidth) / 2,
                    top: (viewport - displayHeight) / 2,
                  },
                  imageStyle,
                ]}>
                <Image source={{ uri }} style={styles.fill} contentFit="fill" />
              </Animated.View>
              {/* Máscara: escurece tudo fora do círculo. */}
              <View
                style={{
                  position: 'absolute',
                  pointerEvents: 'none',
                  left: -ring,
                  top: -ring,
                  width: viewport + ring * 2,
                  height: viewport + ring * 2,
                  borderRadius: viewport / 2 + ring,
                  borderWidth: ring,
                  borderColor: 'rgba(14, 11, 14, 0.62)',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  pointerEvents: 'none',
                  width: viewport,
                  height: viewport,
                  borderRadius: viewport / 2,
                  borderWidth: 2,
                  borderColor: 'rgba(255, 255, 255, 0.9)',
                }}
              />
            </View>
          </GestureDetector>
        )}
      </View>

      <View style={{ gap: spacing.lg, paddingHorizontal: spacing.xl }}>
        <AppText variant="callout" align="center" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Arraste para enquadrar · dois dedos para dar zoom
        </AppText>
        <View style={[styles.header, styles.centerRow, { gap: spacing.xl }]}>
          <DarkIconButton
            icon={Minus}
            label="Diminuir zoom"
            onPress={() => applyZoom(zoom.get() - ZOOM_STEP, true)}
          />
          <DarkIconButton
            icon={Plus}
            label="Aumentar zoom"
            onPress={() => applyZoom(Math.min(MAX_ZOOM, zoom.get() + ZOOM_STEP), true)}
          />
        </View>
        <Button
          label="Usar esta foto"
          onPress={() => void confirm()}
          loading={saving}
          disabled={!source}
          testID="avatar-crop-confirm"
          style={{ backgroundColor: colors.primary }}
        />
      </View>
    </View>
  );
}

/** Botão redondo claro, legível sobre o fundo escuro do ajuste. */
function DarkIconButton({
  icon: IconComponent,
  label,
  onPress,
}: {
  icon: Icon;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={8} style={styles.darkButton}>
      <IconComponent size={22} color="#FFFFFF" strokeWidth={2.2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  darkButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  fill: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  centerRow: { justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  light: { color: '#FFFFFF' },
});
