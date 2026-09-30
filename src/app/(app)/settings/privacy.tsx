import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { toAppError } from '@/core/errors/app-error';
import { shareJsonFile } from '@/core/sharing/share-file';
import { AppText, Card, ListRow, Screen, ScreenHeader, toast, useTheme } from '@/design-system';
import { CalendarHeart, Download, FileText, Lock, UserRound, type Icon } from '@/design-system/icons';
import { getCoupleRepository } from '@/features/couple/hooks';

export default function PrivacyScreen() {
  const { spacing } = useTheme();
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await getCoupleRepository().exportMyData();
      await shareJsonFile(`duoday-meus-dados-${new Date().toISOString().slice(0, 10)}.json`, data);
    } catch (error) {
      toast.error(toAppError(error).userMessage);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Privacidade" subtitle="O que é compartilhado e o que é só seu." />
      <View style={{ gap: spacing.md }}>
        <Explain
          icon={CalendarHeart}
          title="Agenda"
          text="Compartilhada com seu parceiro. Vocês dois veem e podem editar os compromissos e as datas especiais."
        />
        <Explain
          icon={Lock}
          title="Notas"
          text="Somente neste aparelho. Não vão para a internet, não vão para o parceiro e ficam criptografadas no celular."
        />
        <Explain
          icon={UserRound}
          title="Conta"
          text="Informações privadas. Seu parceiro vê apenas seu nome. Seu e-mail nunca é mostrado a ninguém."
        />
      </View>

      <Card padded={false} style={{ marginTop: spacing.xl }}>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <ListRow
            icon={Download}
            title={exporting ? 'Preparando arquivo…' : 'Exportar meus dados'}
            subtitle="Conta e agenda em um arquivo (LGPD)"
            onPress={exporting ? undefined : exportData}
          />
          <ListRow
            icon={FileText}
            title="Política de Privacidade"
            onPress={() => router.push('/legal/privacy')}
          />
          <ListRow icon={FileText} title="Termos de Uso" onPress={() => router.push('/legal/terms')} />
        </View>
      </Card>
      <AppText variant="caption" color="textSecondary" style={{ marginTop: spacing.md }}>
        Para exportar suas notas, use a opção na tela de Notas. Para excluir sua conta, vá em Minha conta.
      </AppText>
    </Screen>
  );
}

function Explain({ icon: IconComponent, title, text }: { icon: Icon; title: string; text: string }) {
  const { colors, spacing } = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <IconComponent size={22} color={colors.primary} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText variant="callout" color="textSecondary">
            {text}
          </AppText>
        </View>
      </View>
    </Card>
  );
}
