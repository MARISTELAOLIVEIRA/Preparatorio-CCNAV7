/* ==============================================================
   ENCONTRO VIVO · SRWE: redundância, serviços e segurança da LAN
   versão 1 · 2026-11-13

   O que tem aqui (uma seção por recurso):
   1. Ajudantes
   2. Termômetro (antes e depois)
   3. Simulador do EtherChannel (avenida)
   4. Simulador do DHCP (recepção do hotel)
   5. Simulador do HSRP (goleiro reserva)
   6. Simulador do port security (porteiro)
   7. Desafio relâmpago (10 questões originais)
   8. Visão da professora (só para a conta de professora)

   Onde fica salvo: na tabela prep_treinos (a mesma dos simulados), pelo CONTA.salvarTreino.
   - termômetro: treino "termometro:redundancia:antes:etherchannel", acertos = nota (1 a 5), total = 5
   - desafio:    treino "desafio:redundancia", acertos de 10
   Sem login, fica só no navegador (localStorage).
   ============================================================== */


/* 1. Ajudantes -------------------------------------------------- */

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

function pausado() {
  return document.documentElement.classList.contains("pausado");
}

// espera um tempo (ou nada, se as animações estiverem pausadas)
function esperar(ms) {
  return new Promise((pronto) => setTimeout(pronto, pausado() ? 0 : ms));
}

function lerLocal(chave) {
  try {
    return JSON.parse(localStorage.getItem(chave) || "null");
  } catch (e) {
    return null;
  }
}

function gravarLocal(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (e) {
    // navegador sem armazenamento: segue sem salvar
  }
}

function logado() {
  return Boolean(window.CONTA && CONTA.usuario && CONTA.usuario());
}

// o aviso de login some quando a pessoa entra
function avisoLogin() {
  const aviso = $("[data-aviso-login]");
  if (aviso) aviso.hidden = logado();
}


/* 2. Termômetro --------------------------------------------------- */

const TEMAS = [
  { id: "etherchannel", nome: "EtherChannel", ico: "🛣️" },
  { id: "dhcp", nome: "DHCP", ico: "🏨" },
  { id: "hsrp", nome: "HSRP", ico: "⚽" },
  { id: "portsec", nome: "Port security", ico: "🪪" },
];
const ROSTOS = ["😵", "😕", "😐", "🙂", "🤩"];

function desenharTermometro(caixa) {
  const quando = caixa.dataset.termometro;            // "antes" ou "depois"
  const chave = "ccna:termometro:redundancia:" + quando;
  const salvo = lerLocal(chave) || {};

  const linhas = TEMAS.map((tema) => {
    const botoes = ROSTOS.map((rosto, i) => {
      const nota = i + 1;
      const marcado = salvo[tema.id] === nota;
      return `<button type="button" data-tema="${tema.id}" data-nota="${nota}" aria-pressed="${marcado}" aria-label="${tema.nome}: ${nota} de 5">${rosto}<small>${nota}</small></button>`;
    }).join("");
    return `<div class="tm-linha"><span class="tm-tema">${tema.ico} ${tema.nome}</span><span class="tm-notas">${botoes}</span></div>`;
  }).join("");

  caixa.innerHTML = `${linhas}
    <p><button type="button" class="botao" data-tm-enviar>Enviar o termômetro</button> <span class="ev-nota" data-tm-retorno aria-live="polite"></span></p>`;

  caixa.addEventListener("click", async (evento) => {
    const nota = evento.target.closest("[data-nota]");
    if (nota) {
      salvo[nota.dataset.tema] = Number(nota.dataset.nota);
      $$(`[data-tema="${nota.dataset.tema}"]`, caixa).forEach((b) => b.setAttribute("aria-pressed", String(b === nota)));
      gravarLocal(chave, salvo);
      return;
    }
    if (evento.target.closest("[data-tm-enviar]")) {
      const retorno = $("[data-tm-retorno]", caixa);
      const faltam = TEMAS.filter((t) => !salvo[t.id]);
      if (faltam.length) {
        retorno.textContent = "Falta marcar: " + faltam.map((t) => t.nome).join(", ") + ".";
        return;
      }
      if (!logado()) {
        retorno.textContent = "Guardado neste navegador. Entre com a sua conta para a professora ver. 😉";
        return;
      }
      retorno.textContent = "Soldando…";
      const envios = TEMAS.map((t) => CONTA.salvarTreino(`termometro:redundancia:${quando}:${t.id}`, "termometro", salvo[t.id], 5));
      const deuCerto = (await Promise.all(envios)).every(Boolean);
      retorno.textContent = deuCerto ? "Compilou de primeira! A professora já está vendo. 💛" : "Curto-circuito ao enviar. Tente de novo.";
    }
  });
}


