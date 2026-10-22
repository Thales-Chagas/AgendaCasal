import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { usePreferences } from '@/core/preferences/preferences-store';
import {
  AppText,
  BottomSheet,
  Button,
  Card,
  CodeInput,
  ListRow,
  Screen,
  ScreenHeader,
  toast,
  useTheme,
} from '@/design-system';
import { FingerprintPattern, KeyRound, Lock, NotebookPen } from '@/design-system/icons';
import { useSession } from '@/features/auth/session-store';
import { useNotesLocked } from '@/features/notes/lock';
import {
  changeNotesPin,
  disableNotesBiometrics,
  enableNotesBiometrics,
  notesBiometricsEnabled,
  notesUsePin,
} from '@/features/notes/vault';
import { useAppLock } from '@/features/security/app-lock';
import {
  enrollBiometrics,
  isBiometricAvailable,
  isBiometricEnrolled,
  verifyBiometrics,
} from '@/features/security/biometrics';
import { isWeakPin, PIN_LENGTH } from '@/features/security/vault-crypto';

export default function SecurityScreen() {
  const { spacing } = useTheme();
  const userId = useSession((s) => s.userId) ?? '';
  const appLock = usePreferences((s) => s.appLock);
  const setAppLock = usePreferences((s) => s.setAppLock);
  const lockNotes = usePreferences((s) => s.lockNotes);
  const setLockNotes = usePreferences((s) => s.setLockNotes);
  const notesLocked = useNotesLocked();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [notesBio, setNotesBio] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  useEffect(() => {
    void isBiometricAvailable().then(setAvailable);
    if (notesUsePin && userId) void notesBiometricsEnabled(userId).then(setNotesBio);
  }, [userId]);

  /** Confirma a biometria antes de ligar uma proteção (no web, cria a passkey na primeira vez). */
  const confirmBiometrics = async (reason: string) => {
    if (Platform.OS === 'web' && !(await isBiometricEnrolled(userId))) {
      return (await enrollBiometrics(userId, reason)).ok;
    }
    return (await verifyBiometrics(userId, reason)).ok;
  };

  const toggleAppLock = async (value: boolean) => {
    if (!value) {
      setAppLock(false);
      return;
    }
    if (await confirmBiometrics('Ativar o bloqueio do DuoDay')) {
      useAppLock.getState().unlock();
      setAppLock(true);
      toast.success('Pronto: o DuoDay vai pedir sua digital ou rosto.');
    }
  };

  const toggleNativeNotesLock = async (value: boolean) => {
    if (!value) {
      setLockNotes(false);
      return;
    }
    if (await confirmBiometrics('Proteger as notas')) setLockNotes(true);
  };

  const toggleWebNotesBio = async (value: boolean) => {
    if (!value) {
      await disableNotesBiometrics(userId);
      setNotesBio(false);
      return;
    }
    const result = await enableNotesBiometrics(userId);
    if (result === 'enabled') {
      setNotesBio(true);
      toast.success('Suas notas agora abrem com digital ou rosto.');
    } else if (result === 'unsupported') {
      toast.info('Este navegador ainda não permite abrir as notas por biometria. Continue usando o PIN.');
    }
  };

  const noBiometrics = available === false;

  return (
    <Screen>
      <ScreenHeader title="Segurança" subtitle="Vale só para este aparelho." />
      <View style={{ gap: spacing.xl }}>
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.lg }}>
            <ListRow
              icon={FingerprintPattern}
              title="Bloquear o DuoDay"
              subtitle={
                noBiometrics
                  ? 'Configure digital ou rosto no aparelho para usar.'
                  : 'Pede digital ou rosto ao abrir o app e ao voltar depois de 30 segundos fora.'
              }
              toggle={noBiometrics ? undefined : { value: appLock, onChange: (v) => void toggleAppLock(v) }}
              testID="security-app-lock"
            />
          </View>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="textSecondary" accessibilityRole="header">
            NOTAS PRIVADAS
          </AppText>
          <Card padded={false}>
            <View style={{ paddingHorizontal: spacing.lg }}>
              {notesUsePin ? (
                <>
                  {notesLocked ? (
                    <ListRow
                      icon={Lock}
                      title="Abra suas notas para mudar estas opções"
                      subtitle="Elas ficam trancadas até você digitar o PIN."
                      onPress={() => router.push('/notes')}
                    />
                  ) : (
                    <>
                      <ListRow
                        icon={FingerprintPattern}
                        title="Abrir as notas com digital ou rosto"
                        subtitle={
                          noBiometrics
                            ? 'Este aparelho não tem biometria disponível.'
                            : 'O PIN continua valendo.'
                        }
                        toggle={
                          noBiometrics
                            ? undefined
                            : { value: notesBio, onChange: (v) => void toggleWebNotesBio(v) }
                        }
                      />
                      <ListRow
                        icon={KeyRound}
                        title="Trocar o PIN das notas"
                        onPress={() => setPinOpen(true)}
                      />
                    </>
                  )}
                </>
              ) : (
                <ListRow
                  icon={NotebookPen}
                  title="Pedir digital ou rosto nas notas"
                  subtitle={noBiometrics ? 'Configure digital ou rosto no aparelho para usar.' : undefined}
                  toggle={
                    noBiometrics
                      ? undefined
                      : { value: lockNotes, onChange: (v) => void toggleNativeNotesLock(v) }
                  }
                />
              )}
            </View>
          </Card>
          <AppText variant="caption" color="textSecondary">
            {notesUsePin
              ? 'No navegador, suas notas ficam guardadas neste aparelho, criptografadas, e só abrem com o PIN ou com a sua biometria. A biometria nunca sai do aparelho.'
              : 'Suas notas ficam só neste celular, criptografadas. A biometria é do sistema: o DuoDay nunca a recebe.'}
          </AppText>
        </View>
      </View>
      <ChangePinSheet visible={pinOpen} onClose={() => setPinOpen(false)} userId={userId} />
    </Screen>
  );
}

function ChangePinSheet({
  visible,
  onClose,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
}) {
  const { spacing } = useTheme();
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string>();

  const close = () => {
    setFirst(null);
    setPin('');
    setError(undefined);
    onClose();
  };

  const onComplete = async (value: string) => {
    if (first === null) {
      if (isWeakPin(value)) {
        setPin('');
        setError('Esse PIN é fácil de adivinhar. Evite números repetidos ou em sequência.');
        return;
      }
      setFirst(value);
      setPin('');
      setError(undefined);
      return;
    }
    if (value !== first) {
      setFirst(null);
      setPin('');
      setError('Os PINs não são iguais. Comece de novo.');
      return;
    }
    try {
      await changeNotesPin(userId, value);
      toast.success('PIN das notas trocado.');
      close();
    } catch {
      setError('As notas trancaram. Abra-as de novo e tente outra vez.');
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={first === null ? 'Novo PIN das notas' : 'Repita o novo PIN'}>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
        <CodeInput
          key={first === null ? 'first' : 'second'}
          value={pin}
          onChange={setPin}
          length={PIN_LENGTH}
          secure
          autoFocus
          accessibilityLabel={`Novo PIN de ${PIN_LENGTH} números`}
          error={error}
          onComplete={(value) => void onComplete(value)}
        />
        <Button label="Cancelar" variant="ghost" onPress={close} />
      </View>
    </BottomSheet>
  );
}
