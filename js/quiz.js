/* ==================================================================
   QUIZ CBMEDE · funcionamento da página
   - trilha dos 5 blocos (cadeado fechado até a hora de cada bloco abrir)
   - inscrição (obrigatória para responder) e "já fiz minha inscrição"
   - player do quiz: uma pergunta por vez, deslizando na horizontal
   Teste: abra a página com ?teste=1 para liberar todos os blocos
   (só no modo de demonstração; com a planilha ligada quem manda é o horário dela).
   ================================================================== */
(function(){
  'use strict';
  var C = window.QUIZ_CONFIG || {};
  var ENDPOINT = (C.endpoint || '').trim();
  var TESTE = /[?&]teste=1\b/.test(location.search) && !ENDPOINT;
  var PAGINA = document.body.getAttribute('data-page') || 'inicio'; // 'inicio' (inscrição) ou 'quiz'
  var LS = { inscrito: 'qcb.inscrito', respostas: 'qcb.respostas', demoInscritos: 'qcb.demo.inscritos' };
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

  /* ---------- datas e formatação ---------- */
  function dois(n){ return ('0' + n).slice(-2); }
  function quando(s){ return new Date(s + ':00-03:00'); } // s = AAAA-MM-DDTHH:MM, horário de Brasília
  function partes(s){ var m = String(s).match(/^(\d+)-(\d+)-(\d+)T(\d+):(\d+)/) || [0, 1970, 1, 1, 0, 0]; return { a: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5] }; }
  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  function diaSemana(s){ var p = partes(s); return DIAS[new Date(Date.UTC(p.a, p.m - 1, p.d, 12)).getUTCDay()]; }
  function diaAbrev(s){ return diaSemana(s).slice(0, 3); }
  function dataCurta(s){ var p = partes(s); return dois(p.d) + '/' + dois(p.m); }
  function horaTxt(s){ var p = partes(s); return p.mi ? p.h + 'h' + dois(p.mi) : p.h + 'h'; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function contagem(ms){
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return { d: d, h: h, m: m, s: s };
  }
  function contagemTxt(ms){
    var c = contagem(ms);
    return c.d > 0 ? c.d + 'd ' + dois(c.h) + 'h ' + dois(c.m) + 'min' : dois(c.h) + ':' + dois(c.m) + ':' + dois(c.s);
  }

  /* ---------- blocos ---------- */
  function prep(b){ b.inicio = quando(b.abre); b.fim = quando(b.fecha); return b; }
  var BLOCOS = (C.blocos || []).map(function(b){ return prep({ id: +b.id, abre: b.abre, fecha: b.fecha }); });
  var ANUNCIO = quando(C.anuncio);
  var ANUNCIO_TXT = C.anuncio;

  function respondidas(){ return lsGet(LS.respostas, {}); }
  function status(b){
    if(respondidas()[b.id]) return 'respondida';
    if(TESTE) return 'aberta';
    var agora = Date.now();
    if(agora < b.inicio.getTime()) return 'futura';
    if(agora <= b.fim.getTime()) return 'aberta';
    return 'encerrada';
  }
  function pendentes(){ return BLOCOS.filter(function(b){ return status(b) === 'aberta'; }); }
  function proximoBloco(){
    var agora = Date.now();
    for(var i = 0; i < BLOCOS.length; i++) if(BLOCOS[i].inicio.getTime() > agora) return BLOCOS[i];
    return null;
  }
  function anunciado(){ return Date.now() >= ANUNCIO.getTime(); }
  function textoBloco(b){ return 'Bloco ' + b.id + ' · ' + diaSemana(b.abre) + ', ' + dataCurta(b.abre) + ' às ' + horaTxt(b.abre); }
  function agendaTexto(){
    var por = {}, ordem = [];
    BLOCOS.forEach(function(b){ var d = b.abre.slice(0, 10); if(!por[d]){ por[d] = []; ordem.push(d); } por[d].push(horaTxt(b.abre)); });
    var partesTxt = ordem.map(function(d){
      var hs = por[d], hora = hs.length > 1 ? hs.slice(0, -1).join(', ') + ' e ' + hs[hs.length - 1] : hs[0];
      return diaSemana(d + 'T00:00') + ', ' + dataCurta(d + 'T00:00') + ', às ' + hora;
    });
    return partesTxt.join('; ');
  }

  /* ---------- ícones ---------- */
  var IC = {
    fechado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>',
    aberto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 7.6-1.7"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    trofeu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>'
  };

  /* ---------- trilha (caminho até o vencedor) ---------- */
  function progresso(){
    var t = BLOCOS.map(function(b){ return b.inicio.getTime(); }).concat([ANUNCIO.getTime()]);
    var agora = Date.now(), n = t.length - 1;
    if(agora <= t[0]) return 0;
    if(agora >= t[n]) return 100;
    for(var i = 0; i < n; i++){
      if(agora < t[i + 1]) return ((i + (agora - t[i]) / (t[i + 1] - t[i])) / n) * 100;
    }
    return 100;
  }

  function renderTrilha(){
    var alvo = $('#trilha'); if(!alvo) return;
    var prox = proximoBloco();
    var html = '<div class="tl-line"><i id="tlFill"></i></div><ol class="tl-nodes">';
    BLOCOS.forEach(function(b){
      var st = status(b), ic, sub;
      if(st === 'respondida'){ ic = IC.check; sub = '<span class="tl-sub tl-ok">Respondido</span>'; }
      else if(st === 'aberta'){ ic = IC.aberto; sub = '<button class="btn btn-primary btn-sm" data-bloco="' + b.id + '">Responder</button>'; }
      else if(st === 'encerrada'){ ic = IC.fechado; sub = '<span class="tl-sub">Encerrado</span>'; }
      else { ic = IC.fechado; sub = (prox && prox.id === b.id) ? '<span class="tl-sub tl-next">Abre em <b id="tlCd"></b></span>' : '<span class="tl-sub">Bloqueado</span>'; }
      html += '<li class="tl-node st-' + st + '"><span class="tl-ic">' + ic + '</span><b class="tl-t">Bloco ' + b.id + '</b>' +
        '<span class="tl-when">' + esc(diaAbrev(b.abre)) + ' · ' + dataCurta(b.abre) + '<span class="tl-h">' + horaTxt(b.abre) + '</span></span>' + sub + '</li>';
    });
    var fim = anunciado();
    html += '<li class="tl-node tl-final ' + (fim ? 'st-aberta' : 'st-futura') + '"><span class="tl-ic">' + IC.trofeu + '</span><b class="tl-t">Vencedor</b>' +
      '<span class="tl-when">' + esc(diaAbrev(ANUNCIO_TXT)) + ' · ' + dataCurta(ANUNCIO_TXT) + '<span class="tl-h">' + horaTxt(ANUNCIO_TXT) + '</span></span>' +
      '<span class="tl-sub">' + (fim ? 'Anunciado' : 'Anúncio do resultado') + '</span></li></ol>';
    alvo.innerHTML = html;
    atualizarTrilha();
  }
  function atualizarTrilha(){
    var f = $('#tlFill'); if(f) f.parentNode.style.setProperty('--p', progresso().toFixed(2) + '%');
    var cd = $('#tlCd'), prox = proximoBloco();
    if(cd && prox) cd.textContent = contagemTxt(prox.inicio.getTime() - Date.now());
  }

  /* ---------- status do topo (primeira coluna do hero) ---------- */
  function tick(){
    var alvo = $('#heroStatus');
    var pend = pendentes(), prox = proximoBloco();
    if(alvo){
      if(pend.length){
        var b = pend[0], mais = pend.length > 1 ? ' · mais ' + (pend.length - 1) + (pend.length > 2 ? ' blocos abertos' : ' bloco aberto') : '';
        alvo.className = 'hero-status glass glass-red is-live';
        alvo.innerHTML = '<span class="hst-dot"></span><div><small>Bloco aberto agora</small><b>Bloco ' + b.id + ' liberado</b><span>Seis perguntas' + mais + '</span></div>' +
          '<button class="btn btn-primary btn-sm" data-bloco="' + b.id + '">Responder agora</button>';
      } else if(prox){
        var c = contagem(prox.inicio.getTime() - Date.now());
        alvo.className = 'hero-status glass';
        alvo.innerHTML = '<div class="hst-txt"><small>Próximo bloco</small><b>' + esc(textoBloco(prox)) + '</b><span>O cadeado abre sozinho no horário</span></div>' +
          '<div class="cd" aria-label="Tempo até o próximo bloco">' +
          '<div><b>' + c.d + '</b><span>dias</span></div><div><b>' + dois(c.h) + '</b><span>horas</span></div><div><b>' + dois(c.m) + '</b><span>min</span></div><div><b>' + dois(c.s) + '</b><span>seg</span></div></div>';
      } else if(!anunciado()){
        var c2 = contagem(ANUNCIO.getTime() - Date.now());
        alvo.className = 'hero-status glass';
        alvo.innerHTML = '<div class="hst-txt"><small>Quiz encerrado</small><b>Vencedor: ' + esc(diaSemana(ANUNCIO_TXT)) + ', ' + dataCurta(ANUNCIO_TXT) + ' às ' + horaTxt(ANUNCIO_TXT) + '</b><span>Faltam ' + contagemTxt(ANUNCIO.getTime() - Date.now()) + '</span></div>';
        void c2;
      } else {
        alvo.className = 'hero-status glass';
        alvo.innerHTML = '<div class="hst-txt"><small>Resultado</small><b>O vencedor foi anunciado</b><span>As empresas realizadoras divulgam nos canais oficiais.</span></div>';
      }
    }
    atualizarTrilha();
    /* se algum bloco abriu ou fechou, redesenha */
    var assinatura = BLOCOS.map(status).join(',') + '|' + anunciado();
    if(assinatura !== tick.ultima){ tick.ultima = assinatura; renderTrilha(); renderPainel(); }
  }

  /* ---------- inscrição ---------- */
  function inscrito(){ return lsGet(LS.inscrito, null); }
  /* versão demonstrativa (config.demonstracao): dá para ver e responder o quiz sem se inscrever */
  var DEMO = !!C.demonstracao;
  function pessoa(){ return inscrito() || (DEMO ? { nome: 'Visitante', email: 'visitante@demonstracao' } : null); }
  function soDigitos(s){ return String(s || '').replace(/\D/g, ''); }
  function mascaraTel(v){
    var d = soDigitos(v).slice(0, 11);
    if(d.length <= 2) return d.length ? '(' + d : '';
    if(d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
  }
  function mascaraCpf(v){
    var d = soDigitos(v).slice(0, 11);
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  function cpfOk(c){
    c = soDigitos(c);
    if(c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    for(var t = 9; t < 11; t++){
      var s = 0;
      for(var i = 0; i < t; i++) s += +c.charAt(i) * (t + 1 - i);
      if(((s * 10) % 11) % 10 !== +c.charAt(t)) return false;
    }
    return true;
  }
  var aba = 'inscrever';
  function mostrarAba(nome){
    aba = nome;
    var form = $('#formInscricao'), entrar = $('#formEntrar');
    form.hidden = nome !== 'inscrever'; entrar.hidden = nome !== 'entrar';
    $('#tabInscrever').classList.toggle('on', nome === 'inscrever');
    $('#tabEntrar').classList.toggle('on', nome === 'entrar');
    $('#tabInscrever').setAttribute('aria-selected', nome === 'inscrever');
    $('#tabEntrar').setAttribute('aria-selected', nome === 'entrar');
  }

  function renderPainel(){
    var form = $('#formInscricao'), painel = $('#painelInscrito'), entrar = $('#formEntrar'), tabs = $('#fTabs');
    if(PAGINA === 'quiz') return renderAcesso();
    if(!form || !painel) return;
    var u = inscrito();
    if(!u){ painel.hidden = true; tabs.hidden = false; mostrarAba(aba); return; }
    form.hidden = true; entrar.hidden = true; tabs.hidden = true; painel.hidden = false;
    var pend = pendentes(), prox = proximoBloco();
    var feitas = Object.keys(respondidas()).length;
    var acao;
    if(pend.length){
      acao = '<div class="pi-box pi-live"><small>Bloco aberto agora</small><b>Bloco ' + pend[0].id + ' liberado</b><span>Seis perguntas de marcar</span>' +
        '<a class="btn btn-primary btn-block" href="quiz.html?bloco=' + pend[0].id + '">Acessar o quiz</a></div>';
    } else if(prox){
      acao = '<div class="pi-box"><small>Próximo bloco</small><b>' + esc(textoBloco(prox)) + '</b><span>Volte aqui no horário: o cadeado abre sozinho.</span>' +
        '<a class="btn btn-primary btn-block" href="quiz.html">Acessar o quiz</a></div>';
    } else {
      acao = '<div class="pi-box"><small>' + (anunciado() ? 'Quiz encerrado' : 'Todos os blocos concluídos') + '</small><b>Obrigado por participar!</b><span>O vencedor é anunciado ' + esc(diaSemana(ANUNCIO_TXT)) + ', ' + dataCurta(ANUNCIO_TXT) + ' às ' + horaTxt(ANUNCIO_TXT) + '.</span></div>';
    }
    var primeiro = (u.nome || '').trim().split(/\s+/)[0] || '';
    painel.innerHTML = '<div class="pi-head"><span class="pi-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>' +
      '<div><small>Inscrição confirmada</small><h3>' + (primeiro ? 'Olá, ' + esc(primeiro) + '!' : 'Você está inscrito(a)!') + '</h3><span>' + esc(u.email) + '</span></div></div>' +
      '<p class="pi-sub">Você já pode responder. Blocos respondidos: <b>' + feitas + ' de ' + BLOCOS.length + '</b>.</p>' +
      acao +
      '<button class="pi-sair" id="btnSair">Não é você? Sair deste aparelho</button>';
  }

  /* página do quiz: saudação, blocos abertos agora e entrada por e-mail */
  function renderAcesso(){
    var ok = $('#acessoOk'), entrar = $('#formEntrar'), agora = $('#quizAgora');
    if(!ok || !entrar) return;
    var u = inscrito();
    entrar.hidden = !!u; ok.hidden = !u; if(agora) agora.hidden = !(u || DEMO);
    if(!u && !DEMO) return;
    if(u){
    var primeiro = (u.nome || '').trim().split(/\s+/)[0] || '';
    var feitas = Object.keys(respondidas()).length;
    ok.innerHTML = '<div class="pi-head"><span class="pi-ok">' + IC.check + '</span>' +
      '<div><small>Acesso liberado</small><h3>' + (primeiro ? 'Olá, ' + esc(primeiro) + '!' : 'Bem-vindo(a)!') + '</h3><span>' + esc(u.email) + '</span></div></div>' +
      '<p class="pi-sub">Blocos respondidos: <b>' + feitas + ' de ' + BLOCOS.length + '</b>. Cada bloco só pode ser enviado uma vez.</p>' +
      '<button class="pi-sair" id="btnSair">Não é você? Sair deste aparelho</button>';
    }
    if(agora){
      var pend = pendentes(), prox = proximoBloco(), html;
      if(pend.length){
        html = '<h3 class="agora-t">Blocos liberados agora</h3><div class="agora-grid">' + pend.map(function(b){
          return '<div class="agora-card glass glass-red"><span class="agora-ic">' + IC.aberto + '</span><div><b>Bloco ' + b.id + '</b><span>6 perguntas de marcar</span></div>' +
            '<button class="btn btn-primary" data-bloco="' + b.id + '">Responder</button></div>';
        }).join('') + '</div>';
      } else if(prox){
        html = '<div class="agora-vazio glass"><span class="agora-ic">' + IC.fechado + '</span><div><b>Nenhum bloco aberto agora</b><span>Próximo: ' + esc(textoBloco(prox)) + '</span></div></div>';
      } else {
        html = '<div class="agora-vazio glass"><span class="agora-ic">' + IC.trofeu + '</span><div><b>Todos os blocos foram encerrados</b><span>O vencedor é anunciado ' + esc(diaSemana(ANUNCIO_TXT)) + ', ' + dataCurta(ANUNCIO_TXT) + ' às ' + horaTxt(ANUNCIO_TXT) + '.</span></div></div>';
      }
      agora.innerHTML = html;
    }
  }

  function msg(el, texto, tipo){ el.textContent = texto; el.className = 'f-msg' + (tipo ? ' ' + tipo : ''); }
  var emailOk = function(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); };

  function iniciarFormularios(){
    var form = $('#formInscricao'), entrar = $('#formEntrar');
    if(form){
    var tel = form.elements.whatsapp;
    tel.addEventListener('input', function(){ tel.value = mascaraTel(tel.value); });
    var cpf = form.elements.cpf;
    cpf.addEventListener('input', function(){ cpf.value = mascaraCpf(cpf.value); });
    $('#tabInscrever').addEventListener('click', function(){ mostrarAba('inscrever'); });
    $('#tabEntrar').addEventListener('click', function(){ mostrarAba('entrar'); entrar.elements.email.focus({ preventScroll: true }); });

    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var f = form.elements, aviso = $('#msgInscricao');
      var interesses = $$('input[name=interesse]:checked', form).map(function(x){ return x.value; });
      var dados = {
        acao: 'inscricao',
        nome: f.nome.value.trim(),
        email: f.email.value.trim().toLowerCase(),
        whatsapp: soDigitos(f.whatsapp.value),
        cpf: soDigitos(f.cpf.value),
        categoria: f.categoria.value,
        interesses: interesses,
        aceite: f.aceite.checked,
        origem: location.href.slice(0, 200)
      };
      if(dados.nome.split(/\s+/).length < 2) return msg(aviso, 'Digite seu nome completo.', 'erro');
      if(!emailOk(dados.email)) return msg(aviso, 'Confira o seu e-mail.', 'erro');
      if(dados.whatsapp.length < 10) return msg(aviso, 'Digite o WhatsApp com DDD.', 'erro');
      if(!dados.categoria) return msg(aviso, 'Escolha a sua categoria profissional.', 'erro');
      if(!interesses.length) return msg(aviso, 'Marque pelo menos uma opção sobre 2027.', 'erro');
      if(!cpfOk(dados.cpf)) return msg(aviso, 'Confira o CPF.', 'erro');
      if(!f.regulamento.checked) return msg(aviso, 'Para participar, aceite o regulamento do quiz.', 'erro');
      if(!f.aceite.checked) return msg(aviso, 'Para participar, marque também a autorização de mensagens.', 'erro');

      var bt = form.querySelector('button[type=submit]');
      bt.disabled = true; bt.textContent = 'Enviando...';
      msg(aviso, '');
      var envio = ENDPOINT ? apiPost(dados) : Promise.resolve({ ok: true });
      envio.then(function(r){
        if(!r || !r.ok) throw new Error((r && r.erro) || 'erro');
        if(!ENDPOINT){ var lista = lsGet(LS.demoInscritos, {}); lista[dados.email] = dados.nome; lsSet(LS.demoInscritos, lista); }
        lsSet(LS.inscrito, { nome: dados.nome, email: dados.email });
        renderPainel(); renderTrilha();
        popupInscrito(dados.nome);
      }).catch(function(){
        msg(aviso, 'Não conseguimos enviar agora. Confira a internet e tente de novo.', 'erro');
      }).then(function(){ bt.disabled = false; bt.textContent = 'Fazer minha inscrição'; });
    });
    }

    /* já tenho inscrição (outro aparelho ou página atualizada): só o e-mail */
    if(entrar){
    entrar.addEventListener('submit', function(ev){
      ev.preventDefault();
      var email = entrar.elements.email.value.trim().toLowerCase(), aviso = $('#msgEntrar');
      if(!emailOk(email)) return msg(aviso, 'Confira o seu e-mail.', 'erro');
      var bt = entrar.querySelector('button[type=submit]');
      bt.disabled = true;
      var busca = ENDPOINT ? apiGet({ acao: 'inscrito', email: email }) :
        Promise.resolve((function(){ var l = lsGet(LS.demoInscritos, {}); return l[email] ? { ok: true, nome: l[email] } : { ok: false }; })());
      busca.then(function(r){
        if(r && r.ok){
          lsSet(LS.inscrito, { nome: r.nome || '', email: email });
          if(r.respondidas){ var rs = respondidas(); r.respondidas.forEach(function(id){ rs[id] = rs[id] || { enviado: true }; }); lsSet(LS.respostas, rs); }
          msg(aviso, '');
          renderPainel(); renderTrilha(); tick();
          toast('Pronto! Encontramos a sua inscrição.');
          var c = $('#caminho'); if(c && PAGINA === 'inicio') c.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          msg(aviso, 'Não encontramos inscrição com este e-mail. Confira ou faça a inscrição.', 'erro');
        }
      }).catch(function(){ msg(aviso, 'Não conseguimos conferir agora. Tente de novo.', 'erro'); })
        .then(function(){ bt.disabled = false; });
    });
    }

    document.addEventListener('click', function(ev){
      if(ev.target && ev.target.id === 'btnSair'){
        lsDel(LS.inscrito); lsDel(LS.respostas);
        aba = 'inscrever'; renderPainel(); renderTrilha();
      }
    });
  }

  /* ---------- campos montados pela configuração ---------- */
  function montarCampos(){
    var sel = $('#fCategoria');
    if(sel) sel.innerHTML = '<option value="">Escolha uma opção</option>' + (C.categorias || []).map(function(c){ return '<option>' + esc(c) + '</option>'; }).join('');
    var q = $('#fPergunta2027'); if(q) q.textContent = C.pergunta2027 || '';
    var box = $('#fInteresses');
    if(box) box.innerHTML = (C.interesses || []).map(function(t){
      return '<label class="f-chip"><input type="checkbox" name="interesse" value="' + esc(t) + '" /><span>' + esc(t) + '</span></label>';
    }).join('');
    var rz = $('#realizadoresLista');
    var wa = function(r){ return 'https://wa.me/' + soDigitos(r.whatsapp) + '?text=' + encodeURIComponent('Olá! Vim pelo Quiz CBMEDE e gostaria de saber mais sobre a ' + r.nome + '.'); };
    if(rz) rz.innerHTML = (C.realizadores || []).map(function(r){
      var marca = r.logo ? '<img src="' + esc(r.logo) + '" alt="' + esc(r.nome) + '" loading="lazy" />' : '<span class="rz-word">' + esc(r.nome) + '</span>';
      return '<div class="rz-card glass fade-in"><div class="rz-logo">' +
        (r.site ? '<a href="' + esc(r.site) + '" target="_blank" rel="noopener" aria-label="Site da ' + esc(r.nome) + '">' + marca + '</a>' : marca) + '</div>' +
        (r.logo ? '<h3>' + esc(r.nome) + '</h3>' : '') + (r.texto ? '<p>' + esc(r.texto) + '</p>' : '') +
        (r.whatsapp ? '<a class="btn btn-primary btn-sm rz-wa" href="' + wa(r) + '" target="_blank" rel="noopener">Falar no WhatsApp</a>' : '') + '</div>';
    }).join('');
    /* logos do topo e do rodapé levam à página de cada marca */
    $$('.br-link').forEach(function(a){
      var m = (C.realizadores || []).filter(function(r){ return r.nome === a.getAttribute('data-marca'); })[0];
      if(m && m.site) a.href = m.site; else a.removeAttribute('target');
    });
  }

  /* ---------- janelas (popup e quiz) ---------- */
  var modal, corpo, pop, popCorpo;
  function abrirJanela(el){
    el.hidden = false;
    requestAnimationFrame(function(){ el.classList.add('open'); });
    document.body.classList.add('no-scroll');
  }
  function fecharJanela(el){
    el.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(function(){ el.hidden = true; }, 300);
  }

  function popupInscrito(nome){
    var primeiro = (nome || '').trim().split(/\s+/)[0] || '';
    var pend = pendentes(), prox = proximoBloco(), texto;
    if(pend.length) texto = 'O <b>bloco ' + pend[0].id + '</b> já está aberto: são seis perguntas de marcar.';
    else if(prox) texto = 'O primeiro bloco abre <b>' + esc(diaSemana(prox.abre)) + ', ' + dataCurta(prox.abre) + ', às ' + horaTxt(prox.abre) + '</b>. Volte no horário: o cadeado abre sozinho.';
    else texto = 'Os blocos do quiz já foram encerrados.';
    var botao = '<a class="btn btn-primary btn-block" href="quiz.html' + (pend.length ? '?bloco=' + pend[0].id : '') + '">Acessar o quiz</a>';
    popCorpo.innerHTML = '<div class="qz-fim"><span class="qz-fim-ic">' + IC.check + '</span>' +
      '<h3>' + (primeiro ? esc(primeiro) + ', acesso liberado!' : 'Acesso liberado!') + '</h3>' +
      '<p>Sua inscrição foi feita e você já pode acessar o quiz. ' + texto + '</p>' + botao +
      '<p class="qz-obs">Se atualizar a página, é só usar <b>Já fiz minha inscrição</b> e digitar o seu e-mail.</p></div>';
    abrirJanela(pop);
  }

  /* ---------- player do quiz ---------- */
  var Q = { bloco: null, perguntas: [], i: 0, resp: [], inicio: 0, comecou: false, enviado: false };

  function abrirBloco(id){
    var b = BLOCOS.filter(function(x){ return x.id === id; })[0];
    if(!b) return;
    if(PAGINA === 'inicio' && pessoa()){ location.href = 'quiz.html?bloco=' + id; return; }
    if(!pessoa()){
      if(PAGINA === 'quiz'){ toast('Digite o e-mail da sua inscrição para entrar.'); var ac = $('#quizAcesso'); if(ac) ac.scrollIntoView({ behavior: 'smooth' }); return; }
      toast('Faça sua inscrição para responder ao quiz.');
      $('#inscricao').scrollIntoView({ behavior: 'smooth' });
      setTimeout(function(){ var n = $('#formInscricao input[name=nome]'); if(n) n.focus({ preventScroll: true }); }, 700);
      return;
    }
    var st = status(b);
    if(st !== 'aberta'){ toast(st === 'respondida' ? 'Você já respondeu este bloco.' : st === 'futura' ? 'O cadeado deste bloco ainda não abriu.' : 'Este bloco foi encerrado.'); return; }
    Q = { bloco: b, perguntas: [], i: 0, resp: [], inicio: Date.now(), comecou: false, enviado: false };
    abrirJanela(modal);
    corpo.innerHTML = '<div class="qz-load"><span class="spin"></span>Carregando as perguntas do bloco ' + b.id + '...</div>';
    var carrega = ENDPOINT ? apiGet({ acao: 'bloco', id: b.id, email: pessoa().email }) :
      Promise.resolve({ ok: true, perguntas: (window.QUIZ_PERGUNTAS_DEMO || {})[b.id] || [] });
    carrega.then(function(res){
      if(!res || !res.ok){
        var m = { fechada: 'Este bloco não está aberto agora.', respondida: 'Você já respondeu este bloco.', inscricao: 'Não encontramos a sua inscrição. Faça a inscrição de novo.' }[res && res.erro] || 'Não conseguimos carregar as perguntas.';
        if(res && res.erro === 'respondida'){ marcarRespondida(b.id); renderTrilha(); renderPainel(); }
        return telaFinal(m, true);
      }
      Q.perguntas = (res.perguntas || []).map(function(x){ return { p: x.p, o: x.o }; });
      if(!Q.perguntas.length) return telaFinal('As perguntas deste bloco ainda não foram cadastradas.', true);
      telaInicio();
    }).catch(function(){ telaFinal('Não conseguimos carregar as perguntas. Confira a internet e tente de novo.', true); });
  }

  function fecharQuiz(forcar){
    var andamento = Q.comecou && !Q.enviado && Q.resp.some(function(x){ return x != null; });
    if(andamento && !forcar && !confirm('Sair agora? As respostas deste bloco ainda não foram enviadas.')) return;
    fecharJanela(modal);
  }

  function cabecalho(){
    return '<div class="qz-head"><span class="qz-tag">Bloco ' + Q.bloco.id + ' · ' + esc(diaSemana(Q.bloco.abre)) + ', ' + dataCurta(Q.bloco.abre) + '</span></div>';
  }

  function telaInicio(){
    corpo.innerHTML = cabecalho() +
      '<div class="qz-intro"><h3 class="qz-h">Vamos começar!</h3><p>São <b>' + Q.perguntas.length + ' perguntas</b> de marcar. Toque na resposta e a próxima aparece. Cada acerto vale 1 ponto; em caso de empate, vence quem responder primeiro (o tempo conta desde a liberação do bloco).</p>' +
      '<button class="btn btn-primary btn-block" id="qzComecar">Vamos começar</button></div>';
    $('#qzComecar').addEventListener('click', function(){ Q.comecou = true; Q.inicio = Date.now(); telaQuiz(); });
  }

  function telaQuiz(){
    var n = Q.perguntas.length, letras = ['A', 'B', 'C', 'D', 'E'];
    Q.resp = Q.perguntas.map(function(){ return null; });
    Q.i = 0;
    var slides = Q.perguntas.map(function(q){
      return '<div class="qz-slide"><p class="qz-q">' + esc(q.p) + '</p><div class="qz-ops" role="radiogroup">' +
        q.o.map(function(op, k){ return '<button class="qz-op" role="radio" aria-checked="false" data-k="' + k + '"><span class="qz-l">' + letras[k] + '</span><span>' + esc(op) + '</span></button>'; }).join('') +
        '</div></div>';
    }).join('');
    corpo.innerHTML = cabecalho() +
      '<div class="qz-prog"><span id="qzPos"></span><div class="qz-bar"><i id="qzBar"></i></div></div>' +
      '<div class="qz-view" id="qzView"><div class="qz-track" id="qzTrack">' + slides + '</div></div>' +
      '<div class="qz-nav"><button class="btn btn-glass" id="qzVoltar">Voltar</button><button class="btn btn-primary" id="qzAvancar" disabled>Próxima</button></div>';

    var track = $('#qzTrack'), view = $('#qzView');
    function atualizar(){
      track.style.transform = 'translateX(-' + (Q.i * 100) + '%)';
      $('#qzPos').textContent = 'Pergunta ' + (Q.i + 1) + ' de ' + n;
      $('#qzBar').style.width = ((Q.i + 1) / n * 100) + '%';
      $('#qzVoltar').disabled = Q.i === 0;
      var ultima = Q.i === n - 1, todas = Q.resp.every(function(x){ return x != null; });
      var av = $('#qzAvancar');
      av.textContent = ultima ? 'Enviar respostas' : 'Próxima';
      av.disabled = ultima ? !todas : Q.resp[Q.i] == null;
      $$('.qz-slide', track).forEach(function(s, k){ s.setAttribute('aria-hidden', k === Q.i ? 'false' : 'true'); });
    }
    function ir(i){ Q.i = Math.max(0, Math.min(n - 1, i)); atualizar(); }
    track.addEventListener('click', function(ev){
      var b = ev.target.closest && ev.target.closest('.qz-op'); if(!b) return;
      var slide = b.closest('.qz-slide'), si = $$('.qz-slide', track).indexOf(slide);
      if(si !== Q.i) return;
      $$('.qz-op', slide).forEach(function(x){ x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); });
      b.classList.add('sel'); b.setAttribute('aria-checked', 'true');
      Q.resp[si] = +b.getAttribute('data-k');
      atualizar();
      if(si < n - 1) setTimeout(function(){ if(Q.i === si) ir(si + 1); }, 320);
    });
    $('#qzVoltar').addEventListener('click', function(){ ir(Q.i - 1); });
    $('#qzAvancar').addEventListener('click', function(){ if(Q.i === n - 1) enviar(); else ir(Q.i + 1); });
    var x0 = null, y0 = null;
    view.addEventListener('touchstart', function(ev){ var t = ev.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    view.addEventListener('touchend', function(ev){
      if(x0 === null) return;
      var t = ev.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if(Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      if(dx > 0) ir(Q.i - 1); else if(Q.resp[Q.i] != null && Q.i < n - 1) ir(Q.i + 1);
    }, { passive: true });
    atualizar();
  }

  function marcarRespondida(id, extra){
    var rs = respondidas(); rs[id] = extra || { enviado: true }; lsSet(LS.respostas, rs);
  }

  function enviar(){
    corpo.innerHTML = cabecalho() + '<div class="qz-load"><span class="spin"></span>Enviando suas respostas...</div>';
    var u = pessoa(), b = Q.bloco;
    var dados = { acao: 'resposta', email: u.email, nome: u.nome, bloco: b.id, respostas: Q.resp, tempoNoAparelho: Math.round((Date.now() - Q.inicio) / 1000) };
    var envio = ENDPOINT ? apiPost(dados) : Promise.resolve({ ok: true });
    envio.then(function(res){
      if(res && (res.ok || res.erro === 'respondida')){
        Q.enviado = true;
        marcarRespondida(b.id, { enviado: true, em: new Date().toISOString() });
        renderTrilha(); renderPainel(); tick();
        var prox = proximoBloco(), pend = pendentes();
        var texto = pend.length ? 'Você ainda tem o <b>bloco ' + pend[0].id + '</b> aberto para responder.' :
          prox ? 'Próximo bloco: <b>' + esc(textoBloco(prox)) + '</b>.' : 'Esse foi o último bloco. O vencedor é anunciado ' + esc(diaSemana(ANUNCIO_TXT)) + ', ' + dataCurta(ANUNCIO_TXT) + ' às ' + horaTxt(ANUNCIO_TXT) + '. Boa sorte!';
        telaFinal('Respostas enviadas!', false, texto);
      } else {
        var m = { fechada: 'O horário deste bloco terminou antes do envio.', inscricao: 'Não encontramos a sua inscrição.' }[res && res.erro];
        telaFinal(m || 'Não conseguimos enviar. Tente de novo.', true, null, !m);
      }
    }).catch(function(){ telaFinal('Não conseguimos enviar. Confira a internet e tente de novo.', true, null, true); });
  }

  function telaFinal(titulo, erro, texto, podeRepetir){
    corpo.innerHTML = (Q.bloco ? cabecalho() : '') +
      '<div class="qz-fim' + (erro ? ' erro' : '') + '"><span class="qz-fim-ic">' + (erro ?
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 16.5v.5"/></svg>' : IC.check) + '</span>' +
      '<h3>' + esc(titulo) + '</h3>' + (texto ? '<p>' + texto + '</p>' : '') +
      (!erro ? '<p class="qz-obs">O resultado não aparece aqui: a pontuação é calculada pelas equipes das empresas realizadoras ao fim do quiz.</p>' : '') +
      (podeRepetir ? '<button class="btn btn-primary btn-block" id="qzRepetir">Tentar enviar de novo</button>' : '') +
      '<button class="btn btn-glass btn-block" id="qzFechar">Fechar</button></div>';
    $('#qzFechar').addEventListener('click', function(){ fecharQuiz(true); });
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
    $$('[data-c="blocos"]').forEach(function(el){ el.textContent = BLOCOS.length; });
    $$('[data-c="perguntas"]').forEach(function(el){ el.textContent = BLOCOS.length * 6; });
    $$('[data-c="agenda"]').forEach(function(el){ el.textContent = agendaTexto(); });
    $$('[data-c="anuncio"]').forEach(function(el){ el.textContent = diaSemana(ANUNCIO_TXT) + ', ' + dataCurta(ANUNCIO_TXT) + ', às ' + horaTxt(ANUNCIO_TXT); });
    $$('[data-c="whats"]').forEach(function(el){ el.href = 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent('Olá! Tenho uma dúvida sobre o Quiz CBMEDE.'); });
    $$('[data-c="whatsTexto"]').forEach(function(el){ el.textContent = C.whatsappTexto; });
    var pr = $('#listaPremios');
    if(pr){
      pr.innerHTML = (C.premios || []).slice(1).map(function(p){
        return '<div class="pz-item glass fade-in"><span class="pz-pos">' + esc(p.posicao) + '</span><h3>' + esc(p.nome) + '</h3><p>' + esc(p.texto) + '</p></div>';
      }).join('');
    }
  }


  /* ---------- botão "Versão mobile": mostra a página dentro de um celular (para apresentar no computador) ---------- */
  function iniciarVersaoMobile(){
    if(window.top !== window.self || window.innerWidth <= 1024) return;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'vm-btn';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>Versão mobile';
    var over = document.createElement('div');
    over.className = 'vm-over'; over.hidden = true;
    over.innerHTML = '<div class="vm-phone"><iframe title="Versão mobile" allow="clipboard-write"></iframe></div><button type="button" class="vm-fechar">Voltar ao computador</button>';
    document.body.appendChild(btn); document.body.appendChild(over);
    var frame = over.querySelector('iframe');
    function abrir(){
      frame.src = (location.pathname.split('/').pop() || 'index.html') + location.search + location.hash;
      over.hidden = false; document.body.classList.add('no-scroll');
    }
    function fechar(){
      over.hidden = true; frame.removeAttribute('src'); document.body.classList.remove('no-scroll');
    }
    btn.addEventListener('click', abrir);
    over.querySelector('.vm-fechar').addEventListener('click', fechar);
    over.addEventListener('click', function(ev){ if(ev.target === over) fechar(); });
    document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape' && !over.hidden) fechar(); });
  }
  /* ---------- início ---------- */
  function carregarAgendaOficial(){
    if(!ENDPOINT) return Promise.resolve();
    return apiGet({ acao: 'agenda' }).then(function(res){
      if(res && res.ok && res.blocos && res.blocos.length){
        BLOCOS = res.blocos.map(function(b){ return prep({ id: +b.id, abre: b.abre, fecha: b.fecha }); });
        if(res.anuncio){ ANUNCIO_TXT = res.anuncio; ANUNCIO = quando(res.anuncio); }
        tick.ultima = null; preencherTextos(); tick();
      }
    }).catch(function(){});
  }

  document.addEventListener('DOMContentLoaded', function(){
    modal = $('#quizModal'); corpo = $('#quizCorpo'); pop = $('#popModal'); popCorpo = $('#popCorpo');
    iniciarVersaoMobile();
    montarCampos();
    preencherTextos();
    iniciarFormularios();
    tick();
    setInterval(tick, 1000);
    carregarAgendaOficial();
    if(TESTE) document.body.classList.add('modo-teste');

    document.addEventListener('click', function(ev){
      var b = ev.target.closest && ev.target.closest('[data-bloco]');
      if(b){
        ev.preventDefault();
        if(b.closest('#popModal')) fecharJanela(pop);
        abrirBloco(+b.getAttribute('data-bloco'));
        return;
      }
      if(ev.target.closest && ev.target.closest('[data-fechar-pop]')) fecharJanela(pop);
    });
    if(modal){
      $('#quizFechar').addEventListener('click', function(){ fecharQuiz(false); });
      modal.addEventListener('click', function(ev){ if(ev.target === modal) fecharQuiz(false); });
    }
    if(pop){
      $('#popFechar').addEventListener('click', function(){ fecharJanela(pop); });
      pop.addEventListener('click', function(ev){ if(ev.target === pop) fecharJanela(pop); });
    }
    document.addEventListener('keydown', function(ev){
      if(ev.key !== 'Escape') return;
      if(pop && !pop.hidden) fecharJanela(pop); else if(modal && !modal.hidden) fecharQuiz(false);
    });
    /* quiz.html?bloco=N abre o bloco direto (vindo da página de inscrição) */
    if(PAGINA === 'quiz'){
      var m = location.search.match(/[?&]bloco=(\d+)/);
      if(m && pessoa()) abrirBloco(+m[1]);
    }

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
