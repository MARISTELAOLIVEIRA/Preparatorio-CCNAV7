/* ==============================================================
   Trilha de revisão do ITN (revisao-itn.html)
   Usa ESTACOES e NIVEIS de js/revisao-dados.js, carregado antes deste arquivo.
   O recorde de cada minijogo fica salvo neste navegador e, com login
   (js/conta.js), também na conta do aluno, para o ranking da turma (js/ranking.js).

   Índice
   1. Utilidades
   2. Recordes, XP, níveis e insígnias
   3. Painel do jogador e mapa da trilha
   4. Estações
   5. Minijogo: quiz
   6. Minijogo: ordenar
   7. Minijogo: memória
   8. Minijogo: classificar
   9. Minijogo: bits
   10. Minijogo: digitar
   11. Minijogo: terminal do IOS
   12. Início
   ============================================================== */


/* 1. Utilidades ------------------------------------------------ */

const $ = (seletor) => document.querySelector(seletor);

// Cópia da lista em ordem aleatória (Fisher-Yates)
const embaralhar = (lista) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

// Cria um elemento com classe e texto (textContent evita injetar HTML)
const criar = (tag, classe, texto) => {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
};

// Botão comum dos minijogos
const botao = (texto, classe) => {
  const b = criar("button", classe || "", texto);
  b.type = "button";
  return b;
};

// Leva o cursor para o campo, menos quando a página está sendo montada
// (senão a página pularia para o último minijogo ao abrir)
let montando = true;
const focar = (el) => {
  if (!montando) el.focus({ preventScroll: true });
};

// Espera alguns milissegundos (para o aluno ver o certo ou o errado)
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));


/* 2. Recordes, XP, níveis e insígnias -------------------------- */

const CHAVE = "ccna-revisao";

// Quanto cada minijogo vale, no máximo
const XP_MAXIMO = {
  quiz: (jogo) => jogo.perguntas.length * 10,
  ordenar: () => 30,
  memoria: () => 40,
  classificar: (jogo) => jogo.itens.length * 5,
  bits: (jogo) => jogo.rodada * 10,
  digitar: (jogo) => jogo.perguntas.length * 10,
  terminal: (jogo) => jogo.passos.length * 5,
};

const maximoDoJogo = (jogo) => XP_MAXIMO[jogo.tipo](jogo);

// "e3-j1" = estação 3, jogo 1 (a contagem começa em 0)
const idDoJogo = (e, j) => `e${e}-j${j}`;

function lerRecordes() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (salvo && salvo.jogos) return salvo;
  } catch (erro) {}
  return { jogos: {}, insignias: [] };
}

function salvarRecordes(recordes) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(recordes));
  } catch (erro) {}
}

// XP, máximo e estrelas de uma estação
function situacaoDaEstacao(recordes, e) {
  const estacao = ESTACOES[e];
  let xp = 0;
  let maximo = 0;
  let jogados = 0;
  estacao.jogos.forEach((jogo, j) => {
    const recorde = recordes.jogos[idDoJogo(e, j)];
    maximo += maximoDoJogo(jogo);
    if (recorde !== undefined) {
      xp += recorde;
      jogados++;
    }
  });
  const concluida = jogados === estacao.jogos.length;
  const pct = maximo ? (xp / maximo) * 100 : 0;
  let estrelas = 0;
  if (concluida) estrelas = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
  return { xp, maximo, jogados, concluida, estrelas };
}

const textoEstrelas = (n) => "★".repeat(n) + "☆".repeat(3 - n);

