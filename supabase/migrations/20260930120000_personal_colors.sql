-- Cores pessoais: o rosé passa a identificar só o que é "do casal".
-- Cada pessoa escolhe entre índigo, verde-azulado, ameixa, âmbar e sálvia; quem estava com o
-- rosé (o padrão antigo) passa para índigo. O rosé continua aceito pela constraint para não
-- quebrar versões antigas do app.
alter table public.profiles alter column avatar_color set default 'indigo';

update public.profiles set avatar_color = 'indigo' where avatar_color = 'rose';
