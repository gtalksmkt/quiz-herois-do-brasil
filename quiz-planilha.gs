/* ==================================================================
   QUIZ CBMEDE · planilha (Google Apps Script)

   O que este script faz:
   - guarda as inscrições (aba "Inscritos"), com categoria profissional e interesses para 2027
   - entrega as perguntas de cada bloco SÓ quando ele está aberto, sem o gabarito
   - recebe as respostas, corrige aqui no servidor e anota acertos e tempo (aba "Respostas")
   - monta o ranking (aba "Ranking", menu Quiz > Atualizar ranking)

   Como ligar (uma vez):
   1. Crie uma planilha no Google Planilhas, ex.: "Quiz CBMEDE".
      Extensões > Apps Script. Apague o código e cole este arquivo inteiro. Salve.
   2. Escolha a função "configurar" e clique em Executar (autorize o acesso).
      Ela cria as abas Blocos, Perguntas, Inscritos, Respostas e Ranking.
      A aba Perguntas vem com 30 linhas em branco (5 blocos x 6 perguntas).
   3. Implantar > Nova implantação > tipo "App da Web". Executar como: Eu.
      Quem pode acessar: Qualquer pessoa. Implantar.
   4. Copie o "URL do app da Web" (termina em /exec) para js/config.js, no campo
      endpoint, e publique o site. Abrir o /exec no navegador mostra "versao": 2.

   No dia a dia:
   - Aba "Blocos": quando cada bloco abre e fecha (AAAA-MM-DD HH:MM, horário de Brasília).
     É daqui que o site lê os horários dos cadeados.
   - Aba "Perguntas": uma linha por pergunta, 6 por bloco. Coluna "Correta" = A, B, C ou D.
     Escreva as perguntas oficiais AQUI (nunca no site: o site é público).
   - Depois de mudar o código: Implantar > Gerenciar implantações > editar > Nova versão
     (assim o endereço /exec continua o mesmo).
   ================================================================== */

var VERSAO = 2;
var FUSO = 'America/Sao_Paulo';
var PLANILHA_ID = ''; // vazio = planilha onde o script foi criado
var ANUNCIO = '2026-11-28T12:00'; // anúncio do vencedor (mesmo valor de js/config.js)

var ABAS = {
  blocos:    { nome: 'Blocos',    colunas: ['Bloco', 'Abre', 'Fecha'] },
  perguntas: { nome: 'Perguntas', colunas: ['Bloco', 'Ordem', 'Pergunta', 'A', 'B', 'C', 'D', 'Correta'] },
  inscritos: { nome: 'Inscritos', colunas: ['Data', 'Nome', 'E-mail', 'WhatsApp', 'Categoria', 'Interesses 2027', 'Aceita mensagens', 'Origem'] },
  respostas: { nome: 'Respostas', colunas: ['Data', 'Bloco', 'E-mail', 'Nome', 'Respostas', 'Acertos', 'Total', 'Tempo (s)'] },
  ranking:   { nome: 'Ranking',   colunas: ['Posição', 'Nome', 'E-mail', 'WhatsApp', 'Blocos respondidos', 'Acertos', 'Tempo total (s)'] }
};

/* ---------------- utilidades ---------------- */
function ss_(){ return PLANILHA_ID ? SpreadsheetApp.openById(PLANILHA_ID) : SpreadsheetApp.getActiveSpreadsheet(); }
function aba_(tipo){
  var cfg = ABAS[tipo], sh = ss_().getSheetByName(cfg.nome);
  if(!sh){ sh = ss_().insertSheet(cfg.nome); sh.setFrozenRows(1); }
  var tit = sh.getRange(1, 1, 1, cfg.colunas.length);
  if(tit.getValues()[0].join('|') !== cfg.colunas.join('|')) tit.setValues([cfg.colunas]).setFontWeight('bold');
  return sh;
}
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function digitos_(s){ return String(s || '').replace(/\D/g, ''); }
function email_(s){ return String(s || '').trim().toLowerCase().slice(0, 120); }
/* aceita "2026-11-26 12:00", "2026-11-26T12:00" ou uma data/hora da planilha; devolve AAAA-MM-DDTHH:MM */
function dataHora_(v){
  if(v instanceof Date) return Utilities.formatDate(v, FUSO, "yyyy-MM-dd'T'HH:mm");
  var m = String(v || '').trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/);
  return m ? m[1] + 'T' + ('0' + m[2]).slice(-2) + ':' + m[3] : '';
}
function quando_(dh){ return new Date(dh + ':00-03:00'); }

