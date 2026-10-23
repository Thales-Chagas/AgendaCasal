import { Config } from '@remotion/cli/config';

// Usa o chrome-headless-shell já instalado no ambiente (defina CHROME_PATH para outro navegador).
Config.setBrowserExecutable(process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(4);
