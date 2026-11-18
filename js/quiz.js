/* ==================================================================
   QUIZ · ENCONTRO DOS HERÓIS DO BRASIL · funcionamento da página
   - monta a agenda de rodadas (manhã, tarde e noite de cada data)
   - inscrição (obrigatória para responder)
   - player do quiz (uma pergunta por vez) e envio das respostas
   Teste: abra a página com ?teste=1 para liberar todas as rodadas
   (só no modo de demonstração; com a planilha ligada quem manda é o horário dela).
   ================================================================== */
(function(){
  'use strict';
  var C = window.QUIZ_CONFIG || {};
  var ENDPOINT = (C.endpoint || '').trim();
  var TESTE = /[?&]teste=1\b/.test(location.search) && !ENDPOINT;
  var LS = { inscrito: 'qhb.inscrito', respostas: 'qhb.respostas', demoInscritos: 'qhb.demo.inscritos' };
  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- armazenamento local (protegido) ---------- */
  function lsGet(k, def){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }catch(e){ return def; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }

  /* ---------- comunicação com a planilha (Apps Script) ---------- */
  function apiGet(params){
    var q = Object.keys(params).map(function(k){ return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch(ENDPOINT + '?' + q, { method: 'GET' }).then(function(r){ return r.json(); });
  }
  function apiPost(body){
    /* text/plain evita a checagem CORS prévia que o Apps Script não responde */
    return fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function(r){ return r.json(); });
  }

  /* ---------- rodadas ---------- */
  var ORDEM_PER = ['manha', 'tarde', 'noite'];
  function quando(data, hora){ return new Date(data + 'T' + hora + ':00-03:00'); }
  function montarRodadasLocais(){
    var lista = [], n = 0;
    (C.datas || []).forEach(function(d, di){
      ORDEM_PER.forEach(function(pk){
        var per = C.periodos[pk]; n++;
        lista.push({ id: n, dia: di + 1, data: d, periodo: pk, abre: per.abre, fecha: per.fecha, tema: (C.temas || [])[n - 1] || '' });
      });
    });
    return lista;
  }
  var RODADAS = montarRodadasLocais();
  function prep(r){
    r.inicio = quando(r.data, r.abre); r.fim = quando(r.data, r.fecha);
    return r;
  }
  RODADAS.forEach(prep);

  function respondidas(){ return lsGet(LS.respostas, {}); }
  function status(r){
    if(respondidas()[r.id]) return 'respondida';
    if(TESTE) return 'aberta';
    var agora = Date.now();
    if(agora < r.inicio.getTime()) return 'futura';
    if(agora <= r.fim.getTime()) return 'aberta';
    return 'encerrada';
  }

  /* ---------- formatação ---------- */
  var DIAS_SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function partesData(iso){ var p = iso.split('-'); return { d: +p[2], m: +p[1], a: +p[0] }; }
  function dataCurta(iso){ var p = partesData(iso); return ('0' + p.d).slice(-2) + '/' + ('0' + p.m).slice(-2); }
  function diaSemana(iso){ var p = partesData(iso); return DIAS_SEM[new Date(Date.UTC(p.a, p.m - 1, p.d, 12)).getUTCDay()]; }
  function dataLonga(iso){ var p = partesData(iso); return p.d + ' de ' + ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'][p.m - 1]; }
  function horaTxt(h){ var p = h.split(':'); return p[1] === '00' ? (+p[0]) + 'h' : (+p[0]) + 'h' + p[1]; }
  function nomePer(pk){ return (C.periodos[pk] || {}).nome || pk; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function contagem(ms){
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return { d: d, h: h, m: m, s: s };
  }
  function dois(n){ return ('0' + n).slice(-2); }

  var ICONES = {
    manha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
    tarde: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 3v6M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4 4 4-4"/></svg>',
    noite: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
  };
  var SELOS = {
    futura: '<span class="selo selo-futura">Em breve</span>',
    aberta: '<span class="selo selo-aberta"><i></i>Aberta agora</span>',
    encerrada: '<span class="selo selo-encerrada">Encerrada</span>',
    respondida: '<span class="selo selo-ok">Respondida</span>'
  };

  /* ---------- agenda ---------- */
  function renderAgenda(){
    var alvo = $('#agenda'); if(!alvo) return;
    var html = '';
    var porDia = {};
    RODADAS.forEach(function(r){ (porDia[r.data] = porDia[r.data] || []).push(r); });
    Object.keys(porDia).sort().forEach(function(d, i){
      html += '<div class="dia fade-in"><div class="dia-head"><span class="dia-n">Dia ' + (i + 1) + '</span><b>' + esc(dataLonga(d)) + '</b><span class="dia-sem">' + esc(diaSemana(d)) + '</span></div><div class="dia-grid">';
      porDia[d].forEach(function(r){
        var st = status(r);
        var botao;
        if(st === 'aberta') botao = '<button class="btn btn-primary btn-sm" data-rodada="' + r.id + '">Responder agora</button>';
        else if(st === 'futura') botao = '<span class="r-quando">Abre ' + dataCurta(r.data) + ' às ' + horaTxt(r.abre) + '</span>';
        else if(st === 'respondida') botao = '<span class="r-quando r-ok">Suas respostas foram enviadas</span>';
        else botao = '<span class="r-quando">Fechou às ' + horaTxt(r.fecha) + '</span>';
        html += '<article class="rodada glass st-' + st + '">' +
          '<div class="r-top"><span class="r-ic">' + (ICONES[r.periodo] || '') + '</span>' +
          '<div class="r-per"><b>' + esc(nomePer(r.periodo)) + '</b><span>' + horaTxt(r.abre) + ' às ' + horaTxt(r.fecha) + '</span></div>' + (SELOS[st] || '') + '</div>' +
          '<span class="r-num">Rodada ' + r.id + '</span>' +
          '
          '<div class="r-acao">' + botao + '</div></article>';
      });
      html += '</div></div>';
    });
    alvo.innerHTML = html;
    $$('.fade-in', alvo).forEach(observar);
  }

  /* ---------- próxima rodada (topo + área do inscrito) ---------- */
  function rodadaAtual(){
    for(var i = 0; i < RODADAS.length; i++) if(status(RODADAS[i]) === 'aberta') return RODADAS[i];
    return null;
  }
  function proximaRodada(){
    var agora = Date.now();
    for(var i = 0; i < RODADAS.length; i++) if(RODADAS[i].inicio.getTime() > agora && !respondidas()[RODADAS[i].id]) return RODADAS[i];
    return null;
  }
  function textoRodada(r){ return 'Rodada ' + r.id + ' · ' + nomePer(r.periodo) + ' de ' + dataCurta(r.data); }

  function tick(){
    var alvo = $('#heroStatus');
    var aberta = rodadaAtual();
    var prox = proximaRodada();
    if(alvo){
      if(aberta){
        alvo.className = 'hero-status glass glass-red is-live';
        alvo.innerHTML = '<span class="hst-dot"></span><div><small>Rodada aberta agora</small><b>' + esc(textoRodada(aberta)) + '</b><span>' + 'Fecha às ' + horaTxt(aberta.fecha) + '</span></div>' +
          '<button class="btn btn-primary btn-sm" data-rodada="' + aberta.id + '">Responder agora</button>';
      } else if(prox){
        var c = contagem(prox.inicio.getTime() - Date.now());
        alvo.className = 'hero-status glass';
        alvo.innerHTML = '<div class="hst-txt"><small>Próxima rodada</small><b>' + esc(textoRodada(prox)) + '</b><span>Abre às ' + horaTxt(prox.abre) + '</span></div>' +
          '<div class="cd" aria-label="Tempo até a próxima rodada">' +
          '<div><b>' + c.d + '</b><span>dias</span></div><div><b>' + dois(c.h) + '</b><span>horas</span></div><div><b>' + dois(c.m) + '</b><span>min</span></div><div><b>' + dois(c.s) + '</b><span>seg</span></div></div>';
      } else {
        alvo.className = 'hero-status glass';
        alvo.innerHTML = '<div class="hst-txt"><small>Quiz encerrado</small><b>Todas as rodadas foram concluídas</b><span>O resultado será divulgado pela equipe Emergency Talks.</span></div>';
      }
    }
    /* se uma rodada abriu ou fechou, redesenha */
    var assinatura = RODADAS.map(status).join(',');
    if(assinatura !== tick.ultima){ tick.ultima = assinatura; renderAgenda(); renderPainel(); }
  }

  /* ---------- inscrição ---------- */
  function inscrito(){ return lsGet(LS.inscrito, null); }
  function soDigitos(s){ return String(s || '').replace(/\D/g, ''); }
  function mascaraTel(v){
    var d = soDigitos(v).slice(0, 11);
    if(d.length <= 2) return d.length ? '(' + d : '';
    if(d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
  }

  function renderPainel(){
    var form = $('#formInscricao'), painel = $('#painelInscrito'), entrar = $('#formEntrar');
    if(!form || !painel) return;
    var u = inscrito();
    if(!u){ painel.hidden = true; if(entrar.hidden) form.hidden = false; return; }
    form.hidden = true; entrar.hidden = true; painel.hidden = false;
    var aberta = rodadaAtual(), prox = proximaRodada();
    var feitas = Object.keys(respondidas()).length;
    var acao;
    if(aberta){
      acao = '<div class="pi-box pi-live"><small>Rodada aberta agora</small><b>' + esc(textoRodada(aberta)) + '</b><span>' + 'Fecha às ' + horaTxt(aberta.fecha) + '</span>' +
        '<button class="btn btn-primary btn-block" data-rodada="' + aberta.id + '">Responder a rodada ' + aberta.id + '</button></div>';
    } else if(prox){
      acao = '<div class="pi-box"><small>Próxima rodada</small><b>' + esc(textoRodada(prox)) + '</b><span>Abre às ' + horaTxt(prox.abre) + '</span>' +
        '<a class="btn btn-glass btn-block" href="#rodadas">Ver todas as rodadas</a></div>';
    } else {
      acao = '<div class="pi-box"><small>Quiz encerrado</small><b>Obrigado por participar!</b><span>A equipe entra em contato com os vencedores pelo WhatsApp e e-mail da inscrição.</span></div>';
    }
    var primeiro = (u.nome || '').trim().split(/\s+/)[0] || '';
    painel.innerHTML = '<div class="pi-head"><span class="pi-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>' +
      '<div><small>Inscrição confirmada</small><h3>' + (primeiro ? 'Olá, ' + esc(primeiro) + '!' : 'Você está inscrito(a)!') + '</h3><span>' + esc(u.email) + '</span></div></div>' +
      '<p class="pi-sub">Você já pode responder às rodadas. Cada rodada fica aberta só no seu horário. Rodadas respondidas: <b>' + feitas + ' de ' + RODADAS.length + '</b>.</p>' +
      acao +
      '<button class="pi-sair" id="btnSair">Não é você? Sair deste aparelho</button>';
  }

  function msg(el, texto, tipo){ el.textContent = texto; el.className = 'f-msg' + (tipo ? ' ' + tipo : ''); }

  function iniciarFormularios(){
    var form = $('#formInscricao'), entrar = $('#formEntrar');
    if(!form) return;
    var tel = form.elements.whatsapp;
    tel.addEventListener('input', function(){ tel.value = mascaraTel(tel.value); });

    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var f = form.elements, aviso = $('#msgInscricao');
      var dados = {
        acao: 'inscricao',
        nome: f.nome.value.trim(),
        email: f.email.value.trim().toLowerCase(),
        whatsapp: soDigitos(f.whatsapp.value),
        perfil: f.perfil.value,
        uf: f.uf.value,
        aceite: f.aceite.checked,
        origem: location.href.slice(0, 200)
      };
      if(dados.nome.split(/\s+/).length < 2) return msg(aviso, 'Digite seu nome completo.', 'erro');
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dados.email)) return msg(aviso, 'Confira o seu e-mail.', 'erro');
      if(dados.whatsapp.length < 10) return msg(aviso, 'Digite o WhatsApp com DDD.', 'erro');
      if(!dados.perfil) return msg(aviso, 'Escolha a sua área de atuação.', 'erro');
      if(!dados.uf) return msg(aviso, 'Escolha o seu estado.', 'erro');
      if(!f.regulamento.checked) return msg(aviso, 'Para participar, aceite o regulamento do quiz.', 'erro');

      var bt = form.querySelector('button[type=submit]');
      bt.disabled = true; bt.textContent = 'Enviando...';
      msg(aviso, '');
      var envio = ENDPOINT ? apiPost(dados) : Promise.resolve({ ok: true });
      envio.then(function(r){
        if(!r || !r.ok) throw new Error((r && r.erro) || 'erro');
        if(!ENDPOINT){ var lista = lsGet(LS.demoInscritos, {}); lista[dados.email] = dados.nome; lsSet(LS.demoInscritos, lista); }
        lsSet(LS.inscrito, { nome: dados.nome, email: dados.email });
        renderPainel(); renderAgenda();
        toast('Inscrição feita! Agora é só responder às rodadas.');
        $('#inscricao').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }).catch(function(){
        msg(aviso, 'Não conseguimos enviar agora. Confira a internet e tente de novo.', 'erro');
      }).then(function(){ bt.disabled = false; bt.textContent = 'Fazer minha inscrição'; });
    });

    /* já tenho inscrição (outro aparelho) */
    $('#linkEntrar').addEventListener('click', function(ev){ ev.preventDefault(); form.hidden = true; entrar.hidden = false; entrar.elements.email.focus(); });
    $('#linkVoltar').addEventListener('click', function(ev){ ev.preventDefault(); entrar.hidden = true; form.hidden = false; });
    entrar.addEventListener('submit', function(ev){
      ev.preventDefault();
      var email = entrar.elements.email.value.trim().toLowerCase(), aviso = $('#msgEntrar');
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return msg(aviso, 'Confira o seu e-mail.', 'erro');
      var bt = entrar.querySelector('button[type=submit]');
      bt.disabled = true;
      var busca = ENDPOINT ? apiGet({ acao: 'inscrito', email: email }) :
        Promise.resolve((function(){ var l = lsGet(LS.demoInscritos, {}); return l[email] ? { ok: true, nome: l[email] } : { ok: false }; })());
      busca.then(function(r){
        if(r && r.ok){
          lsSet(LS.inscrito, { nome: r.nome || '', email: email });
          if(r.respondidas){ var rs = respondidas(); r.respondidas.forEach(function(id){ rs[id] = rs[id] || { enviado: true }; }); lsSet(LS.respostas, rs); }
          renderPainel(); renderAgenda();
          toast('Pronto! Você entrou com a sua inscrição.');
        } else {
          msg(aviso, 'Não encontramos inscrição com este e-mail. Faça a sua inscrição abaixo.', 'erro');
        }
      }).catch(function(){ msg(aviso, 'Não conseguimos conferir agora. Tente de novo.', 'erro'); })
        .then(function(){ bt.disabled = false; });
    });

    document.addEventListener('click', function(ev){
      if(ev.target && ev.target.id === 'btnSair'){
        lsDel(LS.inscrito); lsDel(LS.respostas);
        entrar.hidden = true; renderPainel(); renderAgenda();
      }
    });
  }

  /* ---------- player do quiz ---------- */
  var Q = { rodada: null, perguntas: [], i: 0, respostas: [], escolha: null, inicio: 0 };
  var modal, corpo;

  function abrirRodada(id){
    var r = RODADAS.filter(function(x){ return x.id === id; })[0];
    if(!r) return;
    if(!inscrito()){
      toast('Faça sua inscrição para responder às rodadas.');
      $('#inscricao').scrollIntoView({ behavior: 'smooth' });
      setTimeout(function(){ var n = $('#formInscricao input[name=nome]'); if(n) n.focus({ preventScroll: true }); }, 700);
      return;
    }
    var st = status(r);
    if(st !== 'aberta'){ toast(st === 'respondida' ? 'Você já respondeu esta rodada.' : 'Esta rodada não está aberta agora.'); return; }
    Q = { rodada: r, perguntas: [], i: 0, respostas: [], escolha: null, inicio: Date.now() };
    mostrarModal();
    corpo.innerHTML = '<div class="qz-load"><span class="spin"></span>Carregando as perguntas da rodada ' + r.id + '...</div>';
    var carrega = ENDPOINT ? apiGet({ acao: 'rodada', id: r.id, email: inscrito().email }) :
      Promise.resolve({ ok: true, perguntas: (window.QUIZ_PERGUNTAS_DEMO || {})[r.id] || [] });
    carrega.then(function(res){
      if(!res || !res.ok){
        var m = { fechada: 'Esta rodada não está aberta agora.', respondida: 'Você já respondeu esta rodada.', inscricao: 'Não encontramos a sua inscrição. Faça a inscrição de novo.' }[res && res.erro] || 'Não conseguimos carregar as perguntas.';
        if(res && res.erro === 'respondida'){ marcarRespondida(r.id); }
        return telaFinal(m, true);
      }
      Q.perguntas = (res.perguntas || []).map(function(x){ return { p: x.p, o: x.o }; });
      if(!Q.perguntas.length) return telaFinal('As perguntas desta rodada ainda não foram cadastradas.', true);
      telaInicio();
    }).catch(function(){ telaFinal('Não conseguimos carregar as perguntas. Confira a internet e tente de novo.', true); });
  }

  function mostrarModal(){
    modal.hidden = false;
    requestAnimationFrame(function(){ modal.classList.add('open'); });
    document.body.classList.add('no-scroll');
  }
  function fecharModal(forcar){
    var emAndamento = Q.perguntas.length && Q.i < Q.perguntas.length && !Q.enviado && Q.comecou;
    if(emAndamento && !forcar && !confirm('Sair agora? As respostas desta rodada ainda não foram enviadas.')) return;
    modal.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(function(){ modal.hidden = true; }, 300);
  }

  function cabecalho(){
    var r = Q.rodada;
    return '<div class="qz-head"><span class="qz-tag">Rodada ' + r.id + ' · ' + esc(nomePer(r.periodo)) + ' de ' + dataCurta(r.data) + '</span></div>';
  }

  function telaInicio(){
    corpo.innerHTML = cabecalho() +
      '<div class="qz-intro"><p>Esta rodada tem <b>' + Q.perguntas.length + ' perguntas</b>. Escolha uma alternativa em cada uma e clique em <b>Confirmar resposta</b>.</p>' +
      '<ul><li>Depois de confirmar, não dá para voltar e mudar a resposta.</li><li>Você só pode enviar esta rodada uma vez.</li><li>Em caso de empate na pontuação, ganha quem respondeu em menos tempo.</li></ul>' +
      '<button class="btn btn-primary btn-block" id="qzComecar">Começar a rodada</button></div>';
    $('#qzComecar').addEventListener('click', function(){ Q.comecou = true; Q.inicio = Date.now(); telaPergunta(); });
  }

  function telaPergunta(){
    var t = Q.perguntas.length, q = Q.perguntas[Q.i];
    Q.escolha = null;
    var letras = ['A', 'B', 'C', 'D', 'E'];
    corpo.innerHTML = cabecalho() +
      '<div class="qz-prog"><span>Pergunta ' + (Q.i + 1) + ' de ' + t + '</span><div class="qz-bar"><i style="width:' + ((Q.i) / t * 100) + '%"></i></div></div>' +
      '<p class="qz-q">' + esc(q.p) + '</p>' +
      '<div class="qz-ops" role="radiogroup">' + q.o.map(function(op, k){
        return '<button class="qz-op" role="radio" aria-checked="false" data-k="' + k + '"><span class="qz-l">' + letras[k] + '</span><span>' + esc(op) + '</span></button>';
      }).join('') + '</div>' +
      '<button class="btn btn-primary btn-block" id="qzConfirmar" disabled>' + (Q.i + 1 === t ? 'Confirmar e enviar respostas' : 'Confirmar resposta') + '</button>';
    requestAnimationFrame(function(){ var b = $('.qz-bar i', corpo); if(b) b.style.width = ((Q.i + 1) / t * 100) + '%'; });
    $$('.qz-op', corpo).forEach(function(b){
      b.addEventListener('click', function(){
        $$('.qz-op', corpo).forEach(function(x){ x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); });
        b.classList.add('sel'); b.setAttribute('aria-checked', 'true');
        Q.escolha = +b.getAttribute('data-k');
        $('#qzConfirmar').disabled = false;
      });
    });
    $('#qzConfirmar').addEventListener('click', function(){
      if(Q.escolha === null) return;
      Q.respostas.push(Q.escolha);
      Q.i++;
      if(Q.i < t) telaPergunta(); else enviar();
    });
  }

  function marcarRespondida(id, extra){
    var rs = respondidas(); rs[id] = extra || { enviado: true }; lsSet(LS.respostas, rs);
  }

  function enviar(){
    corpo.innerHTML = cabecalho() + '<div class="qz-load"><span class="spin"></span>Enviando suas respostas...</div>';
    var u = inscrito(), r = Q.rodada;
    var dados = { acao: 'resposta', email: u.email, nome: u.nome, rodada: r.id, respostas: Q.respostas, tempoNoAparelho: Math.round((Date.now() - Q.inicio) / 1000) };
    var envio = ENDPOINT ? apiPost(dados) : Promise.resolve({ ok: true });
    envio.then(function(res){
      if(res && (res.ok || res.erro === 'respondida')){
        Q.enviado = true;
        marcarRespondida(r.id, { enviado: true, em: new Date().toISOString() });
        renderAgenda(); renderPainel(); tick();
        var prox = proximaRodada();
        telaFinal('Respostas enviadas!', false, prox ? 'Próxima rodada: <b>' + esc(textoRodada(prox)) + '</b>, abre às ' + horaTxt(prox.abre) + '.' : 'Esta foi a última rodada do quiz. Boa sorte!');
      } else {
        var m = { fechada: 'O horário desta rodada terminou antes do envio.', inscricao: 'Não encontramos a sua inscrição.' }[res && res.erro];
        telaFinal(m || 'Não conseguimos enviar. Tente de novo.', true, null, !m);
      }
    }).catch(function(){ telaFinal('Não conseguimos enviar. Confira a internet e tente de novo.', true, null, true); });
  }

  function telaFinal(titulo, erro, texto, podeRepetir){
    corpo.innerHTML = (Q.rodada ? cabecalho() : '') +
      '<div class="qz-fim' + (erro ? ' erro' : '') + '"><span class="qz-fim-ic">' + (erro ?
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 16.5v.5"/></svg>' :
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>') + '</span>' +
      '<h3>' + esc(titulo) + '</h3>' + (texto ? '<p>' + texto + '</p>' : '') +
      (!erro ? '<p class="qz-obs">O resultado não aparece aqui: a pontuação é calculada pela equipe ao fim do quiz.</p>' : '') +
      (podeRepetir ? '<button class="btn btn-primary btn-block" id="qzRepetir">Tentar enviar de novo</button>' : '') +
      '<button class="btn btn-glass btn-block" id="qzFechar">Fechar</button></div>';
    $('#qzFechar').addEventListener('click', function(){ fecharModal(true); });
    var rep = $('#qzRepetir'); if(rep) rep.addEventListener('click', enviar);
  }

  /* ---------- aviso rápido ---------- */
  var toastT;
  function toast(t){
    var el = $('#toast'); if(!el) return;
    el.textContent = t; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function(){ el.classList.remove('show'); }, 3600);
  }

  /* ---------- animações de entrada ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' }) : null;
  function observar(el){ if(io) io.observe(el); else el.classList.add('visible'); }

  /* ---------- textos que vêm da configuração ---------- */
  function preencherTextos(){
    var dias = (C.datas || []).length;
    $$('[data-c="rodadas"]').forEach(function(el){ el.textContent = RODADAS.length; });
    $$('[data-c="dias"]').forEach(function(el){ el.textContent = dias; });
    $$('[data-c="periodos"]').forEach(function(el){
      el.textContent = ORDEM_PER.map(function(k){ var p = C.periodos[k]; return p.nome.toLowerCase() + ' (' + horaTxt(p.abre) + ' às ' + horaTxt(p.fecha) + ')'; }).join(', ').replace(/, ([^,]*)$/, ' e $1');
    });
    $$('[data-c="datas"]').forEach(function(el){
      var l = (C.datas || []).map(dataCurta);
      el.textContent = l.length > 1 ? l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1] : (l[0] || '');
    });
    $$('[data-c="whats"]').forEach(function(el){ el.href = 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent('Olá! Tenho uma dúvida sobre o quiz do Encontro dos Heróis do Brasil.'); });
    $$('[data-c="whatsTexto"]').forEach(function(el){ el.textContent = C.whatsappTexto; });
    var pr = $('#listaPremios');
    if(pr){
      pr.innerHTML = (C.premios || []).slice(1).map(function(p){
        return '<div class="pz-item glass fade-in"><span class="pz-pos">' + esc(p.posicao) + '</span><h3>' + esc(p.nome) + '</h3><p>' + esc(p.texto) + '</p></div>';
      }).join('');
    }
  }

  /* ---------- início ---------- */
  function carregarAgendaOficial(){
    if(!ENDPOINT) return Promise.resolve();
    return apiGet({ acao: 'agenda' }).then(function(res){
      if(res && res.ok && res.rodadas && res.rodadas.length){
        RODADAS = res.rodadas.map(function(r){ return prep({ id: +r.id, data: r.data, periodo: r.periodo, abre: r.abre, fecha: r.fecha, tema: r.tema }); });
        tick.ultima = null; preencherTextos(); tick();
      }
    }).catch(function(){});
  }

  document.addEventListener('DOMContentLoaded', function(){
    modal = $('#quizModal'); corpo = $('#quizCorpo');
    preencherTextos();
    iniciarFormularios();
    tick();
    setInterval(tick, 1000);
    carregarAgendaOficial();
    if(TESTE) document.body.classList.add('modo-teste');

    document.addEventListener('click', function(ev){
      var b = ev.target.closest && ev.target.closest('[data-rodada]');
      if(b){ ev.preventDefault(); abrirRodada(+b.getAttribute('data-rodada')); }
    });
    $('#quizFechar').addEventListener('click', function(){ fecharModal(false); });
    modal.addEventListener('click', function(ev){ if(ev.target === modal) fecharModal(false); });
    document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape' && !modal.hidden) fecharModal(false); });

    /* header, menu, FAQ, fade-in */
    var header = $('.header');
    var onScroll = function(){ header.classList.toggle('scrolled', window.scrollY > 30); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    var mm = $('#mobileMenu');
    $('#hamburger').addEventListener('click', function(){ mm.classList.add('open'); });
    $('#mmClose').addEventListener('click', function(){ mm.classList.remove('open'); });
    $$('#mobileMenu a').forEach(function(a){ a.addEventListener('click', function(){ mm.classList.remove('open'); }); });
    $$('.faq-q').forEach(function(q){
      q.addEventListener('click', function(){
        var it = q.parentElement, aberto = it.classList.contains('open');
        $$('.faq-item').forEach(function(x){ x.classList.remove('open'); x.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); });
        if(!aberto){ it.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
      });
    });
    $$('.fade-in').forEach(observar);
  });
})();
