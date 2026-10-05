/* ==============================================================
   Funções do site
   Usa as constantes de js/dados.js, que é carregado antes deste arquivo.

   Índice
   1. Utilidades
   2. Traceroute do hero
   3. Próximo encontro e cronograma
   4. Progresso nos cursos
   5. Vídeos
   6. Área da turma
   7. Links da turma
   ============================================================== */


/* 1. Utilidades ------------------------------------------------ */

// Atalho para document.querySelector
const $ = (seletor) => document.querySelector(seletor);

// "2026-10-03" -> "03/10"
const formatarData = (texto) => {
  const [, mes, dia] = texto.split("-");
  return dia + "/" + mes;
};

// "2026-10-03" -> Date à meia-noite no fuso local
// (new Date("2026-10-03") usaria UTC e poderia cair no dia anterior)
const dataDe = (texto) => {
  const [ano, mes, dia] = texto.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
};

const hoje = new Date();
hoje.setHours(0, 0, 0, 0);

// true quando a pessoa pediu menos movimento no sistema
const menosMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Monta uma <ul> a partir de uma lista de textos
const listaHtml = (itens) => "<ul>" + itens.map((x) => `<li>${x}</li>`).join("") + "</ul>";


/* 2. Traceroute do hero ---------------------------------------- */

(function traceroute() {
  const saltos = [
    ["1", "ITN · Introduction to Networks", "17 módulos"],
    ["2", "SRWE · Switching, Routing and Wireless", "16 módulos"],
    ["3", "ENSA · Enterprise Networking, Security and Automation", "14 módulos"],
    ["4", "CCNA · certificação", "você chegou!"],
  ];
  const caixa = $("#hops");

  // Mostra o elemento depois de "ordem" passos de 650 ms
  const aparecer = (elemento, ordem) => {
    const espera = menosMovimento ? 0 : 500 + ordem * 650;
    setTimeout(() => elemento.classList.add("on"), espera);
  };

  saltos.forEach(([numero, destino, detalhe], i) => {
    const linha = document.createElement("div");
    linha.className = "hop";
    if (i === saltos.length - 1) linha.classList.add("fim");
    linha.innerHTML = `<span>${numero}</span><span>${destino}</span><span class="t">${detalhe}</span>`;
    caixa.appendChild(linha);
    aparecer(linha, i);
  });

  // Prompt final com o cursor piscando
  const prompt = document.createElement("div");
  prompt.className = "hop prompt";
  prompt.innerHTML = '<span class="p">Maristela#</span> <span class="cursor"></span>';
  caixa.appendChild(prompt);
  aparecer(prompt, saltos.length);
})();


/* 3. Próximo encontro e cronograma ----------------------------- */

(function encontros() {
  // Primeiro encontro com data de hoje em diante (-1 se o semestre acabou)
  const idx = ENCONTROS.findIndex((e) => dataDe(e.d) >= hoje);
  const acabou = idx === -1;

  // Cronograma: um item por encontro
  const lista = $("#listaTrilha");

  ENCONTROS.forEach((e, i) => {
    const li = document.createElement("li");
    li.style.setProperty("--c", CORES[e.c]);
    if (!acabou && i < idx) li.classList.add("feito");
    if (i === idx) li.classList.add("agora");

    li.innerHTML = `
      <span class="no">${String(i + 1).padStart(2, "0")}</span>
      <details ${i === idx ? "open" : ""}>
        <summary>
          <span class="d">${formatarData(e.d)}</span>
          <h3>${e.t}</h3>
          <span class="tag">${e.c}</span>
        </summary>
        <div class="corpo">
          <div><h4>Laboratório</h4>${listaHtml(e.lab)}</div>
          <div><h4>Desafio</h4>${listaHtml(e.des)}</div>
          <div><h4>Para a quinzena</h4>${listaHtml(e.casa)}</div>
        </div>
      </details>`;
    lista.appendChild(li);
  });

  // Cartão do próximo encontro
  const cartao = $("#cartaoProximo");

  if (acabou) {
    cartao.innerHTML = `
      <div class="data">Fim</div>
      <div>
        <h3>O semestre terminou</h3>
        <p>Agora é com você: agende a prova com o voucher e siga o seu plano de estudos.</p>
      </div>`;
    return;
  }

  const e = ENCONTROS[idx];
  cartao.style.borderLeftColor = CORES[e.c];

  const dias = Math.round((dataDe(e.d) - hoje) / 864e5); // 864e5 ms = 1 dia
  let quando = `em ${dias} dias`;
  if (dias === 0) quando = "é hoje!";
  if (dias === 1) quando = "amanhã";

  // As tarefas "para a quinzena" do encontro anterior preparam para este
  const anterior = ENCONTROS[idx - 1];
  const antesDeVir = anterior
    ? `<p class="antes">Antes do encontro:</p>${listaHtml(anterior.casa)}`
    : "";

  cartao.innerHTML = `
    <div class="data">${formatarData(e.d)}<small>${quando}</small></div>
    <div>
      <h3>Encontro ${idx + 1}: ${e.t}</h3>
      <p>No laboratório: ${e.lab.join("; ")}. Desafio: ${e.des.join(" e ")}.</p>
      ${antesDeVir}
    </div>`;
})();


/* 4. Progresso nos cursos -------------------------------------- */
/* Salvo só neste navegador, no localStorage, como { "ITN-1": true, ... } */

