/* ==============================================================
   TRILHA DE REVISÃO DO ITN (edite aqui)
   Conteúdo original, escrito para o preparatório (nada copiado da NetAcad).
   As funções que usam este arquivo ficam em js/revisao.js.

   Cada estação tem
   - titulo, modulos: o nome e os módulos do ITN que ela revisa
   - resumo:   frases curtas (o essencial)
   - lembrar:  um truque para memorizar
   - jogos:    a lista de minijogos da estação

   Tipos de minijogo (campo "tipo")
   - "quiz":       perguntas de uma resposta. perguntas: [{ p, opcoes, certa, exp }]
                   (certa = índice da opção certa; a primeira é 0)
   - "ordenar":    clicar os itens na ordem certa. itens: na ordem CERTA (o jogo embaralha)
   - "memoria":    jogo da memória. pares: [[carta A, carta B]]
   - "classificar": cada item vai para um grupo. grupos: [nomes]; itens: [[item, grupo certo]]
   - "bits":       ligar e desligar os 8 bits até formar o número. alvos: [números]
   - "digitar":    escrever a resposta. perguntas: [{ p, dado, respostas: [aceitas], exp }]
   - "terminal":   digitar os comandos do IOS. passos: [{ prompt, missao, cmd }]
                   No cmd, as palavras do IOS aceitam abreviação (conf t);
                   as que começam com = são valores e têm de ser exatas (=S1).
                   cmd também pode ser uma lista de comandos aceitos.

   Toda opção, item e carta aparece embaralhada para o aluno.
   ============================================================== */