// Guarda o resultado de um minijogo e devolve as insígnias novas
function registrar(e, j, xp, extras) {
  const recordes = lerRecordes();
  const id = idDoJogo(e, j);
  const anterior = recordes.jogos[id];
  const novoRecorde = anterior === undefined || xp > anterior;
  if (novoRecorde) recordes.jogos[id] = xp;

  const novas = [];
  const ganhar = (insignia) => {
    if (!recordes.insignias.includes(insignia)) {
      recordes.insignias.push(insignia);
      novas.push(insignia);
    }
  };

  const situacoes = ESTACOES.map((_, i) => situacaoDaEstacao(recordes, i));
  if (situacoes.some((s) => s.concluida)) ganhar("Primeira estação");
  if (situacoes.some((s) => s.estrelas === 3)) ganhar("Três estrelas");
  if (situacoes.every((s) => s.concluida)) ganhar("Trilha completa");
  if (situacoes.every((s) => s.estrelas === 3)) ganhar("Lenda do ITN");
  (extras || []).forEach(ganhar);

  salvarRecordes(recordes);
  atualizarPainel();
  atualizarEstacao(e);

  // Logado? O XP também vai para a conta (o ranking usa o melhor de cada minijogo)
  if (novoRecorde && window.CONTA && CONTA.usuario()) {
    const jogo = ESTACOES[e].jogos[j];
    CONTA.salvarTreino("revisao:" + id, "revisao", xp, maximoDoJogo(jogo)).then((ok) => {
      if (ok && window.RANKING) RANKING.atualizar();
    });
  }

  return { novoRecorde, novas, anterior };
}

// Ao entrar com a conta: traz os recordes da nuvem para este navegador
// e manda para a nuvem os recordes feitos aqui sem login
async function sincronizarComConta() {
  const linhas = await CONTA.carregarTreinos("revisao:");
  if (!linhas) return;
  const recordes = lerRecordes();
  const naNuvem = {};
  linhas.forEach((linha) => {
    const id = linha.treino.slice("revisao:".length);
    naNuvem[id] = Math.max(naNuvem[id] || 0, linha.acertos);
  });

  let enviou = false;
  for (let e = 0; e < ESTACOES.length; e++) {
    for (let j = 0; j < ESTACOES[e].jogos.length; j++) {
      const id = idDoJogo(e, j);
      const local = recordes.jogos[id];
      const nuvem = naNuvem[id];
      if (nuvem !== undefined && (local === undefined || nuvem > local)) {
        recordes.jogos[id] = Math.min(nuvem, maximoDoJogo(ESTACOES[e].jogos[j]));
      } else if (local !== undefined && (nuvem === undefined || local > nuvem)) {
        if (await CONTA.salvarTreino("revisao:" + id, "revisao", local, maximoDoJogo(ESTACOES[e].jogos[j]))) enviou = true;
      }
    }
  }

  salvarRecordes(recordes);
  atualizarPainel();
  ESTACOES.forEach((_, e) => atualizarEstacao(e));
  document.querySelectorAll(".rev-jogo").forEach((cartao) => cartao.dispatchEvent(new Event("recorde")));
  if (enviou && window.RANKING) RANKING.atualizar();
}


/* 3. Painel do jogador e mapa da trilha ------------------------ */

function atualizarPainel() {
  const recordes = lerRecordes();
  const situacoes = ESTACOES.map((_, e) => situacaoDaEstacao(recordes, e));
  const xp = situacoes.reduce((soma, s) => soma + s.xp, 0);
  const maximo = situacoes.reduce((soma, s) => soma + s.maximo, 0);
  const concluidas = situacoes.filter((s) => s.concluida).length;
  const estrelas = situacoes.reduce((soma, s) => soma + s.estrelas, 0);

  // Nível atual e quanto falta para o próximo
  let nivel = 0;
  NIVEIS.forEach((n, i) => {
    if (xp >= n.xp) nivel = i;
  });
  const proximo = NIVEIS[nivel + 1];

  $("#revNivel").textContent = NIVEIS[nivel].nome;
  $("#revXp").textContent = `${xp} de ${maximo} XP`;
  $("#revEstacoes").textContent = `${concluidas} de ${ESTACOES.length} estações · ${estrelas} de ${ESTACOES.length * 3} estrelas`;
  $("#revProximo").textContent = proximo ? `Faltam ${proximo.xp - xp} XP para o nível ${proximo.nome}.` : "Nível máximo. Agora é o simulado!";
  $("#revBarra").style.width = (xp / maximo) * 100 + "%";
  $("#revInsignias").textContent = recordes.insignias.length ? "Insígnias: " + recordes.insignias.join(" · ") : "Insígnias: jogue a primeira estação para ganhar a primeira.";

  // Mapa: um botão por estação
  const mapa = $("#revMapa");
  mapa.innerHTML = "";
  ESTACOES.forEach((estacao, e) => {
    const s = situacoes[e];
    const item = criar("a", "rev-ponto" + (s.concluida ? " feita" : ""));
    item.href = "#estacao-" + (e + 1);
    item.append(
      criar("span", "rev-ponto-num", String(e + 1)),
      criar("span", "rev-ponto-nome", estacao.titulo),
      criar("span", "rev-ponto-estrelas", textoEstrelas(s.estrelas)),
    );
    item.addEventListener("click", () => {
      $("#estacao-" + (e + 1)).open = true;
    });
    mapa.appendChild(item);
  });
}