function blocos_(){
  var v = aba_('blocos').getDataRange().getValues(), lista = [];
  for(var i = 1; i < v.length; i++){
    if(!v[i][0]) continue;
    lista.push({ id: +v[i][0], abre: dataHora_(v[i][1]), fecha: dataHora_(v[i][2]) });
  }
  return lista;
}
function bloco_(id){ return blocos_().filter(function(b){ return b.id === +id; })[0] || null; }
function aberto_(b){
  var agora = Date.now();
  return agora >= quando_(b.abre).getTime() && agora <= quando_(b.fecha).getTime() + 2 * 60 * 1000; // 2 min de tolerância para envio
}
function inscrito_(email){
  var v = aba_('inscritos').getDataRange().getValues();
  for(var i = 1; i < v.length; i++) if(email_(v[i][2]) === email) return { linha: i + 1, nome: v[i][1], whatsapp: v[i][3] };
  return null;
}
function respondidos_(email){
  var v = aba_('respostas').getDataRange().getValues(), ids = [];
  for(var i = 1; i < v.length; i++) if(email_(v[i][2]) === email) ids.push(+v[i][1]);
  return ids;
}
function perguntas_(id){
  var v = aba_('perguntas').getDataRange().getValues(), lista = [];
  for(var i = 1; i < v.length; i++){
    if(+v[i][0] !== +id || !v[i][2]) continue;
    var ops = [v[i][3], v[i][4], v[i][5], v[i][6]].filter(function(x){ return String(x).trim() !== ''; }).map(String);
    lista.push({ ordem: +v[i][1] || i, p: String(v[i][2]), o: ops, correta: 'ABCDE'.indexOf(String(v[i][7] || '').trim().toUpperCase()) });
  }
  return lista.sort(function(a, b){ return a.ordem - b.ordem; });
}

/* ---------------- leitura (GET) ---------------- */
function doGet(e){
  var p = (e && e.parameter) || {};
  if(p.acao === 'agenda') return json_({ ok: true, blocos: blocos_(), anuncio: ANUNCIO });

  if(p.acao === 'inscrito'){
    var em = email_(p.email), ins = em && inscrito_(em);
    return json_(ins ? { ok: true, nome: ins.nome, respondidas: respondidos_(em) } : { ok: false });
  }

  if(p.acao === 'bloco'){
    var email = email_(p.email), b = bloco_(p.id);
    if(!b || !aberto_(b)) return json_({ ok: false, erro: 'fechada' });
    if(!email || !inscrito_(email)) return json_({ ok: false, erro: 'inscricao' });
    if(respondidos_(email).indexOf(b.id) >= 0) return json_({ ok: false, erro: 'respondida' });
    /* marca a hora em que a pessoa abriu o bloco (para o desempate por tempo) */
    var cache = CacheService.getScriptCache(), chave = 'abriu|' + b.id + '|' + email;
    if(!cache.get(chave)) cache.put(chave, String(Date.now()), 21600);
    return json_({ ok: true, perguntas: perguntas_(b.id).map(function(q){ return { p: q.p, o: q.o }; }) });
  }

  return json_({ ok: true, quiz: 'Quiz CBMEDE', versao: VERSAO });
}

