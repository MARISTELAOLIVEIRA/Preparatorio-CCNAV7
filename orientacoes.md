# Site do Preparatório CCNA — instruções para o Claude Code

Este repositório contém o site do preparatório CCNA da Profa. Maristela Oliveira (Academia Cisco da Faculdade de Tecnologia e Inovação Senac-DF), publicado no GitHub Pages. Ele também é o **modelo-base** para os sites das outras disciplinas e preparatórios dela.

## Visão geral

- Site estático em arquivos separados e formatados, para facilitar a manutenção e o estudo do código pela professora: `index.html` e `treinos.html` (estrutura), `css/estilo.css` (visual, compartilhado), `js/dados.js` e `js/questoes.js` (conteúdo), `js/site.js` e `js/treinos.js` (funções). Não há build, framework nem dependências.
- Será publicado no GitHub Pages a partir da branch `main`, na raiz.
- Idioma: português do Brasil. Público: alunos do preparatório (matrícula aberta à comunidade, não necessariamente alunos da faculdade).
- `gerador-area-turma.html` é uma ferramenta **local** da professora. **Não deve ser publicada** (mantê-la fora do repositório publicado ou no `.gitignore`).

## Estrutura dos arquivos

1. `index.html`: só a estrutura. Seções, nesta ordem: topo fixo, hero (terminal com traceroute), Próximo encontro, Cronograma, Meu progresso, Vídeos, Treinos, Prova e voucher, Área da turma (protegida), Links. A seção Treinos é só um cartão com link para `treinos.html`. Carrega o CSS e os dois scripts com `defer`, nessa ordem: `dados.js` antes de `site.js`.
2. `css/estilo.css`: tokens de cor em `:root` e todo o CSS, dividido em seções numeradas com índice no topo. Sem `style=""` no HTML.
3. `js/dados.js` (**edite aqui**). Quase toda atualização de conteúdo acontece só nesse arquivo:
   - `LINKS_TURMA`: links públicos (NetAcad, Binary Game, Pearson VUE).
   - `ENCONTROS`: data (AAAA-MM-DD), curso, título, laboratório, desafio e tarefas da quinzena de cada sábado.
   - `MODULOS` e `NOMES`: módulos dos cursos ITN, SRWE e ENSA.
   - `VIDEOS`: lista numerada dos vídeos (as URLs reais ficam na área protegida, não aqui).
   - `AREA_TURMA`: conteúdo criptografado da área da turma (ver abaixo).
4. `js/site.js`: funções da página, uma seção por recurso: próximo encontro calculado pela data atual, linha do tempo, progresso salvo em `localStorage`, filtro de vídeos e área da turma.
5. `treinos.html` + `js/treinos.js`: simulado CCNA (modo estudo, com feedback a cada resposta, e modo prova, com cronômetro e resultado por tópico) e treino de sub-redes.
6. `js/questoes.js` (**edite aqui**): `TOPICOS` (tópicos oficiais do exame 200-301) e `QUESTOES`, com tipos `unica`, `multipla` e `associar`. Os campos estão documentados no topo do arquivo.
7. `assets/`: `favicon.svg` (o ">_" neon no hexágono), `favicon-32.png` e `apple-touch-icon.png` (versões PNG), `banner.svg` e as capturas de tela usadas no README. As duas páginas apontam para o favicon no `<head>`.
8. `README.md`: escrito para os alunos, com humor de redes e o estilo cyberpunk do site. A seção da professora fica recolhida no final.
9. Scripts comuns (não `type="module"`), para o site abrir com duplo clique, sem servidor.

## Estilo do código

- A professora estuda e contribui com o código: priorizar legibilidade. Uma declaração por linha, indentação de 2 espaços, nomes descritivos em português e comentários curtos explicando o porquê.
- Nada de código compactado ou minificado.

## Questões do simulado

