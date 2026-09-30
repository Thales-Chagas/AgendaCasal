import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Card, Screen, ScreenHeader, useTheme } from '@/design-system';
import { ChevronDown, ChevronUp } from '@/design-system/icons';

const faq = [
  {
    q: 'Como conecto meu parceiro?',
    a: 'Em Nós › Conectar com meu parceiro, toque em "Enviar convite". Seu parceiro cria a conta dele e digita o código (ou toca no link).',
  },
  {
    q: 'Meu parceiro vê minhas notas?',
    a: 'Não. As notas ficam somente no seu celular, criptografadas. Elas não vão para a internet nem para o parceiro.',
  },
  {
    q: 'O que significa "Meu", "Do parceiro" e "Nosso"?',
    a: 'É de quem é o compromisso. Todos aparecem para vocês dois, mas os lembretes vão para quem participa.',
  },
  {
    q: 'Funciona sem internet?',
    a: 'Sim. Você vê a agenda salva e pode criar ou editar compromissos. Tudo é enviado quando a internet voltar.',
  },
  {
    q: 'E se nós dois editarmos o mesmo compromisso?',
    a: 'O app junta as alterações. Se ambos mudarem a mesma informação, vale a última enviada.',
  },
  {
    q: 'Troquei de celular. E as notas?',
    a: 'As notas ficam no aparelho antigo. Antes de trocar, use "Exportar minhas notas" na tela de Notas.',
  },
  {
    q: 'Como desfaço a conexão?',
    a: 'Em Nós › Nosso relacionamento › Desfazer vínculo. Nada é apagado: cada um fica com os próprios compromissos.',
  },
];

export default function HelpScreen() {
  const { spacing, colors } = useTheme();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen>
      <ScreenHeader title="Ajuda" subtitle="Perguntas frequentes" />
      <View style={{ gap: spacing.sm }}>
        {faq.map((item, i) => (
          <Card key={item.q} padded={false}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open === i }}
              onPress={() => setOpen(open === i ? null : i)}
              style={{ padding: spacing.lg, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>
                  {item.q}
                </AppText>
                {open === i ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </View>
              {open === i ? (
                <AppText variant="body" color="textSecondary">
                  {item.a}
                </AppText>
              ) : null}
            </Pressable>
          </Card>
        ))}
      </View>
      <AppText variant="caption" color="textSecondary" style={{ marginTop: spacing.xl }}>
        Ainda com dúvida? Escreva para ajuda@duoday.app
      </AppText>
    </Screen>
  );
}
