/* ==================================================================
   QUIZ · ENCONTRO DOS HERÓIS DO BRASIL · planilha (Google Apps Script)

   O que este script faz:
   - guarda as inscrições (aba "Inscritos")
   - entrega as perguntas de cada rodada SÓ quando ela está aberta, sem o gabarito
   - recebe as respostas, corrige aqui no servidor e anota acertos e tempo (aba "Respostas")
   - monta o ranking (aba "Ranking", menu Quiz > Atualizar ranking)

   Como ligar (uma vez):
   1. Crie uma planilha no Google Planilhas, ex.: "Quiz Heróis do Brasil".
      Extensões > Apps Script. Apague o código e cole este arquivo inteiro. Salve.
   2. Escolha a função "configurar" e clique em Executar (autorize o acesso).
      Ela cria as abas Rodadas, Perguntas, Inscritos e Respostas, já preenchidas
      com as datas provisórias e perguntas de exemplo.
   3. Implantar > Nova implantação > tipo "App da Web". Executar como: Eu.
      Quem pode acessar: Qualquer pessoa. Implantar.
   4. Copie o "URL do app da Web" (termina em /exec) para js/config.js, no campo
      endpoint, e publique o site. Abrir o /exec no navegador mostra "versao": 1.

   No dia a dia:
   - Aba "Rodadas": datas (AAAA-MM-DD), horários (HH:MM, horário de Brasília) e temas.
     É daqui que o site lê a agenda.
   - Aba "Perguntas": uma linha por pergunta. Coluna "Correta" = A, B, C ou D.
     Troque as perguntas de exemplo pelas oficiais AQUI (nunca no site: o site é público).
   - Depois de mudar o código: Implantar > Gerenciar implantações > editar > Nova versão
     (assim o endereço /exec continua o mesmo).
   ================================================================== */

var VERSAO = 1;
var FUSO = 'America/Sao_Paulo';
var PLANILHA_ID = ''; // vazio = planilha onde o script foi criado

