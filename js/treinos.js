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
   8. Treino de sub-redes
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


/* 8. Treino de sub-redes --------------------------------------- */

(function subRedes() {
  // IP em texto <-> número de 32 bits
  // (usa multiplicação e divisão em vez de << e >>, que trabalham com números com sinal)
  const ipParaNumero = (ip) => ip.split(".").reduce((soma, octeto) => soma * 256 + Number(octeto), 0);
  const numeroParaIp = (n) => [24, 16, 8, 0].map((desloc) => Math.floor(n / 2 ** desloc) % 256).join(".");

  const sorteio = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

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

    const tamanho = 2 ** (32 - prefixo);  // endereços no bloco
    const n = ipParaNumero(ip);
    const rede = n - (n % tamanho);       // múltiplo do bloco logo abaixo do IP

    atual = {
      ip,
      prefixo,
      rede: numeroParaIp(rede),
      broad: numeroParaIp(rede + tamanho - 1),
      prim: numeroParaIp(rede + 1),
      ult: numeroParaIp(rede + tamanho - 2),
      hosts: String(tamanho - 2),
      masc: numeroParaIp(2 ** 32 - tamanho),
    };

    $("#ipDesafio").textContent = ip + " /" + prefixo;
    Object.keys(CAMPOS).forEach((idCampo) => {
      const campo = $("#" + idCampo);
      campo.value = "";
      campo.className = "";
    });
    mensagem("");
  };

  $("#sVerificar").addEventListener("click", () => {
    let corretos = 0;

    Object.entries(CAMPOS).forEach(([idCampo, chave]) => {
      const campo = $("#" + idCampo);
      const certo = campo.value.trim() === atual[chave];
      campo.className = certo ? "certo" : "errado";
      if (certo) corretos++;
    });

    tentativas++;

    if (corretos === 6) {
      acertos++;
      mensagem("Tudo certo! Sub-rede dominada.", "ok");
    } else {
      mensagem(
        `${corretos} de 6 corretos. Dica: o bloco de um /${atual.prefixo} tem ${2 ** (32 - atual.prefixo)} endereços; ache o múltiplo do bloco logo abaixo do IP.`,
        "no"
      );
    }

    $("#sPlacar").textContent = `Sub-redes resolvidas: ${acertos} em ${tentativas} tentativas`;
  });

  $("#sNovo").addEventListener("click", novoDesafio);

  $("#sMostrar").addEventListener("click", () => {
    Object.entries(CAMPOS).forEach(([idCampo, chave]) => {
      const campo = $("#" + idCampo);
      campo.value = atual[chave];
      campo.className = "";
    });
    mensagem("Confira cada campo e tente um novo endereço.");
  });

  novoDesafio();
})();