/* 3. EtherChannel: várias pistas viram uma avenida --------------------- */

const ec = {
  canal: false,    // EtherChannel ligado?
  cortado: false,  // um cabo foi cortado?
  rodando: false,
};

function desenharPistas() {
  const pistas = $("[data-ec-pistas]");
  pistas.innerHTML = [0, 1, 2, 3].map((i) => {
    let estado = "livre";
    if (ec.cortado && i === 0) estado = "cortada";
    else if (!ec.canal && i > 0) estado = "bloqueada";
    const rotulo = { livre: "", cortada: "✂️ cabo cortado", bloqueada: "🚧 bloqueada pelo STP" }[estado];
    return `<div class="ec-pista ${estado}${ec.canal ? " avenida" : ""}" data-pista="${i}"><span class="ec-rotulo">${rotulo}</span></div>`;
  }).join("");
  $("[data-ec-cli]").textContent = ec.canal
    ? "S1(config)# interface range g0/1 - 4\nS1(config-if-range)# channel-group 1 mode active   ! LACP: o padrão aberto (IEEE 802.3ad)\nS1# show etherchannel summary   ! Po1(SU): as 4 portas na mesma avenida"
    : "S1# show spanning-tree\n! G0/1 FWD (encaminhando)   G0/2, G0/3 e G0/4 BLK (bloqueadas, para não dar loop)";
}

async function enviarCarros() {
  if (ec.rodando) return;
  ec.rodando = true;
  const fala = $("[data-ec-fala]");
  // pistas que estão andando
  const abertas = $$(".ec-pista").filter((p) => !p.classList.contains("bloqueada") && !p.classList.contains("cortada"));
  if (!abertas.length) {
    fala.textContent = "🚨 Nenhuma pista aberta! Sem EtherChannel, o STP precisa recalcular para liberar outra (no STP clássico, até uns 50 segundos de rede parada). Ligue o EtherChannel ou recomece.";
    ec.rodando = false;
    return;
  }
  let restantes = 12;
  let rodadas = 0;
  while (restantes > 0) {
    rodadas++;
    abertas.forEach((pista) => {
      if (restantes <= 0) return;
      restantes--;
      const carro = document.createElement("span");
      carro.className = "ec-carro";
      carro.textContent = "🚗";
      pista.appendChild(carro);
      setTimeout(() => carro.remove(), pausado() ? 0 : 900);
    });
    fala.textContent = `Rodada ${rodadas}: faltam ${restantes} carros...`;
    await esperar(950);
  }
  fala.textContent = ec.canal
    ? `✅ ${rodadas} rodadas com ${abertas.length} pistas abertas. Avenida liberada!${ec.cortado ? " E repare: mesmo com um cabo cortado, o trânsito seguiu nas outras pistas, sem esperar o STP." : " Agora tente cortar um cabo."}`
    : `🐢 ${rodadas} rodadas numa pista só: os outros 3 cabos estão parados (bloqueados pelo STP). Ligue "Juntar em EtherChannel" e mande de novo.`;
  ec.rodando = false;
}

function iniciarEtherChannel() {
  desenharPistas();
  const caixa = $('[data-sim="etherchannel"]');
  $("[data-ec-canal]", caixa).addEventListener("change", (e) => {
    ec.canal = e.target.checked;
    desenharPistas();
    $("[data-ec-fala]").textContent = ec.canal
      ? "As 4 pistas viraram uma avenida (Port-channel 1). Para o STP, agora é um caminho só: nada para bloquear."
      : "Sem EtherChannel: o STP vê 4 caminhos e bloqueia 3 para evitar loop.";
  });
  $("[data-ec-enviar]", caixa).addEventListener("click", enviarCarros);
  $("[data-ec-cortar]", caixa).addEventListener("click", () => {
    ec.cortado = true;
    desenharPistas();
    $("[data-ec-fala]").textContent = ec.canal
      ? "Cabo cortado! Com EtherChannel, a avenida perde uma pista, mas continua aberta. Mande os carros."
      : "Cabo cortado... era justamente a única pista aberta! Mande os carros e veja.";
  });
  $("[data-ec-reset]", caixa).addEventListener("click", () => {
    ec.cortado = false;
    desenharPistas();
    $("[data-ec-fala]").textContent = "Tudo de volta. Aperte \"Mandar 12 carros\".";
  });
}


