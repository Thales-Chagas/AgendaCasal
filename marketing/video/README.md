# Vídeo de apresentação do DuoDay

Produção em [Remotion](https://www.remotion.dev/), separada do app. As telas são **capturas reais**
do DuoDay (a versão web do mesmo código, no tamanho de um celular de 390 × 844 pt), com dados
**fictícios** (Bia e Rafa) num Supabase **local**.

| Versão                    | Composição  | Formato                       | Duração | Arquivo                                       |
| ------------------------- | ----------- | ----------------------------- | ------- | --------------------------------------------- |
| Principal (campanha)      | `Principal` | 1920 × 1080, 30 fps, H.264    | 62 s    | `out/duoday-principal-16x9.mp4`               |
| Vertical (Reels/TikTok)   | `Vertical`  | 1080 × 1920, 30 fps, H.264    | 62 s    | `out/duoday-vertical-9x16.mp4`                |
| Demonstração completa     | `Completo`  | 1920 × 1080, 30 fps, H.264    | 2 min 14 s | `out/duoday-demonstracao-completa-16x9.mp4` |

## Como reproduzir

```bash
cd marketing/video
npm install
npm run audio            # gera public/audio/*.wav (trilha e efeitos, determinístico)
npm run studio           # pré-visualizar e ajustar
npm run render           # gera os três MP4 em out/
```

O Remotion usa o `chrome-headless-shell` indicado em `remotion.config.ts` (ou em `CHROME_PATH`).

### Refazer as capturas (opcional, as telas já estão em `public/screens/`)

1. Na raiz do repositório: `npm run db:start` (Supabase local, precisa de Docker).
2. Gere o web apontando para o banco local:
   `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave de npx supabase status> npx expo export --clear --platform web`
   e sirva a pasta `dist` em `http://localhost:8099/` com fallback para `index.html`.
3. Em `marketing/video/capture/`, na ordem:
   - `node 01-casal.js` e `node 01b-vinculo.js` (cadastro, convite e vínculo de Bia e Rafa;
     o código de confirmação é lido do Mailpit local);
   - `docker exec -i supabase_db_agendacasal psql -U postgres < seed.sql` (compromissos, datas e contas);
   - `node 02-tour.js`, `node 03-ajustes.js`, `node 04-tema-claro.js` (telas) e `node 05-posicoes.js`
     (posições reais dos botões para os toques animados → `src/taps.json`).

Nada disso toca no banco de teste (TST) ou de produção.

## Licenças

- **Música e efeitos sonoros:** sintetizados do zero por `audio/make_audio.py` (sem amostras de
  terceiros). Uso livre pelo dono do projeto.
- **Fonte:** Plus Jakarta Sans (SIL Open Font License 1.1), a mesma do app.
- **Remotion:** gratuito para pessoas físicas e empresas com até 3 pessoas; acima disso exige a
  licença da empresa (remotion.pro). Isso vale para quem renderiza, não para quem assiste.
- **Foto de perfil:** ilustração gerada (`capture/foto-ficticia.jpg`), não é uma pessoa real.

## O que aparece (checklist)

| Funcionalidade                                                 | Principal | Vertical | Completo |
| -------------------------------------------------------------- | :-------: | :------: | :------: |
| Boas-vindas, cadastro e confirmação por código                 |           |          |    ✅    |
| Escolha inicial (criar agenda, entrar com convite, explorar)   |           |          |    ✅    |
| Convite por código / QR Code / link                            |    ✅     |    ✅    |    ✅    |
| Entrar com convite e celebração nos dois celulares             |    ✅     |    ✅    |    ✅    |
| Início: próximo compromisso, contagem regressiva, atalhos      |    ✅     |    ✅    |    ✅    |
| Agenda: Hoje, Semana, Mês, Próximos                            |    ✅     |    ✅    |    ✅    |
| Detalhe do compromisso e exclusão de repetição (um dia/todos)  |    ✅¹    |    ✅¹   |    ✅    |
| Botão + (compromisso, conta, nota, data especial)              |    ✅     |    ✅    |    ✅    |
| Formulário: Meu / Do parceiro / Nosso, categoria               |    ✅     |    ✅    |    ✅    |
| Local, repetição, lembrete, prioridade, contagem regressiva    |    ✅     |    ✅    |    ✅    |
| Tempo real: o parceiro vê na hora                              |    ✅     |    ✅    |    ✅    |
| Notas privadas: editor com salvamento automático               |    ✅     |    ✅    |    ✅    |
| Notas: fixar, buscar, arquivar, ordenar, exportar              |    ✅²    |    ✅²   |    ✅    |
| Finanças: total do mês, marcar como paga, filtros              |    ✅     |    ✅    |    ✅    |
| Contas privadas (só o dono vê) e nova conta                    |    ✅     |    ✅    |    ✅    |
| Datas especiais com contagem regressiva e nova data            |    ✅     |    ✅    |    ✅    |
| Busca (compromissos, datas e notas)                            |    ✅¹    |    ✅¹   |    ✅    |
| Seletor de cor prismático                                      |    ✅     |    ✅    |    ✅    |
| Foto de perfil com recorte                                     |    ✅¹    |    ✅¹   |    ✅    |
| Tema claro / escuro / automático                               |    ✅¹    |    ✅¹   |    ✅    |
| Notificações (preferências)                                    |    ✅¹    |    ✅¹   |    ✅    |
| Privacidade e exportação de dados (LGPD)                       |    ✅¹    |    ✅¹   |    ✅    |
| Desfazer vínculo, Ajuda, Sobre, Termos e Política              |           |          |    ✅    |

¹ No quadro rápido "E tem mais". ² Fixar e buscar aparecem; arquivar e ordenar só na completa.

**Citados em texto, sem tela:** funcionamento sem internet e biometria nas notas (existem no app,
mas só no celular; a captura foi feita no web) e a criptografia das notas no aparelho.
