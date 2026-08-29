# Studoo — direcao de produto

*Atualizado em 2026-08-29*

## Premissa central

O Studoo existe para fazer o professor particular abandonar a operacao espalhada entre planilha, agenda, WhatsApp, caderno e memoria.

Nao e "mais uma agenda". E o painel unico da gestao do professor.

## Decisao de posicionamento

**Frase-guia:**

Studoo e o painel de gestao para professores particulares que querem parar de se organizar entre planilha, agenda, WhatsApp e bloco de notas.

**Promessa principal:**

Em um lugar so, o professor entende quem tem aula, quem faltou, quem deve, quem precisa de reposicao e o que precisa fazer hoje.

## Principio de produto

Toda feature precisa responder "isso ajuda o professor a abandonar outra ferramenta?"

Se a resposta for nao, vai para depois.

## Ferramentas que o Studoo deve substituir

| Ferramenta atual | O que o professor faz nela | Como o Studoo deve substituir |
|------------------|----------------------------|-------------------------------|
| Planilha | Lista de alunos, mensalidades, presencas | Cadastro, financeiro, historico e relatorios |
| Google Calendar | Horarios e aulas recorrentes | Agenda recorrente com aluno, status e reposicao |
| WhatsApp | Cobrancas, lembretes, combinados | Mensagens prontas e historico por aluno |
| Caderno/bloco de notas | Observacoes de aula e evolucao | Diario do aluno |
| Memoria | Pendencias e alunos que sumiram | Alertas e resumo da semana |

## O que precisa estar forte antes do beta

1. Cadastro e login sem friccao.
2. Onboarding curto, claro e visualmente alinhado.
3. Importacao/cadastro de alunos muito simples.
4. Agenda confiavel.
5. Financeiro manual, mas claro.
6. Recibos e mensagens com tom profissional.
7. Dashboard mostrando apenas o que exige acao.
8. Emails de autenticacao com marca e melhor entregabilidade.

## IA no Studoo

A IA deve economizar trabalho dentro do fluxo. Ela nao deve ser um chat solto sem contexto.

### Prioridade 1 — Assistente de cobrancas

Objetivo: reduzir o atrito de cobrar aluno ou responsavel.

Fluxo esperado:

- O professor abre Financeiro.
- O Studoo identifica cobrancas pendentes/atrasadas.
- A IA gera mensagens prontas por aluno.
- O professor escolhe o tom e envia via WhatsApp.

Tons sugeridos:

- Leve
- Direto
- Mais firme
- Para responsavel

Por que entra primeiro:

- Dor clara.
- Dados ja existem.
- Valor percebido rapido.
- Ajuda o professor a abandonar planilha + texto manual no WhatsApp.

### Prioridade 2 — Resumo inteligente da semana

Objetivo: criar habito de uso.

Resumo deve mostrar:

- Aulas da semana.
- Cobrancas pendentes.
- Reposicoes abertas.
- Alunos sem aula recente.
- Aniversarios.
- Sugestao de prioridades.

Formato inicial:

- Card no dashboard.
- Depois, email semanal ou WhatsApp, se houver canal confiavel.

### Prioridade 3 — Copiloto de aula

Objetivo: transformar anotacoes simples em historico util.

Fluxo esperado:

- Professor escreve uma observacao curta.
- IA organiza em resumo, evolucao, tarefa para proxima aula e mensagem opcional para aluno/responsavel.

### Prioridade 4 — Importador inteligente

Objetivo: reduzir o medo de migrar.

Fluxo esperado:

- Professor cola uma lista baguncada.
- IA identifica nome, telefone, instrumento, dia, horario e mensalidade.
- Professor revisa antes de salvar.

## O que nao fazer agora

- Chat generico de IA sem acao no produto.
- IA que prometa ensinar musica.
- Automacao que envie mensagens sem aprovacao do professor.
- Cobrança automatica antes de o fluxo manual estar validado.
- Portal do aluno antes de validar uso recorrente pelo professor.

## Onboarding guiado

Deve entrar depois que as telas principais estiverem estaveis.

Critérios:

- Aparecer no primeiro acesso ao painel.
- Explicar menu, novo aluno, agenda, financeiro e configuracoes.
- Permitir pular.
- Nao reaparecer apos conclusao.
- Poder ser reaberto em Ajuda ou Configuracoes.

## Ordem recomendada

1. Fechar polimento visual e textos das telas principais.
2. Ajustar templates de email no Supabase.
3. Rodar QA completo com conta real.
4. Implementar onboarding guiado.
5. Implementar Assistente de cobrancas.
6. Implementar Resumo inteligente da semana.
7. Convidar primeiros professores para beta fechado.