/* 4. DHCP: a recepção do hotel ---------------------------------------- */

const PASSOS_DHCP = [
  { de: "hospede", texto: "Alguém tem um quarto para mim?", tecnico: "DHCPDISCOVER: o PC grita para a rede inteira (broadcast), porque ainda não sabe quem é o servidor." },
  { de: "recepcao", texto: "Temos o quarto 11! Quer?", tecnico: "DHCPOFFER: o servidor oferece um endereço livre do pool: 192.168.10.11." },
  { de: "hospede", texto: "Quero o 11, por favor!", tecnico: "DHCPREQUEST: o PC confirma qual oferta aceitou (pode haver mais de uma recepção na rede)." },
  { de: "recepcao", texto: "Chave entregue. Boa estadia!", tecnico: "DHCPACK: confirmado! O PC recebe o IP, a máscara, o gateway e o DNS, por um tempo (o lease, a diária do hotel)." },
];
let passoDhcp = 0;

function desenharQuartos() {
  const quartos = [];
  for (let n = 1; n <= 14; n++) {
    let classe = "livre";
    let dica = "livre";
    if (n <= 10) {
      classe = "reservado";
      dica = "reservado (gerência)";
    }
    if (n === 11 && passoDhcp >= 4) {
      classe = "ocupado";
      dica = "do hóspede";
    }
    quartos.push(`<span class="dh-quarto ${classe}" title=".${n}: ${dica}">.${n}</span>`);
  }
  $("[data-dh-quartos]").innerHTML = `<strong>Quartos (endereços):</strong> ${quartos.join("")}<small>… até .254 · os .1 a .10 são da gerência (gateway e servidores): <code>ip dhcp excluded-address</code></small>`;
}

async function proximoPassoDhcp() {
  if (passoDhcp >= 4) return;
  const passo = PASSOS_DHCP[passoDhcp];
  passoDhcp++;
  const meio = $("[data-dh-meio]");
  meio.innerHTML = `<span class="dh-balao ${passo.de === "hospede" ? "vai" : "volta"}">${passo.texto}</span>`;
  $$("[data-dh-dora] li").forEach((li) => li.classList.toggle("feito", Number(li.dataset.p) <= passoDhcp));
  $("[data-dh-fala]").textContent = passo.tecnico;
  if (passoDhcp === 4) {
    $("[data-dh-ip]").textContent = "IP: 192.168.10.11 ✅";
    $("[data-dh-cli]").textContent = "R1(config)# ip dhcp excluded-address 192.168.10.1 192.168.10.10\nR1(config)# ip dhcp pool LAN\nR1(dhcp-config)# network 192.168.10.0 255.255.255.0\nR1(dhcp-config)# default-router 192.168.10.1\nR1(dhcp-config)# dns-server 8.8.8.8\n! Servidor em outra rede? No gateway da VLAN: ip helper-address 10.0.0.5";
    $("[data-dh-passo]").disabled = true;
  }
  desenharQuartos();
}

function iniciarDhcp() {
  desenharQuartos();
  $("[data-dh-passo]").addEventListener("click", proximoPassoDhcp);
  $("[data-dh-reset]").addEventListener("click", () => {
    passoDhcp = 0;
    $("[data-dh-meio]").innerHTML = "";
    $("[data-dh-ip]").textContent = "IP: ainda não tem";
    $("[data-dh-cli]").textContent = "";
    $("[data-dh-passo]").disabled = false;
    $$("[data-dh-dora] li").forEach((li) => li.classList.remove("feito"));
    $("[data-dh-fala]").textContent = "O hóspede acabou de chegar. Aperte \"Próximo passo\".";
    desenharQuartos();
  });
}


