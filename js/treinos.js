/* ==============================================================
   Funções da página de treinos (treinos.html)
   Usa as constantes de js/questoes.js, que é carregado antes deste arquivo.

   Índice
   1. Utilidades
   2. Simulado: configuração
   3. Simulado: mostrar a questão
   4. Simulado: responder e corrigir
   5. Simulado: cronômetro (modo prova)
   6. Simulado: resultado
   7. Simulado: imagem do resultado
   8. Sub-redes: cálculo e passo a passo
   9. Treino livre de sub-redes
   10. Maratona de sub-redes
   ============================================================== */


/* 1. Utilidades ------------------------------------------------ */

// Atalho para document.querySelector
const $ = (seletor) => document.querySelector(seletor);

// Devolve uma cópia da lista em ordem aleatória (algoritmo de Fisher-Yates)
const embaralhar = (lista) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

// [0, 1, 2, ..., n - 1]
const indices = (n) => Array.from({ length: n }, (_, i) => i);

// Cria um elemento com classe e texto (textContent evita injetar HTML)
const criar = (tag, classe, texto) => {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
};

// 125 -> "02:05"
const formatarTempo = (segundos) => {
  const m = String(Math.floor(segundos / 60)).padStart(2, "0");
  const s = String(segundos % 60).padStart(2, "0");
  return m + ":" + s;
};


/* 2. Simulado: configuração ------------------------------------ */

const SEGUNDOS_POR_QUESTAO = 75; // a prova real dá cerca de 1 minuto por questão
const META = 80;                 // porcentagem sugerida para considerar "pronto"

// Estado da rodada atual
const sim = {
  nome: "",         // nome completo do aluno
  curso: "",        // curso escolhido ("todos", "ITN"...)
  modo: "estudo",   // "estudo" ou "prova"
  rodada: [],       // questões sorteadas, cada uma com a ordem das opções
  respostas: [],    // { resposta, certo } na mesma posição da rodada
  i: 0,             // índice da questão atual
  fimEm: 0,         // horário (ms) em que o tempo acaba, no modo prova
  relogio: null,    // id do setInterval do cronômetro
};

const telaConfig = $("#simConfig");
const telaQuestao = $("#simQuestao");
const telaResultado = $("#simResultado");
const campoNome = $("#simNome");
const erroNome = $("#simNomeErro");
const CHAVE_NOME = "ccna-nome";

// Preenche o nome usado da última vez (fica salvo só neste navegador)
try {
  campoNome.value = localStorage.getItem(CHAVE_NOME) || "";
  // logado e sem nome salvo? usa o nome da conta
  if (window.CONTA) {
    CONTA.aoMudar((usuario) => {
      if (usuario && !campoNome.value && usuario.user_metadata && usuario.user_metadata.nome) {
        campoNome.value = usuario.user_metadata.nome;
      }
    });
  }
} catch (erro) {}

// "  maria   da silva " -> "maria da silva"
const limparNome = (texto) => texto.trim().replace(/\s+/g, " ");

// Nome completo = pelo menos duas palavras, cada uma com 2 letras ou mais
const nomeCompleto = (nome) => {
  const partes = nome.split(" ");
  return partes.length >= 2 && partes.every((parte) => parte.length >= 2);
};

const primeiroNome = (nome) => nome.split(" ")[0];

// Preenche a lista de cursos com a quantidade de questões de cada um
(function montarCursos() {
  const select = $("#simCurso");
  const cursos = [...new Set(QUESTOES.map((q) => q.curso))];

  const opcao = (valor, texto) => {
    const op = criar("option", "", texto);
    op.value = valor;
    select.appendChild(op);
  };

  if (cursos.length > 1) {
    opcao("todos", `Todos os cursos (${QUESTOES.length} questões)`);
  }
  cursos.forEach((curso) => {
    const total = QUESTOES.filter((q) => q.curso === curso).length;
    opcao(curso, `${curso} (${total} questões)`);
  });
})();

telaConfig.addEventListener("submit", (ev) => {
  ev.preventDefault();

  // O simulado só começa com o nome completo
  const nome = limparNome(campoNome.value);
  if (!nomeCompleto(nome)) {
    erroNome.textContent = "Digite seu nome completo, com nome e sobrenome, para começar.";
    campoNome.setAttribute("aria-invalid", "true");
    campoNome.focus();
    return;
  }
  erroNome.textContent = "";
  campoNome.removeAttribute("aria-invalid");
  campoNome.value = nome;
  try {
    localStorage.setItem(CHAVE_NOME, nome);
  } catch (erro) {}

  sim.nome = nome;
  sim.curso = $("#simCurso").value;
  sim.modo = telaConfig.elements.modo.value;

  const escolhidas = QUESTOES.filter((q) => sim.curso === "todos" || q.curso === sim.curso);

  const qtd = $("#simQtd").value;
  const quantidade = qtd === "todas" ? escolhidas.length : Math.min(Number(qtd), escolhidas.length);

  // Sorteia as questões, dando prioridade às que não caíram na tentativa anterior
  const anteriores = new Set(sim.rodada.map((item) => item.q.id));
  const ineditas = embaralhar(escolhidas.filter((q) => !anteriores.has(q.id)));
  const repetidas = embaralhar(escolhidas.filter((q) => anteriores.has(q.id)));
  const selecionadas = [...ineditas, ...repetidas].slice(0, quantidade);

  // Embaralha a ordem. Se a nova tentativa começar pela mesma questão
  // da anterior, embaralha de novo, para cada tentativa parecer nova.
  const primeiraAnterior = sim.rodada.length ? sim.rodada[0].q.id : null;
  let sorteadas = embaralhar(selecionadas);
  while (sorteadas.length > 1 && sorteadas[0].id === primeiraAnterior) {
    sorteadas = embaralhar(selecionadas);
  }

  // Cada questão guarda a ordem embaralhada das opções (ou dos pares)
  sim.rodada = sorteadas.map((q) => ({
    q,
    ordem: embaralhar(indices(q.tipo === "associar" ? q.pares.length : q.opcoes.length)),
  }));
  sim.respostas = [];
  sim.i = 0;

  telaConfig.hidden = true;
  telaResultado.hidden = true;
  telaQuestao.hidden = false;

  $("#simTempo").hidden = sim.modo !== "prova";
  $("#simPlacar").hidden = sim.modo === "prova";
  if (sim.modo === "prova") iniciarCronometro();

  mostrarQuestao();
});


/* 3. Simulado: mostrar a questão ------------------------------- */

const caixaOpcoes = $("#simOpcoes");
const feedback = $("#simFeedback");
const botaoConfirmar = $("#simConfirmar");
const botaoProxima = $("#simProxima");

function atualizarPlacar() {
  const respondidas = sim.respostas.filter(Boolean).length;
  const acertos = sim.respostas.filter((r) => r && r.certo).length;
  $("#simPlacar").textContent = `Acertos: ${acertos} de ${respondidas}`;
}