// Atualiza as estrelas no título de uma estação
function atualizarEstacao(e) {
  const s = situacaoDaEstacao(lerRecordes(), e);
  const caixa = $("#estacao-" + (e + 1));
  if (!caixa) return;
  caixa.querySelector(".rev-estrelas").textContent = textoEstrelas(s.estrelas);
  caixa.querySelector(".rev-xp").textContent = `${s.xp}/${s.maximo} XP`;
  caixa.classList.toggle("feita", s.concluida);
}


/* 4. Estações -------------------------------------------------- */

const MINIJOGOS = {}; // preenchido nas seções 5 a 11

function montarEstacoes() {
  const caixa = $("#revTrilha");

  ESTACOES.forEach((estacao, e) => {
    const detalhes = criar("details", "rev-estacao painel corte");
    detalhes.id = "estacao-" + (e + 1);

    const resumo = criar("summary");
    resumo.append(
      criar("span", "rev-num", String(e + 1)),
      criar("h3", "", estacao.titulo),
      criar("span", "tag", estacao.modulos),
      criar("span", "rev-estrelas"),
      criar("span", "rev-xp"),
    );
    detalhes.appendChild(resumo);

    const corpo = criar("div", "rev-corpo");

    // O essencial e o truque para lembrar
    const essencial = criar("div", "rev-essencial");
    essencial.appendChild(criar("h4", "", "Em poucas palavras"));
    const lista = criar("ul");
    estacao.resumo.forEach((frase) => lista.appendChild(criar("li", "", frase)));
    essencial.appendChild(lista);
    const lembrar = criar("p", "rev-lembrar");
    lembrar.append(criar("strong", "", "Para lembrar: "), estacao.lembrar);
    essencial.appendChild(lembrar);
    if (estacao.link) {
      const link = criar("a", "btn sec", estacao.link.texto);
      link.href = estacao.link.href;
      essencial.appendChild(link);
    }
    corpo.appendChild(essencial);

    // Os minijogos
    estacao.jogos.forEach((jogo, j) => corpo.appendChild(cartaoDoJogo(e, j)));

    detalhes.appendChild(corpo);
    caixa.appendChild(detalhes);
    atualizarEstacao(e);
  });
}

