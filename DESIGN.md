---
name: Poliniza CRM
description: Operação comercial clara com identidade púrpura e dourado contido.
colors:
  purple: "#402052"
  purple-deep: "#281137"
  purple-soft: "#f0eaf5"
  gold: "#d8b355"
  gold-soft: "#f8f0dc"
  text: "#252033"
  muted: "#686575"
  line: "#e5e3eb"
  surface: "#fff"
  canvas: "#f5f5f9"
  blue: "#2563b6"
  blue-bg: "#eaf1fc"
  green: "#16704d"
  green-bg: "#e8f5ee"
  red: "#ad3b3b"
  red-bg: "#fdeeee"
  amber: "#88620b"
  amber-bg: "#fff5d8"
  flow-mint-color: "#14735d"
  flow-mint-soft: "#d9f4e9"
  flow-mint-band: "#bbebd9"
  flow-gold-color: "#8b6114"
  flow-gold-soft: "#fff5dd"
  flow-gold-band: "#f7dfa5"
  flow-blue-color: "#2d609d"
  flow-blue-soft: "#eaf1fc"
  flow-blue-band: "#ccdef8"
  flow-green-color: "#217246"
  flow-green-soft: "#e4f4e8"
  flow-green-band: "#c1e7cd"
  flow-violet-color: "#7043a1"
  flow-violet-soft: "#f1eafa"
  flow-violet-band: "#e0cef2"
  flow-cyan-color: "#226d87"
  flow-cyan-soft: "#e4f3fa"
  flow-cyan-band: "#c4e6f4"
  flow-rose-color: "#98485c"
  flow-rose-soft: "#fceaf0"
  flow-rose-band: "#f2ceda"
  flow-slate-color: "#5c6178"
  flow-slate-soft: "#edf0f8"
  flow-slate-band: "#d8deed"
  flow-plum-color: "#7b4587"
  flow-plum-soft: "#f6eafa"
  flow-plum-band: "#e7cfee"
  flow-sage-color: "#4e7059"
  flow-sage-soft: "#edf5ee"
  flow-sage-band: "#d0e3d4"
typography:
  headline:
    fontSize: "27px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.7px"
  title:
    fontSize: "18px"
    fontWeight: 700
    letterSpacing: "-.25px"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    lineHeight: 1.45
  label:
    fontSize: "12px"
    fontWeight: 600
rounded:
  field: "7px"
  control: "8px"
  card: "10px"
  stage: "12px"
  panel: "13px"
  dialog: "16px"
spacing:
  compact: "8px"
  control: "13px"
  row: "16px"
  panel: "20px"
  page: "28px"
components:
  button-primary:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
  button-primary-hover:
    backgroundColor: "{colors.purple-deep}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
  button-plain:
    textColor: "{colors.purple}"
    padding: "5px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "9px 11px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "20px"
  deal-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "15px"
  flow-node:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.stage}"
    width: "100%"
    padding: "0 0 16px"
---

# Design System: Poliniza CRM

## Overview

**Creative North Star: "Poliniza — Funil Comercial"**

A identidade herdada combina navegação púrpura, emblema original e dourado discreto com uma área de trabalho clara. O sistema implementado é compacto, convencional e orientado à leitura de oportunidades, atividades e números em português brasileiro.

A composição aprovada é o Funil Comercial da proposta A. A interface coloca contexto e ações acima do conteúdo; agrupa dados por superfícies, bordas suaves e hierarquia tipográfica. Esta documentação reconcilia a identidade herdada com public/index.html, public/styles.css e public/app.mjs; descreve o ambiente independente de validação local.

**Key Characteristics:**
- Navegação superior púrpura e conteúdo claro.
- Dourado contido na identidade e em avisos.
- Dados financeiros com algarismos tabulares.
- Controles explícitos, compactos e convencionais.

## Colors

A paleta reserva a presença mais forte à identidade e usa tons claros para organizar o trabalho.

### Primary
- **Púrpura Poliniza:** ações principais, links de ação e dados do funil.
- **Púrpura profundo:** cabeçalho, feedback temporário e hover da ação principal.
- **Púrpura suave:** seleção, avatares e etiquetas neutras da marca.

### Secondary
- **Dourado Poliniza:** detalhe do emblema e ação dourada disponível.
- **Dourado suave:** avisos contextuais; não é a superfície padrão de trabalho.