/* ---------------- envio (POST) ---------------- */
function doPost(e){
  var d = {};
  try{ d = JSON.parse(e.postData.contents || '{}'); }catch(err){ return json_({ ok: false, erro: 'dados' }); }
  var email = email_(d.email);
  if(!email) return json_({ ok: false, erro: 'dados' });

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try{
    if(d.acao === 'inscricao'){
      if(inscrito_(email)) return json_({ ok: true, repetido: true });
      var interesses = (d.interesses || []).map(function(x){ return String(x).slice(0, 80); }).slice(0, 12).join(' | ');
      aba_('inscritos').appendRow([
        new Date(), String(d.nome || '').slice(0, 100), email, "'" + digitos_(d.whatsapp).slice(0, 13),
        String(d.categoria || '').slice(0, 60), interesses, d.aceite ? 'Sim' : 'Não', String(d.origem || '').slice(0, 200)
      ]);
      return json_({ ok: true });
    }

    if(d.acao === 'resposta'){
      var b = bloco_(d.bloco);
      if(!b || !aberto_(b)) return json_({ ok: false, erro: 'fechada' });
      var ins = inscrito_(email);
      if(!ins) return json_({ ok: false, erro: 'inscricao' });
      if(respondidos_(email).indexOf(b.id) >= 0) return json_({ ok: false, erro: 'respondida' });

      var qs = perguntas_(b.id), resp = (d.respostas || []).slice(0, qs.length), acertos = 0, letras = [];
      for(var i = 0; i < qs.length; i++){
        var k = (typeof resp[i] === 'number') ? resp[i] : -1;
        letras.push(k >= 0 ? 'ABCDE'.charAt(k) : '-');
        if(k >= 0 && k === qs[i].correta) acertos++;
      }
      var abriu = +CacheService.getScriptCache().get('abriu|' + b.id + '|' + email);
      var tempo = abriu ? Math.round((Date.now() - abriu) / 1000) : Math.max(0, Math.round(+d.tempoNoAparelho || 0));
      aba_('respostas').appendRow([new Date(), b.id, email, ins.nome, letras.join(','), acertos, qs.length, tempo]);
      return json_({ ok: true }); // o acerto não volta para o site, de propósito
    }
    return json_({ ok: false, erro: 'acao' });
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- ranking ---------------- */
function atualizarRanking(){
  var v = aba_('respostas').getDataRange().getValues(), por = {};
  for(var i = 1; i < v.length; i++){
    var em = email_(v[i][2]); if(!em) continue;
    var p = por[em] = por[em] || { nome: v[i][3], email: em, blocos: 0, acertos: 0, tempo: 0 };
    p.blocos++; p.acertos += +v[i][5] || 0; p.tempo += +v[i][7] || 0;
  }
  var ins = aba_('inscritos').getDataRange().getValues(), tel = {};
  for(var j = 1; j < ins.length; j++) tel[email_(ins[j][2])] = ins[j][3];
  var lista = Object.keys(por).map(function(k){ return por[k]; })
    .sort(function(a, b){ return b.acertos - a.acertos || a.tempo - b.tempo; });
  var sh = aba_('ranking');
  if(sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, ABAS.ranking.colunas.length).clearContent();
  if(lista.length) sh.getRange(2, 1, lista.length, 7).setValues(lista.map(function(p, n){
    return [n + 1, p.nome, p.email, "'" + digitos_(tel[p.email]), p.blocos, p.acertos, p.tempo];
  }));
  ss_().setActiveSheet(sh);
}
function onOpen(){
  SpreadsheetApp.getUi().createMenu('Quiz').addItem('Atualizar ranking', 'atualizarRanking').addToUi();
}

/* ---------------- configuração inicial ---------------- */
function configurar(){
  var shB = aba_('blocos');
  if(shB.getLastRow() < 2){
    var linhas = [
      [1, '2026-11-26 12:00', '2026-11-28 11:00'],
      [2, '2026-11-26 18:00', '2026-11-28 11:00'],
      [3, '2026-11-27 08:00', '2026-11-28 11:00'],
      [4, '2026-11-27 12:00', '2026-11-28 11:00'],
      [5, '2026-11-27 18:00', '2026-11-28 11:00']
    ];
    shB.getRange(2, 2, linhas.length, 2).setNumberFormat('@');
    shB.getRange(2, 1, linhas.length, 3).setValues(linhas);
  }
  var shP = aba_('perguntas');
  if(shP.getLastRow() < 2){
    var out = [];
    for(var b = 1; b <= 5; b++) for(var o = 1; o <= 6; o++) out.push([b, o, '', '', '', '', '', '']);
    shP.getRange(2, 1, out.length, 8).setValues(out);
  }
  aba_('inscritos'); aba_('respostas'); aba_('ranking');
  var padrao = ss_().getSheetByName('Página1') || ss_().getSheetByName('Sheet1');
  if(padrao && ss_().getSheets().length > 1 && padrao.getLastRow() === 0) ss_().deleteSheet(padrao);
}