// Cartão de um minijogo: título, instrução, área do jogo e botão de jogar de novo
function cartaoDoJogo(e, j) {
  const jogo = ESTACOES[e].jogos[j];
  const cartao = criar("div", "rev-jogo");
  cartao.dataset.tipo = jogo.tipo;

  const nomes = {
    quiz: "Quiz",
    ordenar: "Ordenar",
    memoria: "Jogo da memória",
    classificar: "Classificar",
    bits: "Bits",
    digitar: "Digitar",
    terminal: "Terminal do IOS",
  };

  const topo = criar("div", "rev-jogo-topo");
  topo.append(criar("span", "rev-tipo", nomes[jogo.tipo]), criar("h4", "", jogo.titulo), criar("span", "rev-recorde"));
  cartao.append(topo, criar("p", "rev-instrucao", jogo.instrucao));

  const area = criar("div", "rev-area");
  cartao.appendChild(area);

  const final = criar("div", "rev-final");
  final.setAttribute("aria-live", "polite");
  cartao.appendChild(final);

  const mostrarRecorde = () => {
    const recorde = lerRecordes().jogos[idDoJogo(e, j)];
    topo.querySelector(".rev-recorde").textContent =
      recorde === undefined ? `vale ${maximoDoJogo(jogo)} XP` : `recorde: ${recorde}/${maximoDoJogo(jogo)} XP`;
  };

  // Começa (ou recomeça) o minijogo
  const comecar = () => {
    area.innerHTML = "";
    final.innerHTML = "";
    final.className = "rev-final";
    MINIJOGOS[jogo.tipo](jogo, area, terminar);
  };

  // Chamado pelo minijogo quando acaba
  const terminar = (xp, resumo, extras) => {
    const { novoRecorde, novas, anterior } = registrar(e, j, xp, extras);
    mostrarRecorde();

    const maximo = maximoDoJogo(jogo);
    final.className = "rev-final " + (xp === maximo ? "ok" : "");
    final.innerHTML = "";
    final.append(criar("strong", "", `+${xp} de ${maximo} XP. `), resumo);
    if (novoRecorde && anterior !== undefined) final.append(" Novo recorde!");
    if (novas.length) final.appendChild(criar("p", "rev-insignia", "Insígnia nova: " + novas.join(" · ")));

    const deNovo = botao(xp === maximo ? "Jogar de novo" : "Tentar de novo para o XP máximo", "sec");
    deNovo.addEventListener("click", comecar);
    final.appendChild(deNovo);
  };

  cartao.addEventListener("recorde", mostrarRecorde);
  mostrarRecorde();
  comecar();
  return cartao;
}


/* 5. Minijogo: quiz -------------------------------------------- */
/* Uma pergunta por vez. 10 XP por acerto. */

MINIJOGOS.quiz = (jogo, area, terminar) => {
  let i = 0;
  let acertos = 0;
  const perguntas = embaralhar(jogo.perguntas);

  const mostrar = () => {
    const q = perguntas[i];
    area.innerHTML = "";
    area.appendChild(criar("p", "rev-contador", `Pergunta ${i + 1} de ${perguntas.length}`));
    area.appendChild(criar("p", "rev-pergunta", q.p));

    const opcoes = criar("div", "rev-opcoes");
    const explicacao = criar("p", "rev-exp");
    explicacao.setAttribute("aria-live", "polite");

    embaralhar(q.opcoes.map((texto, k) => ({ texto, k }))).forEach(({ texto, k }) => {
      const b = botao(texto, "rev-opcao");
      b.addEventListener("click", () => {
        const certo = k === q.certa;
        if (certo) acertos++;
        opcoes.querySelectorAll("button").forEach((outro) => (outro.disabled = true));
        b.classList.add(certo ? "certo" : "errado");
        if (!certo) {
          // mostra qual era a certa
          [...opcoes.children].find((outro) => outro.textContent === q.opcoes[q.certa]).classList.add("certo");
        }
        explicacao.textContent = (certo ? "Isso! " : "Quase. ") + q.exp;
        explicacao.className = "rev-exp " + (certo ? "ok" : "no");

        const seguir = botao(i < perguntas.length - 1 ? "Próxima pergunta" : "Ver o resultado");
        seguir.addEventListener("click", () => {
          i++;
          if (i < perguntas.length) mostrar();
          else {
            area.innerHTML = "";
            terminar(acertos * 10, `Você acertou ${acertos} de ${perguntas.length}.`);
          }
        });
        area.appendChild(seguir);
        focar(seguir);
      });
      opcoes.appendChild(b);
    });

    area.append(opcoes, explicacao);
  };

  mostrar();
};


/* 6. Minijogo: ordenar ----------------------------------------- */
/* Clique no próximo item da ordem. Cada erro tira 5 XP (mínimo 10). */

