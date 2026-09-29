/**
 * Fluxos de autenticação ponta a ponta contra o Supabase local:
 * cadastro com código, login, sessão, recuperação e troca de senha.
 * Os e-mails são lidos do Mailpit local.
 */
import { randomUUID } from 'node:crypto';

import { createAuthRepository } from '../../src/features/auth/data/auth-repository';
import { anonClient } from './helpers';

const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

async function latestCodeFor(email: string, subjectIncludes: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const body = (await res.json()) as { messages: { ID: string; Subject: string }[] };
    const message = body.messages.find((m) => m.Subject.includes(subjectIncludes));
    if (message) {
      const detail = (await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json()) as {
        HTML: string;
      };
      const code = detail.HTML.match(/>\s*(\d{6})\s*</)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Código não encontrado para ${email}`);
}

const newEmail = () => `pessoa-${randomUUID().slice(0, 8)}@teste.local`;

describe('cadastro e login', () => {
  it('cria conta, exige confirmação por código e entra', async () => {
    const client = anonClient();
    const auth = createAuthRepository(client);
    const email = newEmail();

    await auth.signUp({ name: 'Júlia', email, password: 'senhaForte123' });

    await expect(auth.signIn(email, 'senhaForte123')).rejects.toMatchObject({ code: 'email_not_confirmed' });

    const code = await latestCodeFor(email, 'confirmação');
    const session = await auth.confirmSignUp(email, code);
    expect(session.user.email).toBe(email);

    const { data: profile } = await client.from('profiles').select('display_name, terms_version').single();
    expect(profile).toEqual({ display_name: 'Júlia', terms_version: '2026-09' });

    await auth.signOut();
    expect(await auth.getSession()).toBeNull();

    const again = await auth.signIn(email, 'senhaForte123');
    expect(again.user.email).toBe(email);
  });

  it('recusa código de confirmação errado', async () => {
    const auth = createAuthRepository(anonClient());
    const email = newEmail();
    await auth.signUp({ name: 'Leo', email, password: 'senhaForte123' });
    await expect(auth.confirmSignUp(email, '000000')).rejects.toMatchObject({ code: 'invalid_otp' });
  });

  it('recusa senha fraca no servidor', async () => {
    const auth = createAuthRepository(anonClient());
    await expect(auth.signUp({ name: 'Leo', email: newEmail(), password: 'abcdefgh' })).rejects.toMatchObject(
      {
        code: 'weak_password',
      },
    );
  });

  it('informa credenciais inválidas sem dizer qual campo errou', async () => {
    const auth = createAuthRepository(anonClient());
    await expect(auth.signIn(newEmail(), 'qualquer123')).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
  });

  it('avisa quando o e-mail já tem conta', async () => {
    const client = anonClient();
    const auth = createAuthRepository(client);
    const email = newEmail();
    await auth.signUp({ name: 'Rita', email, password: 'senhaForte123' });
    await auth.confirmSignUp(email, await latestCodeFor(email, 'confirmação'));
    await auth.signOut();
    await expect(auth.signUp({ name: 'Rita', email, password: 'outraSenha123' })).rejects.toMatchObject({
      code: 'email_taken',
    });
  });
});

describe('senha', () => {
  it('recupera a senha com código enviado por e-mail', async () => {
    const auth = createAuthRepository(anonClient());
    const email = newEmail();
    await auth.signUp({ name: 'Nina', email, password: 'senhaAntiga1' });
    await auth.confirmSignUp(email, await latestCodeFor(email, 'confirmação'));
    await auth.signOut();

    const other = createAuthRepository(anonClient());
    await other.requestPasswordReset(email);
    const code = await latestCodeFor(email, 'redefinir');
    await other.verifyRecoveryCode(email, code);
    await other.setNewPassword('senhaNova123');
    await other.signOut();

    await expect(other.signIn(email, 'senhaAntiga1')).rejects.toMatchObject({ code: 'invalid_credentials' });
    const session = await other.signIn(email, 'senhaNova123');
    expect(session.user.email).toBe(email);
  });

  it('troca a senha no perfil só com a senha atual correta', async () => {
    const auth = createAuthRepository(anonClient());
    const email = newEmail();
    await auth.signUp({ name: 'Caio', email, password: 'senhaAtual1' });
    await auth.confirmSignUp(email, await latestCodeFor(email, 'confirmação'));

    await expect(auth.changePassword(email, 'errada123', 'senhaNova123')).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
    await auth.changePassword(email, 'senhaAtual1', 'senhaNova123');
    await auth.signOut();
    const session = await auth.signIn(email, 'senhaNova123');
    expect(session.user.email).toBe(email);
  });
});
