/* ===================================================================
   painel.js: o painel da professora (piloto CCNA · 08/10/2026)
   Mostra quem entrou no preparatório, os módulos marcados e as notas dos
   treinos. Só aparece para quem está em prep_professoras (veja o SQL em
   supabase/tabelas-preparatorios.sql): para os outros, o banco não entrega nada.
   =================================================================== */

(function painel() {
  const $ = (s) => document.querySelector(s);
  const status = $("#painelStatus");
  const acoes = $("#painelAcoes");
  const caixa = $("#painelTabela");
  let linhas = [];

  if (!window.CONTA) {
    status.textContent = "Não foi possível carregar o login. Confira a internet e recarregue a página.";
    return;
  }

  const escapar = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const data = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");

  async function carregar() {
    const nuvem = CONTA.nuvem();
    status.textContent = "Carregando a turma…";

    const { data: ehProfessora } = await nuvem.rpc("prep_eh_professora");
    if (!ehProfessora) {
      status.textContent = "Este painel é só da professora. A sua conta não tem acesso.";
      acoes.hidden = true;
      caixa.innerHTML = "";
      return;
    }

    const [acessos, alunos, progresso, treinos] = await Promise.all([
      nuvem.from("prep_acessos").select("aluno_id, ultimo_acesso").eq("preparatorio", PREPARATORIO),
      nuvem.from("prep_alunos").select("id, nome, email"),
      nuvem.from("prep_progresso").select("aluno_id, item, feito").eq("preparatorio", PREPARATORIO).eq("feito", true),
      nuvem.from("prep_treinos").select("aluno_id, treino, acertos, total, feito_em").eq("preparatorio", PREPARATORIO).order("feito_em"),
    ]);
    const erro = [acessos, alunos, progresso, treinos].find((r) => r.error);
    if (erro) {
      status.textContent = "O banco respondeu com erro: " + erro.error.message + ". As tabelas já foram criadas no Supabase?";
      return;
    }

    const porId = {};
    alunos.data.forEach((a) => {
      porId[a.id] = a;
    });

    linhas = acessos.data
      .map((acesso) => {
        const aluno = porId[acesso.aluno_id] || { nome: "(sem cadastro)", email: "" };
        const feitos = progresso.data.filter((p) => p.aluno_id === acesso.aluno_id).map((p) => p.item);
        const cursos = {};
        Object.keys(MODULOS).forEach((curso) => {
          cursos[curso] = feitos.filter((item) => item.startsWith(curso + "-")).length + " de " + MODULOS[curso].length;
        });
        const seus = treinos.data.filter((t) => t.aluno_id === acesso.aluno_id);
        const pct = (t) => Math.round((t.acertos / t.total) * 100);
        const melhor = seus.length ? Math.max(...seus.map(pct)) + "%" : "";
        const ultimo = seus.length ? pct(seus[seus.length - 1]) + "% em " + data(seus[seus.length - 1].feito_em) : "";
        return { nome: aluno.nome, email: aluno.email, acesso: data(acesso.ultimo_acesso), cursos, treinos: seus.length, melhor, ultimo };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    status.textContent = linhas.length
      ? `${linhas.length} ${linhas.length === 1 ? "aluno entrou" : "alunos entraram"} no preparatório.`
      : "Nenhum aluno entrou ainda. Quando a turma criar as contas, eles aparecem aqui.";
    acoes.hidden = false;

    const cursos = Object.keys(MODULOS);
    caixa.innerHTML = linhas.length
      ? `<table>
          <thead><tr><th scope="col">Aluno</th><th scope="col">Último acesso</th>${cursos.map((c) => `<th scope="col">${c}</th>`).join("")}<th scope="col">Treinos</th><th scope="col">Melhor nota</th><th scope="col">Último treino</th></tr></thead>
          <tbody>${linhas
            .map(
              (l) => `<tr><th scope="row">${escapar(l.nome)}<small>${escapar(l.email)}</small></th><td>${l.acesso}</td>${cursos
                .map((c) => `<td>${l.cursos[c]}</td>`)
                .join("")}<td>${l.treinos}</td><td>${l.melhor}</td><td>${l.ultimo}</td></tr>`,
            )
            .join("")}</tbody>
        </table>`
      : "";
  }

  // planilha para abrir no Excel (separada por ponto e vírgula)
  $("#painelCsv").addEventListener("click", () => {
    const cursos = Object.keys(MODULOS);
    const cab = ["Aluno", "E-mail", "Último acesso", ...cursos, "Treinos", "Melhor nota", "Último treino"];
    const corpo = linhas.map((l) => [l.nome, l.email, l.acesso, ...cursos.map((c) => l.cursos[c]), l.treinos, l.melhor, l.ultimo]);
    const csv = [cab, ...corpo].map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    link.download = "turma-" + PREPARATORIO + ".csv";
    link.click();
  });

  $("#painelAtualizar").addEventListener("click", carregar);

  CONTA.aoMudar((usuario) => {
    if (usuario) {
      carregar();
    } else {
      status.innerHTML = "Entre com a sua conta de professora (botão <strong>Entrar</strong>, no topo) para ver a turma.";
      acoes.hidden = true;
      caixa.innerHTML = "";
    }
  });
})();