/* 5. HSRP: o goleiro reserva ---------------------------------------- */

const hs = {
  r1Ligado: true,
  ativo: "R1",       // quem está com a camisa (IP virtual)
  pings: [],
  timer: null,
  trocando: false,
};

function desenharHsrp() {
  const r1 = $("[data-hs-r1]");
  const r2 = $("[data-hs-r2]");
  r1.classList.toggle("caido", !hs.r1Ligado);
  r1.classList.toggle("ativo", hs.ativo === "R1");
  r2.classList.toggle("ativo", hs.ativo === "R2");
  $("[data-hs-e1]").textContent = !hs.r1Ligado ? "🤕 fora de campo" : hs.ativo === "R1" ? "🧤 ATIVO" : "🪑 standby";
  $("[data-hs-e2]").textContent = hs.ativo === "R2" ? "🧤 ATIVO" : "🪑 standby";
  $("[data-hs-ping]").innerHTML = "ping 8.8.8.8: " + hs.pings.slice(-24).map((ok) => (ok ? '<b class="ok">✓</b>' : '<b class="nao">✗</b>')).join("");
}

// a cada segundo, os PCs mandam um ping pelo goleiro ativo
function tickHsrp() {
  const temGoleiro = (hs.ativo === "R1" && hs.r1Ligado) || hs.ativo === "R2";
  hs.pings.push(temGoleiro && !hs.trocando);
  desenharHsrp();
}

async function derrubarR1() {
  if (!hs.r1Ligado) return;
  hs.r1Ligado = false;
  const fala = $("[data-hs-fala]");
  if (hs.ativo === "R1") {
    hs.trocando = true;
    fala.textContent = "O titular caiu! O R2 está no banco esperando os \"hellos\" do R1 (um a cada 3 s)... Sem resposta até o hold time (10 s no padrão), ele assume.";
    desenharHsrp();
    await esperar(4000);
    hs.ativo = "R2";
    hs.trocando = false;
    fala.textContent = "⚽ O R2 vestiu a camisa: agora ele responde pelo 192.168.1.254. Os PCs nem perceberam a troca de goleiro (o IP do gateway é o mesmo). Perderam só alguns pings.";
  } else {
    fala.textContent = "O R1 caiu, mas ele já era reserva: nada muda para os PCs.";
  }
  desenharHsrp();
}

function voltaR1() {
  if (hs.r1Ligado) return;
  hs.r1Ligado = true;
  const preempt = $("[data-hs-preempt]").checked;
  const fala = $("[data-hs-fala]");
  if (preempt) {
    hs.ativo = "R1";
    fala.textContent = "Com preempt, o R1 (prioridade 110, maior) pede a camisa de volta e vira o ativo de novo.";
  } else {
    fala.textContent = "Sem preempt, o R1 volta para o banco: o R2 continua no gol, mesmo com prioridade menor. Ligue o preempt e teste de novo.";
  }
  desenharHsrp();
}

function iniciarHsrp() {
  $("[data-hs-cli]").textContent = "R1(config-if)# standby 1 ip 192.168.1.254   ! a camisa (IP virtual)\nR1(config-if)# standby 1 priority 110\nR1(config-if)# standby 1 preempt\nR1# show standby brief   ! quem está Active e quem está Standby";
  for (let i = 0; i < 8; i++) hs.pings.push(true);
  desenharHsrp();
  hs.timer = setInterval(() => {
    if (!pausado()) tickHsrp();
  }, 1000);
  $("[data-hs-derruba]").addEventListener("click", derrubarR1);
  $("[data-hs-volta]").addEventListener("click", voltaR1);
}


/* 6. Port security: o porteiro --------------------------------------- */

const ps = {
  ligada: true,
  violacoes: 0,
};

function desenharPorta() {
  const porta = $("[data-ps-porta]");
  porta.classList.toggle("errdisabled", !ps.ligada);
  $("[data-ps-estado]").textContent = ps.ligada ? "porta ligada" : "err-disabled (porta desligada)";
  $("[data-ps-contador]").textContent = "violações: " + ps.violacoes;
}