var ABAS = {
  rodadas:   { nome: 'Rodadas',   colunas: ['Rodada', 'Data', 'Período', 'Abre', 'Fecha', 'Tema'] },
  perguntas: { nome: 'Perguntas', colunas: ['Rodada', 'Ordem', 'Pergunta', 'A', 'B', 'C', 'D', 'Correta'] },
  inscritos: { nome: 'Inscritos', colunas: ['Data', 'Nome', 'E-mail', 'WhatsApp', 'Perfil', 'Estado', 'Aceita mensagens', 'Origem'] },
  respostas: { nome: 'Respostas', colunas: ['Data', 'Rodada', 'E-mail', 'Nome', 'Respostas', 'Acertos', 'Total', 'Tempo (s)'] },
  ranking:   { nome: 'Ranking',   colunas: ['Posição', 'Nome', 'E-mail', 'WhatsApp', 'Rodadas respondidas', 'Acertos', 'Tempo total (s)'] }
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
function txtData_(v){ return v instanceof Date ? Utilities.formatDate(v, FUSO, 'yyyy-MM-dd') : String(v || '').trim(); }
function txtHora_(v){ return v instanceof Date ? Utilities.formatDate(v, FUSO, 'HH:mm') : String(v || '').trim(); }
function quando_(data, hora){ return new Date(data + 'T' + (hora.length === 4 ? '0' + hora : hora) + ':00-03:00'); }

function rodadas_(){
  var v = aba_('rodadas').getDataRange().getValues(), lista = [];
  for(var i = 1; i < v.length; i++){
    if(!v[i][0]) continue;
    var r = { id: +v[i][0], data: txtData_(v[i][1]), periodo: String(v[i][2] || '').trim().toLowerCase(), abre: txtHora_(v[i][3]), fecha: txtHora_(v[i][4]), tema: String(v[i][5] || '') };
    r.periodo = { 'manhã': 'manha', manha: 'manha', tarde: 'tarde', noite: 'noite' }[r.periodo] || r.periodo;
    lista.push(r);
  }
  return lista;
}
function rodada_(id){ return rodadas_().filter(function(r){ return r.id === +id; })[0] || null; }
function aberta_(r){
  var agora = Date.now();
  return agora >= quando_(r.data, r.abre).getTime() && agora <= quando_(r.data, r.fecha).getTime() + 2 * 60 * 1000; // 2 min de tolerância para envio
}
function inscrito_(email){
  var v = aba_('inscritos').getDataRange().getValues();
  for(var i = 1; i < v.length; i++) if(email_(v[i][2]) === email) return { linha: i + 1, nome: v[i][1], whatsapp: v[i][3] };
  return null;
}
function respondidas_(email){
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
  if(p.acao === 'agenda') return json_({ ok: true, rodadas: rodadas_() });

  if(p.acao === 'inscrito'){
    var em = email_(p.email), ins = em && inscrito_(em);
    return json_(ins ? { ok: true, nome: ins.nome, respondidas: respondidas_(em) } : { ok: false });
  }

  if(p.acao === 'rodada'){
    var email = email_(p.email), r = rodada_(p.id);
    if(!r || !aberta_(r)) return json_({ ok: false, erro: 'fechada' });
    if(!email || !inscrito_(email)) return json_({ ok: false, erro: 'inscricao' });
    if(respondidas_(email).indexOf(r.id) >= 0) return json_({ ok: false, erro: 'respondida' });
    /* marca a hora em que a pessoa abriu a rodada (para o desempate por tempo) */
    var cache = CacheService.getScriptCache(), chave = 'abriu|' + r.id + '|' + email;
    if(!cache.get(chave)) cache.put(chave, String(Date.now()), 21600);
    return json_({ ok: true, perguntas: perguntas_(r.id).map(function(q){ return { p: q.p, o: q.o }; }) });
  }

  return json_({ ok: true, quiz: 'Encontro dos Heróis do Brasil', versao: VERSAO });
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
      aba_('inscritos').appendRow([
        new Date(), String(d.nome || '').slice(0, 100), email, "'" + digitos_(d.whatsapp).slice(0, 13),
        String(d.perfil || '').slice(0, 60), String(d.uf || '').slice(0, 2), d.aceite ? 'Sim' : 'Não', String(d.origem || '').slice(0, 200)
      ]);
      return json_({ ok: true });
    }

    if(d.acao === 'resposta'){
      var r = rodada_(d.rodada);
      if(!r || !aberta_(r)) return json_({ ok: false, erro: 'fechada' });
      var ins = inscrito_(email);
      if(!ins) return json_({ ok: false, erro: 'inscricao' });
      if(respondidas_(email).indexOf(r.id) >= 0) return json_({ ok: false, erro: 'respondida' });

      var qs = perguntas_(r.id), resp = (d.respostas || []).slice(0, qs.length), acertos = 0, letras = [];
      for(var i = 0; i < qs.length; i++){
        var k = (typeof resp[i] === 'number') ? resp[i] : -1;
        letras.push(k >= 0 ? 'ABCDE'.charAt(k) : '-');
        if(k >= 0 && k === qs[i].correta) acertos++;
      }
      var abriu = +CacheService.getScriptCache().get('abriu|' + r.id + '|' + email);
      var tempo = abriu ? Math.round((Date.now() - abriu) / 1000) : Math.max(0, Math.round(+d.tempoNoAparelho || 0));
      aba_('respostas').appendRow([new Date(), r.id, email, ins.nome, letras.join(','), acertos, qs.length, tempo]);
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
    var p = por[em] = por[em] || { nome: v[i][3], email: em, rodadas: 0, acertos: 0, tempo: 0 };
    p.rodadas++; p.acertos += +v[i][5] || 0; p.tempo += +v[i][7] || 0;
  }
  var ins = aba_('inscritos').getDataRange().getValues(), tel = {};
  for(var j = 1; j < ins.length; j++) tel[email_(ins[j][2])] = ins[j][3];
  var lista = Object.keys(por).map(function(k){ return por[k]; })
    .sort(function(a, b){ return b.acertos - a.acertos || a.tempo - b.tempo; });
  var sh = aba_('ranking');
  if(sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, ABAS.ranking.colunas.length).clearContent();
  if(lista.length) sh.getRange(2, 1, lista.length, 7).setValues(lista.map(function(p, n){
    return [n + 1, p.nome, p.email, "'" + digitos_(tel[p.email]), p.rodadas, p.acertos, p.tempo];
  }));
  ss_().setActiveSheet(sh);
}
function onOpen(){
  SpreadsheetApp.getUi().createMenu('Quiz').addItem('Atualizar ranking', 'atualizarRanking').addToUi();
}

