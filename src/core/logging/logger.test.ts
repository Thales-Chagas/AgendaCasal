import { addLogSink, logger, scrub, scrubText, type LogEntry } from './logger';

describe('logger', () => {
  it('mascara e-mails, JWTs e chaves no texto', () => {
    const text = scrubText(
      'falha para ana@exemplo.com com eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc_def e sb_secret_abc123 Bearer xyz.123',
    );
    expect(text).not.toContain('ana@exemplo.com');
    expect(text).not.toContain('eyJhbGci');
    expect(text).not.toContain('sb_secret_abc123');
    expect(text).not.toContain('xyz.123');
  });

  it('remove campos sensíveis de objetos, inclusive aninhados', () => {
    const result = scrub({
      eventId: '123',
      title: 'Consulta médica',
      nested: { password: 'segredo', content: 'nota privada', count: 2 },
    });
    expect(result).toEqual({
      eventId: '123',
      title: '[redacted]',
      nested: { password: '[redacted]', content: '[redacted]', count: 2 },
    });
  });

  it('entrega entradas já mascaradas para os destinos', () => {
    const entries: LogEntry[] = [];
    const remove = addLogSink((e) => entries.push(e));
    logger.error('Erro ao salvar para bia@exemplo.com', { email: 'bia@exemplo.com', code: 'x' });
    remove();
    expect(entries).toHaveLength(1);
    expect(JSON.stringify(entries[0])).not.toContain('bia@exemplo.com');
  });
});