function cliPortsec(modo) {
  return `S1(config)# interface fa0/5\nS1(config-if)# switchport mode access\nS1(config-if)# switchport port-security\nS1(config-if)# switchport port-security maximum 1\nS1(config-if)# switchport port-security mac-address sticky\nS1(config-if)# switchport port-security violation ${modo}\nS1# show port-security interface fa0/5`;
}

function iniciarPortsec() {
  const fala = $("[data-ps-fala]");
  const modo = () => $("[data-ps-modo]").value;
  $("[data-ps-cli]").textContent = cliPortsec(modo());
  desenharPorta();
  $("[data-ps-modo]").addEventListener("change", () => {
    $("[data-ps-cli]").textContent = cliPortsec(modo());
  });
  $("[data-ps-ana]").addEventListener("click", () => {
    fala.textContent = ps.ligada
      ? "✅ O porteiro reconhece o crachá da Ana (o MAC AA:AA:AA:11:11:11, aprendido pelo sticky). Pode entrar."
      : "🚫 A porta está desligada (err-disabled): nem a Ana entra. Alguém precisa religar a porta.";
  });
  $("[data-ps-estranho]").addEventListener("click", () => {
    if (!ps.ligada) {
      fala.textContent = "A porta já está desligada: ninguém passa.";
      return;
    }
    const m = modo();
    if (m === "shutdown") {
      ps.ligada = false;
      ps.violacoes++;
      fala.textContent = "🚨 SHUTDOWN: o porteiro fecha o prédio inteiro. A porta vai para err-disabled (luz apagada) e ninguém entra, nem a Ana, até o técnico religar (shutdown e no shutdown na interface). É o modo padrão.";
    } else if (m === "restrict") {
      ps.violacoes++;
      fala.textContent = "✋ RESTRICT: o estranho é barrado, a Ana continua trabalhando, e o porteiro anota no livro de ocorrências (o contador de violações sobe e o switch avisa no log).";
    } else {
      fala.textContent = "🤫 PROTECT: o estranho é barrado em silêncio. A Ana continua trabalhando, mas nada é anotado: ninguém fica sabendo da tentativa.";
    }
    desenharPorta();
  });
  $("[data-ps-religar]").addEventListener("click", () => {
    ps.ligada = true;
    desenharPorta();
    fala.textContent = "Porta religada (S1(config-if)# shutdown e depois no shutdown). O porteiro voltou ao posto.";
  });
}


/* 7. Desafio relâmpago --------------------------------------------- */
/* Questões originais, escritas para esta turma (nada de dumps). certa = índice da alternativa certa. */

