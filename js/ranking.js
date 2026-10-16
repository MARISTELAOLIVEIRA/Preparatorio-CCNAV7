/* ==============================================================
   Ranking da turma (treinos.html e revisao-itn.html)
   Mostra a soma do melhor XP de cada fase da Maratona de sub-redes e de
   cada minijogo da Revisão do ITN, de quem entrou com a conta.
   Os dados vêm da função prep_ranking do Supabase (supabase/tabelas-preparatorios.sql),
   que devolve só o primeiro nome, a inicial do sobrenome e o XP.
   Usa window.CONTA, de js/conta.js.
   ============================================================== */

window.RANKING = (function ranking() {
  const caixas = [...document.querySelectorAll("[data-ranking]")];

  const criar = (tag, classe, texto) => {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  };

  const MEDALHAS = { 1: "🥇", 2: "🥈", 3: "🥉" };

  // Escreve a mesma mensagem ou a mesma tabela em todas as caixas da página
  function mostrar(montar) {
    caixas.forEach((caixa) => {
      const lista = caixa.querySelector(".ranking-lista");
      lista.innerHTML = "";
      montar(lista);
    });
  }

  const aviso = (texto) => mostrar((lista) => lista.appendChild(criar("p", "placar", texto)));

  async function atualizar() {
    if (!caixas.length) return;
    if (!window.CONTA || !CONTA.nuvem()) {
      aviso("O ranking precisa de internet. Confira a conexão e recarregue a página.");
      return;
    }
    if (!CONTA.usuario()) {
      aviso("Entre com a sua conta (botão Entrar, no topo) para ver o ranking e aparecer nele. Sem login, o seu XP fica só neste navegador.");
      return;
    }

    aviso("Carregando o ranking…");
    const dados = await CONTA.ranking();
    if (dados === null) {
      aviso("O ranking ainda não foi ativado. Assim que a professora ativar, ele aparece aqui. O seu XP já está guardado.");
      return;
    }
    if (!dados.length) {
      aviso("Ninguém pontuou ainda. Jogue a Maratona ou a Revisão e seja o primeiro!");
      return;
    }

    mostrar((lista) => {
      const tabela = criar("table", "ranking-tabela");
      const cabeca = criar("tr");
      ["#", "Aluno", "Revisão", "Maratona", "Total"].forEach((titulo) => {
        const th = criar("th", "", titulo);
        th.scope = "col";
        cabeca.appendChild(th);
      });
      tabela.appendChild(criar("thead")).appendChild(cabeca);

      const corpo = criar("tbody");
      dados.forEach((linha) => {
        const tr = criar("tr", linha.eu ? "ranking-eu" : "");
        tr.append(
          criar("td", "ranking-pos", MEDALHAS[linha.posicao] || linha.posicao + "º"),
          criar("td", "", linha.nome + (linha.eu ? " (você)" : "")),
          criar("td", "", linha.xp_revisao + " XP"),
          criar("td", "", linha.xp_maratona + " XP"),
          criar("td", "ranking-total", linha.xp_total + " XP"),
        );
        corpo.appendChild(tr);
      });
      tabela.appendChild(corpo);
      lista.appendChild(tabela);

      if (!dados.some((linha) => linha.eu)) {
        lista.appendChild(criar("p", "placar", "Você ainda não aparece: termine uma fase da Maratona ou um minijogo da Revisão."));
      }
    });
  }

  caixas.forEach((caixa) => {
    const botao = caixa.querySelector(".ranking-atualizar");
    if (botao) botao.addEventListener("click", atualizar);
  });

  if (window.CONTA) CONTA.aoMudar(atualizar);
  atualizar();

  return { atualizar };
})();
