# Quiz · Encontro dos Heróis do Brasil

Landing do quiz de medicina de emergência da Emergency Talks: a pessoa se inscreve e responde a rodadas de perguntas (manhã, tarde e noite de cada data) para concorrer a um videolaringoscópio e outros prêmios.

No ar: https://gtalksmkt.github.io/quiz-herois-do-brasil/ (com `noindex` até as pendências serem resolvidas)

## Arquivos

- `index.html`: a página (visual do Preparatório TEME 2027: preto, luz vermelha, Barlow Condensed + Inter).
- `js/config.js`: **o que a equipe troca**: datas, horários de cada período, temas, prêmios, WhatsApp e o endereço da planilha (`endpoint`).
- `js/perguntas-demo.js`: perguntas de exemplo, usadas só enquanto `endpoint` está vazio. Arquivo público: nunca coloque aqui as perguntas oficiais.
- `js/quiz.js`: funcionamento (agenda, contagem, inscrição, player do quiz).
- `quiz-planilha.gs`: Google Apps Script da planilha (inscrições, perguntas por rodada, correção no servidor, ranking). Instruções no topo do arquivo.

## Modos

- **Demonstração** (`endpoint` vazio): inscrição e respostas ficam só no aparelho da pessoa. Serve para ver o fluxo.
- **Valendo** (`endpoint` com o /exec do Apps Script): a agenda vem da aba "Rodadas", as perguntas só são entregues quando a rodada abre (sem gabarito), e a correção e o tempo ficam na planilha.

Para testar tudo fora do horário: abra `index.html?teste=1` (só funciona no modo demonstração).

## Pontuação

1 ponto por acerto, somando todas as rodadas. Desempate: menor tempo total (do momento em que a pessoa abre a rodada até enviar, medido no servidor). Ranking: na planilha, menu **Quiz > Atualizar ranking**.