### Tertiary
- **Azul informativo:** informação e indicadores, acompanhado de fundo azul claro.
- **Verde de conclusão:** ganhos e atividades concluídas, acompanhado de fundo verde claro.
- **Vermelho de atenção:** perdas e erros, acompanhado de fundo vermelho claro.
- **Âmbar de pendência:** atraso e estados pendentes, acompanhado de fundo âmbar claro.

The automation editor adds action-specific color families. Mint identifies activity and entry, gold timers, blue email, green WhatsApp, violet conditions, cyan duplication, rose sharing, slate webhooks, plum transfer and sage product. Each family has a foreground, a pale interaction surface and a stronger header band. Local --flow-color, --flow-soft and --flow-band variables bind the same action identity across library tile, node and editing dialog; these colors do not imply execution availability.

### Neutral
- **Tinta:** texto principal.
- **Texto secundário:** metadados, legendas e contexto.
- **Linha:** limites de superfícies e separadores.
- **Branco:** painéis, cartões e campos.
- **Tela clara:** fundo geral da aplicação.

**The Restrained Brand Rule.** Preserve o púrpura na navegação e nas ações; use o dourado com moderação, conforme a identidade confirmada.

## Typography

**Display Font:** a mesma fonte de sistema da interface; não existe uma família de display independente.
**Body Font:** pilha nativa definida no token body.

**Character:** Tipografia de escritório, direta e densa. A hierarquia cresce pouco entre metadados, títulos e valores; números recebem maior destaque que ornamentação.

### Hierarchy
- **Headline:** título de página; no celular o título final aplicado é menor (22px).
- **Title:** títulos gerais de seção; painéis usam títulos menores (14px), e etapas e oportunidades usam (13px).
- **Body:** base herdada pelos controles; tabelas e linhas operacionais frequentemente usam (12px).
- **Label:** rótulos de formulário e toolbar; metadados variam entre (10px) e (11px).
- **Values:** valores de oportunidade (18px), indicadores principais (29px) e detalhe financeiro (33px), com peso (650).

**The Aligned Numbers Rule.** Preserve algarismos tabulares em valores, totais de etapa e colunas numéricas; alinhe números de tabela à direita.

## Layout

A navegação é superior, com emblema à esquerda e links de ícone e texto. O conteúdo central limita-se a (1920px); o espaçamento de página usa o token page. Cabeçalho de página, toolbar e conteúdo formam a ordem recorrente.

O funil usa colunas horizontais com largura mínima (230px), intervalo (14px) e rolagem própria. As quatro etapas iniciais são dados configuráveis, não uma limitação do sistema. A agenda lateral ocupa (252px), passa a (230px) até (1250px) e a (285px) a partir de (1650px).

Até (1000px), a navegação ocupa uma segunda linha, painéis duplos viram uma coluna, indicadores passam a duas colunas e a agenda lateral dá lugar a um link compacto com resumo. Até (600px), o conteúdo recebe margens menores, formulários ficam em uma coluna, filtros de relatórios e sua ação ocupam a largura completa. O funil mantém rolagem horizontal e encaixe suave de etapas, com largura mínima (245px) ou (82vw). Tabelas mantêm rolagem em seu contêiner.

The automation editor pairs a left action library (225px) with a flexible workspace. A central vertical sequence connects entry and action nodes; the scrollable canvas is (610px) high. At (900px), the library narrows to (185px). At (650px), it moves above the canvas as a horizontally scrolling action strip, while the canvas becomes (560px) high. Pipeline and flow selectors each retain a full-width readable label/control row; action buttons follow below. Zoom operates within the canvas. This composition belongs to the editor, not every CRM screen.

The Conversations surface uses the existing white/purple shell with an inbox split between a (310px) conversation list and a flexible message panel. At (900px), the list narrows to (240px). At (650px), it becomes a single-column view: the list is capped at (230px), and selecting a conversation hides it until the explicit back action. Message history scrolls inside the panel; the composer remains below it. The connection bar wraps its status/context into readable rows. The pairing dialog changes from instructions beside a code/status region to a single column.

## Elevation & Depth

Superfícies em repouso são separadas por borda e tom. Cartões de oportunidade elevam-se discretamente no hover; o diálogo recebe sombra estrutural e fundo escurecido com desfoque. A seleção de relatório usa uma linha interna inferior. Os valores exatos e os estados estão no sidecar.

**The Quiet Surface Rule.** Use borda e fundo para separar painéis em repouso; reserve a elevação para interação de oportunidade e sobreposição de diálogo.