const DESAFIO = [
  {
    tema: "EtherChannel",
    enunciado: "Para que serve o EtherChannel?",
    alternativas: [
      "Juntar vários cabos entre dois switches num link só, somando a velocidade e continuando a funcionar se um cabo cair.",
      "Criar redes sem fio entre os switches.",
      "Dar endereço IP automaticamente para os computadores.",
      "Bloquear computadores desconhecidos nas portas do switch.",
    ],
    certa: 0,
    explicacao: "É a avenida: várias pistas viram uma só. Mais velocidade e, se uma pista fechar, o trânsito continua nas outras.",
  },
  {
    tema: "EtherChannel",
    enunciado: "Há 4 cabos entre dois switches, SEM EtherChannel. O que o STP faz?",
    alternativas: [
      "Usa os 4 cabos ao mesmo tempo.",
      "Bloqueia 3 cabos e deixa só 1 passando tráfego, para evitar loop.",
      "Desliga os dois switches.",
      "Transforma os cabos em Wi-Fi.",
    ],
    certa: 1,
    explicacao: "O STP é o guarda de trânsito que tem medo de loop: com 4 caminhos iguais, ele fecha 3. O EtherChannel resolve porque o STP passa a ver um caminho só.",
  },
  {
    tema: "EtherChannel",
    enunciado: "Qual protocolo é o padrão aberto (IEEE) para negociar um EtherChannel, e funciona com equipamentos de qualquer fabricante?",
    alternativas: ["PAgP", "LACP", "HSRP", "DHCP"],
    certa: 1,
    explicacao: "LACP é o padrão aberto (modos active e passive). O PAgP é da Cisco (modos desirable e auto). Dica: LACP = \"Lá fora também funciona\".",
  },
  {
    tema: "DHCP",
    enunciado: "Qual é a ordem das mensagens do DHCP?",
    alternativas: [
      "Offer, Discover, Ack, Request",
      "Request, Ack, Discover, Offer",
      "Discover, Offer, Request, Ack",
      "Ack, Request, Offer, Discover",
    ],
    certa: 2,
    explicacao: "DORA: o hóspede pergunta (Discover), a recepção oferece (Offer), o hóspede aceita (Request) e recebe a chave (Ack).",
  },
  {
    tema: "DHCP",
    enunciado: "Por que usamos o comando ip dhcp excluded-address 192.168.10.1 192.168.10.10?",
    alternativas: [
      "Para o DHCP não entregar esses endereços, que já são do gateway e dos servidores.",
      "Para bloquear a internet desses computadores.",
      "Para o DHCP entregar só esses 10 endereços.",
      "Para apagar o DHCP do roteador.",
    ],
    certa: 0,
    explicacao: "São os quartos da gerência: a recepção não aluga para hóspede. Assim ninguém recebe o mesmo IP do gateway (conflito).",
  },
  {
    tema: "DHCP",
    enunciado: "Os PCs da VLAN 10 não recebem IP porque o servidor DHCP está em outra rede. O que configurar no gateway da VLAN 10?",
    alternativas: ["ip helper-address com o IP do servidor", "standby 1 ip", "channel-group 1 mode active", "switchport port-security"],
    certa: 0,
    explicacao: "O Discover é um grito (broadcast) e não atravessa o roteador. O ip helper-address é o mensageiro: leva o pedido até a recepção que fica em outro prédio.",
  },
  {
    tema: "HSRP",
    enunciado: "Qual é o objetivo do HSRP?",
    alternativas: [
      "Deixar a rede sem fio mais rápida.",
      "Manter o gateway funcionando mesmo se um roteador cair.",
      "Dar IP automático aos computadores.",
      "Juntar vários cabos num só.",
    ],
    certa: 1,
    explicacao: "É o goleiro reserva: dois roteadores dividem a camisa do gateway. Se o titular cai, o reserva assume e os PCs nem percebem.",
  },
  {
    tema: "HSRP",
    enunciado: "No HSRP, qual endereço os computadores usam como gateway padrão?",
    alternativas: [
      "O IP real do roteador ativo.",
      "O IP real do roteador standby.",
      "O IP virtual do grupo HSRP.",
      "O IP do servidor DHCP.",
    ],
    certa: 2,
    explicacao: "Os PCs apontam para a camisa (o IP virtual), não para o jogador. Por isso a troca de goleiro é invisível para eles.",
  },
  {
    tema: "Port security",
    enunciado: "O que o port security faz numa porta do switch?",
    alternativas: [
      "Limita quais endereços MAC (crachás) podem usar aquela porta.",
      "Criptografa a senha do Wi-Fi.",
      "Escolhe o roteador ativo.",
      "Entrega endereços IP.",
    ],
    certa: 0,
    explicacao: "É o porteiro da tomada: decora o crachá (MAC) de quem pode entrar e reage quando aparece um estranho.",
  },
  {
    tema: "Port security",
    enunciado: "Com o modo de violação shutdown, o que acontece quando um MAC desconhecido aparece na porta?",
    alternativas: [
      "Nada: o estranho entra normalmente.",
      "O estranho é barrado em silêncio, e a porta continua ligada.",
      "A porta é desligada (err-disabled) e ninguém passa até alguém religar.",
      "O switch reinicia.",
    ],
    certa: 2,
    explicacao: "Shutdown fecha o prédio inteiro (é o modo padrão). Restrict barra e anota no livro; protect barra calado.",
  },
];

const desafio = {
  ordem: [],
  atual: 0,
  acertos: 0,
  respondeu: false,
};

function memoji(nome, alt) {
  return `<img class="ev-memoji" src="assets/memoji/${nome}.webp" alt="${alt}" width="64" height="69">`;
}

function comecarDesafio() {
  desafio.ordem = DESAFIO.map((_, i) => i);
  desafio.atual = 0;
  desafio.acertos = 0;
  mostrarQuestao();
}

