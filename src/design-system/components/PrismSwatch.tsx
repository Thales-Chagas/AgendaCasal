import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

export type PrismSwatchProps = {
  /** Tons do degradê, do canto superior esquerdo ao inferior direito. */
  colors: readonly string[];
};

/**
 * Superfície prismática puramente decorativa: degradê diagonal, duas faixas de luz refratada,
 * um brilho no canto e uma leve sombra embaixo para dar profundidade. Preenche o pai.
 */
export function PrismSwatch({ colors }: PrismSwatchProps) {
  // Ids de gradiente precisam ser únicos na página (no web eles são globais).
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const last = Math.max(colors.length - 1, 1);
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none">
      <Defs>
        <LinearGradient id={`base${id}`} x1="0" y1="0" x2="1" y2="1">
          {colors.map((color, i) => (
            <Stop key={color + i} offset={i / last} stopColor={color} />
          ))}
        </LinearGradient>
        <LinearGradient id={`band${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id={`glow${id}`} cx="0.22" cy="0.18" r="0.7">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`depth${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.55" stopColor="#000000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.22" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#base${id})`} />
      <Polygon points="38,0 58,0 18,100 -2,100" fill={`url(#band${id})`} opacity={0.7} />
      <Polygon points="66,0 72,0 32,100 26,100" fill={`url(#band${id})`} opacity={0.5} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#glow${id})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#depth${id})`} />
    </Svg>
  );
}