Automation nodes use a faint resting shadow and a stronger hover shadow, both recorded in the sidecar. This editor-specific layering extends the quiet surface rule without changing the other panels.

## Shapes

Campos têm cantos levemente arredondados; controles, cartões, etapas e painéis seguem os tokens próprios. Etiquetas são pequenas e retangulares com cantos suaves (5px). Avatares e o indicador de hoje são circulares. O detalhe lateral preserva cantos apenas no lado esquerdo; não extrapole seu recorte para os demais painéis.

## Components

### Buttons

Compactos e explícitos. A ação principal é púrpura com texto branco, a secundária branca com borda e a ação simples é texto púrpura. Hover escurece a principal e dá leve fundo à secundária. Controles desabilitados reduzem opacidade e mudam o cursor. O foco visível usa contorno púrpura claro (3px), afastado (3px).

### Chips

Etiquetas de estado combinam texto e fundo semântico, peso (600), texto (10px) e preenchimento (3px 7px). Use o rótulo para comunicar o estado junto à cor.

### Cards / Containers

Painéis usam borda neutra, fundo branco e preenchimento do token panel; no celular passam a (16px). Oportunidades usam título, organização, valor, etiqueta e rodapé separado. O hover acrescenta sombra e deslocamento vertical discreto.

### Inputs / Fields

Campos brancos, borda suave e raio field. Rótulos ficam acima em formulários e junto ao controle em toolbars amplas. Texto de ajuda é secundário; erros usam fundo vermelho claro e texto vermelho. Preserve o foco visível comum.

### Navigation

Links superiores mantêm ícone e texto, fundo branco translúcido no hover e na seleção, e aria-current="page" na rota atual. Em larguras menores a faixa de links permite rolagem horizontal.

### Report view selection

Os seletores Operação, Comercial e Gestão são botões comuns com aria-pressed. A seleção é púrpura com linha inferior; não atribua semântica de abas a esse controle. Pipeline e período ficam explícitos na toolbar e no contexto do relatório.

### Agenda and detail

Agenda lateral no desktop, resumo com link no layout compacto. Diálogos de edição são centrais; o detalhe da oportunidade abre em painel lateral. O feedback de ação usa mensagem temporária com role="status". Movimento de cartões e feedback dura (150ms); prefers-reduced-motion remove transições e animações.

### Automation index

Automa??es now opens on a pipeline-specific management list, including after reload or navigation back to this area. The toolbar exposes status filtering and name search. A white panel presents the visible/total count and desktop rows for name, block count, activities created, entry trigger, pipeline, update date and draft/local-active status. Edit, Activate/Pause and Delete are separate labelled actions; the name is purple and row hover uses purple-soft. Empty results explain how to adjust filters; an empty pipeline offers creation.

At (1100px), row padding tightens. At (760px), table headings disappear and each record becomes stacked labelled fields using its data-label values; filters fill the width and action buttons wrap. This responsive record pattern belongs to the automation index. Editing opens the preserved colored workflow editor with an explicit back-to-list control; creating opens the new editor. The list changes discovery and management, not the local execution limits described above.

### Visual automation editor

The user-selected action library and central connected sequence extend the existing Poliniza world. Nodes are white, softly rounded rectangles with colored inset header bands; connector arrows communicate sequence, not branching. Node content opens its editor. Independent adjacent tools move a node up/down or remove it, with explicit accessible labels; drag reordering is an additional path. Library tiles use inline action icons and a matching hover color. Entry configuration, add-action control, zoom controls and draft/active status stay visible around the sequence.

Keep planning-only actions marked as draft and distinguish them from executable activity and timer nodes. Editing pauses a flow for review. Timers add days to subsequent activity dates; they do not represent asynchronous waiting. The surface must not visually promise working branches, message delivery or integrations: current execution limits are maintained in PRODUCT.md. Small auxiliary tile text is an implementation detail, not a reusable typography minimum.

### Conversations and manual WhatsApp test

This extension preserves the incumbent purple navigation, white panels, soft borders and native type. The connection bar keeps the expected account context, a textual status badge with a dot, explanatory feedback and refresh action together. Connected state uses the existing green semantic pair; other connection states use a pale amber badge. Status wording distinguishes connecting, waiting for pairing, reconnecting, wrong account and disconnected states.