MINIJOGOS.ordenar = (jogo, area, terminar) => {
  let proximo = 0;
  let erros = 0;

  const montada = criar("ol", "rev-montada");
  const monte = criar("div", "rev-monte");
  const aviso = criar("p", "rev-exp");
  aviso.setAttribute("aria-live", "polite");
  area.append(montada, monte, aviso);

  embaralhar(jogo.itens.map((texto, k) => ({ texto, k }))).forEach(({ texto, k }) => {
    const b = botao(texto, "rev-peca");
    b.addEventListener("click", async () => {
      if (k === proximo) {
        montada.appendChild(criar("li", "", texto));
        b.remove();
        proximo++;
        aviso.textContent = "";
        if (proximo === jogo.itens.length) {
          const xp = Math.max(10, 30 - erros * 5);
          terminar(xp, erros === 0 ? "Ordem perfeita, sem nenhum erro!" : `Ordem montada com ${erros} ${erros === 1 ? "erro" : "erros"}.`);
        }
      } else {
        erros++;
        aviso.textContent = `Ainda não é a vez de "${texto}". Qual vem antes?`;
        aviso.className = "rev-exp no";
        b.classList.add("errado");
        await esperar(500);
        b.classList.remove("errado");
      }
    });
    monte.appendChild(b);
  });
};


/* 7. Minijogo: memória ----------------------------------------- */
/* Vire duas cartas: se forem par, ficam abertas. Cada jogada a mais
   que o número de pares tira 2 XP (mínimo 10). */

MINIJOGOS.memoria = (jogo, area, terminar) => {
  const cartas = embaralhar(jogo.pares.flatMap(([a, b], par) => [{ texto: a, par }, { texto: b, par }]));
  let abertas = [];   // cartas viradas nesta jogada (até 2)
  let jogadas = 0;
  let achados = 0;
  let travado = false; // enquanto mostra um par errado

  const placar = criar("p", "rev-contador", "Jogadas: 0");
  const mesa = criar("div", "rev-mesa");
  area.append(placar, mesa);

  const virar = (b, carta, aberta) => {
    b.textContent = aberta ? carta.texto : "?";
    b.classList.toggle("aberta", aberta);
    b.setAttribute("aria-label", aberta ? carta.texto : "Carta virada para baixo");
  };

  cartas.forEach((carta) => {
    const b = botao("?", "rev-carta");
    virar(b, carta, false);
    b.addEventListener("click", async () => {
      if (travado || b.classList.contains("aberta")) return;
      virar(b, carta, true);
      abertas.push({ b, carta });
      if (abertas.length < 2) return;

      jogadas++;
      placar.textContent = `Jogadas: ${jogadas} · Pares: ${achados} de ${jogo.pares.length}`;
      const [primeira, segunda] = abertas;
      abertas = [];

      if (primeira.carta.par === segunda.carta.par) {
        achados++;
        primeira.b.classList.add("par");
        segunda.b.classList.add("par");
        primeira.b.disabled = true;
        segunda.b.disabled = true;
        placar.textContent = `Jogadas: ${jogadas} · Pares: ${achados} de ${jogo.pares.length}`;
        if (achados === jogo.pares.length) {
          const sobra = jogadas - jogo.pares.length;
          const xp = Math.max(10, 40 - sobra * 2);
          const extras = sobra <= 2 ? ["Memória de elefante"] : [];
          terminar(xp, `Todos os pares em ${jogadas} jogadas (o mínimo é ${jogo.pares.length}).`, extras);
        }
      } else {
        travado = true;
        primeira.b.classList.add("errado");
        segunda.b.classList.add("errado");
        await esperar(1000);
        primeira.b.classList.remove("errado");
        segunda.b.classList.remove("errado");
        virar(primeira.b, primeira.carta, false);
        virar(segunda.b, segunda.carta, false);
        travado = false;
      }
    });
    mesa.appendChild(b);
  });
};


/* 8. Minijogo: classificar ------------------------------------- */
/* Um item por vez, em rajada: clique no grupo certo. 5 XP por acerto. */

