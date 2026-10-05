/* ==============================================================
   DADOS DO SITE (edite aqui)
   Quase toda atualização de conteúdo acontece só neste arquivo.
   As funções que usam estes dados ficam em js/site.js.
   ============================================================== */


/* Links públicos da seção "Links da turma" */
const LINKS_TURMA = [
  { t: "NetAcad", d: "Cursos, checkpoints e exames", u: "https://www.netacad.com/" },
  { t: "Cisco Binary Game", d: "Treino de conversão binária", u: "https://learningnetwork.cisco.com/s/cisco-binary-game" },
  { t: "Pearson VUE para Cisco", d: "Agendamento da prova", u: "https://home.pearsonvue.com/cisco" },
];


/* Cor de cada curso (as variáveis estão em css/ccna.css) */
const CORES = {
  ITN: "var(--itn)",
  SRWE: "var(--srwe)",
  ENSA: "var(--ensa)",
  CCNA: "var(--tinta)",
};


/* Encontros de sábado
   d: data (AAAA-MM-DD)  c: curso  t: título
   lab: laboratório  des: desafio  casa: tarefas da quinzena */
const ENCONTROS = [
  {
    d: "2026-08-08", c: "ITN", t: "Boas-vindas e redes hoje",
    lab: ["Primeira topologia no Packet Tracer"],
    des: ["Mapa da rede de casa"],
    casa: ["ITN módulos 1 e 2", "Gravação do encontro no Teams"],
  },
  {
    d: "2026-08-22", c: "ITN", t: "Configuração básica de switch",
    lab: ["Navigate the IOS", "Basic Switch and End Device Configuration"],
    des: ["Corrida de comandos"],
    casa: ["ITN módulo 3", "Gravação do encontro no Teams"],
  },
  {
    d: "2026-09-05", c: "ITN", t: "Protocolos e modelos",
    lab: ["Encapsulamento no modo simulação"],
    des: ["Jogo das camadas"],
    casa: ["Revisão dos módulos 1 a 3", "Gravações dos encontros 1 a 3"],
  },
  {
    d: "2026-09-19", c: "ITN", t: "Checkpoint dos módulos 1 a 3",
    lab: ["Exame de ponto de verificação"],
    des: ["Correção comentada"],
    casa: ["ITN módulos 4 a 7"],
  },
  {
    d: "2026-10-03", c: "ITN", t: "Do cabo ao quadro Ethernet",
    lab: ["Mini-aula sobre cabos, binário e quadro Ethernet", "Connect a Wired and Wireless LAN", "Tabela MAC no modo simulação"],
    des: ["Corrida binária"],
    casa: ["ITN módulos 8 a 13 e checkpoints", "Labs de roteador, sub-redes e IPv6 no Packet Tracer", "Gravação do encontro no Teams"],
  },
  {
    d: "2026-10-17", c: "ITN", t: "Roteador, sub-redes e IPv6",
    lab: ["VLSM Addressing Scheme", "Ping e traceroute"],
    des: ["Maratona de sub-redes", "Detetive de falhas"],
    casa: ["Fim do ITN e SRWE 1 a 4", "Labs de SSH, VLANs e router-on-a-stick no Packet Tracer", "Gravação do encontro no Teams"],
  },
  {
    d: "2026-10-31", c: "SRWE", t: "Fim do ITN e VLANs",
    lab: ["ITN Practice Skills Assessment"],
    des: ["Detetive de VLANs", "Jeopardy do ITN"],
    casa: ["SRWE módulos 5 a 13", "Labs de STP, EtherChannel, DHCP, HSRP e WLAN no Packet Tracer", "Gravação do encontro no Teams"],
  },
  {
    d: "2026-11-14", c: "SRWE", t: "Redundância, serviços e segurança da LAN",
    lab: ["EtherChannel", "DHCP, HSRP e port security"],
    des: ["Corrida de comandos de segurança"],
    casa: ["Fim do SRWE e ENSA 1 a 5", "Labs de rotas estáticas, OSPF e ACLs no Packet Tracer", "Gravação do encontro no Teams"],
  },
  {
    d: "2026-11-28", c: "ENSA", t: "Rotas estáticas, OSPF e ACLs",
    lab: ["SRWE Practice Skills Assessment", "OSPFv2 e ACL estendida"],
    des: ["Desafio das ACLs"],
    casa: ["ENSA módulos 6 a 14", "Labs de NAT, CDP, LLDP, NTP e Syslog no Packet Tracer", "Gravação do encontro no Teams"],
  },
  {
    d: "2026-12-12", c: "CCNA", t: "Simulado final e caminho até a prova",
    lab: ["Troubleshoot Enterprise Networks"],
    des: ["Simulado final do CCNA"],
    casa: ["Tutorial do voucher", "Plano de estudos até a prova"],
  },
];