/* ---------------- configuração inicial ---------------- */
function configurar(){
  var datas = ['2026-12-07', '2026-12-08', '2026-12-09']; // ⚠️ provisórias: mesmas de js/config.js
  var per = [['Manhã', '09:00', '12:00'], ['Tarde', '14:00', '18:00'], ['Noite', '19:00', '23:00']];
  var temas = ['Via aérea', 'Parada cardiorrespiratória', 'Sepse e choque', 'Trauma', 'Síndromes coronarianas e arritmias',
               'Neurologia na emergência', 'Anafilaxia e intoxicações', 'Distúrbios metabólicos', 'POCUS na emergência'];
  var shR = aba_('rodadas');
  if(shR.getLastRow() < 2){
    var linhas = [], n = 0;
    datas.forEach(function(d){ per.forEach(function(p){ n++; linhas.push([n, d, p[0], p[1], p[2], temas[n - 1]]); }); });
    shR.getRange(2, 2, linhas.length, 1).setNumberFormat('@');
    shR.getRange(2, 4, linhas.length, 2).setNumberFormat('@');
    shR.getRange(2, 1, linhas.length, 6).setValues(linhas);
  }
  var shP = aba_('perguntas');
  if(shP.getLastRow() < 2){
    var ex = PERGUNTAS_EXEMPLO_, out = [];
    Object.keys(ex).forEach(function(rid){ ex[rid].forEach(function(q, k){ out.push([+rid, k + 1, q[0], q[1], q[2], q[3], q[4], q[5]]); }); });
    shP.getRange(2, 1, out.length, 8).setValues(out);
  }
  aba_('inscritos'); aba_('respostas'); aba_('ranking');
  var padrao = ss_().getSheetByName('Página1') || ss_().getSheetByName('Sheet1');
  if(padrao && ss_().getSheets().length > 1 && padrao.getLastRow() === 0) ss_().deleteSheet(padrao);
}