function mostrarQuestao() {
  const { q, ordem } = sim.rodada[sim.i];
  const total = sim.rodada.length;

  $("#simPos").textContent = `Questão ${sim.i + 1} de ${total}`;
  $("#simTopico").textContent = q.topico;
  $("#simProgresso").style.width = (sim.i / total) * 100 + "%";
  atualizarPlacar();

  const enunciado = $("#simEnunciado");
  enunciado.textContent = q.enunciado;

  const exibicao = $("#simExibicao");
  exibicao.textContent = q.exibicao || "";
  exibicao.hidden = !q.exibicao;

  // Arquivo do Packet Tracer, quando a questão tiver um
  const pkt = $("#simPkt");
  pkt.innerHTML = "";
  pkt.hidden = !q.pkt;
  if (q.pkt) {
    const link = criar("a", "", "Baixar o arquivo do Packet Tracer");
    link.href = q.pkt;
    link.download = "";
    pkt.append("Abra a atividade no Packet Tracer para responder: ", link);
  }

  const instrucoes = {
    unica: "Escolha uma opção.",
    multipla: `Escolha ${q.certas?.length} opções.`,
    associar: "Escolha o destino certo para cada item.",
  };
  $("#simInstrucao").textContent = instrucoes[q.tipo];

  // Opções
  caixaOpcoes.innerHTML = "";

  if (q.tipo === "associar") {
    ordem.forEach((p) => {
      const [item] = q.pares[p];
      const linha = criar("label", "sim-par");
      const select = criar("select");
      select.dataset.par = p; // índice original do par, para corrigir depois

      const vazia = criar("option", "", "Escolha…");
      vazia.value = "";
      select.appendChild(vazia);

      q.alvos.forEach((alvo) => {
        const op = criar("option", "", alvo);
        op.value = alvo;
        select.appendChild(op);
      });

      linha.append(criar("span", "", item), select);
      caixaOpcoes.appendChild(linha);
    });
  } else {
    const tipoInput = q.tipo === "unica" ? "radio" : "checkbox";
    ordem.forEach((k) => {
      const linha = criar("label", "sim-opcao");
      const input = criar("input");
      input.type = tipoInput;
      input.name = "opcao";
      input.value = k; // índice original, para corrigir depois
      linha.append(input, criar("span", "", q.opcoes[k]));
      caixaOpcoes.appendChild(linha);
    });
  }

  feedback.textContent = "";
  feedback.className = "sim-feedback";
  botaoConfirmar.hidden = false;
  botaoProxima.hidden = true;

  // Leva o foco do teclado (e do leitor de tela) para a nova questão
  enunciado.tabIndex = -1;
  enunciado.focus({ preventScroll: true });
  telaQuestao.scrollIntoView({ block: "start" });
}


/* 4. Simulado: responder e corrigir ---------------------------- */

// Lê o que o aluno marcou. Devolve null e avisa se estiver incompleto.
function lerResposta(q) {
  if (q.tipo === "associar") {
    const resposta = [];
    caixaOpcoes.querySelectorAll("select").forEach((s) => {
      resposta[Number(s.dataset.par)] = s.value;
    });
    if (resposta.some((valor) => valor === "")) {
      return avisar("Escolha um destino para todos os itens.");
    }
    return resposta;
  }

  const marcadas = [...caixaOpcoes.querySelectorAll("input:checked")].map((i) => Number(i.value));
  const precisa = q.tipo === "unica" ? 1 : q.certas.length;
  if (marcadas.length !== precisa) {
    return avisar(precisa === 1 ? "Escolha uma opção." : `Marque exatamente ${precisa} opções.`);
  }
  return marcadas;
}

function avisar(texto) {
  feedback.textContent = texto;
  feedback.className = "sim-feedback aviso";
  return null;
}

function estaCerta(q, resposta) {
  if (q.tipo === "associar") {
    return q.pares.every(([, alvo], p) => resposta[p] === alvo);
  }
  const ordenar = (lista) => [...lista].sort().join(",");
  return ordenar(resposta) === ordenar(q.certas);
}

// Pinta de verde o que é certo e de vermelho o que o aluno errou
function mostrarCorrecao(q, resposta) {
  if (q.tipo === "associar") {
    caixaOpcoes.querySelectorAll("select").forEach((s) => {
      const certo = q.pares[s.dataset.par][1];
      const acertou = s.value === certo;
      s.parentElement.classList.add(acertou ? "certo" : "errado");
      if (!acertou) s.parentElement.appendChild(criar("small", "", "Certo: " + certo));
    });
    return;
  }

  caixaOpcoes.querySelectorAll("input").forEach((input) => {
    const k = Number(input.value);
    const linha = input.parentElement;
    if (q.certas.includes(k)) linha.classList.add("certo");
    else if (resposta.includes(k)) linha.classList.add("errado");
  });
}

document.querySelector("#simForm").addEventListener("submit", (ev) => {
  ev.preventDefault();

  const { q } = sim.rodada[sim.i];
  const resposta = lerResposta(q);
  if (!resposta) return;

  const certo = estaCerta(q, resposta);
  sim.respostas[sim.i] = { resposta, certo };
  caixaOpcoes.querySelectorAll("input, select").forEach((el) => (el.disabled = true));

  // Modo prova: sem feedback, segue direto
  if (sim.modo === "prova") {
    avancar();
    return;
  }

  // Modo estudo: feedback na hora
  mostrarCorrecao(q, resposta);
  atualizarPlacar();
  feedback.className = "sim-feedback " + (certo ? "ok" : "no");
  feedback.innerHTML = "";
  feedback.append(criar("strong", "", certo ? "Correto. " : "Incorreto. "), q.explicacao);

  botaoConfirmar.hidden = true;
  botaoProxima.hidden = false;
  botaoProxima.textContent = sim.i < sim.rodada.length - 1 ? "Próxima questão" : "Ver resultado";
  botaoProxima.focus();
});

function avancar() {
  sim.i++;
  if (sim.i < sim.rodada.length) mostrarQuestao();
  else finalizar();
}

botaoProxima.addEventListener("click", avancar);
$("#simEncerrar").addEventListener("click", () => finalizar("Você encerrou o simulado antes do fim."));


/* 5. Simulado: cronômetro (modo prova) ------------------------- */

function iniciarCronometro() {
  // Guarda o horário final em vez de contar segundos: assim o relógio
  // não atrasa se o navegador pausar a aba
  sim.fimEm = Date.now() + sim.rodada.length * SEGUNDOS_POR_QUESTAO * 1000;

  const tick = () => {
    const restante = Math.max(0, Math.round((sim.fimEm - Date.now()) / 1000));
    const tempo = $("#simTempo");
    tempo.textContent = "Tempo: " + formatarTempo(restante);
    tempo.classList.toggle("alerta", restante <= 60);
    if (restante === 0) finalizar("O tempo acabou.");
  };

  tick();
  sim.relogio = setInterval(tick, 1000);
}

function pararCronometro() {
  clearInterval(sim.relogio);
  sim.relogio = null;
}


/* 6. Simulado: resultado --------------------------------------- */

// Texto da resposta do aluno (ou da resposta certa)
function textoResposta(q, resposta) {
  if (q.tipo === "associar") {
    return q.pares.map(([item], p) => `${item} → ${resposta[p]}`).join("; ");
  }
  return resposta.map((k) => q.opcoes[k]).join("; ");
}

const respostaCerta = (q) =>
  q.tipo === "associar" ? q.pares.map(([, alvo]) => alvo) : q.certas;

// [{ topico, certos, total }] só dos tópicos que caíram nesta rodada
function desempenhoPorTopico() {
  return TOPICOS
    .map((topico) => {
      const indicesDoTopico = sim.rodada
        .map((item, i) => (item.q.topico === topico ? i : -1))
        .filter((i) => i !== -1);
      const certos = indicesDoTopico.filter((i) => sim.respostas[i] && sim.respostas[i].certo).length;
      return { topico, certos, total: indicesDoTopico.length };
    })
    .filter((t) => t.total > 0);
}

// Mensagem de acordo com a pontuação, com o ponto forte e o que revisar
function mensagemPersonalizada(pct, desempenho) {
  const nome = primeiroNome(sim.nome);
  let texto;

  if (pct >= 90) {
    texto = `Excelente, ${nome}! Você está com o conteúdo afiado. Tente o modo prova para treinar o ritmo da certificação.`;
  } else if (pct >= META) {
    texto = `Muito bem, ${nome}! Você atingiu a meta. Revise as questões que errou para chegar à prova com ainda mais segurança.`;
  } else if (pct >= 60) {
    texto = `Você está no caminho, ${nome}. Falta pouco para a meta: revise as explicações das questões que errou e refaça o simulado.`;
  } else {
    texto = `${nome}, este é um bom ponto de partida. Reveja os vídeos e os módulos da NetAcad dos tópicos mais fracos e tente de novo no modo estudo.`;
  }

  // Ponto forte e ponto a revisar, quando há mais de um tópico para comparar
  if (desempenho.length > 1) {
    const taxa = (t) => t.certos / t.total;
    const ordenados = [...desempenho].sort((a, b) => taxa(b) - taxa(a));
    const forte = ordenados[0];
    const fraco = ordenados[ordenados.length - 1];
    if (taxa(forte) > taxa(fraco)) {
      texto += ` Seu ponto mais forte foi ${forte.topico} (${forte.certos} de ${forte.total}).`;
      texto += ` Comece a revisão por ${fraco.topico} (${fraco.certos} de ${fraco.total}).`;
    }
  }

  return texto;
}

