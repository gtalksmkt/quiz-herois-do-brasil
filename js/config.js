/* ==================================================================
   QUIZ CBMEDE · configuração
   Tudo o que a equipe costuma trocar fica aqui.
   Datas e horários: sempre no horário de Brasília, no formato
   AAAA-MM-DDTHH:MM (ex.: 2026-11-26T12:00 = quinta, 26/11, meio-dia).
   ================================================================== */
window.QUIZ_CONFIG = {

  /* Endereço do Apps Script (termina em /exec). Ver quiz-planilha.gs.
     Vazio = modo de demonstração: as inscrições e respostas ficam só no
     aparelho da pessoa e as perguntas vêm de js/perguntas-demo.js. */
  endpoint: '',

  /* Versão demonstrativa: true = qualquer pessoa vê e responde o quiz sem se inscrever.
     Trocar para false quando o quiz valer (aí a inscrição volta a ser obrigatória). */
  demonstracao: true,

  /* WhatsApp de atendimento (dúvidas sobre o quiz) */
  whatsapp: '5585998302705',
  whatsappTexto: '(85) 99830-2705',

  /* Os 5 blocos de 6 perguntas (30 no total). "abre" = hora em que o cadeado se abre.
     "fecha" = até quando dá para responder o bloco (por enquanto, todos ficam
     abertos até pouco antes de anunciar o vencedor). */
  blocos: [
    /* ⚠️ Bloco 1 aberto de propósito, só para mostrar o quiz. Na hora de valer, voltar para '2026-11-26T12:00'. */
    { id: 1, abre: '2026-11-19T00:00', fecha: '2026-11-28T11:00' },
    { id: 2, abre: '2026-11-26T18:00', fecha: '2026-11-28T11:00' },
    { id: 3, abre: '2026-11-27T08:00', fecha: '2026-11-28T11:00' },
    { id: 4, abre: '2026-11-27T12:00', fecha: '2026-11-28T11:00' },
    { id: 5, abre: '2026-11-27T18:00', fecha: '2026-11-28T11:00' }
  ],

  /* Anúncio do vencedor */
  anuncio: '2026-11-28T12:00',

  /* Categoria profissional (lista da inscrição) */
  categorias: [
    'Médico(a) emergencista',
    'Médico(a) com outra especialidade',
    'Médico(a) sem especialidade',
    'Médico(a) residente',
    'Estudante de medicina',
    'Enfermeiro(a)',
    'Outro'
  ],

  /* "Em 2027, o que você quer oferecer mais para o seu paciente?" (pode marcar vários) */
  pergunta2027: 'Em 2027, o que você quer oferecer mais para o seu paciente?',
  interesses: [
    'Título de especialista',
    'Maior segurança em manejo de via aérea',
    'Formação em gestão',
    'Atualização em emergência'
  ],

  /* Prêmio: só existe o vencedor (quem acertar mais; empate = quem respondeu primeiro) */
  premios: [
    { posicao: 'Vencedor', nome: 'Videolaringoscópio', texto: 'Para quem acertar mais perguntas nos 5 blocos. Em caso de empate, vence quem respondeu primeiro (o tempo conta desde a liberação de cada bloco).' }
  ],

  /* Realizadores (aparecem no fim da página). "logo" = arquivo em img/. "site" = página da marca (as logos do topo e do rodapé levam para lá).
     "whatsapp" = número comercial com DDI e DDD (ex.: 5585999999999); vazio = não mostra o botão.
     "texto" vazio = não mostra descrição. */
  realizadores: [
    { nome: 'Emergency Talks', logo: 'img/emergency-logo.png', site: 'https://grupotalks.com.br', whatsapp: '558597345004', texto: 'A Emergency Talks é uma das referências na formação de médicos emergencistas e intensivistas no Brasil. Com aulas objetivas, baseadas em evidências e na prática real, já impactou mais de 4 mil alunos no Brasil e em Portugal, com preparatórios como TEME, TEP e TEMI.' },
    { nome: 'Omni', logo: 'img/omni.webp', site: 'https://emergenciaomni.com.br/', whatsapp: '5519996359705', texto: 'Escola de via aérea na emergência, criada por e para médicos emergencistas. Seu curso presencial, o The Difficult Airway Course, une teoria, simulação em manequins e dispositivos do plantão, com mais de 3.000 pessoas treinadas.' },
    { nome: 'ECME', logo: 'img/ecme.webp', site: 'https://ecmebrasil.com.br/', whatsapp: '5588992612891', texto: 'Polo de educação médica em medicina de emergência, construído por médicos emergencistas. Une evidência científica, prática real e gestão de alta performance em formações como a ECME Business School e o ECME Mentorship Program.' }
  ]
};
