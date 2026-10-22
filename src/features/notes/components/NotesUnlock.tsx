import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { AppText, Button, CodeInput, ConfirmDialog, toast, useTheme } from '@/design-system';
import { FingerprintPattern as Fingerprint, Lock } from '@/design-system/icons';
import { isBiometricAvailable } from '@/features/security/biometrics';
import { isWeakPin, PIN_LENGTH } from '@/features/security/vault-crypto';

import { unlockNotes, useNotesLock } from '../lock';
import { destroyNotes } from '../notes-service';
import {
  createNotesPin,
  enableNotesBiometrics,
  hasNotesPin,
  notesBiometricsEnabled,
  notesUsePin,
  unlockNotesWithBiometrics,
  unlockNotesWithPin,
} from '../vault';

type Step = 'loading' | 'create' | 'confirm' | 'offer-biometrics' | 'enter';

const waitLabel = (ms: number) => {
  const minutes = Math.ceil(ms / 60_000);
  return ms < 60_000
    ? `${Math.ceil(ms / 1000)} segundos`
    : `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
};

/**
 * Porta das notas privadas. Celular: digital/rosto/senha do aparelho. Web: PIN de 6 números
 * (criado no primeiro uso) e, se a pessoa ativar, digital ou rosto pela passkey do aparelho.
 */
export function NotesUnlock({ userId }: { userId: string }) {
  if (!notesUsePin) return <NativeUnlock userId={userId} />;
  return <PinUnlock userId={userId} />;
}

function Header({ title, message }: { title: string; message: string }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
      <View
        style={{
          backgroundColor: colors.privateSoft,
          borderRadius: radius.pill,
          padding: spacing.lg,
          marginBottom: spacing.sm,
        }}>
        <Lock size={28} color={colors.private} />
      </View>
      <AppText variant="title2" align="center" accessibilityRole="header">
        {title}
      </AppText>
      <AppText variant="callout" color="textSecondary" align="center">
        {message}
      </AppText>
    </View>
  );
}

function NativeUnlock({ userId }: { userId: string }) {
  const { spacing } = useTheme();
  useEffect(() => {
    void unlockNotes(userId);
  }, [userId]);
  return (
    <View style={{ paddingTop: spacing.huge }}>
      <Header title="Notas protegidas" message="Desbloqueie para ver suas notas privadas." />
      <Button label="Desbloquear" icon={Fingerprint} onPress={() => void unlockNotes(userId)} />
    </View>
  );
}

function PinUnlock({ userId }: { userId: string }) {
  const { spacing } = useTheme();
  const setUnlocked = useNotesLock((s) => s.setUnlocked);
  const [step, setStep] = useState<Step>('loading');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.all([hasNotesPin(userId), notesBiometricsEnabled(userId), isBiometricAvailable()]).then(
      ([hasPin, bio, available]) => {
        if (!alive) return;
        setBioEnabled(bio);
        setBioAvailable(available);
        setStep(hasPin ? 'enter' : 'create');
      },
    );
    return () => {
      alive = false;
    };
  }, [userId]);

  const reset = (next: Step) => {
    setPin('');
    setError(undefined);
    setStep(next);
  };

  const onCreate = (value: string) => {
    if (isWeakPin(value)) {
      setPin('');
      setError('Esse PIN é fácil de adivinhar. Evite números repetidos ou em sequência.');
      return;
    }
    setFirstPin(value);
    reset('confirm');
  };

  const onConfirm = async (value: string) => {
    if (value !== firstPin) {
      setFirstPin('');
      setPin('');
      setStep('create');
      setError('Os PINs não são iguais. Comece de novo.');
      return;
    }
    setBusy(true);
    try {
      await createNotesPin(userId, value);
      if (bioAvailable) reset('offer-biometrics');
      else setUnlocked(true);
    } catch {
      setError('Não conseguimos criar o PIN neste navegador.');
    } finally {
      setBusy(false);
    }
  };

  const onEnter = async (value: string) => {
    setBusy(true);
    const result = await unlockNotesWithPin(userId, value);
    setBusy(false);
    if (result.ok) {
      setUnlocked(true);
      return;
    }
    setPin('');
    setError(
      result.waitMs > 0
        ? `Muitas tentativas. Tente de novo em ${waitLabel(result.waitMs)}.`
        : 'PIN incorreto. Tente de novo.',
    );
  };

  const useBiometrics = async () => {
    setError(undefined);
    if (await unlockNotesWithBiometrics(userId)) setUnlocked(true);
    else setError('Não deu certo. Use o PIN.');
  };

  const turnOnBiometrics = async () => {
    setBusy(true);
    const result = await enableNotesBiometrics(userId);
    setBusy(false);
    if (result === 'enabled') toast.success('Pronto: suas notas abrem com digital ou rosto.');
    if (result === 'unsupported')
      toast.info('Este navegador ainda não permite abrir as notas por biometria. Use o PIN.');
    setUnlocked(true);
  };

  if (step === 'loading') return null;

  if (step === 'offer-biometrics') {
    return (
      <View style={{ paddingTop: spacing.xxl, gap: spacing.md }}>
        <Header
          title="Abrir com digital ou rosto?"
          message="Além do PIN, suas notas podem abrir com a biometria deste aparelho. Ela fica no aparelho; o DuoDay nunca a recebe."
        />
        <Button label="Usar digital ou rosto" icon={Fingerprint} onPress={turnOnBiometrics} loading={busy} />
        <Button label="Agora não" variant="ghost" onPress={() => setUnlocked(true)} disabled={busy} />
      </View>
    );
  }

  const creating = step === 'create' || step === 'confirm';
  return (
    <View style={{ paddingTop: spacing.xxl, gap: spacing.lg }}>
      <Header
        title={
          step === 'create'
            ? 'Crie um PIN para suas notas'
            : step === 'confirm'
              ? 'Repita o PIN'
              : 'Notas protegidas'
        }
        message={
          creating
            ? 'São 6 números, só deste aparelho. Suas notas ficam guardadas aqui, criptografadas, e só abrem com ele.'
            : 'Digite seu PIN para abrir suas notas privadas.'
        }
      />
      {step === 'enter' && bioEnabled ? (
        <Button label="Usar digital ou rosto" icon={Fingerprint} onPress={useBiometrics} testID="notes-bio" />
      ) : null}
      <CodeInput
        key={step}
        value={pin}
        onChange={(value) => {
          setPin(value);
          if (value) setError(undefined);
        }}
        length={PIN_LENGTH}
        secure
        autoFocus={Platform.OS === 'web' || !bioEnabled}
        accessibilityLabel={`PIN de ${PIN_LENGTH} números`}
        error={error}
        onComplete={(value) => {
          if (busy) return;
          if (step === 'create') onCreate(value);
          else if (step === 'confirm') void onConfirm(value);
          else void onEnter(value);
        }}
      />
      {busy ? (
        <AppText variant="caption" color="textSecondary" align="center">
          Abrindo…
        </AppText>
      ) : null}
      {step === 'enter' ? (
        <Button label="Esqueci o PIN" variant="ghost" size="sm" onPress={() => setForgotOpen(true)} />
      ) : null}
      <ConfirmDialog
        visible={forgotOpen}
        title="Esqueceu o PIN?"
        message="Sem o PIN não há como abrir as notas deste aparelho: nem nós conseguimos, porque elas não saem daqui. Você pode apagá-las e criar um PIN novo. Isso não pode ser desfeito."
        confirmLabel="Apagar notas e criar PIN novo"
        destructive
        onCancel={() => setForgotOpen(false)}
        onConfirm={async () => {
          setForgotOpen(false);
          await destroyNotes(userId);
          setBioEnabled(false);
          reset('create');
        }}
      />
    </View>
  );
}