MINIJOGOS.classificar = (jogo, area, terminar) => {
  const itens = embaralhar(jogo.itens);
  let i = 0;
  let acertos = 0;
  let seguidas = 0;

  const contador = criar("p", "rev-contador");
  const item = criar("p", "rev-item");
  const grupos = criar("div", "rev-grupos");
  const aviso = criar("p", "rev-exp");
  aviso.setAttribute("aria-live", "polite");
  area.append(contador, item, grupos, aviso);

  const mostrar = () => {
    const [texto] = itens[i];
    contador.textContent = `Item ${i + 1} de ${itens.length}` + (seguidas >= 3 ? ` · ${seguidas} seguidas!` : "");
    item.textContent = texto;
    grupos.querySelectorAll("button").forEach((b) => {
      b.disabled = false;
      b.className = "rev-grupo";
    });
  };

  jogo.grupos.forEach((grupo) => {
    const b = botao(grupo, "rev-grupo");
    b.addEventListener("click", async () => {
      const [texto, certo] = itens[i];
      grupos.querySelectorAll("button").forEach((outro) => (outro.disabled = true));
      if (grupo === certo) {
        acertos++;
        seguidas++;
        b.classList.add("certo");
        aviso.textContent = "Certo!";
        aviso.className = "rev-exp ok";
        await esperar(650);
      } else {
        seguidas = 0;
        b.classList.add("errado");
        [...grupos.children].find((outro) => outro.textContent === certo).classList.add("certo");
        aviso.textContent = `${texto}: ${certo}.`;
        aviso.className = "rev-exp no";
        await esperar(1800);
      }
      i++;
      if (i < itens.length) {
        aviso.textContent = "";
        mostrar();
      } else {
        area.innerHTML = "";
        terminar(acertos * 5, `Você classificou ${acertos} de ${itens.length} certo.`);
      }
    });
    grupos.appendChild(b);
  });

  mostrar();
};


/* 9. Minijogo: bits -------------------------------------------- */
/* Ligue os bits até a soma dar o número pedido. 10 XP por número. */

MINIJOGOS.bits = (jogo, area, terminar) => {
  const PESOS = [128, 64, 32, 16, 8, 4, 2, 1];
  const alvos = embaralhar(jogo.alvos).slice(0, jogo.rodada);
  let i = 0;
  let feitos = 0;
  let ligados = [0, 0, 0, 0, 0, 0, 0, 0];

  const contador = criar("p", "rev-contador");
  const alvo = criar("p", "rev-item");
  const linha = criar("div", "rev-bits");
  const soma = criar("p", "rev-soma");
  soma.setAttribute("aria-live", "polite");
  const pular = botao("Pular este número", "sec");
  area.append(contador, alvo, linha, soma, pular);

  const atualizar = () => {
    const total = ligados.reduce((s, bit, p) => s + bit * PESOS[p], 0);
    const partes = PESOS.filter((_, p) => ligados[p]);
    soma.textContent = `${ligados.join("")} = ${partes.length ? partes.join(" + ") + " = " : ""}${total}`;
    return total;
  };

  const mostrar = () => {
    ligados = [0, 0, 0, 0, 0, 0, 0, 0];
    contador.textContent = `Número ${i + 1} de ${alvos.length}`;
    alvo.textContent = "Forme o " + alvos[i];
    linha.querySelectorAll("button").forEach((b) => {
      b.classList.remove("ligado", "certo");
      b.disabled = false;
      b.querySelector(".rev-bit").textContent = "0";
      b.setAttribute("aria-pressed", "false");
    });
    atualizar();
  };

  const seguir = async (acertou) => {
    if (acertou) feitos++;
    i++;
    if (i < alvos.length) mostrar();
    else {
      area.innerHTML = "";
      const extras = feitos === alvos.length ? ["Mestre dos bits"] : [];
      terminar(feitos * 10, `Você formou ${feitos} de ${alvos.length} números.`, extras);
    }
  };

  PESOS.forEach((peso, p) => {
    const b = botao("", "rev-bit-botao");
    b.append(criar("span", "rev-bit", "0"), criar("span", "rev-peso", String(peso)));
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-label", "Bit de peso " + peso);
    b.addEventListener("click", async () => {
      ligados[p] = ligados[p] ? 0 : 1;
      b.classList.toggle("ligado", Boolean(ligados[p]));
      b.querySelector(".rev-bit").textContent = String(ligados[p]);
      b.setAttribute("aria-pressed", String(Boolean(ligados[p])));
      if (atualizar() === alvos[i]) {
        linha.querySelectorAll("button").forEach((outro) => {
          outro.disabled = true;
          outro.classList.add("certo");
        });
        soma.textContent += " · Certo! +10 XP";
        await esperar(900);
        seguir(true);
      }
    });
    linha.appendChild(b);
  });

  pular.addEventListener("click", () => seguir(false));
  mostrar();
};


