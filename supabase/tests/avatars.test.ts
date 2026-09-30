/**
 * Foto de perfil: bucket privado. Só eu e meu parceiro vemos; ninguém grava na pasta de outro.
 */
import { randomUUID } from 'node:crypto';

import { connect, createUser, type TestUser } from './helpers';

// Menor JPEG válido (1×1) — o conteúdo não importa para as regras de acesso.
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

let ana: TestUser;
let bruno: TestUser;
let carla: TestUser;
let anaPath: string;

async function upload(user: TestUser, path: string) {
  return user.client.storage.from('avatars').upload(path, JPEG, { contentType: 'image/jpeg' });
}

beforeAll(async () => {
  [ana, bruno, carla] = await Promise.all([createUser('Ana'), createUser('Bruno'), createUser('Carla')]);
  await connect(ana, bruno);
  anaPath = `${ana.id}/${randomUUID()}.jpg`;
  const { error } = await upload(ana, anaPath);
  if (error) throw error;
});

it('eu e meu parceiro conseguimos ver a foto', async () => {
  const mine = await ana.client.storage.from('avatars').createSignedUrl(anaPath, 60);
  expect(mine.error).toBeNull();
  const partner = await bruno.client.storage.from('avatars').createSignedUrl(anaPath, 60);
  expect(partner.error).toBeNull();
  expect(partner.data?.signedUrl).toContain('token=');
});

it('outra pessoa não consegue ver nem baixar', async () => {
  const signed = await carla.client.storage.from('avatars').createSignedUrl(anaPath, 60);
  expect(signed.error).not.toBeNull();
  const download = await carla.client.storage.from('avatars').download(anaPath);
  expect(download.error).not.toBeNull();
});

it('ninguém grava nem apaga na pasta de outra pessoa', async () => {
  const { error } = await upload(bruno, `${ana.id}/${randomUUID()}.jpg`);
  expect(error).not.toBeNull();

  const { data } = await bruno.client.storage.from('avatars').remove([anaPath]);
  expect(data ?? []).toHaveLength(0);
  const stillThere = await ana.client.storage.from('avatars').createSignedUrl(anaPath, 60);
  expect(stillThere.error).toBeNull();
});

it('só aceita imagens JPEG pequenas', async () => {
  const { error } = await ana.client.storage
    .from('avatars')
    .upload(`${ana.id}/${randomUUID()}.jpg`, Buffer.from('<svg/>'), { contentType: 'image/svg+xml' });
  expect(error).not.toBeNull();
});

it('o perfil só aponta para uma foto da própria pasta', async () => {
  const ok = await ana.client.from('profiles').update({ avatar_path: anaPath }).eq('id', ana.id);
  expect(ok.error).toBeNull();

  const alien = await bruno.client.from('profiles').update({ avatar_path: anaPath }).eq('id', bruno.id);
  expect(alien.error).not.toBeNull();

  const { data } = await bruno.client.from('profiles').select('avatar_path').eq('id', ana.id).single();
  expect(data?.avatar_path).toBe(anaPath);
});