function finalizar(motivo) {
  pararCronometro();
  telaQuestao.hidden = true;
  telaResultado.hidden = false;

  const total = sim.rodada.length;
  const acertos = sim.respostas.filter((r) => r && r.certo).length;
  const pct = Math.round((acertos / total) * 100);

  const desempenho = desempenhoPorTopico();

  // Cabeçalho: quem fez, o quê e quando (bom para print ou para mostrar à professora)
  const curso = sim.curso === "todos" ? "todos os cursos" : sim.curso;
  const modo = sim.modo === "prova" ? "modo prova" : "modo estudo";
  const data = new Date().toLocaleDateString("pt-BR");
  $("#simAluno").textContent = `${sim.nome} · ${curso} · ${modo} · ${data}`;

  const mensagem = mensagemPersonalizada(pct, desempenho);
  $("#simNota").textContent = `${primeiroNome(sim.nome)}, você acertou ${acertos} de ${total} (${pct}%)`;
  $("#simMensagem").textContent = mensagem;

  let tempo = "";
  if (sim.modo === "prova") {
    const usado = Math.round(total * SEGUNDOS_POR_QUESTAO - Math.max(0, (sim.fimEm - Date.now()) / 1000));
    tempo = `Tempo usado: ${formatarTempo(usado)} de ${formatarTempo(total * SEGUNDOS_POR_QUESTAO)}`;
  }

  let resumo = `Meta sugerida: ${META}%.`;
  if (motivo) resumo = motivo + " " + resumo;
  if (tempo) resumo += ` ${tempo}.`;
  $("#simResumo").textContent = resumo;

  // Guarda o resultado para gerar a imagem (seção 7)
  sim.resultado = { curso, modo, data, acertos, total, pct, mensagem, tempo, desempenho };

  // Logado (conta.js)? A nota também vai para a nuvem, para a professora acompanhar
  if (window.CONTA && CONTA.usuario()) {
    CONTA.salvarTreino(sim.curso, sim.modo, acertos, total).then((ok) => {
      if (ok) $("#simResumo").textContent += " Nota guardada na sua conta.";
    });
  }

  // Desempenho por tópico, na ordem oficial do exame
  const caixaTopicos = $("#simTopicos");
  caixaTopicos.innerHTML = "";

  desempenho.forEach(({ topico, certos, total: totalTopico }) => {
    const linha = criar("div", "sim-topico");
    const barra = criar("div", "medidor");
    const preenchido = criar("i");
    preenchido.style.width = (certos / totalTopico) * 100 + "%";
    barra.appendChild(preenchido);
    linha.append(criar("span", "", topico), criar("span", "pct", `${certos} de ${totalTopico}`), barra);
    caixaTopicos.appendChild(linha);
  });

  // Revisão: todas as questões, com a resposta dada, a certa e a explicação
  const revisao = $("#simRevisao");
  revisao.innerHTML = "";

  sim.rodada.forEach(({ q }, i) => {
    const r = sim.respostas[i];
    const situacao = !r ? "sem-resposta" : r.certo ? "certo" : "errado";
    const rotulo = { certo: "Certo", errado: "Errado", "sem-resposta": "Sem resposta" }[situacao];

    const li = criar("li", situacao);
    li.append(
      criar("span", "sim-status", rotulo),
      criar("p", "sim-rev-enunciado", q.enunciado),
    );
    if (r && !r.certo) li.appendChild(criar("p", "", "Sua resposta: " + textoResposta(q, r.resposta)));
    li.append(
      criar("p", "", "Resposta certa: " + textoResposta(q, respostaCerta(q))),
      criar("p", "placar", q.explicacao),
    );
    revisao.appendChild(li);
  });

  $("#simImagemMsg").textContent = "";
  telaResultado.scrollIntoView({ block: "start" });
}

$("#simDeNovo").addEventListener("click", () => {
  telaResultado.hidden = true;
  telaConfig.hidden = false;
  telaConfig.scrollIntoView({ block: "start" });
});


/* 7. Simulado: imagem do resultado ----------------------------- */
/* Desenha o resultado em um <canvas> e salva como PNG, para o aluno
   enviar à professora. Usa só a Canvas API, sem biblioteca externa. */

const LARGURA_IMAGEM = 1080;
const MARGEM = 80;

// Lê as cores direto dos tokens do CSS (uma única fonte da verdade)
const cor = (token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim();

// Quebra o texto em linhas que caibam na largura e devolve a lista de linhas
function quebrarTexto(ctx, texto, largura) {
  const linhas = [];
  let linha = "";
  texto.split(" ").forEach((palavra) => {
    const teste = linha ? linha + " " + palavra : palavra;
    if (ctx.measureText(teste).width > largura && linha) {
      linhas.push(linha);
      linha = palavra;
    } else {
      linha = teste;
    }
  });
  if (linha) linhas.push(linha);
  return linhas;
}

// Retângulo com dois cantos cortados, como a classe .corte do site
function caminhoCorte(ctx, x, y, w, h, corte) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - corte, y);
  ctx.lineTo(x + w, y + corte);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + corte, y + h);
  ctx.lineTo(x, y + h - corte);
  ctx.closePath();
}

