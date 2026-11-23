# Quiz CBMEDE

Landing do quiz de medicina de emergência da Emergency Talks: a pessoa se inscreve (nome, e-mail, WhatsApp, CPF, categoria) e responde a 30 perguntas, em 5 blocos de 6, para concorrer a um videolaringoscópio. O vencedor é anunciado no sábado, ao meio-dia.

No ar: https://gtalksmkt.github.io/quiz-herois-do-brasil/ (com `noindex` até as pendências serem resolvidas). O nome do repositório ainda é o antigo; será trocado depois.

## Arquivos

- `index.html`: a página (visual do Preparatório TEME 2027: preto, luz vermelha, Barlow Condensed + Inter). Inscrição no topo, trilha com cadeados, prêmios, regulamento e realizadores.
- `js/config.js`: **o que a equipe troca**: horários dos 5 blocos, anúncio do vencedor, categorias e opções de 2027 da inscrição, prêmios, realizadores (logos em `img/`), WhatsApp e o endereço da planilha (`endpoint`).
- `js/perguntas-demo.js`: 30 perguntas de exemplo, usadas só enquanto `endpoint` está vazio. Arquivo público: nunca coloque aqui as perguntas oficiais.
- `js/quiz.js`: funcionamento (trilha, inscrição, "já fiz minha inscrição", player que desliza na horizontal).
- `quiz-planilha.gs`: Google Apps Script da planilha (inscrições, perguntas por bloco, correção no servidor, ranking). Instruções no topo do arquivo.

## Calendário

| Bloco | Abre |
|---|---|
| 1 | quinta 26/11, 12h |
| 2 | quinta 26/11, 18h |
| 3 | sexta 27/11, 8h |
| 4 | sexta 27/11, 12h |
| 5 | sexta 27/11, 18h |
| Vencedor | sábado 28/11, 12h |

Por enquanto todos os blocos ficam abertos até sábado 11h (campo `fecha` em `js/config.js` e na aba "Blocos").

## Modos

- **Demonstração** (`endpoint` vazio): inscrição e respostas ficam só no aparelho da pessoa. Serve para ver o fluxo.
- **Valendo** (`endpoint` com o /exec do Apps Script): os horários vêm da aba "Blocos", as perguntas só são entregues quando o bloco abre (sem gabarito), e a correção e o tempo ficam na planilha.

Para testar tudo fora do horário: abra `index.html?teste=1` (só funciona no modo demonstração).

## Pontuação

1 ponto por acerto, somando todos os blocos. Desempate: quem respondeu primeiro, medido no servidor pelo tempo entre a liberação de cada bloco e o envio das respostas (somado nos 5 blocos). Ranking: na planilha, menu **Quiz > Atualizar ranking**.