/* Módulos de cada curso (seção "Meu progresso") */
const MODULOS = {
  ITN: [
    "Redes hoje",
    "Configuração básica de switch e dispositivos finais",
    "Protocolos e modelos",
    "Camada física",
    "Sistemas numéricos",
    "Camada de enlace",
    "Comutação Ethernet",
    "Camada de rede",
    "Resolução de endereços",
    "Configuração básica de roteador",
    "Endereçamento IPv4",
    "Endereçamento IPv6",
    "ICMP",
    "Camada de transporte",
    "Camada de aplicação",
    "Fundamentos de segurança de rede",
    "Construindo uma rede pequena",
  ],
  SRWE: [
    "Configuração básica de dispositivos",
    "Conceitos de switching",
    "VLANs",
    "Roteamento entre VLANs",
    "STP",
    "EtherChannel",
    "DHCPv4",
    "SLAAC e DHCPv6",
    "FHRP",
    "Conceitos de segurança de LAN",
    "Configuração de segurança de switch",
    "Conceitos de WLAN",
    "Configuração de WLAN",
    "Conceitos de roteamento",
    "Roteamento estático IP",
    "Troubleshooting de rotas estáticas e padrão",
  ],
  ENSA: [
    "Conceitos de OSPFv2 de área única",
    "Configuração de OSPFv2 de área única",
    "Conceitos de segurança de rede",
    "Conceitos de ACL",
    "ACLs para IPv4",
    "NAT para IPv4",
    "Conceitos de WAN",
    "Conceitos de VPN e IPsec",
    "Conceitos de QoS",
    "Gerenciamento de rede",
    "Design de rede",
    "Troubleshooting de rede",
    "Virtualização de rede",
    "Automação de rede",
  ],
};

const NOMES = {
  ITN: "Introduction to Networks",
  SRWE: "Switching, Routing and Wireless Essentials",
  ENSA: "Enterprise Networking, Security and Automation",
};


/* Vídeos: [curso, título]. O número sai da posição na lista.
   As URLs reais ficam na área da turma (protegida), não aqui. */
const VIDEOS = [
  ["ITN", "Redes hoje"],
  ["ITN", "Primeiros passos no Cisco IOS"],
  ["ITN", "Protocolos e modelos OSI e TCP/IP"],
  ["ITN", "Camada física"],
  ["ITN", "Sistemas numéricos"],
  ["ITN", "Camada de enlace"],
  ["ITN", "Comutação Ethernet"],
  ["ITN", "Como um pacote encontra o caminho"],
  ["ITN", "ARP e configuração básica do roteador"],
  ["ITN", "Sub-redes sem medo, parte 1"],
  ["ITN", "Sub-redes, parte 2: VLSM"],
  ["ITN", "IPv6 descomplicado"],
  ["ITN", "ICMP, ping e traceroute"],
  ["ITN", "TCP e UDP"],
  ["ITN", "Camada de aplicação"],
  ["ITN", "Segurança básica dos dispositivos"],

  ["SRWE", "Configuração básica e conceitos de switching"],
  ["SRWE", "VLANs e trunks"],
  ["SRWE", "Roteamento entre VLANs"],
  ["SRWE", "STP: evitando loops"],
  ["SRWE", "EtherChannel"],
  ["SRWE", "DHCPv4"],
  ["SRWE", "SLAAC e DHCPv6"],
  ["SRWE", "FHRP e HSRP"],
  ["SRWE", "Segurança de switch"],
  ["SRWE", "Redes sem fio"],
  ["SRWE", "Roteamento estático"],

  ["ENSA", "OSPFv2 de área única"],
  ["ENSA", "Segurança de rede e conceitos de ACL"],
  ["ENSA", "Configurando ACLs"],
  ["ENSA", "NAT para IPv4"],
  ["ENSA", "WAN, VPN e QoS"],
  ["ENSA", "Gerenciamento de rede"],
  ["ENSA", "Design e troubleshooting"],
  ["ENSA", "Virtualização e automação"],
].map(([curso, titulo], i) => ({ n: i + 1, c: curso, t: titulo, u: "" }));


/* Área da turma: conteúdo criptografado.
   Gere com o gerador-area-turma.html e cole o resultado aqui. */
const AREA_TURMA = "wla3EoZ5vTtSKnS0IS4g+yxJcMQNQ2ZK+i7zcl4BTppUY9h+SdPCcj407VVOgv4JTllhfhbpgj65hWI0x+WqXGeZYniv3HezKOARNHjTRr1sEcKve83k07dAh+eD8edYIXbs315JMNnRi8olZ0l3cM0p7jgjv9KyNchRCvmXy6JG7isDVlkxQnqbbbuEWhro1oyCX0iEYABrL1yuUGjQ8qWtNWDW12HEVy9/xmNokhMY/U2Vxmqf9rilBsmNrBDP5AR7xu4EYLTDF6IWuAJ9447Pc7rwwnmo8TMBrnjey5UIwI5VmscbxvS265QpcPPm2B6WtXNFZS47/w==";