- Questões **originais**, no estilo da prova CCNA 200-301 (temas, formato e pegadinhas comuns). **Nunca** copiar questões de dumps nem de sites que publicam "questões que caíram na prova": elas violam o NDA da Cisco e costumam ter gabarito errado.
- Não publicar material da NetAcad (atividades `.pka`, checkpoints e exames): tem direitos autorais da Cisco. Para usá-lo, colocar o link para a NetAcad ou para o arquivo no Teams/Moodle, na área protegida.
- A cada tentativa, o simulado sorteia a quantidade escolhida (10, 15, 30 ou todas), dando prioridade às questões que não caíram na tentativa anterior, e embaralha questões e opções. Quanto maior o banco, melhor.
- Arquivos `.pkt` criados pela professora podem ir para a pasta `exercicios/` e ser ligados pelo campo `pkt` da questão.

## Área da turma (protegida por senha)

- Conteúdo protegido: links do Teams, do Moodle, do grupo de avisos e URLs dos vídeos.
- Formato: JSON `{"links":[{"t","d","u"}], "videos":{"1":"url"}}`, criptografado com **AES-GCM 256**, chave derivada da senha por **PBKDF2-SHA-256 com 250.000 iterações**. O valor de `AREA_TURMA` é base64 de `salt (16 bytes) + iv (12 bytes) + texto cifrado`.
- Para atualizar: a professora usa o `gerador-area-turma.html` e cola o resultado em `AREA_TURMA`, no `js/dados.js`. Se for gerar por código, use exatamente esses parâmetros.
- **Nunca** colocar links da turma, URLs de vídeos ou a senha em texto aberto no `index.html`, no `js/dados.js`, em commits ou em mensagens de commit.
- A senha é trocada a cada semestre.

## Identidade visual (estilo cyberpunk da professora)

- Fundo noite roxa `#0D0221`, painéis `#190A3A`, texto `#EDE7FF`, texto suave `#B3A6DA`, linhas `#3D2775`.
- Cores de destaque por curso (como cabos de rede): ITN ciano `#05D9E8`, SRWE amarelo `#F9F002`, ENSA magenta `#FF2A6D`. Sucesso `#39FF9E`, erro `#FF5C7A`.
- Fontes (Google Fonts): Chakra Petch (títulos e interface), IBM Plex Sans (texto), Share Tech Mono (terminal e dados).
- Elementos característicos: título com brilho neon e glitch único ao carregar; grade synthwave e scanlines no hero; cantos cortados (`.corte`); hexágonos no cronograma; títulos de seção com `//`; assinatura `> Profa. Maristela_`.
- Ao criar o site de outra disciplina: manter a base e trocar as cores de destaque e os dados.

## Regras de qualidade

- Manter HTML, CSS e JavaScript em arquivos separados, sem dependências além do Google Fonts.
- Responsivo até 360 px de largura; foco de teclado visível; respeitar `prefers-reduced-motion` (glitch, cursor e animações desligados).
- `localStorage` e `sessionStorage` sempre dentro de `try/catch`.
- Textos em linguagem simples, voz ativa, frases curtas, sem caixa alta em rótulos.
- Antes de publicar, testar: próximo encontro correto, abrir e fechar encontros, marcar módulos, filtrar vídeos, senha errada e senha certa na área da turma; na página de treinos, treino de sub-redes e simulado nos dois modos (estudo e prova).

## Contexto da professora (para orientar as sugestões)

- Sala de aula invertida: teoria em casa (NetAcad + vídeos curtos de 8 a 12 min), prática nos encontros de sábado (8h30 às 11h50, sábados alternados com o preparatório AWS).
- Os encontros são **online, ao vivo pelo Microsoft Teams**, e gravados. Não há atividades em dupla: a professora demonstra com a tela compartilhada, cada aluno reproduz no próprio Packet Tracer e a participação acontece pelo chat (prints, respostas, rankings). Quizzes e mini-simulados ficam no Microsoft Forms.
- Em 02/10/2026, nenhum vídeo tinha sido gravado. Os vídeos aparecem como "Em breve" e a gravação do encontro no Teams faz esse papel. Não escreva textos que dependam de o aluno já ter assistido a um vídeo.
- Usa NetAcad, Packet Tracer, Microsoft Teams, Loop, Whiteboard, Moodle, GitHub e IA com uso consciente (GitHub Copilot e Copilot do Microsoft 365).
- Não usa slides: os sites substituem as apresentações.
- Os vídeos ficam no Teams/Stream (acesso só da turma); o site guarda apenas os links, na área protegida.
