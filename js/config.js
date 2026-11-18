/* ==================================================================
   QUIZ · ENCONTRO DOS HERÓIS DO BRASIL · configuração
   Tudo o que a equipe costuma trocar fica aqui.
   ================================================================== */
window.QUIZ_CONFIG = {

  /* Endereço do Apps Script (termina em /exec). Ver quiz-planilha.gs.
     Vazio = modo de demonstração: as inscrições e respostas ficam só no
     aparelho da pessoa e as perguntas vêm de js/perguntas-demo.js. */
  endpoint: '',

  /* WhatsApp de atendimento (dúvidas sobre o quiz) */
  whatsapp: '5585998302705',
  whatsappTexto: '(85) 99830-2705',

  /* Horários de cada período (horário de Brasília). Cada rodada fica
     aberta do horário "abre" até o horário "fecha". */
  periodos: {
    manha: { nome: 'Manhã', abre: '09:00', fecha: '12:00' },
    tarde: { nome: 'Tarde', abre: '14:00', fecha: '18:00' },
    noite: { nome: 'Noite', abre: '19:00', fecha: '23:00' }
  },

  /* Datas do quiz (AAAA-MM-DD). Cada data tem 3 rodadas: manhã, tarde e noite.
     ⚠️ DATAS PROVISÓRIAS: trocar pelas datas oficiais do Encontro.
     Com o Apps Script ligado, a agenda oficial passa a ser a aba "Rodadas"
     da planilha (o site lê de lá). */
  datas: ['2026-12-07', '2026-12-08', '2026-12-09'],


  /* Prêmios (o primeiro é o destaque do topo da página) */
  premios: [
    { posicao: '1º lugar', nome: 'Videolaringoscópio', texto: 'Para quem fizer mais pontos somando todas as rodadas.' },
    { posicao: 'Próximos colocados', nome: 'Outros prêmios de medicina de emergência', texto: 'Materiais e cursos para a sua prática na emergência. A lista completa será divulgada em breve.' }
  ]
};