async function desenharResultado() {
  const r = sim.resultado;
  const largura = LARGURA_IMAGEM - MARGEM * 2;

  // Espera as fontes do Google Fonts para o canvas usar as mesmas do site
  try {
    await Promise.all([
      document.fonts.load('700 64px "Chakra Petch"'),
      document.fonts.load('400 32px "IBM Plex Sans"'),
      document.fonts.load('600 32px "IBM Plex Sans"'),
      document.fonts.load('400 30px "Share Tech Mono"'),
    ]);
  } catch (erro) {
    // Sem as fontes (offline, por exemplo), o canvas usa as fontes do sistema
  }

  // Camada 1: o conteúdo, em uma tela transparente e alta.
  // Só no fim sabemos a altura usada, para desenhar o painel e recortar.
  const rascunho = document.createElement("canvas");
  rascunho.width = LARGURA_IMAGEM;
  rascunho.height = 3000;
  const ctx = rascunho.getContext("2d");

  let y = MARGEM;
  ctx.textBaseline = "top";

  // Marca e título
  ctx.font = '700 34px "Chakra Petch", sans-serif';
  ctx.fillStyle = cor("--srwe");
  ctx.fillText(">_ CCNA", MARGEM, y);
  ctx.textAlign = "right";
  ctx.font = '400 28px "Share Tech Mono", monospace';
  ctx.fillStyle = cor("--suave");
  ctx.fillText("Resultado do simulado", LARGURA_IMAGEM - MARGEM, y + 4);
  ctx.textAlign = "left";
  y += 70;

  // Três "cabos" coloridos, como no site
  const cabo = (largura - 16) / 3;
  ["--itn", "--srwe", "--ensa"].forEach((token, i) => {
    ctx.fillStyle = cor(token);
    ctx.shadowColor = cor(token);
    ctx.shadowBlur = 14;
    ctx.fillRect(MARGEM + i * (cabo + 8), y, cabo, 6);
  });
  ctx.shadowBlur = 0;
  y += 60;

  // Painel com os dados do aluno
  const topoPainel = y;
  y += 50;
  const dentro = MARGEM + 50;
  const larguraDentro = largura - 100;

  ctx.font = '600 48px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = cor("--tinta");
  quebrarTexto(ctx, sim.nome, larguraDentro).forEach((linha) => {
    ctx.fillText(linha, dentro, y);
    y += 60;
  });

  ctx.font = '400 30px "Share Tech Mono", monospace';
  ctx.fillStyle = cor("--suave");
  ctx.fillText(`${r.curso} · ${r.modo} · ${r.data}`, dentro, y + 6);
  y += 80;

  // Porcentagem grande, com a cor da faixa
  const corNota = r.pct >= META ? cor("--ok") : r.pct >= 60 ? cor("--srwe") : cor("--erro");
  ctx.font = '700 180px "Chakra Petch", sans-serif';
  ctx.fillStyle = corNota;
  ctx.shadowColor = corNota;
  ctx.shadowBlur = 30;
  ctx.fillText(r.pct + "%", dentro, y);
  ctx.shadowBlur = 0;
  y += 200;

  ctx.font = '600 36px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = cor("--tinta");
  ctx.fillText(`${r.acertos} de ${r.total} questões certas · meta ${META}%`, dentro, y);
  y += 52;

  if (r.tempo) {
    ctx.font = '400 30px "Share Tech Mono", monospace';
    ctx.fillStyle = cor("--suave");
    ctx.fillText(r.tempo, dentro, y);
    y += 48;
  }
  y += 20;

  // Mensagem personalizada
  ctx.font = '400 32px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = cor("--tinta");
  quebrarTexto(ctx, r.mensagem, larguraDentro).forEach((linha) => {
    ctx.fillText(linha, dentro, y);
    y += 46;
  });
  y += 30;

  // Barras por tópico
  ctx.font = '700 30px "Chakra Petch", sans-serif';
  ctx.fillStyle = cor("--itn");
  ctx.fillText("Desempenho por tópico", dentro, y);
  y += 56;

  r.desempenho.forEach(({ topico, certos, total }) => {
    ctx.font = '400 28px "IBM Plex Sans", sans-serif';
    ctx.fillStyle = cor("--tinta");
    ctx.fillText(topico, dentro, y);
    ctx.textAlign = "right";
    ctx.font = '400 28px "Share Tech Mono", monospace';
    ctx.fillStyle = cor("--suave");
    ctx.fillText(`${certos} de ${total}`, dentro + larguraDentro, y);
    ctx.textAlign = "left";
    y += 42;

    ctx.fillStyle = cor("--noite");
    ctx.fillRect(dentro, y, larguraDentro, 12);
    ctx.fillStyle = cor("--itn");
    ctx.shadowColor = cor("--itn");
    ctx.shadowBlur = 12;
    ctx.fillRect(dentro, y, larguraDentro * (certos / total), 12);
    ctx.shadowBlur = 0;
    y += 40;
  });
  y += 20;

  const alturaPainel = y - topoPainel;
  y += 50;

  // Assinatura
  ctx.font = '400 30px "Share Tech Mono", monospace';
  ctx.fillStyle = cor("--srwe");
  ctx.fillText("> Profa. Maristela_ · Academia Cisco · Senac-DF", MARGEM, y);
  y += 40 + MARGEM;

  // Camada 2: a imagem final, com a altura certa
  const imagem = document.createElement("canvas");
  imagem.width = LARGURA_IMAGEM;
  imagem.height = y;
  const final = imagem.getContext("2d");

  // Fundo: noite roxa com brilhos magenta e ciano
  final.fillStyle = cor("--noite");
  final.fillRect(0, 0, imagem.width, imagem.height);
  const brilho = (x, yBrilho, raio, rgba) => {
    const g = final.createRadialGradient(x, yBrilho, 0, x, yBrilho, raio);
    g.addColorStop(0, rgba);
    g.addColorStop(1, "transparent");
    final.fillStyle = g;
    final.fillRect(0, 0, imagem.width, imagem.height);
  };
  brilho(LARGURA_IMAGEM * 0.9, -100, 700, "rgba(255, 42, 109, .25)");
  brilho(-100, 600, 700, "rgba(5, 217, 232, .15)");

  // Painel com cantos cortados, por baixo dos dados do aluno
  caminhoCorte(final, MARGEM, topoPainel, largura, alturaPainel, 28);
  final.fillStyle = cor("--painel");
  final.fill();
  final.strokeStyle = cor("--linha");
  final.lineWidth = 2;
  final.stroke();

  // Por cima, o conteúdo da camada 1
  final.drawImage(rascunho, 0, 0);

  return new Promise((resolver) => imagem.toBlob(resolver, "image/png"));
}

// "Maria da Silva" -> "simulado-ccna-maria-da-silva-2026-10-02.png"
function nomeDoArquivo() {
  const slug = sim.nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira os acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const hojeIso = new Date().toLocaleDateString("sv-SE"); // formato AAAA-MM-DD
  return `simulado-ccna-${slug}-${hojeIso}.png`;
}

const msgImagem = $("#simImagemMsg");
const botaoCompartilhar = $("#simCompartilhar");

$("#simSalvarImagem").addEventListener("click", async () => {
  msgImagem.textContent = "Gerando a imagem…";
  const blob = await desenharResultado();

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeDoArquivo();
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);

  msgImagem.textContent = "Imagem salva. Agora é só enviar para a professora pelo Teams.";
});

// Compartilhar direto (celulares e navegadores compatíveis)
const podeCompartilhar = (() => {
  try {
    const teste = new File([""], "teste.png", { type: "image/png" });
    return Boolean(navigator.canShare && navigator.canShare({ files: [teste] }));
  } catch (erro) {
    return false;
  }
})();
botaoCompartilhar.hidden = !podeCompartilhar;

botaoCompartilhar.addEventListener("click", async () => {
  msgImagem.textContent = "Gerando a imagem…";
  const blob = await desenharResultado();
  const arquivo = new File([blob], nomeDoArquivo(), { type: "image/png" });
  try {
    await navigator.share({ files: [arquivo], title: "Resultado do simulado CCNA" });
    msgImagem.textContent = "";
  } catch (erro) {
    // A pessoa cancelou o compartilhamento: não é um erro de verdade
    msgImagem.textContent = "";
  }
});


/* 8. Sub-redes: cálculo e passo a passo ------------------------ */
/* Funções usadas pelo treino livre (seção 9) e pela maratona (seção 10). */

// IP em texto <-> número de 32 bits
// (usa multiplicação e divisão em vez de << e >>, que trabalham com números com sinal)
const ipParaNumero = (ip) => ip.split(".").reduce((soma, octeto) => soma * 256 + Number(octeto), 0);
const numeroParaIp = (n) => [24, 16, 8, 0].map((desloc) => Math.floor(n / 2 ** desloc) % 256).join(".");

// Número inteiro entre min e max (incluindo os dois)
const sorteio = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// Um item qualquer da lista
const umDe = (lista) => lista[Math.floor(Math.random() * lista.length)];

// "1º", "2º"...
const ordinal = (n) => n + "º";

// 26 -> "255.255.255.192"
const prefixoParaMascara = (prefixo) => numeroParaIp(2 ** 32 - 2 ** (32 - prefixo));

// 192 -> "11000000"
const paraBinario = (n) => n.toString(2).padStart(8, "0");

// Um IP privado qualquer (das faixas 10, 172.16 a 172.31 e 192.168)
const ipPrivado = () => {
  const faixa = umDe(["10", "172", "192"]);
  if (faixa === "10") return ["10", sorteio(0, 255), sorteio(0, 255), sorteio(1, 254)].join(".");
  if (faixa === "172") return ["172", sorteio(16, 31), sorteio(0, 255), sorteio(1, 254)].join(".");
  return ["192", "168", sorteio(0, 255), sorteio(1, 254)].join(".");
};

// Todos os dados da sub-rede de um IP
function calcularSubRede(ip, prefixo) {
  const tamanho = 2 ** (32 - prefixo); // endereços no bloco
  const n = ipParaNumero(ip);
  const rede = n - (n % tamanho);      // múltiplo do bloco logo abaixo do IP

  return {
    ip,
    prefixo,
    rede: numeroParaIp(rede),
    broad: numeroParaIp(rede + tamanho - 1),
    prim: numeroParaIp(rede + 1),
    ult: numeroParaIp(rede + tamanho - 2),
    hosts: String(tamanho - 2),
    masc: prefixoParaMascara(prefixo),
  };
}