function mostrarQuestao() {
  const caixa = $("[data-desafio]");
  const q = DESAFIO[desafio.ordem[desafio.atual]];
  desafio.respondeu = false;
  caixa.innerHTML = `
    <p class="ev-placar">Questão ${desafio.atual + 1} de ${DESAFIO.length} · ${q.tema} · acertos: ${desafio.acertos}</p>
    <h3>${q.enunciado}</h3>
    <div class="ev-alts">${q.alternativas.map((a, i) => `<button type="button" data-alt="${i}"><b>${"ABCD"[i]}</b> ${a}</button>`).join("")}</div>
    <div class="ev-retorno" data-retorno></div>`;
}

function responder(indice) {
  if (desafio.respondeu) return;
  desafio.respondeu = true;
  const q = DESAFIO[desafio.ordem[desafio.atual]];
  const acertou = indice === q.certa;
  if (acertou) desafio.acertos++;
  $$("[data-alt]").forEach((b) => {
    const i = Number(b.dataset.alt);
    b.disabled = true;
    if (i === q.certa) b.classList.add("certa");
    if (i === indice && !acertou) b.classList.add("errada");
  });
  const ultima = desafio.atual === DESAFIO.length - 1;
  $("[data-retorno]").innerHTML = `<div class="ev-fala-stela">${acertou ? memoji("sorrindo", "Stela sorrindo") : memoji("ideia", "Stela com uma ideia")}
      <p><strong>${acertou ? "Compilou de primeira!" : "Curto-circuito, mas calma:"}</strong> ${q.explicacao}</p></div>
    <button type="button" class="botao" data-proxima>${ultima ? "Ver o resultado" : "Próxima →"}</button>`;
  $("[data-proxima]").focus();
}

async function terminarDesafio() {
  const caixa = $("[data-desafio]");
  const n = desafio.acertos;
  const total = DESAFIO.length;
  const rosto = n >= 8 ? ["festa", "Stela comemorando"] : n >= 5 ? ["joinha", "Stela fazendo joinha"] : ["punho", "Stela dando força"];
  const frase = n >= 8 ? "Mandou muito! Essa parte do SRWE já é sua." : n >= 5 ? "Bom caminho! Releia as explicações dos erros e refaça." : "Faz parte: é assim que aprende. Volte nos simuladores e tente de novo.";
  caixa.innerHTML = `<div class="ev-fim">${memoji(rosto[0], rosto[1])}<div><p class="ev-nota-grande">${n}/${total}</p><p>${frase}</p>
    <p class="ev-nota" data-salvo>${logado() ? "Soldando…" : "Entre com a sua conta para a professora ver o seu resultado."}</p>
    <button type="button" class="botao contorno" data-refazer>Fazer de novo</button></div></div>`;
  gravarLocal("ccna:desafio:redundancia", { acertos: n, total: total, quando: new Date().toISOString() });
  if (logado()) {
    const ok = await CONTA.salvarTreino("desafio:redundancia", "estudo", n, total);
    $("[data-salvo]").textContent = ok ? "Resultado registrado. A professora já está vendo. 💛" : "Não deu para registrar agora.";
  }
}

function iniciarDesafio() {
  comecarDesafio();
  $("[data-desafio]").addEventListener("click", (e) => {
    const alt = e.target.closest("[data-alt]");
    if (alt) return responder(Number(alt.dataset.alt));
    if (e.target.closest("[data-proxima]")) {
      if (desafio.atual === DESAFIO.length - 1) return terminarDesafio();
      desafio.atual++;
      return mostrarQuestao();
    }
    if (e.target.closest("[data-refazer]")) return comecarDesafio();
  });
}


/* 8. Visão da professora ------------------------------------------- */
/* Lê prep_treinos (termômetro e desafio) e prep_alunos (nomes). O banco só entrega tudo para a professora. */

