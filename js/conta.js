/* ===================================================================
   conta.js: login opcional do Preparatório CCNA (piloto · 08/10/2026)
   O site é aberto para todo mundo. Quem entra com a conta (e-mail e senha)
   também guarda o progresso e as notas dos treinos no Supabase, e a
   professora acompanha no painel.html.
   O banco é o mesmo do StelaCore, mas em tabelas próprias (prep_...):
   veja supabase/tabelas-preparatorios.sql.
   A chave abaixo é a PÚBLICA (publishable): a segurança está nas regras
   do banco (RLS). Nunca coloque aqui a chave secreta (service_role).
   =================================================================== */

const CONTA_URL = "https://isnmqovwcmwrzbafpknp.supabase.co";
const CONTA_CHAVE = "sb_publishable_p7CqrA9dQNM9JqjAJm3TKg_jKcvQ2Vp";
const PREPARATORIO = "ccna";

window.CONTA = (function () {
  const nuvem = window.supabase ? window.supabase.createClient(CONTA_URL, CONTA_CHAVE) : null;
  let usuario = null;
  const avisos = [];

  // quem quiser saber quando a pessoa entra ou sai (progresso, treinos)
  function aoMudar(funcao) {
    avisos.push(funcao);
    if (usuario) funcao(usuario);
  }

  // mensagens do Supabase (em inglês) traduzidas para o aluno
  function explicarErro(error, aba) {
    const texto = (error && error.message ? error.message : "").toLowerCase();
    const codigo = error && error.code ? error.code : "";
    if (codigo === "email_not_confirmed" || texto.includes("not confirmed")) {
      return "Falta confirmar o seu e-mail: abra o link que enviamos (confira também o spam) e tente de novo.";
    }
    if (texto.includes("already registered") || codigo === "user_already_exists") {
      return "Este e-mail já tem conta. Use a aba Já tenho conta.";
    }
    if (texto.includes("rate limit") || codigo === "over_email_send_rate_limit") {
      return "Muitas contas criadas agora há pouco. Espere alguns minutos e tente de novo.";
    }
    if (texto.includes("password")) {
      return "A senha precisa ter pelo menos 6 letras ou números.";
    }
    if (aba === "entrar") {
      return "E-mail ou senha não conferem. Ainda não tem conta? Use a aba Criar conta.";
    }
    return "Não deu para criar a conta agora. Confira o e-mail e tente de novo.";
  }

  const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const primeiroNome = (u) => ((u && u.user_metadata && u.user_metadata.nome) || (u && u.email) || "").split(/[\s@]/)[0];

  // cadastro do aluno e registro do acesso a este preparatório
  async function registrar(u) {
    const nome = (u.user_metadata && u.user_metadata.nome) || u.email.split("@")[0];
    await nuvem.from("prep_alunos").upsert({ id: u.id, nome: nome, email: u.email });
    await nuvem.from("prep_acessos").upsert({ aluno_id: u.id, preparatorio: PREPARATORIO, ultimo_acesso: new Date().toISOString() });
  }

  function mudou(u) {
    usuario = u;
    atualizarBotao();
    if (u) registrar(u).catch(() => {});
    avisos.forEach((funcao) => funcao(u));
  }

  /* ---------- o que os outros scripts usam ---------- */

  async function carregarProgresso() {
    if (!usuario) return null;
    const { data, error } = await nuvem
      .from("prep_progresso")
      .select("item, feito")
      .eq("aluno_id", usuario.id)
      .eq("preparatorio", PREPARATORIO);
    if (error) return null;
    const feito = {};
    data.forEach((linha) => {
      feito[linha.item] = linha.feito;
    });
    return feito;
  }

  async function salvarProgresso(itens) {
    if (!usuario) return;
    const linhas = Object.keys(itens).map((item) => ({
      aluno_id: usuario.id,
      preparatorio: PREPARATORIO,
      item: item,
      feito: Boolean(itens[item]),
      atualizado_em: new Date().toISOString(),
    }));
    if (linhas.length) await nuvem.from("prep_progresso").upsert(linhas);
  }

  async function salvarTreino(treino, modo, acertos, total) {
    if (!usuario) return false;
    const { error } = await nuvem.from("prep_treinos").insert({
      aluno_id: usuario.id,
      preparatorio: PREPARATORIO,
      treino: treino,
      modo: modo,
      acertos: acertos,
      total: total,
    });
    return !error;
  }

  /* ---------- botão na barra e janela de login ---------- */

  const botao = document.createElement("button");
  botao.type = "button";
  botao.id = "btn-conta";
  botao.setAttribute("aria-haspopup", "dialog");
  botao.textContent = "Entrar";

  function atualizarBotao() {
    botao.textContent = usuario ? "Olá, " + primeiroNome(usuario) : "Entrar";
    botao.title = usuario ? "Conectado como " + usuario.email : "Entrar para salvar o progresso na nuvem (opcional)";
  }

  const janela = document.createElement("dialog");
  janela.className = "conta-janela";
  janela.setAttribute("aria-labelledby", "conta-titulo");

  function desenharJanela() {
    if (usuario) {
      janela.innerHTML = `
        <h2 id="conta-titulo">Sua conta</h2>
        <p>Conectado como <strong>${escapar(usuario.email)}</strong>. Seu progresso e as notas dos treinos estão sendo guardados.</p>
        <div class="conta-botoes">
          <button type="button" data-acao="sair">Sair</button>
          <button type="button" data-acao="fechar" class="sec">Fechar</button>
        </div>`;
      return;
    }
    janela.innerHTML = `
      <h2 id="conta-titulo">Entrar (opcional)</h2>
      <p class="conta-explica">O site funciona sem login. Entrando, o seu progresso e as notas dos treinos ficam guardados
        na nuvem: você recupera tudo em outro computador, e a professora acompanha a turma.</p>
      <div class="conta-abas" role="tablist">
        <button type="button" role="tab" aria-selected="true" data-aba="entrar">Já tenho conta</button>
        <button type="button" role="tab" aria-selected="false" data-aba="criar">Criar conta</button>
      </div>
      <form class="conta-form" novalidate>
        <label class="so-criar" hidden>Nome completo<input name="nome" autocomplete="name"></label>
        <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
        <label>Senha<input name="senha" type="password" autocomplete="current-password" minlength="6" required></label>
        <p class="conta-msg" aria-live="polite"></p>
        <div class="conta-botoes">
          <button type="submit">Entrar</button>
          <button type="button" data-acao="fechar" class="sec">Cancelar</button>
        </div>
        <p class="conta-lgpd">Guardamos só o seu nome, o e-mail, os módulos marcados e as notas dos treinos, para a
          professora acompanhar a turma. Nada é compartilhado.</p>
      </form>`;
    let aba = "entrar";
    const form = janela.querySelector("form");
    const msg = janela.querySelector(".conta-msg");
    janela.querySelectorAll("[data-aba]").forEach((b) => {
      b.addEventListener("click", () => {
        aba = b.dataset.aba;
        janela.querySelectorAll("[data-aba]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
        janela.querySelector(".so-criar").hidden = aba !== "criar";
        form.querySelector('button[type="submit"]').textContent = aba === "criar" ? "Criar conta" : "Entrar";
        form.senha.autocomplete = aba === "criar" ? "new-password" : "current-password";
        msg.textContent = "";
      });
    });
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const email = form.email.value.trim();
      const senha = form.senha.value;
      const nome = form.nome.value.trim();
      if (!email || senha.length < 6 || (aba === "criar" && nome.length < 2)) {
        msg.textContent = aba === "criar" ? "Preencha o nome, o e-mail e uma senha de pelo menos 6 letras ou números." : "Preencha o e-mail e a senha.";
        return;
      }
      msg.textContent = "Um instante…";
      if (aba === "criar") {
        // o link de confirmação do e-mail volta para esta página (o endereço precisa estar nas Redirect URLs do Supabase)
        const voltarPara = location.origin + location.pathname.replace(/[^/]*$/, "");
        const { data, error } = await nuvem.auth.signUp({ email: email, password: senha, options: { data: { nome: nome }, emailRedirectTo: voltarPara } });
        if (error) {
          msg.textContent = explicarErro(error, "criar");
        } else if (!data.session) {
          msg.textContent = "Conta criada! Confira o seu e-mail e clique no link de confirmação. Depois, entre aqui.";
        } else {
          janela.close();
        }
      } else {
        const { error } = await nuvem.auth.signInWithPassword({ email: email, password: senha });
        if (error) {
          msg.textContent = explicarErro(error, "entrar");
        } else {
          janela.close();
        }
      }
    });
  }

  janela.addEventListener("click", async (ev) => {
    const acao = ev.target.dataset && ev.target.dataset.acao;
    if (acao === "fechar") janela.close();
    if (acao === "sair") {
      await nuvem.auth.signOut();
      janela.close();
    }
  });

  botao.addEventListener("click", () => {
    desenharJanela();
    janela.showModal();
  });

  // o botão entra na barra, antes do link da Stela
  const ajustes = document.querySelector(".barra .ajustes");
  if (nuvem && ajustes) {
    ajustes.insertBefore(botao, ajustes.querySelector(".marca"));
    document.body.appendChild(janela);
    nuvem.auth.getSession().then(({ data }) => mudou(data.session ? data.session.user : null));
    nuvem.auth.onAuthStateChange((evento, sessao) => {
      const u = sessao ? sessao.user : null;
      if ((u && u.id) !== (usuario && usuario.id)) mudou(u);
    });
  }

  return { aoMudar, carregarProgresso, salvarProgresso, salvarTreino, nuvem: () => nuvem, usuario: () => usuario };
})();