// O passo a passo do "número mágico", com os números deste IP
function passosSubRede(ip, prefixo) {
  const r = calcularSubRede(ip, prefixo);
  const bitsHost = 32 - prefixo;
  const passos = [];

  // /8, /16 e /24: a máscara termina no fim de um octeto, não há octeto "quebrado"
  if (prefixo % 8 === 0) {
    const cheios = prefixo / 8;
    passos.push(`O /${prefixo} tem ${prefixo} bits de rede: são ${cheios} octetos inteiros. A máscara é ${r.masc}.`);
    passos.push(`Rede: copie os ${cheios} primeiros octetos do IP e coloque 0 no resto: ${r.rede}.`);
    passos.push(`Broadcast: os mesmos octetos e 255 no resto: ${r.broad}.`);
    passos.push(`Primeiro host = rede + 1: ${r.prim}. Último host = broadcast − 1: ${r.ult}.`);
    passos.push(`Hosts: 32 − ${prefixo} = ${bitsHost} bits de host. 2^${bitsHost} − 2 = ${r.hosts} (tira a rede e o broadcast).`);
    return passos;
  }

  const octetos = ip.split(".").map(Number);
  const k = Math.floor(prefixo / 8);      // índice do octeto interessante (0 = 1º)
  const bitsRedeNoOcteto = prefixo % 8;
  const bloco = 2 ** (8 - bitsRedeNoOcteto);
  const valor = octetos[k];
  const inicio = Math.floor(valor / bloco) * bloco;
  const fim = inicio + bloco - 1;
  const cheios = k * 8;

  // 1. Octeto interessante
  let texto = `Ache o octeto interessante. O /${prefixo} tem ${prefixo} bits de rede.`;
  texto += cheios > 0 ? ` Os ${k} primeiros octetos usam ${cheios} bits` : "";
  texto += ` e sobram ${bitsRedeNoOcteto} ${bitsRedeNoOcteto === 1 ? "bit" : "bits"} de rede no ${ordinal(k + 1)} octeto. É nele que a conta acontece.`;
  passos.push(texto);

  // 2. Número mágico e máscara
  passos.push(`Ache o número mágico (o tamanho do bloco). No ${ordinal(k + 1)} octeto ficam ${8 - bitsRedeNoOcteto} bits de host: 2^${8 - bitsRedeNoOcteto} = ${bloco}. A máscara nesse octeto é 256 − ${bloco} = ${256 - bloco}, então a máscara inteira é ${r.masc}.`);

  // 3. Em que bloco o IP cai
  const blocos = [];
  if (256 / bloco <= 8) {
    for (let b = 0; b < 256; b += bloco) blocos.push(b);
  } else {
    if (inicio - bloco >= 0) blocos.push("…", inicio - bloco);
    blocos.push(inicio);
    if (inicio + bloco < 256) blocos.push(inicio + bloco, "…");
  }
  passos.push(`Conte de ${bloco} em ${bloco} no ${ordinal(k + 1)} octeto: ${blocos.join(", ")}. O IP tem ${valor} nesse octeto, então cai no bloco que começa em ${inicio} (${inicio} ≤ ${valor} ≤ ${fim}). Conta rápida: ${valor} ÷ ${bloco} dá ${Math.floor(valor / bloco)} inteiro; ${Math.floor(valor / bloco)} × ${bloco} = ${inicio}.`);

  // 4. Rede e broadcast
  const depois = k < 3 ? ` Nos octetos depois dele, use 0.` : "";
  passos.push(`Endereço de rede: copie os octetos antes do interessante, use ${inicio} no interessante.${depois} Rede: ${r.rede}.`);
  const depoisBroad = k < 3 ? ` Nos octetos depois dele, use 255.` : "";
  passos.push(`Broadcast: o próximo bloco começaria em ${inicio + bloco}; o broadcast é um antes: ${fim}.${depoisBroad} Broadcast: ${r.broad}.`);

  // 5. Hosts
  passos.push(`Primeiro host = rede + 1: ${r.prim}. Último host = broadcast − 1: ${r.ult}.`);
  passos.push(`Quantos hosts: 32 − ${prefixo} = ${bitsHost} bits de host. 2^${bitsHost} − 2 = ${r.hosts} (tira a rede e o broadcast).`);

  return passos;
}

// Mostra uma lista de passos numerados dentro de um <ol>
function mostrarPassos(lista, passos) {
  lista.innerHTML = "";
  passos.forEach((passo) => lista.appendChild(criar("li", "", passo)));
  lista.hidden = false;
}