async function carregarProfessora() {
  const secao = $("#professora");
  if (!logado() || !CONTA.nuvem || !CONTA.nuvem()) {
    secao.hidden = true;
    return;
  }
  const nuvem = CONTA.nuvem();
  const { data: ehProfessora } = await nuvem.rpc("prep_eh_professora");
  secao.hidden = !ehProfessora;
  if (!ehProfessora) return;

  const [treinos, alunos] = await Promise.all([
    nuvem.from("prep_treinos").select("aluno_id, treino, acertos, total, feito_em")
      .eq("preparatorio", "ccna").or("treino.like.termometro:redundancia:%,treino.eq.desafio:redundancia").order("feito_em"),
    nuvem.from("prep_alunos").select("id, nome, email"),
  ]);
  const caixa = $("[data-pf]");
  if (treinos.error) {
    caixa.innerHTML = `<p class="ev-nota">Curto-circuito: ${treinos.error.message}</p>`;
    return;
  }
  const nomes = {};
  (alunos.data || []).forEach((a) => { nomes[a.id] = a.nome; });

  // por aluno: a última nota de cada tema (antes e depois) e o melhor desafio
  const porAluno = {};
  treinos.data.forEach((t) => {
    const a = porAluno[t.aluno_id] || (porAluno[t.aluno_id] = { antes: {}, depois: {}, desafio: null });
    if (t.treino === "desafio:redundancia") {
      a.desafio = Math.max(a.desafio || 0, t.acertos);
      return;
    }
    const [, , quando, tema] = t.treino.split(":");
    a[quando][tema] = t.acertos;
  });

  // médias da turma por tema
  const media = (quando, tema) => {
    const notas = Object.values(porAluno).map((a) => a[quando][tema]).filter((n) => n);
    return notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length) : null;
  };
  const barras = TEMAS.map((t) => {
    const antes = media("antes", t.id);
    const depois = media("depois", t.id);
    const barra = (v, classe) => (v === null ? "<span class=\"ev-nota\">—</span>" : `<span class="pf-barra ${classe}" style="--p:${(v / 5) * 100}"><b>${v.toFixed(1)}</b></span>`);
    return `<div class="pf-tema"><span>${t.ico} ${t.nome}</span><div>${barra(antes, "antes")}${barra(depois, "depois")}</div></div>`;
  }).join("");

  const linhas = Object.entries(porAluno)
    .sort((p, q) => (nomes[p[0]] || "").localeCompare(nomes[q[0]] || "", "pt-BR"))
    .map(([id, a]) => {
      const cel = (tema) => {
        const antes = a.antes[tema];
        const depois = a.depois[tema];
        if (!antes && !depois) return "<td>—</td>";
        const seta = antes && depois ? (depois > antes ? " ⬆️" : depois < antes ? " ⬇️" : "") : "";
        return `<td>${antes ? ROSTOS[antes - 1] : "·"} → ${depois ? ROSTOS[depois - 1] : "·"}${seta}</td>`;
      };
      return `<tr><td>${nomes[id] || "(sem nome)"}</td>${TEMAS.map((t) => cel(t.id)).join("")}<td>${a.desafio === null ? "—" : a.desafio + "/10"}</td></tr>`;
    }).join("");

  caixa.innerHTML = `
    <div class="cartao"><h3>Termômetro da turma (média de 1 a 5)</h3>
      <p class="ev-nota"><span class="pf-leg antes"></span> antes · <span class="pf-leg depois"></span> depois</p>${barras}</div>
    <div class="cartao"><h3>Cada aluno</h3>
      ${linhas ? `<div class="pf-tabela"><table><thead><tr><th>Aluno</th>${TEMAS.map((t) => `<th>${t.ico} ${t.nome}</th>`).join("")}<th>Desafio</th></tr></thead><tbody>${linhas}</tbody></table></div>` : '<p class="ev-nota">Ninguém respondeu ainda.</p>'}</div>`;
  $("[data-pf-hora]").textContent = "✔ atualizado às " + new Date().toLocaleTimeString("pt-BR");
}


/* Começo ------------------------------------------------------------ */

$$("[data-termometro]").forEach(desenharTermometro);
iniciarEtherChannel();
iniciarDhcp();
iniciarHsrp();
iniciarPortsec();
iniciarDesafio();
avisoLogin();
if (window.CONTA && CONTA.aoMudar) {
  CONTA.aoMudar(() => {
    avisoLogin();
    carregarProfessora();
  });
}
carregarProfessora();
$("[data-pf-atualizar]").addEventListener("click", carregarProfessora);
// a visão da professora se atualiza sozinha a cada minuto durante o encontro
setInterval(() => {
  if (!document.hidden && !$("#professora").hidden) carregarProfessora();
}, 60000);
