import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePreferences } from '@/core/preferences/preferences-store';
import { AppText, Button, useTheme } from '@/design-system';
import {
  Bell,
  CalendarHeart,
  Heart,
  Lock,
  NotebookPen,
  Smartphone,
  User,
  UserRound,
} from '@/design-system/icons';
import { Illustration, type IllustrationProps } from '@/features/onboarding/components/Illustration';

type Slide = { title: string; message: string; illustration: IllustrationProps };

const slides: Slide[] = [
  {
    title: 'Organizem a vida juntos ❤️',
    message: 'Compromissos, planos e momentos importantes em um só lugar.',
    illustration: {
      icon: CalendarHeart,
      satellites: [
        { icon: Heart, tone: 'primary' },
        { icon: Bell, tone: 'mine' },
      ],
    },
  },
  {
    title: 'Uma agenda para vocês dois',
    message: 'Adicione um compromisso e ele aparece para seu parceiro.',
    illustration: {
      icon: Heart,
      satellites: [
        { icon: User, tone: 'mine' },
        { icon: UserRound, tone: 'partner' },
      ],
    },
  },
  {
    title: 'Suas notas continuam privadas 🔒',
    message: 'Cada pessoa tem seu próprio espaço de anotações, guardado só no seu celular.',
    illustration: {
      icon: Lock,
      tone: 'private',
      satellites: [
        { icon: NotebookPen, tone: 'private' },
        { icon: Smartphone, tone: 'private' },
      ],
    },
  },
];

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();
  const completeOnboarding = usePreferences((s) => s.completeOnboarding);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === slides.length - 1;

  const goTo = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  };

  const finish = (target: '/sign-up' | '/sign-in') => {
    completeOnboarding();
    router.replace(target);
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { paddingHorizontal: spacing.xl }]}>
        {!isLast ? (
          <Button
            label="Pular"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => goTo(slides.length - 1)}
          />
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={styles.fill}>
        {slides.map((slide) => (
          <View
            key={slide.title}
            style={[styles.slide, { width, paddingHorizontal: spacing.xxl, gap: spacing.xxl }]}>
            <Illustration {...slide.illustration} />
            <View style={{ gap: spacing.md }}>
              <AppText variant="title1" align="center" accessibilityRole="header">
                {slide.title}
              </AppText>
              <AppText variant="body" color="textSecondary" align="center">
                {slide.message}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.lg, gap: spacing.lg },
        ]}>
        <View
          style={[styles.dots, { gap: spacing.sm }]}
          accessibilityRole="text"
          accessibilityLabel={`Passo ${index + 1} de ${slides.length}`}>
          {slides.map((slide, i) => (
            <View
              key={slide.title}
              style={{
                height: 8,
                width: i === index ? 24 : 8,
                borderRadius: radius.pill,
                backgroundColor: i === index ? colors.primary : colors.borderStrong,
              }}
            />
          ))}
        </View>
        {isLast ? (
          <View style={{ gap: spacing.sm }}>
            <Button label="Começar" onPress={() => finish('/sign-up')} testID="onboarding-start" />
            <Button label="Já tenho uma conta" variant="ghost" onPress={() => finish('/sign-in')} />
          </View>
        ) : (
          <Button label="Continuar" onPress={() => goTo(index + 1)} testID="onboarding-next" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { height: 56, alignItems: 'flex-end', justifyContent: 'center' },
  slide: { alignItems: 'center', justifyContent: 'center' },
  footer: {},
  dots: { flexDirection: 'row', justifyContent: 'center' },
});
