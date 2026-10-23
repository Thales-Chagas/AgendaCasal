# Vídeo de apresentação do DuoDay

Produção em [Remotion](https://www.remotion.dev/), separada do app.

## Apresentação (23/10/2026, a principal)

Tour divertido e minimalista por **todas as abas**, no tema claro do app e com narração feminina.
É o vídeo do site (`duoday.com.br`, seção "Vídeo").

| Versão                  | Composição              | Formato                    | Arquivo                                          |
| ----------------------- | ----------------------- | -------------------------- | ------------------------------------------------ |
| Site / YouTube          | `Apresentacao`          | 1920 × 1080, 30 fps, H.264 | `out/duoday-apresentacao-16x9.mp4`               |
| Com legenda na imagem   | `ApresentacaoLegendada` | 1920 × 1080, 30 fps, H.264 | `out/duoday-apresentacao-legendada-16x9.mp4`     |
| Reels/TikTok/Shorts     | `ApresentacaoVertical`  | 1080 × 1920, 30 fps, H.264 | `out/duoday-apresentacao-vertical-9x16.mp4`      |
| Versão leve do site     | (de `Apresentacao`)     | 1080p, CRF 24, + capa e VTT | `site/video/duoday-apresentacao.{mp4,jpg,vtt}` |

**Ideia.** Abre com a briga clássica ("Amor, você marcou o dentista?" "Que dentista?") e os dois
pontinhos do casal, a Bia (índigo) e o Rafa (lagoa), viram mascotes. O "Dentista, de Rafa" volta
na Agenda e no final. O resto é um celular só, navegando pelo app de verdade, com:

- um marcador **📍 onde estou** (ex.: "Agenda › Mês", "+ › Novo compromisso") para cada tela;
- toques animados nos lugares reais dos botões (`src/apresentacao/taps.json`, medido no app);
- destaques e rótulos ligados à tela, a barra de abas ampliada, miniaturas das configurações.

Roteiro, na ordem: gancho → o que é → conectar (código, QR Code, link) → barra (Início, Agenda,
Finanças, Notas, Nós e o +) → Início (e a busca) → Agenda (Hoje, Semana, Mês, Próximos, cores) →
criar pelo + (Meu/Do parceiro/Nosso, hora, lembrete, repetição) → tempo real no outro celular →
Finanças → Notas (privadas) → Nós (datas especiais, cor, foto, tema, notificações, digital/rosto)
→ final.

**Sincronia.** Cada cena dura o tempo da sua fala e cada animação está presa a uma palavra
(`cue('agenda', 'semana')`), com os tempos de cada palavra vindos da própria voz. Trocar a voz
reposiciona o vídeo inteiro sozinho.

### Gerar de novo

```bash
cd marketing/video
npm install
npm run apresentacao:voz           # narração ElevenLabs (precisa de plano pago, ver abaixo)
#  ou: npm run apresentacao:voz-reserva   (voz grátis da Microsoft, pt-BR "Thalita")
npm run apresentacao:trilha        # trilha e efeitos, sintetizados, já na duração certa
npm run render:apresentacao        # 16:9
npm run render:apresentacao-vertical
npm run apresentacao:site          # versão leve + capa + legenda em site/video/
```

- Roteiro: `audio/apresentacao/roteiro.json` (`say` é o que a voz fala, com a grafia "Dúo Dêi"
  para a pronúncia; `text` é a legenda).
- Voz da ElevenLabs: `ELEVEN_VOICE=<id>` escolhe a voz (padrão Jessica, "Playful, Bright, Warm";
  com plano pago dá para usar uma voz brasileira da Voice Library), `ELEVEN_MODEL` o modelo. A chave
  vem de `ELEVENLABS_API_KEY` ou do proxy da sessão na nuvem.
- **Em 23/10 a ElevenLabs recusou a conta gratuita** ("detected_unusual_activity": o plano grátis
  bloqueia chamadas feitas por proxy/VPN, como as da nuvem do Claude). Por isso o vídeo atual usa a
  voz reserva (Microsoft Thalita, neural, pt-BR). Com o plano Starter (US$ 5/mês, 30 mil
  caracteres; o roteiro tem ~1.700) basta rodar `npm run apresentacao:voz` e renderizar de novo.
- Telas: `public/apresentacao/` (tema claro), geradas por `capture/07a-convite-claro.js` e
  `capture/07b-tour-claro.js` no Supabase **local** com o casal fictício (ver "Refazer as
  capturas" abaixo; rode o `seed.sql` antes da 07b).

---

## Versões anteriores (21/10/2026)

As telas destas versões são **capturas reais**
do DuoDay (a versão web do mesmo código, no tamanho de um celular de 390 × 844 pt), com dados
**fictícios** (Bia e Rafa) num Supabase **local**.

| Versão                    | Composição  | Formato                       | Duração | Arquivo                                       |
| ------------------------- | ----------- | ----------------------------- | ------- | --------------------------------------------- |
| Principal (campanha)      | `Principal` | 1920 × 1080, 30 fps, H.264    | 62 s    | `out/duoday-principal-16x9.mp4`               |
| Vertical (Reels/TikTok)   | `Vertical`  | 1080 × 1920, 30 fps, H.264    | 62 s    | `out/duoday-vertical-9x16.mp4`                |
| Demonstração completa     | `Completo`  | 1920 × 1080, 30 fps, H.264    | 2 min 14 s | `out/duoday-demonstracao-completa-16x9.mp4` |
| Principal com narração    | `PrincipalNarrado` | 1920 × 1080, 30 fps, H.264 | 62 s | `out/duoday-principal-narrado-16x9.mp4`   |
| Vertical com narração     | `VerticalNarrado`  | 1080 × 1920, 30 fps, H.264 | 62 s | `out/duoday-vertical-narrado-9x16.mp4`    |

## Como reproduzir

```bash
cd marketing/video
npm install
npm run audio            # gera public/audio/*.wav (trilha e efeitos, determinístico)
npm run studio           # pré-visualizar e ajustar
npm run render           # gera os três MP4 em out/
```

### Narração (voz feminina)

Gerada localmente com o [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) (voz `pf_dora`, pt-BR):

```bash
pip install kokoro-onnx soundfile
# baixe kokoro-v1.0.int8.onnx e voices-v1.0.bin para audio/models/
# https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
npm run voz              # gera public/audio/vo-XX.wav e src/narration.json
```

O texto e o momento de cada fala ficam em `audio/make_voice.py`. A música abaixa sozinha
enquanto a narradora fala. Para trocar por uma voz paga (ex.: ElevenLabs) ou gravada, basta
gerar os mesmos `vo-XX.wav` e rodar o script só para atualizar os tempos.

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
     (posições reais dos botões para os toques animados → `src/taps.json`);
   - `node 06-conta.js` ("Minha conta" aberta pelo caminho normal, com o nome preenchido: cor e foto).

Nada disso toca no banco de teste (TST) ou de produção.

## Licenças

- **Música e efeitos sonoros:** sintetizados do zero por `audio/make_audio.py` e
  `audio/apresentacao/trilha.py` (sem amostras de terceiros). Uso livre pelo dono do projeto.
- **Narração da Apresentação:** ElevenLabs (o plano pago inclui uso comercial) ou, na reserva, a voz
  neural da Microsoft pelo `edge-tts` (serviço gratuito sem garantia formal de uso comercial: para
  campanha paga, prefira a ElevenLabs).
- **Narração:** Kokoro-82M e suas vozes são Apache 2.0 (uso comercial permitido). É uma voz
  sintética; vale avisar isso se a plataforma onde for publicar pedir.
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