/* 10. Minijogo: digitar ---------------------------------------- */
/* Escreva a resposta e confira. 10 XP por acerto. */

MINIJOGOS.digitar = (jogo, area, terminar) => {
  let i = 0;
  let acertos = 0;

  const mostrar = () => {
    const q = jogo.perguntas[i];
    area.innerHTML = "";
    area.appendChild(criar("p", "rev-contador", `${i + 1} de ${jogo.perguntas.length}`));
    if (q.p) area.appendChild(criar("p", "rev-pergunta", q.p));
    area.appendChild(criar("p", "rev-dado", q.dado));

    const form = criar("form", "rev-digitar");
    const campo = criar("input");
    campo.autocomplete = "off";
    campo.spellcheck = false;
    campo.setAttribute("aria-label", "Sua resposta");
    const conferir = botao("Conferir");
    conferir.type = "submit";
    form.append(campo, conferir);

    const explicacao = criar("p", "rev-exp");
    explicacao.setAttribute("aria-live", "polite");
    area.append(form, explicacao);
    focar(campo);

    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const resposta = campo.value.trim().toLowerCase().replace(/\s+/g, "");
      if (!resposta) return;
      const certo = q.respostas.includes(resposta);
      if (certo) acertos++;
      campo.disabled = true;
      conferir.remove();
      campo.classList.add(certo ? "certo" : "errado");
      explicacao.textContent = (certo ? "Isso! " : `A forma mais curta é ${q.respostas[0]}. `) + q.exp;
      explicacao.className = "rev-exp " + (certo ? "ok" : "no");

      const seguir = botao(i < jogo.perguntas.length - 1 ? "Próximo" : "Ver o resultado");
      seguir.addEventListener("click", () => {
        i++;
        if (i < jogo.perguntas.length) mostrar();
        else {
          area.innerHTML = "";
          terminar(acertos * 10, `Você acertou ${acertos} de ${jogo.perguntas.length}.`);
        }
      });
      area.appendChild(seguir);
      focar(seguir);
    });
  };

  mostrar();
};


/* 11. Minijogo: terminal do IOS -------------------------------- */
/* Cada missão pede um comando. Palavras do IOS aceitam abreviação, como
   no equipamento de verdade (conf t, no shut). Sem erro: 5 XP; com erro: 2 XP.
   Depois de 2 erros aparece uma dica; depois de 3, o comando inteiro. */

// "int vlan1" -> "int vlan 1"; "g 0/0/0" -> "g0/0/0"
function prepararComando(texto) {
  return texto
    .trim()
    .toLowerCase()
    .replace(/\bvlan(\d)/, "vlan $1")
    .replace(/\b(g|gi|gig|gigabitethernet)\s+(\d)/, "$1$2")
    .split(/\s+/);
}

// O aluno digitou o comando esperado?
function comandoConfere(digitado, esperado) {
  const palavras = prepararComando(digitado);
  const modelo = esperado.toLowerCase().split(" ");
  if (palavras.length !== modelo.length) return false;

  return modelo.every((parte, p) => {
    const palavra = palavras[p];
    // valor (=): tem de ser igual; nomes de interface aceitam g, gi, gig ou gigabitethernet
    if (parte.startsWith("=")) {
      const valor = parte.slice(1);
      if (/^g\d/.test(valor)) return palavra.replace(/^(gigabitethernet|gig|gi)/, "g") === valor;
      return palavra === valor;
    }
    // palavra do IOS: pode ser abreviada (a primeira com pelo menos 2 letras)
    const minimo = p === 0 ? Math.min(2, parte.length) : 1;
    return palavra.length >= minimo && parte.startsWith(palavra);
  });
}

