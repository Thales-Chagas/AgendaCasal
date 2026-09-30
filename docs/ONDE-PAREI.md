# Onde parei

Última atualização: 30/09/2026.

## Estado do projeto

- Todo o código está na branch `claude/busy-darwin-7lbh10` (ainda não foi para a `main`).
  Ela contém tudo da antiga `claude/magical-keller-lh4mgu` mais o `expo-dev-client`.
- Banco testado na nuvem: as 7 migrations aplicam sem erro, `npm run test:db` passa 62/62,
  `npm run check` passa 140/140 e `npm run db:lint` não acha erros.

## Decisões tomadas

- **Supabase online, plano grátis** (sem mensalidade). Aguenta com folga ~200 usuários.
  Sem Docker: o banco local (caminho B) foi descartado.
- Dois projetos criados na região São Paulo (`sa-east-1`):
  - `Agenda_Casal TST`: teste, para desenvolver.
  - `Agenda_Casal`: produção, só para usuários reais.
- **Lançar primeiro só na Play Store** (conta de US$ 25). iPhone depois, quando der para pagar
  a Apple (US$ 99/ano); o mesmo código serve.
- Rodar no celular com _development build_ feito no EAS (nuvem), sem Android Studio.

## Plano

1. ✅ Instalar Git e Node.
2. ✅ Criar os 2 projetos no Supabase.
3. ⏳ Ligar o app no projeto de teste e rodar no celular Android.
4. Criar a conta na Play Console.
5. E-mail grátis (Brevo) via SMTP no projeto de produção. O SMTP padrão do Supabase não
   serve para usuários reais.
6. Teste fechado do Google: 12 pessoas por 14 dias (exigência para conta pessoal).
7. Em paralelo: publicar a Política de Privacidade (GitHub Pages ou Google Sites) e preencher
   o _Data safety_.
8. Publicar na Play Store.
9. iPhone depois.

Pendências conhecidas do plano grátis: backup semanal (sugerido via GitHub Actions,
criptografado) e o projeto pausa após 7 dias sem uso (reativar no painel).