const ESTACOES = [
  /* 1 ------------------------------------------------------------ */
  {
    titulo: "Camadas: OSI e TCP/IP",
    modulos: "ITN módulo 3",
    resumo: [
      "O modelo OSI tem 7 camadas; o TCP/IP tem 4: aplicação, transporte, internet e acesso à rede.",
      "Na ida, cada camada põe o seu cabeçalho (encapsulamento). Na volta, cada uma tira o seu.",
      "Nome do pedaço em cada camada (PDU): dados, segmento, pacote, quadro e bits.",
      "Endereço de cada camada: porta (transporte), IP (rede) e MAC (enlace).",
    ],
    lembrar: "De baixo para cima: Fui Encontrar Ricardo Tomando Sorvete Ali Atrás (Física, Enlace, Rede, Transporte, Sessão, Apresentação, Aplicação).",
    jogos: [
      {
        tipo: "ordenar",
        titulo: "Monte a pilha OSI",
        instrucao: "Clique nas camadas de baixo para cima: da camada 1 até a 7.",
        itens: ["Física", "Enlace", "Rede", "Transporte", "Sessão", "Apresentação", "Aplicação"],
      },
      {
        tipo: "memoria",
        titulo: "Memória das PDUs",
        instrucao: "Ache os pares: cada camada com o nome do seu pedaço de dados.",
        pares: [
          ["Aplicação", "Dados"],
          ["Transporte", "Segmento"],
          ["Rede", "Pacote"],
          ["Enlace", "Quadro"],
          ["Física", "Bits"],
        ],
      },
      {
        tipo: "classificar",
        titulo: "Em que camada mora?",
        instrucao: "Mande cada coisa para a camada OSI onde ela trabalha.",
        grupos: ["Camada 1", "Camada 2", "Camada 3", "Camada 4"],
        itens: [
          ["Hub", "Camada 1"],
          ["Cabo UTP", "Camada 1"],
          ["Switch", "Camada 2"],
          ["Endereço MAC", "Camada 2"],
          ["Roteador", "Camada 3"],
          ["Endereço IP", "Camada 3"],
          ["Porta TCP 443", "Camada 4"],
          ["UDP", "Camada 4"],
        ],
      },
    ],
  },

  /* 2 ------------------------------------------------------------ */
  {
    titulo: "Cabos, Ethernet e o switch",
    modulos: "ITN módulos 4, 6 e 7",
    resumo: [
      "Cabo direto liga aparelhos de tipos diferentes (PC no switch). Cabo cruzado liga iguais (switch com switch, PC com PC, PC com roteador). Hoje o Auto-MDIX acerta isso sozinho na maioria das portas.",
      "Fibra monomodo vai longe (laser); multimodo é para distâncias curtas.",
      "O MAC tem 48 bits, escritos em 12 dígitos hexadecimais. Os 24 primeiros (OUI) dizem o fabricante.",
      "O switch aprende o MAC de ORIGEM de cada quadro e encaminha pelo MAC de DESTINO. Destino desconhecido: ele inunda (flooding) todas as portas da VLAN, menos a de entrada.",
    ],
    lembrar: "Aparelho igual com igual, cabo cruzado. O switch aprende de quem manda e entrega para quem recebe.",
    jogos: [
      {
        tipo: "classificar",
        titulo: "Direto ou cruzado?",
        instrucao: "Sem Auto-MDIX, qual cabo liga cada par de aparelhos?",
        grupos: ["Cabo direto", "Cabo cruzado"],
        itens: [
          ["PC → switch", "Cabo direto"],
          ["Switch → roteador", "Cabo direto"],
          ["PC → hub", "Cabo direto"],
          ["Switch → switch", "Cabo cruzado"],
          ["PC → PC", "Cabo cruzado"],
          ["PC → roteador", "Cabo cruzado"],
          ["Roteador → roteador", "Cabo cruzado"],
          ["Hub → switch", "Cabo cruzado"],
        ],
      },
      {
        tipo: "quiz",
        titulo: "Dentro do switch",
        instrucao: "O que acontece dentro do switch? Responda e leia a explicação.",
        perguntas: [
          {
            p: "A tabela MAC está vazia. PC-A, na porta Fa0/1, manda um quadro para PC-C. O que o switch anota na tabela?",
            opcoes: ["O MAC do PC-A na porta Fa0/1", "O MAC do PC-C na porta Fa0/1", "O IP do PC-A na porta Fa0/1", "Nada: só anota quando o destino responde"],
            certa: 0,
            exp: "O switch aprende sempre pelo MAC de origem: anota que o PC-A está na Fa0/1.",
          },
          {
            p: "Com a tabela MAC vazia, chega um quadro para o PC-C pela porta Fa0/1. O que o switch faz com ele?",
            opcoes: ["Inunda todas as portas da VLAN, menos a Fa0/1", "Descarta o quadro", "Manda um ARP para achar o PC-C", "Devolve o quadro para o PC-A"],
            certa: 0,
            exp: "Destino desconhecido = flooding. Quando o PC-C responder, o switch aprende a porta dele e passa a entregar direto.",
          },
          {
            p: "Qual é o MAC de broadcast, que todo switch inunda?",
            opcoes: ["FF-FF-FF-FF-FF-FF", "00-00-00-00-00-00", "01-00-5E-00-00-01", "255.255.255.255"],
            certa: 0,
            exp: "Os 48 bits ligados: FF-FF-FF-FF-FF-FF. O 255.255.255.255 é o broadcast de IPv4, na camada 3.",
          },
          {
            p: "Quantos bits tem um endereço MAC?",
            opcoes: ["48", "32", "64", "128"],
            certa: 0,
            exp: "48 bits = 12 dígitos hexadecimais (cada dígito hexa vale 4 bits). 32 é o IPv4 e 128 é o IPv6.",
          },
        ],
      },
    ],
  },

  /* 3 ------------------------------------------------------------ */
  {
    titulo: "Binário e hexadecimal",
    modulos: "ITN módulo 5",
    resumo: [
      "Um octeto tem 8 bits. Os pesos, da esquerda para a direita: 128, 64, 32, 16, 8, 4, 2 e 1.",
      "Para ir de binário a decimal, some os pesos dos bits 1. Para ir de decimal a binário, tire o maior peso que cabe, do 128 ao 1.",
      "Cada dígito hexadecimal vale 4 bits: de 0 a 9 e de A (10) a F (15).",
      "Os números das máscaras se repetem sempre: 128, 192, 224, 240, 248, 252, 254 e 255.",
    ],
    lembrar: "Os pesos dobram da direita para a esquerda: 1, 2, 4, 8, 16, 32, 64, 128. Oito bits ligados = 255.",
    jogos: [
      {
        tipo: "bits",
        titulo: "Liga e desliga",
        instrucao: "Clique nos bits para formar o número. O placar mostra a soma na hora.",
        alvos: [192, 168, 10, 255, 224, 172, 100, 63, 240, 129],
        rodada: 6,
      },
      {
        tipo: "memoria",
        titulo: "Memória hexadecimal",
        instrucao: "Ache cada dígito hexadecimal com os seus 4 bits.",
        pares: [
          ["A", "1010"],
          ["F", "1111"],
          ["8", "1000"],
          ["C", "1100"],
          ["5", "0101"],
          ["3", "0011"],
        ],
      },
    ],
  },

  /* 4 ------------------------------------------------------------ */
  {
    titulo: "Endereços IPv4",
    modulos: "ITN módulo 11",
    resumo: [
      "O IPv4 tem 32 bits em 4 octetos. A máscara separa a parte de rede da parte de host.",
      "Faixas privadas (não saem para a internet sem NAT): 10.0.0.0/8, 172.16.0.0/12 (de 172.16 a 172.31) e 192.168.0.0/16.",
      "127.0.0.1 é o loopback: o computador falando com ele mesmo.",
      "169.254.x.x (APIPA) aparece quando o PC pediu IP ao DHCP e ninguém respondeu.",
      "De 224 a 239 no primeiro octeto: multicast.",
    ],
    lembrar: "Privados: 10, 172.16 a 172.31 e 192.168. Viu 169.254? O DHCP não respondeu.",
    jogos: [
      {
        tipo: "classificar",
        titulo: "Privado, público ou especial?",
        instrucao: "Classifique cada endereço.",
        grupos: ["Privado", "Público", "Especial"],
        itens: [
          ["10.5.5.5", "Privado"],
          ["172.20.1.1", "Privado"],
          ["192.168.100.1", "Privado"],
          ["172.32.0.1", "Público"],
          ["8.8.8.8", "Público"],
          ["192.169.1.1", "Público"],
          ["127.0.0.1", "Especial"],
          ["169.254.10.20", "Especial"],
          ["224.0.0.5", "Especial"],
        ],
      },
      {
        tipo: "quiz",
        titulo: "Caso do laboratório",
        instrucao: "Leia o caso e responda.",
        perguntas: [
          {
            p: "Um aluno roda ipconfig e vê o IP 169.254.33.7. O que aconteceu?",
            opcoes: ["O PC não recebeu resposta do servidor DHCP", "O PC recebeu um IP público", "O DNS está fora do ar", "O IP foi digitado à mão errado"],
            certa: 0,
            exp: "169.254.x.x é o APIPA: o Windows se dá esse IP quando o DHCP não responde. Confira o cabo, a VLAN e o servidor DHCP.",
          },
          {
            p: "Qual destes endereços pode ser usado numa LAN sem pedir IP à operadora?",
            opcoes: ["172.31.200.10", "172.33.1.1", "11.0.0.1", "193.168.0.1"],
            certa: 0,
            exp: "172.31 ainda está na faixa privada 172.16.0.0/12, que vai de 172.16 a 172.31. Os outros são públicos.",
          },
          {
            p: "Num IP com máscara 255.255.255.0, quantos bits são de host?",
            opcoes: ["8", "24", "16", "32"],
            certa: 0,
            exp: "A máscara tem 24 bits 1 (/24); sobram 32 − 24 = 8 bits para os hosts.",
          },
        ],
      },
    ],
  },

  /* 5 ------------------------------------------------------------ */
  {
    titulo: "Sub-redes e VLSM",
    modulos: "ITN módulo 11",
    resumo: [
      "Número mágico (bloco) = 256 − valor da máscara no octeto interessante. Um /27 tem máscara 224: bloco de 32.",
      "A rede é o múltiplo do bloco logo abaixo do IP. O broadcast é a próxima rede − 1.",
      "Hosts válidos = 2^(bits de host) − 2. Número de sub-redes = 2^(bits emprestados), sem tirar nada.",
      "VLSM: cada rede do tamanho que precisa. Sempre comece pela MAIOR rede e vá descendo.",
      "Link entre dois roteadores: /30 (2 hosts).",
    ],
    lembrar: "Bloco, múltiplo, menos um: ache o bloco, ache o múltiplo abaixo do IP, e o broadcast é a próxima rede menos um.",
    link: { texto: "Treinar na Maratona de sub-redes", href: "treinos.html#maratona" },
    jogos: [
      {
        tipo: "ordenar",
        titulo: "A receita da sub-rede",
        instrucao: "Coloque os passos do cálculo na ordem.",
        itens: [
          "Achar o octeto interessante",
          "Achar o número mágico (256 − máscara)",
          "Contar os blocos até passar do IP",
          "Escrever o endereço de rede",
          "Escrever o broadcast (próxima rede − 1)",
          "Primeiro e último host (rede + 1 e broadcast − 1)",
        ],
      },
      {
        tipo: "quiz",
        titulo: "Conta rápida",
        instrucao: "Use a receita. Vale fazer a conta no papel.",
        perguntas: [
          {
            p: "Qual é a rede do host 192.168.10.77/27?",
            opcoes: ["192.168.10.64", "192.168.10.32", "192.168.10.72", "192.168.10.96"],
            certa: 0,
            exp: "/27: bloco 32. Blocos 0, 32, 64, 96. O 77 cai no bloco do 64. Broadcast: 95.",
          },
          {
            p: "Quantos hosts válidos tem um /26?",
            opcoes: ["62", "64", "30", "126"],
            certa: 0,
            exp: "32 − 26 = 6 bits de host. 2^6 = 64 endereços; 64 − 2 = 62 hosts.",
          },
          {
            p: "Uma LAN precisa de 50 hosts. Qual é o menor bloco que atende?",
            opcoes: ["/26", "/27", "/25", "/28"],
            certa: 0,
            exp: "/27 dá só 30 hosts. /26 dá 62: é o menor que cabe 50.",
          },
          {
            p: "No VLSM da rede 192.168.1.0/24, a primeira LAN ficou com 192.168.1.0/26. Onde começa a próxima?",
            opcoes: ["192.168.1.64", "192.168.1.63", "192.168.1.26", "192.168.1.32"],
            certa: 0,
            exp: "O /26 tem bloco de 64: vai de .0 a .63. A próxima rede começa em .64.",
          },
        ],
      },
    ],
  },

  /* 6 ------------------------------------------------------------ */
  {
    titulo: "IPv6",
    modulos: "ITN módulos 12 e 13",
    resumo: [
      "128 bits em 8 grupos (hextetos) de 4 dígitos hexadecimais, separados por dois-pontos.",
      "Abreviar, regra 1: tire os zeros à esquerda de cada grupo (0DB8 vira DB8; 0000 vira 0).",
      "Abreviar, regra 2: troque UMA sequência de grupos só de zeros por :: (só uma vez, senão fica ambíguo).",
      "Tipos: global (2000::/3, começa com 2 ou 3), link-local (FE80::/10, toda interface IPv6 tem um), multicast (FF00::/8) e loopback (::1). O IPv6 não tem broadcast.",
      "O ICMPv6 faz o papel do ARP (Neighbor Discovery: NS e NA) e anuncia o roteador (RS e RA). O SLAAC monta o endereço sozinho a partir do RA.",
    ],
    lembrar: "FE80 = fica na rede local. FF = fala com o grupo (multicast). :: só uma vez.",
    jogos: [
      {
        tipo: "digitar",
        titulo: "Abrevie o endereço",
        instrucao: "Escreva a forma mais curta. Pode usar letras minúsculas ou maiúsculas.",
        perguntas: [
          {
            dado: "2001:0DB8:0000:0000:0000:00A1:0000:0001",
            respostas: ["2001:db8::a1:0:1"],
            exp: "Tire os zeros à esquerda: 2001:DB8:0:0:0:A1:0:1. A maior sequência de zeros (três grupos) vira ::.",
          },
          {
            dado: "2001:0DB8:ACAD:0000:0000:0000:0000:0001",
            respostas: ["2001:db8:acad::1"],
            exp: "Quatro grupos de zeros seguidos viram :: e o último 0001 vira 1.",
          },
          {
            dado: "FE80:0000:0000:0000:0202:B3FF:FE1E:8329",
            respostas: ["fe80::202:b3ff:fe1e:8329"],
            exp: "Os três grupos de zeros viram :: e o 0202 perde só o zero da esquerda: 202.",
          },
          {
            dado: "2001:0DB8:0000:0000:ABCD:0000:0000:1234",
            respostas: ["2001:db8::abcd:0:0:1234", "2001:db8:0:0:abcd::1234"],
            exp: "Há duas sequências de dois grupos de zeros: só uma pode virar ::. A regra oficial (RFC 5952) escolhe a primeira: 2001:db8::abcd:0:0:1234.",
          },
        ],
      },
      {
        tipo: "memoria",
        titulo: "Memória dos tipos",
        instrucao: "Ache cada prefixo com o seu tipo de endereço.",
        pares: [
          ["2000::/3", "Global unicast"],
          ["FE80::/10", "Link-local"],
          ["FF00::/8", "Multicast"],
          ["::1/128", "Loopback"],
          ["FC00::/7", "Local único (ULA)"],
        ],
      },
    ],
  },

  /* 7 ------------------------------------------------------------ */
  {
    titulo: "ARP e a viagem do pacote",
    modulos: "ITN módulos 8 e 9",
    resumo: [
      "O ARP descobre o MAC a partir do IP (no IPv4). O pedido vai em broadcast; a resposta volta em unicast.",
      "O PC compara o IP de destino com a própria máscara. Se for de outra rede, entrega o quadro ao gateway padrão.",
      "A cada roteador, o quadro é refeito: os MACs mudam. Os IPs de origem e destino continuam os mesmos (sem NAT). O TTL diminui 1.",
      "Na tabela de rotas do roteador: C = rede conectada, L = o IP da própria interface, S = rota estática.",
    ],
    lembrar: "IP é o endereço da casa (não muda na viagem). MAC é o próximo carteiro (muda a cada salto).",
    jogos: [
      {
        tipo: "ordenar",
        titulo: "A viagem do ping",
        instrucao: "PC1 (192.168.1.10/24) pinga o servidor 192.168.2.20. Coloque os passos na ordem.",
        itens: [
          "PC1 compara o destino com a máscara: é outra rede",
          "PC1 manda um ARP pedindo o MAC do gateway 192.168.1.1",
          "O gateway responde com o seu MAC",
          "PC1 envia o quadro: MAC de destino do gateway, IP de destino do servidor",
          "O roteador consulta a tabela de rotas e escolhe a interface de saída",
          "O roteador monta um quadro novo, com novos MACs, até o servidor",
        ],
      },
      {
        tipo: "classificar",
        titulo: "Muda a cada salto?",
        instrucao: "Quando o pacote atravessa um roteador (sem NAT), o que muda?",
        grupos: ["Muda", "Não muda"],
        itens: [
          ["MAC de origem", "Muda"],
          ["MAC de destino", "Muda"],
          ["TTL", "Muda"],
          ["IP de origem", "Não muda"],
          ["IP de destino", "Não muda"],
          ["Dados da aplicação", "Não muda"],
        ],
      },
    ],
  },

  /* 8 ------------------------------------------------------------ */
  {
    titulo: "TCP, UDP e as portas",
    modulos: "ITN módulo 14",
    resumo: [
      "TCP: abre conexão (SYN, SYN-ACK, ACK), confirma o que chegou, reenvia o que se perdeu e põe em ordem. É confiável, mas mais lento.",
      "UDP: manda e pronto, sem conexão nem confirmação. É rápido: voz, vídeo ao vivo, DNS, DHCP e TFTP.",
      "Portas bem conhecidas vão de 0 a 1023. O cliente usa uma porta alta, sorteada (de 49152 a 65535).",
      "IP + porta = socket. É ele que separa as várias abas abertas do navegador.",
    ],
    lembrar: "TCP é carta registrada (com recibo). UDP é panfleto (joga e vai embora).",
    jogos: [
      {
        tipo: "memoria",
        titulo: "Memória das portas",
        instrucao: "Ache cada protocolo com a sua porta.",
        pares: [
          ["SSH", "22"],
          ["Telnet", "23"],
          ["SMTP", "25"],
          ["DNS", "53"],
          ["DHCP", "67 e 68"],
          ["HTTP", "80"],
          ["HTTPS", "443"],
          ["FTP", "20 e 21"],
        ],
      },
      {
        tipo: "classificar",
        titulo: "TCP ou UDP?",
        instrucao: "Qual transporte cada serviço usa (no uso normal)?",
        grupos: ["TCP", "UDP"],
        itens: [
          ["Acesso remoto por SSH", "TCP"],
          ["Envio de e-mail (SMTP)", "TCP"],
          ["Download por FTP", "TCP"],
          ["Página web (HTTP)", "TCP"],
          ["Chamada de voz (VoIP)", "UDP"],
          ["Consulta de DNS", "UDP"],
          ["Pedido de IP ao DHCP", "UDP"],
          ["TFTP", "UDP"],
        ],
      },
      {
        tipo: "ordenar",
        titulo: "O aperto de mão",
        instrucao: "Coloque o three-way handshake do TCP na ordem.",
        itens: ["Cliente envia SYN", "Servidor responde SYN-ACK", "Cliente envia ACK", "Os dados começam a passar"],
      },
    ],
  },

  /* 9 ------------------------------------------------------------ */
  {
    titulo: "DHCP, DNS e a camada de aplicação",
    modulos: "ITN módulo 15",
    resumo: [
      "DHCP entrega IP, máscara, gateway e DNS. As quatro mensagens: Discover, Offer, Request e Acknowledgment (DORA).",
      "DNS traduz nome em IP. Registro A = IPv4; AAAA = IPv6; MX = servidor de e-mail; CNAME = apelido.",
      "E-mail: SMTP envia. POP3 baixa (e costuma apagar do servidor). IMAP sincroniza e deixa no servidor.",
      "HTTP mostra páginas; HTTPS é o HTTP protegido com TLS.",
    ],
    lembrar: "DORA, a exploradora do DHCP: Descobre, Oferece, Requisita, Aceita.",
    jogos: [
      {
        tipo: "ordenar",
        titulo: "DORA",
        instrucao: "O PC acabou de ligar. Coloque as mensagens do DHCP na ordem.",
        itens: ["DHCPDISCOVER (o PC procura um servidor)", "DHCPOFFER (o servidor oferece um IP)", "DHCPREQUEST (o PC pede aquele IP)", "DHCPACK (o servidor confirma)"],
      },
      {
        tipo: "memoria",
        titulo: "Memória da aplicação",
        instrucao: "Ache cada protocolo ou registro com o que ele faz.",
        pares: [
          ["Registro A", "Nome → IPv4"],
          ["Registro AAAA", "Nome → IPv6"],
          ["Registro MX", "Servidor de e-mail"],
          ["SMTP", "Envia e-mail"],
          ["IMAP", "Sincroniza a caixa"],
          ["DHCP", "Entrega o IP"],
        ],
      },
    ],
  },

  /* 10 ----------------------------------------------------------- */
  {
    titulo: "Comandos do IOS",
    modulos: "ITN módulos 2, 10 e 16",
    resumo: [
      "Modos: usuário (>), privilegiado (#, com enable), configuração global ((config)#, com configure terminal) e interface ((config-if)#).",
      "exit volta um nível; end volta direto ao modo privilegiado.",
      "A interface do roteador começa desligada: sem no shutdown, nada passa.",
      "running-config fica na RAM e some ao desligar. Para guardar: copy running-config startup-config.",
      "SSH precisa de: nome do equipamento, domínio, usuário, chaves RSA e, na line vty, transport input ssh e login local.",
    ],
    lembrar: "O IOS aceita abreviação: conf t, int g0/0, no shut, copy run start. Na dúvida, digite ? no Packet Tracer.",
    jogos: [
      {
        tipo: "terminal",
        titulo: "Missão 1: configure o switch S1",
        instrucao: "Digite o comando que cumpre cada missão e tecle Enter. Pode abreviar como no IOS.",
        passos: [
          { prompt: "Switch>", missao: "Entre no modo privilegiado.", cmd: "enable" },
          { prompt: "Switch#", missao: "Entre no modo de configuração global.", cmd: "configure terminal" },
          { prompt: "Switch(config)#", missao: "Dê o nome S1 ao switch.", cmd: "hostname =S1" },
          { prompt: "S1(config)#", missao: "Proteja o modo privilegiado com a senha criptografada class.", cmd: "enable secret =class" },
          { prompt: "S1(config)#", missao: "Entre na linha do console 0.", cmd: "line console =0" },
          { prompt: "S1(config-line)#", missao: "Defina a senha cisco para o console.", cmd: "password =cisco" },
          { prompt: "S1(config-line)#", missao: "Faça o console pedir a senha.", cmd: "login" },
          { prompt: "S1(config-line)#", missao: "Volte um nível, para a configuração global.", cmd: "exit" },
          { prompt: "S1(config)#", missao: "Criptografe as senhas que estão em texto puro.", cmd: "service password-encryption" },
          { prompt: "S1(config)#", missao: "Entre na interface virtual da VLAN 1 (SVI).", cmd: "interface vlan =1" },
          { prompt: "S1(config-if)#", missao: "Dê o IP 192.168.1.2 com máscara /24.", cmd: "ip address =192.168.1.2 =255.255.255.0" },
          { prompt: "S1(config-if)#", missao: "Ative a interface.", cmd: "no shutdown" },
          { prompt: "S1(config-if)#", missao: "Volte direto ao modo privilegiado.", cmd: "end" },
          { prompt: "S1#", missao: "Salve a configuração na NVRAM.", cmd: ["copy running-config startup-config", "write memory", "write"] },
        ],
      },
      {
        tipo: "terminal",
        titulo: "Missão 2: SSH no roteador R1",
        instrucao: "O R1 já tem o nome configurado. Prepare o acesso por SSH.",
        passos: [
          { prompt: "R1>", missao: "Entre no modo privilegiado.", cmd: "enable" },
          { prompt: "R1#", missao: "Entre no modo de configuração global.", cmd: "configure terminal" },
          { prompt: "R1(config)#", missao: "Entre na interface g0/0/0.", cmd: "interface =g0/0/0" },
          { prompt: "R1(config-if)#", missao: "Dê o IP 192.168.1.1 com máscara /24.", cmd: "ip address =192.168.1.1 =255.255.255.0" },
          { prompt: "R1(config-if)#", missao: "Ligue a interface.", cmd: "no shutdown" },
          { prompt: "R1(config-if)#", missao: "Volte para a configuração global.", cmd: "exit" },
          { prompt: "R1(config)#", missao: "Defina o domínio senac.local.", cmd: "ip domain-name =senac.local" },
          { prompt: "R1(config)#", missao: "Crie o usuário admin com a senha criptografada Senha123.", cmd: "username =admin secret =Senha123" },
          { prompt: "R1(config)#", missao: "Gere as chaves RSA de 1024 bits em um comando só.", cmd: "crypto key generate rsa general-keys modulus =1024" },
          { prompt: "R1(config)#", missao: "Use a versão 2 do SSH.", cmd: "ip ssh version =2" },
          { prompt: "R1(config)#", missao: "Entre nas linhas vty de 0 a 4.", cmd: "line vty =0 =4" },
          { prompt: "R1(config-line)#", missao: "Aceite só SSH nessas linhas.", cmd: "transport input ssh" },
          { prompt: "R1(config-line)#", missao: "Peça o usuário e a senha cadastrados no próprio roteador.", cmd: "login local" },
          { prompt: "R1(config-line)#", missao: "Volte direto ao modo privilegiado.", cmd: "end" },
          { prompt: "R1#", missao: "Salve a configuração.", cmd: ["copy running-config startup-config", "write memory", "write"] },
        ],
      },
    ],
  },

  /* 11 ----------------------------------------------------------- */
  {
    titulo: "Testar a rede e achar o defeito",
    modulos: "ITN módulo 17",
    resumo: [
      "Teste de dentro para fora: ping no 127.0.0.1, no próprio IP, no gateway e só depois no destino.",
      "No ping do IOS: ! = respondeu; . = tempo esgotado; U = destino inalcançável (um roteador avisou).",
      "traceroute (no Windows, tracert) mostra cada salto do caminho: onde parar de responder é onde procurar.",
      "show ip interface brief mostra o estado de cada interface: up/up está funcionando.",
    ],
    lembrar: "Ping de dentro para fora: eu, minha placa, meu portão (gateway), o mundo.",
    jogos: [
      {
        tipo: "ordenar",
        titulo: "Ping de dentro para fora",
        instrucao: "O PC não abre nenhum site. Coloque os testes na ordem certa.",
        itens: [
          "ping 127.0.0.1 (a pilha TCP/IP do PC)",
          "ping no próprio IP (a placa de rede)",
          "ping no gateway padrão (a LAN)",
          "ping num IP da internet (o roteamento)",
          "ping num nome, como senac.br (o DNS)",
        ],
      },
      {
        tipo: "classificar",
        titulo: "Detetive do show ip interface brief",
        instrucao: "Leia o Status e o Protocol de cada interface e dê o diagnóstico.",
        grupos: ["Funcionando", "Falta no shutdown", "Problema no cabo ou na outra ponta"],
        itens: [
          ["G0/0/0 · up · up", "Funcionando"],
          ["G0/0/1 · administratively down · down", "Falta no shutdown"],
          ["G0/0/2 · down · down", "Problema no cabo ou na outra ponta"],
          ["Vlan1 · up · up", "Funcionando"],
          ["S0/1/0 · administratively down · down", "Falta no shutdown"],
          ["G0/1 · down · down", "Problema no cabo ou na outra ponta"],
        ],
      },
      {
        tipo: "quiz",
        titulo: "Leia a saída",
        instrucao: "Interprete o que o IOS mostrou.",
        perguntas: [
          {
            p: "O ping do roteador mostrou .!!!! na primeira vez e !!!!! na segunda. O que houve?",
            opcoes: ["O primeiro pacote esperou o ARP; a rede está boa", "O cabo está com mau contato", "O destino bloqueia ping", "A rota está errada"],
            certa: 0,
            exp: "Na primeira vez, o roteador ainda não sabia o MAC do próximo salto: o ARP atrasou o primeiro pacote. Na segunda, tudo responde.",
          },
          {
            p: "O ping mostrou U.U.U. O que isso quer dizer?",
            opcoes: ["Um roteador avisou que não sabe chegar ao destino", "Tudo respondeu", "O destino respondeu devagar", "O cabo do PC está solto"],
            certa: 0,
            exp: "U = destination unreachable: um roteador no caminho mandou um ICMP dizendo que não tem rota (ou o destino recusou).",
          },
          {
            p: "Qual comando do Windows mostra o IP, a máscara, o gateway e o DNS do PC?",
            opcoes: ["ipconfig /all", "show ip route", "tracert", "arp -d"],
            certa: 0,
            exp: "ipconfig /all mostra a configuração completa da placa, inclusive o servidor DHCP e o MAC.",
          },
        ],
      },
    ],
  },
];


/* Níveis do jogador, pelo XP somado da trilha (a trilha inteira vale cerca de 990 XP) */
const NIVEIS = [
  { xp: 0, nome: "Cabo solto" },
  { xp: 100, nome: "Link up" },
  { xp: 300, nome: "Ping respondendo" },
  { xp: 500, nome: "Técnico de bancada" },
  { xp: 750, nome: "Analista de redes" },
  { xp: 900, nome: "Lenda do ITN" },
];