// Deixa a resposta do aluno no formato da resposta certa:
// tira espaços, aceita "/26" ou "26" e "1.022" ou "1022"
function normalizar(valor, tipo) {
  let texto = valor.trim().replace(/\s+/g, "");
  if (tipo === "prefixo") texto = texto.replace(/^\//, "");
  if (tipo === "numero") texto = texto.replace(/\./g, "");
  if (tipo === "binario") {
    if (!/^[01]{1,8}$/.test(texto)) return texto;
    return paraBinario(parseInt(texto, 2));
  }
  return texto;
}


/* 9. Treino livre de sub-redes --------------------------------- */

(function treinoLivre() {
  // id do campo -> propriedade da resposta
  const CAMPOS = {
    sRede: "rede",
    sBroad: "broad",
    sPrim: "prim",
    sUlt: "ult",
    sHosts: "hosts",
    sMasc: "masc",
  };

  const retorno = $("#sRetorno");
  const listaPassos = $("#sPassos");
  let atual;
  let acertos = 0;
  let tentativas = 0;

  const mensagem = (texto, tipo = "") => {
    retorno.textContent = texto;
    retorno.className = "retorno " + tipo;
  };

  const novoDesafio = () => {
    const prefixo = sorteio(20, 30);
    const ip = [sorteio(10, 189), sorteio(0, 255), sorteio(0, 255), sorteio(1, 254)].join(".");
    atual = calcularSubRede(ip, prefixo);

    $("#ipDesafio").textContent = ip + " /" + prefixo;
    Object.keys(CAMPOS).forEach((idCampo) => {
      const campo = $("#" + idCampo);
      campo.value = "";
      campo.className = "";
    });
    listaPassos.hidden = true;
    mensagem("");
  };

  $("#sVerificar").addEventListener("click", () => {
    let corretos = 0;

    Object.entries(CAMPOS).forEach(([idCampo, chave]) => {
      const campo = $("#" + idCampo);
      const tipo = chave === "hosts" ? "numero" : "ip";
      const certo = normalizar(campo.value, tipo) === atual[chave];
      campo.className = certo ? "certo" : "errado";
      if (certo) corretos++;
    });

    tentativas++;

    if (corretos === 6) {
      acertos++;
      mensagem("Tudo certo! Sub-rede dominada.", "ok");
    } else {
      mensagem(
        `${corretos} de 6 corretos. Dica: o bloco de um /${atual.prefixo} tem ${2 ** (32 - atual.prefixo)} endereços; ache o múltiplo do bloco logo abaixo do IP. Se travar, veja o passo a passo.`,
        "no"
      );
    }

    $("#sPlacar").textContent = `Sub-redes resolvidas: ${acertos} em ${tentativas} tentativas`;
  });

  $("#sNovo").addEventListener("click", novoDesafio);

  $("#sPassoAPasso").addEventListener("click", () => {
    mostrarPassos(listaPassos, passosSubRede(atual.ip, atual.prefixo));
  });

  $("#sMostrar").addEventListener("click", () => {
    Object.entries(CAMPOS).forEach(([idCampo, chave]) => {
      const campo = $("#" + idCampo);
      campo.value = atual[chave];
      campo.className = "";
    });
    mensagem("Confira cada campo com o passo a passo e tente um novo endereço.");
    mostrarPassos(listaPassos, passosSubRede(atual.ip, atual.prefixo));
  });

  novoDesafio();
})();


/* 10. Maratona de sub-redes ------------------------------------ */
/* Cinco fases, do binário ao VLSM. Cada campo certo vale 10 XP (5 XP se o
   passo a passo foi aberto antes de responder). Três questões certas
   seguidas dão bônus de combo. A medalha da fase sai da porcentagem de
   campos certos. O melhor resultado de cada fase fica salvo no navegador
   e, com login (conta.js), também na conta do aluno, para o ranking da turma. */

(function maratona() {
  const XP_CAMPO = 10;
  const XP_CAMPO_COM_AJUDA = 5;
  const XP_COMBO = 10;
  const CHAVE = "ccna-maratona";

  // Questão de uma resposta só: { enunciado, dado, campos: [{ rotulo, resposta, tipo }], passos }

  // Fase 1: binário <-> decimal
  function questaoBinario(i) {
    const valores = [128, 192, 224, 240, 248, 252, 254, 255];
    const valor = i % 2 === 0 ? umDe(valores) : sorteio(1, 254);
    const bits = paraBinario(valor);
    const pesos = [128, 64, 32, 16, 8, 4, 2, 1];
    const usados = pesos.filter((_, p) => bits[p] === "1");

    if (i % 2 === 0) {
      return {
        enunciado: "Converta este octeto de binário para decimal.",
        dado: bits,
        campos: [{ rotulo: "Decimal", resposta: String(valor), tipo: "numero" }],
        passos: [
          "Escreva os pesos de cada bit, da esquerda para a direita: 128 64 32 16 8 4 2 1.",
          `Embaixo, os bits: ${bits.split("").join(" ")}.`,
          `Some só os pesos que têm 1 embaixo: ${usados.join(" + ")} = ${valor}.`,
        ],
      };
    }

    // decimal -> binário: tira o maior peso que cabe, do 128 até o 1
    const passos = ["Use os pesos 128 64 32 16 8 4 2 1. Para cada peso, pergunte: cabe no que sobrou?"];
    let sobra = valor;
    pesos.forEach((peso) => {
      if (peso <= sobra) {
        passos.push(`${peso} cabe em ${sobra}? Sim: bit 1. Sobra ${sobra} − ${peso} = ${sobra - peso}.`);
        sobra -= peso;
      } else {
        passos.push(`${peso} cabe em ${sobra}? Não: bit 0.`);
      }
    });
    passos.push(`Juntando os bits na ordem: ${bits}.`);

    return {
      enunciado: "Converta este octeto de decimal para binário (8 bits).",
      dado: String(valor),
      campos: [{ rotulo: "Binário (8 bits)", resposta: bits, tipo: "binario" }],
      passos,
    };
  }

  // Fase 2: prefixo, máscara, hosts e bloco (um tipo de pergunta por questão)
  function questaoMascara(i) {
    const prefixoQuebrado = () => umDe([17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30]);

    // Os 8 bits do octeto interessante e quantos são 1
    const explicarMascara = (prefixo) => {
      const cheios = Math.floor(prefixo / 8);
      const resto = prefixo % 8;
      const octeto = 256 - 2 ** (8 - resto);
      return `${cheios} octetos cheios (${cheios * 8} bits) valem 255. Sobram ${resto} bits 1 no ${ordinal(cheios + 1)} octeto: ${paraBinario(octeto)} = ${octeto}. O resto é 0.`;
    };

    const tipos = [
      () => {
        const p = prefixoQuebrado();
        return {
          enunciado: "Qual é a máscara decimal deste prefixo?",
          dado: "/" + p,
          campos: [{ rotulo: "Máscara decimal", resposta: prefixoParaMascara(p), tipo: "ip" }],
          passos: [
            `/${p} quer dizer ${p} bits 1 seguidos, da esquerda para a direita.`,
            explicarMascara(p),
            `Máscara: ${prefixoParaMascara(p)}.`,
          ],
        };
      },
      () => {
        const p = prefixoQuebrado();
        const mascara = prefixoParaMascara(p);
        const contas = mascara.split(".").map((o) => {
          const uns = paraBinario(Number(o)).split("").filter((b) => b === "1").length;
          return `${o} = ${paraBinario(Number(o))} (${uns} bits 1)`;
        });
        return {
          enunciado: "Qual é o prefixo (barra) desta máscara?",
          dado: mascara,
          campos: [{ rotulo: "Prefixo (ex.: /24)", resposta: String(p), tipo: "prefixo" }],
          passos: [
            "Conte os bits 1 de cada octeto.",
            contas.join("; ") + ".",
            `Somando: /${p}.`,
          ],
        };
      },
      () => {
        const p = sorteio(20, 30);
        const h = 32 - p;
        return {
          enunciado: "Quantos hosts válidos cabem numa sub-rede com este prefixo?",
          dado: "/" + p,
          campos: [{ rotulo: "Hosts válidos", resposta: String(2 ** h - 2), tipo: "numero" }],
          passos: [
            `Bits de host = 32 − ${p} = ${h}.`,
            `Endereços no bloco = 2^${h} = ${2 ** h}.`,
            `Hosts válidos = ${2 ** h} − 2 = ${2 ** h - 2} (um endereço é da rede e outro é o broadcast).`,
          ],
        };
      },
      () => {
        const precisa = sorteio(3, 500);
        let h = 2;
        while (2 ** h - 2 < precisa) h++;
        const passos = [`Procure o menor número de bits de host (h) em que 2^h − 2 é pelo menos ${precisa}.`];
        for (let t = Math.max(2, h - 2); t <= h; t++) {
          passos.push(`h = ${t}: 2^${t} − 2 = ${2 ** t - 2} ${2 ** t - 2 >= precisa ? "→ cabe!" : "→ não cabe."}`);
        }
        passos.push(`Prefixo = 32 − ${h} = /${32 - h}.`);
        return {
          enunciado: `Uma LAN precisa de ${precisa} hosts. Qual é o maior prefixo (a menor sub-rede) que atende?`,
          dado: precisa + " hosts",
          campos: [{ rotulo: "Prefixo (ex.: /24)", resposta: String(32 - h), tipo: "prefixo" }],
          passos,
        };
      },
      () => {
        const p = prefixoQuebrado();
        const bloco = 2 ** (8 - (p % 8));
        const k = Math.floor(p / 8);
        return {
          enunciado: "Qual é o número mágico (o tamanho do bloco no octeto interessante)?",
          dado: "/" + p,
          campos: [{ rotulo: "Número mágico", resposta: String(bloco), tipo: "numero" }],
          passos: [
            `/${p}: ${k} octetos cheios e ${p % 8} bits de rede no ${ordinal(k + 1)} octeto (o interessante).`,
            `Bits de host nesse octeto: 8 − ${p % 8} = ${8 - (p % 8)}. Bloco = 2^${8 - (p % 8)} = ${bloco}.`,
            `Outro jeito: a máscara nesse octeto é ${256 - bloco}; 256 − ${256 - bloco} = ${bloco}.`,
          ],
        };
      },
    ];

    return tipos[i % tipos.length]();
  }

  // Fases 3 e 4: a sub-rede de um IP
  function questaoSubRede(prefixos) {
    return () => {
      const prefixo = umDe(prefixos);
      const ip = ipPrivado();
      const r = calcularSubRede(ip, prefixo);
      return {
        enunciado: "Ache a sub-rede deste host.",
        dado: ip + " /" + prefixo,
        campos: [
          { rotulo: "Endereço de rede", resposta: r.rede, tipo: "ip" },
          { rotulo: "Primeiro host", resposta: r.prim, tipo: "ip" },
          { rotulo: "Último host", resposta: r.ult, tipo: "ip" },
          { rotulo: "Broadcast", resposta: r.broad, tipo: "ip" },
        ],
        passos: passosSubRede(ip, prefixo),
      };
    };
  }

  // Fase 5: VLSM. Três LANs e um link entre roteadores, fora de ordem.
  function questaoVlsm() {
    const terceiro = sorteio(1, 254);
    const base = `192.168.${terceiro}.0`;
    const nomes = embaralhar(["Vendas", "Financeiro", "Laboratório", "Recepção", "Wi-Fi visitantes", "Diretoria", "Suporte", "Câmeras"]);

    // faixas de hosts escolhidas para que cada rede tenha um prefixo diferente
    const redes = [
      { nome: "LAN " + nomes[0], hosts: sorteio(33, 120) },
      { nome: "LAN " + nomes[1], hosts: sorteio(15, 30) },
      { nome: "LAN " + nomes[2], hosts: sorteio(3, 14) },
      { nome: "Link R1–R2", hosts: 2 },
    ];

    // menor bloco que atende cada rede
    redes.forEach((rede) => {
      let h = 2;
      while (2 ** h - 2 < rede.hosts) h++;
      rede.bloco = 2 ** h;
      rede.prefixo = 32 - h;
    });

    // Alocação: da maior para a menor, a partir do .0
    const passos = [`Ordene da maior para a menor: ${redes.map((r) => `${r.nome} (${r.hosts})`).join(", ")}. Começar pela maior evita sobreposição e buracos.`];
    let inicio = 0;
    redes.forEach((rede) => {
      rede.rede = `192.168.${terceiro}.${inicio}`;
      const h = 32 - rede.prefixo;
      passos.push(`${rede.nome}: ${rede.hosts} hosts → 2^${h} − 2 = ${rede.bloco - 2} cabe → /${rede.prefixo} (bloco de ${rede.bloco}). Começa em .${inicio} e vai até .${inicio + rede.bloco - 1}. A próxima começa em .${inicio + rede.bloco}.`);
      inicio += rede.bloco;
    });

    // Os campos aparecem fora de ordem: escolher a ordem faz parte do desafio
    const campos = [];
    embaralhar(redes).forEach((rede) => {
      campos.push({ rotulo: `${rede.nome} (${rede.hosts} hosts): prefixo`, resposta: String(rede.prefixo), tipo: "prefixo" });
      campos.push({ rotulo: `${rede.nome}: endereço de rede`, resposta: rede.rede, tipo: "ip" });
    });

    return {
      enunciado: `Divida a rede ${base}/24 com VLSM. Comece pela maior rede, a partir do ${base}, sem deixar buracos.`,
      dado: base + " /24",
      campos,
      passos,
    };
  }

  const FASES = [
    { nome: "Aquecimento binário", desc: "Converta octetos entre binário e decimal.", qtd: 6, metaSeg: 120, gerar: questaoBinario, insignia: "Binário fluente" },
    { nome: "Máscaras e prefixos", desc: "Prefixo, máscara, hosts e número mágico.", qtd: 5, metaSeg: 180, gerar: questaoMascara, insignia: "Mestre das máscaras" },
    { nome: "Rede e broadcast", desc: "Sub-redes no 4º octeto (/25 a /30).", qtd: 4, metaSeg: 300, gerar: questaoSubRede([25, 26, 27, 28, 29, 30]), insignia: "Caçador de broadcast" },
    { nome: "Terceiro octeto", desc: "Sub-redes maiores (/17 a /23).", qtd: 4, metaSeg: 360, gerar: questaoSubRede([17, 18, 19, 20, 21, 22, 23]), insignia: "Desbravador do 3º octeto" },
    { nome: "Chefão VLSM", desc: "Divida uma /24 entre LANs de tamanhos diferentes.", qtd: 2, metaSeg: 480, gerar: questaoVlsm, insignia: "Arquiteto VLSM" },
  ];

  const MEDALHAS = [
    { nome: "ouro", minimo: 90 },
    { nome: "prata", minimo: 70 },
    { nome: "bronze", minimo: 50 },
  ];

  // XP máximo de uma fase: 10 por campo e o bônus de combo da 3ª questão em diante
  const xpMaximo = (questoes) =>
    questoes.reduce((soma, q) => soma + q.campos.length * XP_CAMPO, 0) + Math.max(0, questoes.length - 2) * XP_COMBO;

  // O mesmo, sem jogar: sorteia uma rodada só para contar os campos
  const xpMaximoDaFase = (f) => xpMaximo(indices(FASES[f].qtd).map((i) => FASES[f].gerar(i)));

  // "maratona:fase3" é o nome do treino no Supabase
  const nomeNaNuvem = (f) => "maratona:fase" + (f + 1);

  // Estado da fase em andamento
  const jogo = {
    fase: 0,          // índice em FASES
    questoes: [],
    i: 0,
    xp: 0,
    camposCertos: 0,
    camposTotal: 0,
    seguidas: 0,      // questões inteiras certas em sequência (combo)
    ajudas: 0,        // quantas vezes abriu o passo a passo antes de responder
    ajudaAberta: false,
    inicio: 0,
    relogio: null,
    texto: "",        // resultado pronto para colar no chat
  };

  const telaFases = $("#marFases");
  const telaJogo = $("#marJogo");
  const telaResultado = $("#marResultado");
  const caixaCampos = $("#marCampos");
  const retorno = $("#marRetorno");
  const listaPassos = $("#marPassos");
  const botaoConfirmar = $("#marConfirmar");
  const botaoProxima = $("#marProxima");
  const botaoAjuda = $("#marAjuda");

  // Melhores resultados salvos neste navegador
  function lerRecordes() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE)) || { fases: {}, insignias: [] };
    } catch (erro) {
      return { fases: {}, insignias: [] };
    }
  }

  function salvarRecordes(recordes) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(recordes));
    } catch (erro) {}
  }

  // Cartões das fases, com a melhor medalha de cada uma
  function montarFases() {
    const recordes = lerRecordes();
    telaFases.innerHTML = "";

    FASES.forEach((fase, f) => {
      const recorde = recordes.fases[f];
      const botao = criar("button", "mar-fase");
      botao.type = "button";
      botao.append(
        criar("span", "mar-fase-num", "Fase " + (f + 1)),
        criar("strong", "", fase.nome),
        criar("span", "", fase.desc),
        criar("span", "mar-fase-recorde " + (recorde ? recorde.medalha : ""),
          recorde ? `Melhor: ${recorde.xp} XP · ${recorde.medalha === "sem" ? "sem medalha" : "medalha de " + recorde.medalha}` : "Ainda não jogada"),
      );
      botao.addEventListener("click", () => comecarFase(f));
      telaFases.appendChild(botao);
    });

    const xpTotal = Object.values(recordes.fases).reduce((soma, r) => soma + r.xp, 0);
    const insignias = recordes.insignias.length ? recordes.insignias.join(" · ") : "nenhuma ainda";
    $("#marTotal").textContent = `Seu XP na maratona (soma dos recordes): ${xpTotal} · Insígnias: ${insignias}`;
  }

  function comecarFase(f) {
    const fase = FASES[f];
    jogo.fase = f;
    jogo.questoes = indices(fase.qtd).map((i) => fase.gerar(i));
    jogo.i = 0;
    jogo.xp = 0;
    jogo.camposCertos = 0;
    jogo.camposTotal = 0;
    jogo.seguidas = 0;
    jogo.ajudas = 0;
    jogo.inicio = Date.now();

    telaFases.hidden = true;
    $("#marTotal").hidden = true;
    telaResultado.hidden = true;
    telaJogo.hidden = false;
    $("#marNomeFase").textContent = `Fase ${f + 1} · ${fase.nome}`;

    clearInterval(jogo.relogio);
    const tick = () => {
      $("#marTempo").textContent = "Tempo: " + formatarTempo(Math.round((Date.now() - jogo.inicio) / 1000));
    };
    tick();
    jogo.relogio = setInterval(tick, 1000);

    mostrarQuestao();
  }

  function mostrarQuestao() {
    const q = jogo.questoes[jogo.i];
    const total = jogo.questoes.length;

    $("#marPos").textContent = `Questão ${jogo.i + 1} de ${total}`;
    $("#marXp").textContent = `${jogo.xp} XP`;
    $("#marProgresso").style.width = (jogo.i / total) * 100 + "%";
    $("#marEnunciado").textContent = q.enunciado;
    $("#marDado").textContent = q.dado;

    caixaCampos.innerHTML = "";
    q.campos.forEach((campo, c) => {
      const rotulo = criar("label", "", campo.rotulo);
      const input = criar("input");
      input.autocomplete = "off";
      input.inputMode = campo.tipo === "ip" ? "decimal" : "numeric";
      input.dataset.campo = c;
      rotulo.appendChild(input);
      caixaCampos.appendChild(rotulo);
    });

    jogo.ajudaAberta = false;
    listaPassos.hidden = true;
    retorno.textContent = "";
    retorno.className = "retorno";
    botaoConfirmar.hidden = false;
    botaoProxima.hidden = true;
    botaoAjuda.hidden = false;

    const primeiro = caixaCampos.querySelector("input");
    if (primeiro) primeiro.focus({ preventScroll: true });
    telaJogo.scrollIntoView({ block: "start" });
  }

  // Abrir a ajuda antes de responder: a questão passa a valer metade
  botaoAjuda.addEventListener("click", () => {
    const q = jogo.questoes[jogo.i];
    if (!jogo.ajudaAberta) jogo.ajudas++;
    jogo.ajudaAberta = true;
    mostrarPassos(listaPassos, q.passos);
    retorno.textContent = "Passo a passo aberto: esta questão vale metade do XP. Siga os passos e responda.";
    retorno.className = "retorno";
  });

  $("#marForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const q = jogo.questoes[jogo.i];
    const inputs = [...caixaCampos.querySelectorAll("input")];

    if (inputs.some((input) => input.value.trim() === "")) {
      retorno.textContent = "Preencha todos os campos. Se travar, abra o passo a passo.";
      retorno.className = "retorno no";
      return;
    }

    let certos = 0;
    inputs.forEach((input) => {
      const campo = q.campos[Number(input.dataset.campo)];
      const certo = normalizar(input.value, campo.tipo) === campo.resposta;
      input.className = certo ? "certo" : "errado";
      input.disabled = true;
      if (certo) {
        certos++;
      } else {
        const certa = campo.tipo === "prefixo" ? "/" + campo.resposta : campo.resposta;
        input.parentElement.appendChild(criar("small", "mar-certa", "Certo: " + certa));
      }
    });

    const valor = jogo.ajudaAberta ? XP_CAMPO_COM_AJUDA : XP_CAMPO;
    let ganho = certos * valor;
    let texto;

    if (certos === inputs.length) {
      jogo.seguidas++;
      texto = `Correto! +${ganho} XP.`;
      if (jogo.seguidas >= 3) {
        ganho += XP_COMBO;
        texto = `Correto! Combo de ${jogo.seguidas} seguidas: +${ganho} XP.`;
      }
      retorno.className = "retorno ok";
    } else {
      jogo.seguidas = 0;
      texto = `${certos} de ${inputs.length} campos certos: +${ganho} XP. Leia o passo a passo abaixo para ver onde a conta mudou.`;
      retorno.className = "retorno no";
      mostrarPassos(listaPassos, q.passos);
    }

    jogo.xp += ganho;
    jogo.camposCertos += certos;
    jogo.camposTotal += inputs.length;
    retorno.textContent = texto;
    $("#marXp").textContent = `${jogo.xp} XP`;

    botaoConfirmar.hidden = true;
    botaoAjuda.hidden = true;
    botaoProxima.hidden = false;
    botaoProxima.textContent = jogo.i < jogo.questoes.length - 1 ? "Próxima questão" : "Ver o resultado da fase";
    botaoProxima.focus();
  });

  botaoProxima.addEventListener("click", () => {
    jogo.i++;
    if (jogo.i < jogo.questoes.length) mostrarQuestao();
    else terminarFase();
  });

  $("#marSair").addEventListener("click", () => {
    clearInterval(jogo.relogio);
    voltarParaFases();
  });

  function voltarParaFases() {
    telaJogo.hidden = true;
    telaResultado.hidden = true;
    telaFases.hidden = false;
    $("#marTotal").hidden = false;
    montarFases();
    telaFases.scrollIntoView({ block: "start" });
  }

  function terminarFase() {
    clearInterval(jogo.relogio);
    const fase = FASES[jogo.fase];
    const segundos = Math.round((Date.now() - jogo.inicio) / 1000);
    const pct = Math.round((jogo.camposCertos / jogo.camposTotal) * 100);
    const medalha = MEDALHAS.find((m) => pct >= m.minimo);
    const nomeMedalha = medalha ? medalha.nome : "sem";

    // Insígnias novas desta rodada
    const recordes = lerRecordes();
    const novas = [];
    const ganhar = (insignia) => {
      if (!recordes.insignias.includes(insignia)) {
        recordes.insignias.push(insignia);
        novas.push(insignia);
      }
    };
    ganhar("Primeira largada");
    if (nomeMedalha === "ouro") ganhar(fase.insignia);
    if (nomeMedalha === "ouro" && jogo.ajudas === 0) ganhar("Sem colinha");
    if (pct >= 70 && segundos <= fase.metaSeg) ganhar("Relâmpago");
    if (FASES.every((_, f) => (f === jogo.fase ? nomeMedalha : recordes.fases[f] && recordes.fases[f].medalha) === "ouro")) {
      ganhar("Lenda das sub-redes");
    }

    // Guarda o recorde da fase (o maior XP)
    const anterior = recordes.fases[jogo.fase];
    const recorde = !anterior || jogo.xp > anterior.xp;
    if (recorde) recordes.fases[jogo.fase] = { xp: jogo.xp, medalha: nomeMedalha };
    salvarRecordes(recordes);

    // Tela de resultado
    telaJogo.hidden = true;
    telaResultado.hidden = false;

    const medalhaTexto = medalha ? `Medalha de ${medalha.nome}` : "Sem medalha desta vez";
    const caixaMedalha = $("#marMedalha");
    caixaMedalha.textContent = medalhaTexto;
    caixaMedalha.className = "mar-medalha " + nomeMedalha;

    $("#marNota").textContent = `Fase ${jogo.fase + 1} · ${fase.nome}: ${jogo.xp} XP`;

    let mensagem = `Você acertou ${jogo.camposCertos} de ${jogo.camposTotal} campos (${pct}%) em ${formatarTempo(segundos)}.`;
    if (recorde && anterior) mensagem += " Novo recorde nesta fase!";
    if (nomeMedalha === "ouro") mensagem += jogo.fase < FASES.length - 1 ? " Pode ir para a próxima fase." : " Você venceu o chefão!";
    else if (nomeMedalha === "sem") mensagem += " Jogue de novo abrindo o passo a passo: ele ensina a conta com os números da questão.";
    else mensagem += " Jogue de novo para buscar o ouro.";
    $("#marMensagem").textContent = mensagem;

    $("#marInsignias").textContent = novas.length ? "Insígnias novas: " + novas.join(" · ") : "";

    // Logado? O XP também vai para a conta, para o ranking da turma
    if (window.CONTA && CONTA.usuario()) {
      CONTA.salvarTreino(nomeNaNuvem(jogo.fase), nomeMedalha, jogo.xp, xpMaximo(jogo.questoes)).then((ok) => {
        if (!ok) return;
        $("#marMensagem").textContent += " XP guardado na sua conta.";
        if (window.RANKING) RANKING.atualizar();
      });
    }

    // Texto para colar no chat do Teams
    let nome = "";
    try {
      nome = localStorage.getItem("ccna-nome") || "";
    } catch (erro) {}
    jogo.texto = [
      nome,
      `Maratona de sub-redes · Fase ${jogo.fase + 1} (${fase.nome})`,
      `${jogo.camposCertos} de ${jogo.camposTotal} campos · ${jogo.xp} XP · ${medalhaTexto.toLowerCase()} · ${formatarTempo(segundos)}`,
    ].filter(Boolean).join(" · ");
    $("#marCopiado").textContent = "";

    $("#marProximaFase").hidden = jogo.fase === FASES.length - 1;
    telaResultado.scrollIntoView({ block: "start" });
  }

  $("#marCopiar").addEventListener("click", async () => {
    const aviso = $("#marCopiado");
    try {
      await navigator.clipboard.writeText(jogo.texto);
      aviso.textContent = "Copiado! Cole no chat do Teams: " + jogo.texto;
    } catch (erro) {
      // Sem acesso à área de transferência: mostra o texto para copiar à mão
      aviso.textContent = "Copie este texto e cole no chat do Teams: " + jogo.texto;
    }
  });

  $("#marRepetir").addEventListener("click", () => comecarFase(jogo.fase));
  $("#marProximaFase").addEventListener("click", () => comecarFase(jogo.fase + 1));
  $("#marVoltar").addEventListener("click", voltarParaFases);

  // Ao entrar com a conta: traz os recordes da nuvem para este navegador
  // e manda para a nuvem os recordes feitos aqui sem login
  async function sincronizar() {
    const linhas = await CONTA.carregarTreinos("maratona:");
    if (!linhas) return;
    const recordes = lerRecordes();
    let enviou = false;

    for (let f = 0; f < FASES.length; f++) {
      const daFase = linhas.filter((linha) => linha.treino === nomeNaNuvem(f));
      const melhor = daFase.reduce((a, b) => (!a || b.acertos > a.acertos ? b : a), null);
      const local = recordes.fases[f];
      if (melhor && (!local || melhor.acertos > local.xp)) {
        recordes.fases[f] = { xp: melhor.acertos, medalha: melhor.modo || "sem" };
      } else if (local && local.xp > 0 && (!melhor || local.xp > melhor.acertos)) {
        const maximo = Math.max(local.xp, xpMaximoDaFase(f));
        if (await CONTA.salvarTreino(nomeNaNuvem(f), local.medalha, local.xp, maximo)) enviou = true;
      }
    }

    salvarRecordes(recordes);
    if (!telaFases.hidden) montarFases();
    if (enviou && window.RANKING) RANKING.atualizar();
  }

  if (window.CONTA) {
    CONTA.aoMudar((usuario) => {
      if (usuario) sincronizar();
    });
  }

  montarFases();
})();