// Como o comando aparece na tela (sem os =)
const comandoLimpo = (cmd) => cmd.replace(/=/g, "");

MINIJOGOS.terminal = (jogo, area, terminar) => {
  let i = 0;
  let xp = 0;
  let errosNoPasso = 0;
  let semErro = true;

  const missao = criar("p", "rev-missao");
  missao.setAttribute("aria-live", "polite");
  const tela = criar("div", "rev-terminal");
  const historico = criar("div", "rev-historico");
  const form = criar("form", "rev-linha");
  const prompt = criar("label", "rev-prompt");
  const campo = criar("input");
  campo.autocomplete = "off";
  campo.spellcheck = false;
  campo.autocapitalize = "off";
  prompt.htmlFor = campo.id = "terminal-" + Math.random().toString(36).slice(2, 8);
  form.append(prompt, campo);
  tela.append(historico, form);
  const dica = criar("p", "rev-exp");
  dica.setAttribute("aria-live", "polite");
  area.append(missao, tela, dica);

  const linha = (texto, classe) => {
    historico.appendChild(criar("div", classe || "", texto));
    tela.scrollTop = tela.scrollHeight;
  };

  const mostrar = () => {
    const passo = jogo.passos[i];
    missao.textContent = `Missão ${i + 1} de ${jogo.passos.length}: ${passo.missao}`;
    prompt.textContent = passo.prompt;
    campo.value = "";
    errosNoPasso = 0;
    dica.textContent = "";
    focar(campo);
  };

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const passo = jogo.passos[i];
    const digitado = campo.value.trim();
    if (!digitado) return;

    const aceitos = Array.isArray(passo.cmd) ? passo.cmd : [passo.cmd];
    linha(passo.prompt + digitado);

    if (aceitos.some((cmd) => comandoConfere(digitado, cmd))) {
      xp += errosNoPasso === 0 ? 5 : 2;
      i++;
      if (i < jogo.passos.length) {
        mostrar();
      } else {
        form.remove();
        missao.textContent = "Todas as missões cumpridas!";
        dica.textContent = "";
        const extras = semErro ? ["Dedo no terminal"] : [];
        terminar(xp, semErro ? "Configuração completa sem nenhum erro." : "Configuração completa. Treine de novo até sair sem erro.", extras);
      }
      return;
    }

    errosNoPasso++;
    semErro = false;
    campo.value = "";
    linha("% Esse não é o comando desta missão. Tente de novo.", "rev-erro");
    const comando = comandoLimpo(aceitos[0]);
    if (errosNoPasso === 2) {
      dica.textContent = `Dica: o comando começa com "${comando.split(" ")[0]}".`;
    } else if (errosNoPasso >= 3) {
      dica.textContent = `O comando é: ${comando}. Digite para seguir.`;
    }
    dica.className = "rev-exp no";
  });

  // Clicar na tela preta leva o cursor para a linha de comando
  tela.addEventListener("click", () => campo.focus());

  mostrar();
};


/* 12. Início --------------------------------------------------- */

montarEstacoes();
atualizarPainel();
montando = false;

if (window.CONTA) {
  CONTA.aoMudar((usuario) => {
    if (usuario) sincronizarComConta();
  });
}

// Abre a estação do endereço (#estacao-3, por exemplo)
const pedida = location.hash && document.querySelector(location.hash);
if (pedida && pedida.tagName === "DETAILS") pedida.open = true;

$("#revZerar").addEventListener("click", () => {
  if (!confirm("Apagar todo o seu XP, estrelas e insígnias da trilha neste navegador?")) return;
  try {
    localStorage.removeItem(CHAVE);
  } catch (erro) {}
  location.reload();
});