The inbox list uses circular initial avatars and a purple-soft selected row. Received messages sit left on white; outgoing messages sit right on pale green. Wrapped message text, timestamps and explicit delivery wording communicate direction and status without relying on color alone. The current outgoing surface is (#e5f2ea), with border (#cee2d5); these are component-specific values rather than a replacement brand palette.

The composer has an explicit recipient label, multiline field and primary send button. Draft text remains available while disconnected; sending is disabled until connected and while a request is busy. Opening or pairing a conversation does not send a message. An uncertain send is labelled as unconfirmed rather than presented as delivered. Pairing uses the existing dialog pattern, instructions, explicit connect/reconnect and clear-connection actions, plus an isolated code/status region. Never use a real pairing code or private conversation as a reusable design example.

This is a local manual connection test backed by a real QR connector. Pairing and live send/receive remain pending user validation. The interface identifies real messages as separate from fictitious CRM records; it must not imply campaigns, automation integration or automatic lead creation. Empty states explain how to start an individual test and that old history, media and groups are outside the current surface. Small auxiliary timestamp text is not a reusable typography minimum.

### Individual Gmail email

The Email route extends the existing purple/white CRM world with the shared connection bar, account identity and textual configured/awaiting-authorization/connected states. Its local-test notice distinguishes real individual mail from fictitious CRM records. Setup uses the existing dialog, a desktop-app OAuth JSON file input, inline status feedback, an underlined purple guide link and explicit Google authorization action. Connecting does not send mail; never use an OAuth configuration or credentials as a design specimen.

The Gmail setup dialog also offers a labelled OAuth JSON drop region alongside its native file picker. A dashed purple border and purple-soft surface identify the import target; drag-over changes the surface to gold-soft. Instructions provide the drag path when the native chooser is unavailable. The region exposes aria-busy while importing, reduces opacity, disables conflicting actions, and reports progress, invalid JSON or completion in the existing live status area. One file is accepted at a time; configuration remains encrypted in the local service. Never display the imported content in a preview. This import refinement does not establish live account authorization.

The main desktop surface pairs a composer and history in near-equal flexible columns with a (22px) gap. At (900px), they stack, history heading/actions wrap, history record metadata aligns left, and composer actions become a vertical group. The composer retains explicit recipient, subject and message labels, a resizable message field with minimum height (200px), and a primary review action disabled until connected. Review opens an existing-style confirmation dialog showing sender, recipient, subject and a wrapped, scrollable message preview; the separate confirmation action initiates real sending.

History rows use text, a semantic status label and reply count, with purple-soft selection. Opening a row reveals the message and registered responses below the two main panels. Preview and message bodies preserve line breaks in the interface font, on a canvas-colored inset with control-radius corners; reply sections use quiet dividers. Explicit response consultation and unconfirmed-send wording remain distinct from Gmail acceptance. The guide follows a narrow readable document column rather than the inbox composition.

OAuth setup and live account authorization remain pending; only synthetic browser sends and interface tests have been verified. Keep this qualification separate from what the implemented surface can request. The surface supports individual preview-confirm sending and consultation of responses to its own messages; it must not imply campaigns, delivery/open tracking, automatic lead creation or integration with automation blocks. An accepted Gmail send is not evidence of recipient delivery or reading.

### Online pilot access and local companion

The online pilot retains the approved Poliniza emblem, purple navigation, white surfaces, soft neutral borders and native typography. Its access gate is a centered white column with maximum width (440px), padding (30px), radius (12px) and vertical spacing (18px). At (600px), padding becomes (22px), the title becomes (23px), and buttons have a minimum height (44px). A brand row, internal-pilot label, explicit heading and explanatory text precede labelled email/password fields, primary sign-in and plain password-recovery action.

The same gate handles loading, team authorization and password recovery. Reset mode keeps email read-only and asks for a new password of at least twelve characters. Failures use the existing red text/pale-red inset and role=alert; pending submission disables the primary action. A signed-in account without team access receives explicit retry/sign-out actions. These states describe the implemented interface, not completed administrator onboarding.

In authenticated online mode, the context strip reads Base compartilhada, identifies the signed-in account and provides explicit refresh-base and sign-out actions. Existing CRM surfaces then operate on the shared base. Do not present a pending or failed connection as a successfully loaded workspace, or conceal an update conflict behind a success state. The locally disabled cloud configuration and publication-enabled build are operating modes, not separate visual brands.

For Email and WhatsApp in online mode, a narrow companion panel (maximum 720px) replaces the local inbox. It explains that CRM records are online while messaging still requires the connector on this computer, and offers a purple link to the corresponding loopback page in a new window. Copy explains how to start the connector and that local conversations are not automatically attached to the shared base. There is no VPS-based messaging service at this stage; email/WhatsApp automation remains planning-only.

The screenshots verify the access and companion UI with synthetic account context. Administrator account creation and real login remain pending manual action; old real data has not been migrated. Backend transaction/RLS checks are separate evidence and do not establish that a person has signed in or completed messaging setup. Preserve these boundaries when writing empty states, banners and onboarding copy.

## Do's and Don'ts

### Do:
- **Do** keep connection and message delivery states explicit in text, including unconfirmed sends.
- **Do** preserve the manual-send boundary and the mobile conversation back action.
- **Do** preserve action names, icons and draft labels alongside automation colors.
- **Do** keep mobile automation selectors on full readable rows with actions below.
- **Do** preserve o emblema original e a identidade púrpura e dourada contida.
- **Do** mantenha rótulos, foco visível e estado selecionado acessível nos controles.
- **Do** preserve o acesso compacto à agenda e a rolagem própria de quadros e tabelas.
- **Do** use texto junto às cores semânticas e algarismos tabulares em dados financeiros.

### Don't:
- **Don't** transforme o dourado em grandes superfícies metálicas.
- **Don't** substitua os botões de relatório por abas sem implementar o comportamento correspondente.
- **Don't** esconda pipeline, período ou a identificação do ambiente de demonstração.

## Cards compactos de oportunidade — 20/11/2026

- Corpo de aproximadamente 145 px de altura na captura desktop, mantendo empresa, título, valor, data e responsável.
- Status com texto e bolinha: Em aberto em verde, Ganha em púrpura e Perdida em vermelho. O texto transmite o estado independentemente da cor.
- Botão principal abre o detalhe; controle `details/summary` independente com sinal de + abre ações rápidas, sem controles interativos aninhados.
- Menu: atividade vinculada, agendamento de email, agendamento de contato WhatsApp e anotação persistida no negócio. Email/WhatsApp ainda não são disparados.
- Menu fecha após uma escolha, ao clicar fora e com Escape; somente um pode permanecer aberto.

## Etiquetas de andamento — 20/11/2026
Etiquetas suaves por etapa: violeta para entrada, azul para contato, ameixa para proposta e dourado para negociação; texto escuro com fundo claro. Contorno fino acompanha a cor, sem faixa lateral. A bolinha continua representando aberto/ganho/perdido. Etiqueta pode acompanhar etapa ou ser escolhida no formulário; uma mudança de etapa volta a usar o andamento da etapa de destino. “Proposta enviada” só aparece quando selecionada, não representa confirmação de envio por integração.


## Captação pública e gestão de formulários
A superfície pública herda Poliniza: emblema original, púrpura no botão, fundo claro e texto direto. Formulário central sem navegação do CRM, campos em duas colunas no desktop e uma no celular; rótulos persistentes, opcionais explícitos, autorização separada e confirmação de recebimento. Não mostra dados comerciais nem autenticação interna. A gestão integra a navegação do CRM com lista, destino explícito, estado Recebendo/Pausado, editor e código de incorporação. Preserva rascunho em erro e reaproveita a chave de envio em resultado de rede incerto.


## Consulta de empresa por CNPJ
Extensão da identidade existente, sem nova direção visual. Linha CNPJ/Buscar empresa e feedback acessível; dados empresariais em seção expansível, duas colunas no desktop e uma no celular. Todos os campos continuam editáveis. O formulário não substitui dados de contato já digitados. Em erro, permite preenchimento manual. Campos empresariais não são apresentados como dados verificados pelo governo.


## Escopo corrigido pelo usuário — 22/11/2026
O formulário público voltou ao formato anterior, sem CNPJ ou dados cadastrais empresariais adicionais. CNPJ e Buscar empresa ficam somente no cadastro manual de contatos e oportunidades. Dados da empresa na oportunidade são editáveis, persistem no próprio negócio e não sobrescrevem o contato vinculado. A empresa aparece no card e pode existir sem contato vinculado. Registros anteriores de empresa foram preservados.


## Escopo corrigido pelo usuário — 22/11/2026
O formulário público voltou ao formato anterior, sem CNPJ ou dados cadastrais empresariais adicionais. CNPJ e Buscar empresa ficam somente no cadastro manual de contatos e oportunidades. Dados da empresa na oportunidade são editáveis, persistem no próprio negócio e não sobrescrevem o contato vinculado. A empresa aparece no card e pode existir sem contato vinculado. Registros anteriores de empresa foram preservados.
