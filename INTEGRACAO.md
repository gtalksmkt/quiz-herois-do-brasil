# Integração do Quiz CBMEDE (para os devs)

Hoje o site funciona em **modo demonstração**: inscrição e respostas ficam só no aparelho de quem testa. Para valer, é preciso ligar um back-end e o CRM. Este arquivo descreve o que o site espera.

## ✅ O que os devs precisam fazer (lista)

**Antes do dia 26/11, 12h (bloco 1):**

1. [ ] **Ativar o back-end** (conta Google da empresa): criar a planilha, colar `quiz-planilha.gs` no Apps Script, rodar a função `configurar`, publicar como App da Web (executar como "Eu", acesso "Qualquer pessoa") e copiar o endereço `/exec`.
2. [ ] **Colar o `/exec` em `js/config.js`** (campo `endpoint`) e publicar o site. Isso desliga o modo demonstração e passa a usar os dados reais.
3. [ ] **Carregar as 30 perguntas oficiais** na aba **Perguntas** da planilha (arquivo `perguntas-oficiais.csv` com o gabarito, que o time envia por fora; nunca no repositório).
4. [ ] **Conferir a aba Blocos** com os horários certos (26/11 12h e 18h; 27/11 8h, 12h e 18h) e o `anuncio` (28/11 12h) no script.
5. [ ] **Ligar o CRM:** preencher `CRM_WEBHOOK` no script (ou trocar `enviarParaCRM_` pela integração real). Cada nova inscrição chega em JSON com nome, e-mail, WhatsApp, CPF, categoria, interesses de 2027, aceite de mensagens, aceite do regulamento e hora do aceite.
6. [ ] **Conferir quem está inscrito no Congresso CBMEDE 2026.** O regulamento exige isso e o site não checa. Cruzar a lista de inscritos do Congresso (por CPF ou e-mail) com a aba **Inscritos** e desclassificar quem não estiver.
7. [ ] **Testar de ponta a ponta** antes de abrir: uma inscrição de teste, o retorno pelo e-mail, um bloco respondido, a linha na aba **Respostas** e o ranking (**Quiz > Atualizar ranking**). Apagar os testes depois.
8. [ ] **Restringir o acesso** à planilha e ao CRM (há CPF; LGPD).

**Durante o quiz:**

9. [ ] Acompanhar a aba **Respostas** e, se algum bloco precisar de ajuste de horário, mudar na aba **Blocos** (o site lê de lá).

**Depois do quiz (sábado, 28/11, 12h):**

10. [ ] Rodar **Quiz > Atualizar ranking**. O vencedor é quem tem **mais acertos**; no empate, **menor tempo total desde a liberação dos blocos**. Conferir se o vencedor está inscrito no Congresso antes de anunciar.

**Já feito pelo time (não precisa refazer):** validação do CPF no formulário; **bloqueio de CPF repetido** (um CPF = uma inscrição; o e-mail repetido só reabre a mesma inscrição); aceites obrigatórios; layout, textos, logos e links das marcas. **As 30 perguntas com o gabarito NÃO estão no código** (o repositório é público): o time envia o arquivo `perguntas-oficiais.csv` aos devs por fora (item 3).

## Regra de acesso

- Só **quem está inscrito** responde ao quiz (`demonstracao: false` em `js/config.js`).
- Quem já se inscreveu volta ao quiz pela aba **"Já fiz minha inscrição"** (ou em `quiz.html`), digitando só o **e-mail**. O site pergunta ao back-end se o e-mail existe e devolve os blocos que a pessoa já respondeu.
- Cada bloco só pode ser enviado **uma vez** por pessoa.

## Como ligar

1. Back-end: o repositório traz uma versão pronta em Google Apps Script (`quiz-planilha.gs`, instruções no topo). Os devs podem usá-la ou implementar o mesmo contrato abaixo em outro back-end.
2. Colocar o endereço do back-end em `endpoint` (`js/config.js`). Com `endpoint` preenchido o site deixa de usar os dados locais e de exibir `js/perguntas-demo.js`.
3. Perguntas oficiais: aba **Perguntas** da planilha (arquivo com as 30 e o gabarito está com o time, fora do repositório). O gabarito **nunca** vai para o site: a correção é no servidor.
4. CRM: preencher `CRM_WEBHOOK` no `quiz-planilha.gs` (recebe cada nova inscrição em JSON) ou trocar a função `enviarParaCRM_` pela integração real.

## Contrato (todas as chamadas vão para o `endpoint`)

| Chamada | Quando | Entrada | Resposta |
|---|---|---|---|
| `GET ?acao=agenda` | ao abrir a página | — | `{ ok, blocos:[{id, abre, fecha}], anuncio }` (datas `AAAA-MM-DDTHH:MM`, horário de Brasília) |
| `GET ?acao=inscrito&email=` | "Já fiz minha inscrição" | e-mail | `{ ok:true, nome, respondidas:[ids] }` ou `{ ok:false }` |
| `GET ?acao=bloco&id=&email=` | pessoa abre um bloco | id do bloco, e-mail | `{ ok:true, perguntas:[{p, o:[4 alternativas]}] }` (sem gabarito) ou `{ ok:false, erro:'fechada'\|'inscricao'\|'respondida' }` |
| `POST` `acao:'inscricao'` | envio do formulário | ver campos abaixo | `{ ok:true }` |
| `POST` `acao:'resposta'` | fim de um bloco | `{ email, nome, bloco, respostas:[índice 0-3 × 6], tempoNoAparelho }` | `{ ok:true }` (não devolve acertos, de propósito) |

`POST` vai como `text/plain` com JSON no corpo (evita o pré-voo de CORS do Apps Script).

### Campos da inscrição

`nome`, `email`, `whatsapp` (só dígitos), `cpf` (só dígitos, já validado no site), `categoria`, `interesses` (lista: respostas de "Em 2027, o que você quer oferecer mais para o seu paciente?"), `aceite` (mensagens das 3 empresas), `regulamento` (aceite do regulamento), `aceiteEm` (ISO), `origem` (URL da página).

## Pontuação e desempate (importante)

- 1 ponto por acerto, somando os 5 blocos.
- **Desempate = quem respondeu primeiro**: o tempo conta **desde a hora em que o bloco é liberado** até o envio das respostas, medido no servidor, e somado nos blocos. Não é o tempo "de tela aberta".
- O ranking está no menu **Quiz > Atualizar ranking** da planilha.

## Calendário

Bloco 1: 26/11 12h · Bloco 2: 26/11 18h · Bloco 3: 27/11 8h · Bloco 4: 27/11 12h · Bloco 5: 27/11 18h · Vencedor: 28/11 12h (horário de Brasília). Hoje todos os blocos ficam abertos até 28/11 11h (`fecha`); mudar na aba **Blocos** ou em `js/config.js`.

## Atenção

- **CPF e dados pessoais (LGPD):** restringir quem acessa a planilha e o CRM. O consentimento fica registrado (`aceite`, `regulamento`, `aceiteEm`).
- Quem se inscreve no quiz precisa estar inscrito no **Congresso CBMEDE 2026** (regulamento). A checagem não é feita pelo site; se for necessária, cruzar a lista de inscritos do congresso com a do quiz.
- Para testar tudo fora do horário (só sem `endpoint`): `quiz.html?teste=1`.
- Logos e links das marcas, textos e WhatsApps ficam em `js/config.js` (`realizadores`).
