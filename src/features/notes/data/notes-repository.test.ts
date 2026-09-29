import { randomUUID } from 'node:crypto';

import { createNodeSqlDatabase } from '@/core/storage/testing/node-sql';

import { displayTitle, isEmptyNote, preview } from '../domain/types';
import { createNotesRepository, toFtsQuery } from './notes-repository';

async function setup() {
  let clock = new Date('2026-09-29T12:00:00Z').getTime();
  const repo = await createNotesRepository(createNodeSqlDatabase(), {
    newId: randomUUID,
    now: () => new Date((clock += 1000)),
  });
  return repo;
}

describe('notas privadas (repositório local)', () => {
  it('cria, edita, lista e exclui com possibilidade de desfazer', async () => {
    const repo = await setup();
    const note = await repo.create({ title: 'Presente', body: 'Livro de receitas' });
    await repo.update(note.id, { body: 'Livro de receitas veganas' });
    expect((await repo.get(note.id))?.body).toBe('Livro de receitas veganas');

    const removed = await repo.remove(note.id);
    expect(await repo.list()).toEqual([]);
    await repo.restore(removed!);
    expect((await repo.list()).map((n) => n.id)).toEqual([note.id]);
  });

  it('busca sem acento, por prefixo, em título e texto', async () => {
    const repo = await setup();
    await repo.create({ title: 'Café da manhã', body: 'pão de queijo' });
    await repo.create({ title: 'Viagem', body: 'Levar protetor solar' });
    expect((await repo.list({ search: 'cafe' })).map((n) => n.title)).toEqual(['Café da manhã']);
    expect((await repo.list({ search: 'QUEIJ' })).map((n) => n.title)).toEqual(['Café da manhã']);
    expect((await repo.list({ search: 'protetor viag' })).map((n) => n.title)).toEqual(['Viagem']);
    expect(await repo.list({ search: 'inexistente' })).toEqual([]);
  });

  it('a busca acompanha edições e exclusões', async () => {
    const repo = await setup();
    const note = await repo.create({ title: 'Mercado', body: 'arroz' });
    await repo.update(note.id, { body: 'feijão' });
    expect(await repo.list({ search: 'arroz' })).toEqual([]);
    expect(await repo.list({ search: 'feijao' })).toHaveLength(1);
    await repo.remove(note.id);
    expect(await repo.list({ search: 'feijao' })).toEqual([]);
  });

  it('fixadas primeiro; arquivadas ficam separadas', async () => {
    const repo = await setup();
    const a = await repo.create({ title: 'A' });
    const b = await repo.create({ title: 'B' });
    const c = await repo.create({ title: 'C' });
    await repo.setPinned(a.id, true);
    await repo.setArchived(c.id, true);
    expect((await repo.list()).map((n) => n.title)).toEqual(['A', 'B']);
    expect((await repo.list({ archived: true })).map((n) => n.title)).toEqual(['C']);
    expect(await repo.count()).toEqual({ active: 2, archived: 1 });
    expect(b).toBeTruthy();
  });

  it('ordena por edição, criação ou título', async () => {
    const repo = await setup();
    const first = await repo.create({ title: 'banana' });
    await repo.create({ title: 'Abacaxi' });
    await repo.update(first.id, { body: 'editada por último' });
    expect((await repo.list({ sort: 'updated' })).map((n) => n.title)).toEqual(['banana', 'Abacaxi']);
    expect((await repo.list({ sort: 'created' })).map((n) => n.title)).toEqual(['Abacaxi', 'banana']);
    expect((await repo.list({ sort: 'title' })).map((n) => n.title)).toEqual(['Abacaxi', 'banana']);
  });

  it('protege a busca contra sintaxe especial do FTS', () => {
    expect(toFtsQuery('"; DROP TABLE notes; --')).toBe('"DROP"* "TABLE"* "notes"*');
    expect(toFtsQuery('   ')).toBeNull();
  });

  it('títulos e prévias amigáveis', () => {
    expect(displayTitle({ title: '', body: 'Primeira linha\nsegunda' })).toBe('Primeira linha');
    expect(preview({ title: '', body: 'Primeira linha\nsegunda' })).toBe('segunda');
    expect(displayTitle({ title: '', body: '' })).toBe('Nota sem título');
    expect(isEmptyNote({ title: ' ', body: '\n' })).toBe(true);
  });
});