(function progresso() {
  const CHAVE = "ccna-progresso";

  let feito = {};
  try {
    feito = JSON.parse(localStorage.getItem(CHAVE) || "{}");
  } catch (erro) {
    // Sem localStorage (modo privado, por exemplo): segue sem salvar
  }

  const salvar = () => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(feito));
    } catch (erro) {}
  };

  const caixa = $("#cursos-lista");

  Object.keys(MODULOS).forEach((curso) => {
    const modulos = MODULOS[curso];
    const id = (i) => curso + "-" + (i + 1);

    const cartao = document.createElement("div");
    cartao.className = "curso";
    cartao.style.setProperty("--c", CORES[curso]);
    cartao.innerHTML = `
      <h3>${curso}</h3>
      <span class="pct">${NOMES[curso]}</span>
      <div class="medidor"><i></i></div>
      <span class="pct" data-pct></span>
      <ol></ol>`;

    const atualizarBarra = () => {
      const total = modulos.length;
      const concluidos = modulos.filter((_, i) => feito[id(i)]).length;
      cartao.querySelector(".medidor i").style.width = (concluidos / total) * 100 + "%";
      cartao.querySelector("[data-pct]").textContent = `${concluidos} de ${total} módulos concluídos`;
    };

    const ol = cartao.querySelector("ol");

    modulos.forEach((nome, i) => {
      const li = document.createElement("li");
      li.classList.toggle("ck", Boolean(feito[id(i)]));
      li.innerHTML = `<label><input type="checkbox" ${feito[id(i)] ? "checked" : ""}><span>${nome}</span></label>`;

      li.querySelector("input").addEventListener("change", (ev) => {
        feito[id(i)] = ev.target.checked;
        li.classList.toggle("ck", ev.target.checked);
        salvar();
        atualizarBarra();
      });

      ol.appendChild(li);
    });

    atualizarBarra();
    caixa.appendChild(cartao);
  });
})();


/* 5. Vídeos ---------------------------------------------------- */

const botoesFiltro = document.querySelectorAll(".filtros button");

// Desenha a lista de vídeos do curso escolhido ("todos", "ITN", "SRWE" ou "ENSA")
function mostrarVideos(filtro) {
  const ul = $("#listaVideos");
  ul.innerHTML = "";

  VIDEOS
    .filter((v) => filtro === "todos" || v.c === filtro)
    .forEach((v) => {
      const li = document.createElement("li");
      li.style.setProperty("--c", CORES[v.c]);
      const acao = v.u
        ? `<a href="${v.u}" target="_blank" rel="noopener">Assistir</a>`
        : `<span class="em">Em breve</span>`;
      li.innerHTML = `
        <span class="n">Vídeo ${String(v.n).padStart(2, "0")} · ${v.c}</span>
        <strong>${v.t}</strong>
        ${acao}`;
      ul.appendChild(li);
    });
}

// Filtro que está marcado agora
const filtroAtual = () => document.querySelector('.filtros button[aria-pressed="true"]').dataset.f;

botoesFiltro.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesFiltro.forEach((b) => b.setAttribute("aria-pressed", "false"));
    botao.setAttribute("aria-pressed", "true");
    mostrarVideos(botao.dataset.f);
  });
});

mostrarVideos("todos");


/* 6. Área da turma --------------------------------------------- */
/* AREA_TURMA = base64 de salt (16 bytes) + iv (12 bytes) + texto cifrado.
   Chave: PBKDF2-SHA-256, 250.000 iterações. Cifra: AES-GCM 256.
   Tudo acontece no navegador, com a Web Crypto API. */

async function abrirCofre(senha) {
  const bytes = Uint8Array.from(atob(AREA_TURMA), (c) => c.charCodeAt(0));
  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const cifrado = bytes.slice(28);

  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const chave = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // Com a senha errada, o AES-GCM falha aqui e lança um erro
  const texto = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, chave, cifrado);
  return JSON.parse(new TextDecoder().decode(texto));
}

// Mostra os links protegidos e coloca as URLs nos vídeos
function mostrarCofre(conteudo) {
  const caixa = $("#cofreLinks");
  caixa.innerHTML = "";

  (conteudo.links || []).forEach((link) => {
    const a = document.createElement("a");
    a.href = link.u;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `<strong>${link.t}</strong><span>${link.d || ""}</span>`;
    caixa.appendChild(a);
  });

  caixa.hidden = false;
  $("#cofreForm").hidden = true;

  const urls = conteudo.videos || {};
  VIDEOS.forEach((v) => {
    if (urls[v.n]) v.u = urls[v.n];
  });
  mostrarVideos(filtroAtual());
}

(function areaDaTurma() {
  const CHAVE = "ccna-turma";
  const form = $("#cofreForm");
  const msg = $("#cofreMsg");

  // silencioso: não mostra erro (usado ao reabrir a página com a senha da sessão)
  const tentar = async (senha, silencioso) => {
    try {
      const conteudo = await abrirCofre(senha);
      try {
        sessionStorage.setItem(CHAVE, senha);
      } catch (erro) {}
      mostrarCofre(conteudo);
    } catch (erro) {
      if (!silencioso) {
        msg.textContent = "Senha incorreta. Confira a senha informada no primeiro encontro.";
        msg.className = "retorno no";
      }
    }
  };

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    msg.textContent = "Verificando…";
    msg.className = "retorno";
    tentar($("#cofreSenha").value, false);
  });

  let salva = null;
  try {
    salva = sessionStorage.getItem(CHAVE);
  } catch (erro) {}
  if (salva) tentar(salva, true);
})();


/* 7. Links da turma -------------------------------------------- */

(function linksDaTurma() {
  const caixa = $("#listaLinks");

  LINKS_TURMA.forEach((link) => {
    const a = document.createElement("a");
    a.href = link.u;
    if (link.u.startsWith("http")) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    a.innerHTML = `<strong>${link.t}</strong><span>${link.d}</span>`;
    caixa.appendChild(a);
  });
})();
