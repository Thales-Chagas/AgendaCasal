# Narração do vídeo com a ElevenLabs (no seu computador)

O vídeo de apresentação (`marketing/video`, composição "Apresentação") está pronto com a voz reserva
(Microsoft Thalita). Para trocar pela ElevenLabs, a narração é gerada **no seu computador**: a conta
grátis da ElevenLabs recusa os pedidos que vêm da nuvem do Claude ("detected_unusual_activity": o
plano grátis bloqueia proxy/VPN). Depois o Claude renderiza o vídeo de novo e atualiza o site.

## 1. Pegar a chave da API na ElevenLabs

1. Entre em https://elevenlabs.io com a sua conta.
2. Abra https://elevenlabs.io/app/settings/api-keys (pelo menu: barra lateral › **Developers** ›
   **API Keys**; em algumas versões fica no seu nome/avatar, no canto inferior esquerdo).
3. **Create API Key**, nome `duoday-video`.
4. Se pedir permissões: **Text to Speech → Access** (o resto pode ficar sem acesso).
5. **Create** e copie a chave na hora (começa com `sk_`; só aparece uma vez — se perder, crie outra).

⚠️ Não mande a chave no chat nem salve em arquivo do projeto. Ela fica só na janela do PowerShell.

## 2. Instalar Python e ffmpeg (uma vez só)

No PowerShell:

```powershell
winget install -e --id Python.Python.3.12
winget install -e --id Gyan.FFmpeg
```

Feche e abra o PowerShell de novo e confira: `python --version` e `ffmpeg -version`.

## 3. Baixar a versão atual do projeto

Desligue qualquer VPN. Na pasta do projeto:

```powershell
cd C:\caminho\para\AgendaCasal
git fetch
git checkout claude/nifty-hamilton-d40uer
git pull
```

(Se o `checkout` reclamar de arquivos alterados, rode `git status` e mande o resultado ao Claude.)

## 4. Gerar a narração

```powershell
cd marketing\video
$env:ELEVENLABS_API_KEY="sk_cole_sua_chave_aqui"
python audio\apresentacao\voz.py elevenlabs
```

Deu certo se aparecerem 12 linhas (uma por cena) e um total no fim, por exemplo
`total 118.2 s -> src\apresentacao\narracao.json`.

Cada rodada gasta ~1.700 dos 10.000 caracteres grátis do mês (dá para umas 5 tentativas).

Outra voz: em **Voices**, clique na voz, copie o **ID** e rode antes do passo 4
`$env:ELEVEN_VOICE="id_da_voz"`. Padrão: Jessica ("Playful, Bright, Warm"). No plano grátis, vozes
da biblioteca da comunidade podem não funcionar pela API; as padrão funcionam.

## 5. Enviar o resultado

```powershell
cd ..\..
git add marketing/video/public/apresentacao/voz marketing/video/src/apresentacao/narracao.json
git commit -m "Narração da ElevenLabs"
git push
```

Depois diga **"pronto"** ao Claude: ele renderiza as três versões (16:9, vertical e legendada) e
atualiza o vídeo do site. As cenas se ajustam sozinhas à duração da nova fala.

## Se der erro

| Mensagem                                  | Significa                               | O que fazer                                                                 |
| ----------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `detected_unusual_activity`               | O bloqueio vale para a conta inteira    | Assinar o Starter (US$ 5/mês) ou pedir desbloqueio ao suporte da ElevenLabs |
| `invalid_api_key` / `missing_permissions` | Chave errada ou sem permissão           | Criar outra chave com **Text to Speech: Access**                            |
| `quota_exceeded`                          | Acabaram os caracteres do mês           | Esperar renovar ou assinar                                                  |
| `'python' não é reconhecido`              | O PowerShell ainda não viu a instalação | Fechar e abrir o PowerShell                                                 |
| `FileNotFoundError` / `ffprobe`           | ffmpeg ausente                          | Refazer o passo 2 e abrir um PowerShell novo                                |

**Licença:** no plano grátis a ElevenLabs exige citar a ElevenLabs e não libera uso comercial
(conferir nos termos deles). Para o vídeo no site e em anúncios, o Starter é o caminho seguro.
