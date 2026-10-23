import { Composition } from 'remotion';

import { Completo, COMPLETO_FRAMES } from './Completo';
import { Principal, PRINCIPAL_FRAMES } from './Principal';
import { Apresentacao, APRESENTACAO_FRAMES } from './apresentacao/Apresentacao';

export function Root() {
  return (
    <>
      <Composition id="Principal" component={Principal} durationInFrames={PRINCIPAL_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="Vertical" component={Principal} durationInFrames={PRINCIPAL_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="PrincipalNarrado" component={Principal} defaultProps={{ narrated: true }} durationInFrames={PRINCIPAL_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="VerticalNarrado" component={Principal} defaultProps={{ narrated: true }} durationInFrames={PRINCIPAL_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="Apresentacao" component={Apresentacao} durationInFrames={APRESENTACAO_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="ApresentacaoLegendada" component={Apresentacao} defaultProps={{ legendas: true }} durationInFrames={APRESENTACAO_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="ApresentacaoVertical" component={Apresentacao} defaultProps={{ legendas: true }} durationInFrames={APRESENTACAO_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="Completo" component={Completo} durationInFrames={COMPLETO_FRAMES} fps={30} width={1920} height={1080} />
    </>
  );
}