/* Perguntas de exemplo (as mesmas de js/perguntas-demo.js). Trocar pelas oficiais na planilha. */
var PERGUNTAS_EXEMPLO_ = {
  1: [['Na sequência rápida de intubação, qual destes medicamentos é um bloqueador neuromuscular?', 'Rocurônio', 'Midazolam', 'Fentanil', 'Cetamina', 'A'],
      ['Qual dispositivo mostra a glote em uma tela, por meio de uma câmera na ponta da lâmina?', 'Laringoscópio convencional (Macintosh)', 'Videolaringoscópio', 'Máscara laríngea', 'Cânula de Guedel', 'B'],
      ['Qual é o método mais confiável para confirmar a posição do tubo na traqueia?', 'Ausculta pulmonar', 'Embaçamento do tubo', 'Capnografia com curva', 'Expansão do tórax', 'C']],
  2: [['Na RCP de adultos, qual é a frequência recomendada de compressões torácicas?', '60 a 80 por minuto', '80 a 100 por minuto', '100 a 120 por minuto', '120 a 140 por minuto', 'C'],
      ['Qual é a profundidade recomendada das compressões em adultos?', '2 a 3 cm', '3 a 4 cm', '5 a 6 cm', '7 a 8 cm', 'C'],
      ['Qual destes ritmos de parada é chocável?', 'Assistolia', 'Atividade elétrica sem pulso', 'Fibrilação ventricular', 'Bradicardia sinusal', 'C']],
  3: [['Na sepse com hipoperfusão, qual volume inicial de cristaloide é sugerido nas primeiras 3 horas?', '10 mL/kg', '30 mL/kg', '50 mL/kg', '5 mL/kg', 'B'],
      ['Qual é o vasopressor de primeira escolha no choque séptico?', 'Dopamina', 'Noradrenalina', 'Adrenalina', 'Dobutamina', 'B'],
      ['Qual é a meta inicial de pressão arterial média no choque séptico?', '55 mmHg ou mais', '65 mmHg ou mais', '80 mmHg ou mais', '90 mmHg ou mais', 'B']],
  4: [['No atendimento ao trauma (XABCDE), o que significa o "X"?', 'Raio-X na sala de emergência', 'Controle de hemorragia exsanguinante', 'Exposição do paciente', 'Uso de xilocaína', 'B'],
      ['Qual é a menor pontuação possível na Escala de Coma de Glasgow?', '0', '1', '3', '5', 'C'],
      ['Diante de pneumotórax hipertensivo, qual é a conduta imediata?', 'Tomografia de tórax', 'Descompressão do tórax', 'Radiografia de tórax', 'Aguardar e reavaliar', 'B']],
  5: [['No infarto com supra de ST, qual é o tempo ideal porta-balão para a angioplastia primária?', 'Até 30 minutos', 'Até 90 minutos', 'Até 180 minutos', 'Até 12 horas', 'B'],
      ['Quando a opção é a fibrinólise, qual é o tempo porta-agulha recomendado?', 'Até 10 minutos', 'Até 30 minutos', 'Até 60 minutos', 'Até 120 minutos', 'B'],
      ['Taquicardia com pulso e sinais de instabilidade: qual é a conduta?', 'Adenosina', 'Cardioversão elétrica sincronizada', 'Desfibrilação não sincronizada', 'Amiodarona por via oral', 'B']],
  6: [['No AVC isquêmico, até quantas horas do início dos sintomas é indicada a trombólise venosa com alteplase?', '2 horas', '4,5 horas', '12 horas', '24 horas', 'B'],
      ['Qual é o primeiro exame de imagem no AVC agudo?', 'Ressonância com contraste', 'Tomografia de crânio sem contraste', 'Angiografia cerebral', 'Doppler de carótidas', 'B'],
      ['Crise convulsiva que dura mais de 5 minutos: qual é a primeira linha de tratamento?', 'Fenitoína', 'Benzodiazepínico (ex.: midazolam)', 'Ácido valproico', 'Fenobarbital', 'B']],
  7: [['Na anafilaxia, qual é o primeiro medicamento a ser feito?', 'Anti-histamínico na veia', 'Corticoide na veia', 'Adrenalina intramuscular', 'Salbutamol inalatório', 'C'],
      ['Qual é a dose de adrenalina intramuscular para um adulto com anafilaxia?', '0,05 mg', '0,5 mg', '5 mg', '1 mg na veia', 'B'],
      ['Qual é o antídoto da intoxicação por paracetamol?', 'Naloxona', 'Flumazenil', 'N-acetilcisteína', 'Atropina', 'C']],
  8: [['Hipercalemia com alteração no ECG: o que se faz primeiro para proteger o coração?', 'Gluconato de cálcio', 'Furosemida', 'Bicarbonato de sódio', 'Insulina com glicose', 'A'],
      ['Na cetoacidose diabética, qual exame precisa ser conferido antes de iniciar a insulina?', 'Sódio', 'Potássio', 'Cálcio', 'Magnésio', 'B'],
      ['Hipoglicemia em paciente inconsciente e sem acesso venoso: qual é a opção?', 'Glicose por via oral', 'Glucagon intramuscular', 'Insulina regular', 'Tiamina por via oral', 'B']],
  9: [['O protocolo FAST procura principalmente:', 'Fraturas', 'Líquido livre (sangue) no abdome, pericárdio e tórax', 'Lesão de medula', 'Pneumonia', 'B'],
      ['Ausência de deslizamento pleural no ultrassom sugere:', 'Derrame pleural', 'Pneumotórax', 'Pneumonia', 'Pulmão normal', 'B'],
      ['Várias linhas B nos dois pulmões sugerem:', 'Pneumotórax', 'Pulmão normal', 'Síndrome intersticial (ex.: edema pulmonar)', 'Derrame pericárdico', 'C']]
};
