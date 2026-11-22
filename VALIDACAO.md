# Validação — 20/11/2026

## Regras de dados

11 testes Node concluídos com sucesso:

1. Transferência preserva a origem histórica e separa o estoque dos pipelines.
2. Etapa de outro pipeline é rejeitada sem mutação.
3. Exclusão protege etapas ocupadas; reordenação rejeita duplicações e omissões.
4. Criação e conclusão de atividade podem pertencer a períodos diferentes.
5. Perda exige motivo; reabertura mantém o histórico.
6. Falha em transação não altera a base original.
7. CSV aceita BOM, separadores em campos entre aspas, quebras de linha e aspas escapadas.
8. Prévia separa linhas válidas, duplicadas e com email inválido.
9. Confirmação revalida duplicados surgidos após a prévia.
10. Preços brasileiros são convertidos; texto e valores negativos são rejeitados.
11. Exportação protege células que poderiam ser interpretadas como fórmula de planilha.

## Navegação no Chrome

Testes realizados em contexto separado, somente com registros sintéticos:

- As oito rotas renderizaram o título esperado.
- Criado pipeline isolado com uma oportunidade.
- Transferência removeu a oportunidade da origem e a exibiu no destino.
- Relatório da origem preservou uma criação e mostrou estoque aberto zero.
- Recarregar preservou o registro no armazenamento local.
- Importação de duas linhas apresentou uma válida e uma com erro; apenas o contato válido foi inserido.
- Jornada local reagiu à criação de uma oportunidade e agendou a atividade esperada.
- Nenhuma exceção JavaScript foi observada no fluxo automatizado.

A primeira execução da verificação de importação contou também um elemento da prévia em diálogo já fechado. O seletor do teste foi restringido ao conteúdo principal; a execução completa passou. Não foi uma falha de inserção.

## Interface

Capturas desktop (1440 × 1000) e celular (390 × 844), incluindo o dashboard de Gestão, em `.impeccable/`. O quadro desliza horizontalmente no celular, sem ampliar o documento. Navegação e calendário também podem ter deslocamento interno conforme o conteúdo.

Detector mecânico Impeccable executado uma vez sobre `public`, resultado `[]`. Isso não substitui auditoria formal de acessibilidade ou revisão funcional.

## Fora desta validação

Produção multiusuário, autenticação, autorização em servidor, concorrência de gravação, entregabilidade de mensagens, filas em servidor, arquivo XLSX, recuperação de backup e integrações externas. O aplicativo é identificado como demonstração local e não afirma essas capacidades.

## Revisão final da interface

Revisão independente Impeccable concluída. Aplicados os três ajustes materiais, em um único lote:

- Filtros de relatório empilhados no celular; pipeline e período medidos com 323 px úteis em viewport de 390 px.
- Atalho compacto para próximas atividades visível abaixo de 1000 px, mantendo acesso direto à agenda.
- Seleção de relatórios com botões comuns e `aria-pressed`, sem semântica incompleta de abas.

Confirmação final no navegador verificou o atalho visível, o texto completo dos filtros e a navegação por botão. As capturas foram atualizadas. Não houve nova rodada de detector.

O roteiro de navegação está em tests/browser-smoke.cjs para execução pelo Playwright CLI. É um roteiro do navegador, não um teste Node; a execução usa um contexto isolado e dados sintéticos. O seletor dos relatórios foi atualizado para refletir os botões finais.

## Melhoria dos cards — 20/11/2026

Cards compactados para aproximadamente 145 px na captura desktop. Teste isolado confirmou que o + abre as ações sem abrir o detalhe, email/WhatsApp preenchem o tipo correto de atividade, atividade fica vinculada à oportunidade e anotação persiste. Nenhuma exceção JS observada. Capturas em .impeccable/cards-desktop.png e cards-mobile.png.

O detector desta alteração retornou avisos consultivos de escala tipográfica e raios em relação ao DESIGN.md/sidecar existente. Inclui valores compactos já presentes na interface e os novos cards; não houve alteração global de tokens para silenciar esses avisos. O teste funcional e a revisão visual não equivalem a uma auditoria completa de acessibilidade.

Etiquetas de andamento coloridas adicionadas aos cards, com edição na oportunidade. Teste isolado confirmou Novo, Em contato, Em proposta e Negociação, além da seleção manual e persistência de Proposta enviada. Bolinha de estado e + preservados. Capturas labels-desktop.png / labels-mobile.png.

## Editor visual de automações — 20/11/2026

16 testes de regras concluídos com sucesso (11 anteriores e 5 de automações): múltiplas atividades/intervalos, prevenção de duplicação, separação por pipeline, bloqueio de blocos não executáveis, compatibilidade com jornadas antigas e fluxos pausados/somente temporizador.

No navegador, um contexto isolado criou fluxo Entrada → Temporizador → Atividade; ativação e recarga preservaram a configuração; uma nova oportunidade criou a atividade vinculada. Acrescentar email deixou o fluxo em rascunho e impediu ativação, sem execução parcial. Nenhuma exceção JS. Após correção de min-width da biblioteca, documento móvel mediu 390 px em viewport 390 px. Capturas automation-desktop.png e automation-mobile.png. Interações testadas com registros sintéticos; dados da janela principal não foram modificados.

Detector executado uma vez: 40 avisos consultivos de escala tipográfica, 18 de cores e 5 de raios em relação ao registro visual anterior. A nova paleta semântica das ações está sendo documentada como ampliação explícita do editor; não foi feita troca global de tokens para ocultar avisos. Revisão visual independente solicitada.

A revisão final identificou seletores móveis de contexto estreitos. Corrigido em um lote: pipeline e automação agora ocupam linhas completas; ações ficam abaixo. Confirmação em viewport 390 px mediu 338 px para cada seletor, documento 390 px, sem exceções JS. Capturas atualizadas após a confirmação. PRODUCT.md registra execução local e ações somente de planejamento.

## WhatsApp local — 20/11/2026
24 testes de domínio, importação, automações e conector passaram. Navegador desktop/mobile sem overflow e envio com transporte simulado, sem mensagem real. QR real gerado no navegador local; pareamento e envio/recebimento reais pendentes. Revisão encontrou e corrigiu proteção de seleção contra respostas fora de ordem, preservação de novo rascunho durante envio e estado não confirmado quando o serviço falha. Detector: 86 avisos consultivos de escala/cores/raios, incluindo componentes existentes; sem reparos globais de estilo.

## Lista de automações — 20/11/2026
Validação em contexto isolado confirmou entrada pela lista, cadastro seguido do editor, retorno à lista, busca com resultado vazio, abertura por Editar e recarga retornando à lista. Mobile de 390 px sem overflow; nenhuma exceção JavaScript no contexto de teste. Detector direcionado ao módulo passou. Fluxos e limites de execução existentes preservados.

## Gmail — 22/11/2026
31 testes Node passaram, incluindo 7 de Gmail: destinatário único e injeção em cabeçalhos, JSON de cliente desktop cifrado, PKCE/state/expiração/vínculo à janela, rejeição/revogação de conta diferente, idempotência de envio e ausência de reenvio automático em incerteza, consulta restrita aos threads conhecidos e deduplicação de respostas. Após ajuste de concorrência OAuth e cabeçalhos MIME, os 7 testes Gmail passaram novamente.
Browser real: serviço local responde e conexão não configurada. Browser em contexto isolado interceptou todas as rotas de email para simular configuração, envio somente após confirmação e consulta de resposta; 1 envio simulado, zero envios reais, nenhuma exceção JavaScript; mobile390 sem overflow. Capturas email-desktop/mobile.png desconectadas e email-simulated.png sintética. Revisão independente pediu sincronizar o estado dos botões de envio e consulta; corrigido. Detector direcionado a public/emails.mjs passou sem avisos. Pareamento Google real e troca de emails pendentes de configuração/autorização do usuário.

## Importação OAuth por arrastar — 22/11/2026
Usuário relatou que Escolher arquivo não abre. Diagnóstico da sessão de teste mostrou seletores File chooser interceptados pelo navegador automatizado; não era JSON inválido. Adicionada importação por arrastar arquivo na própria janela, com validação compartilhada, bloqueio de importação concorrente e retorno acessível. Teste isolado confirmou evento nativo de seleção, rejeição de JSON inválido sem chamada de configuração, exatamente uma importação por drop com API simulada e habilitação de autorização; mobile390 sem overflow, sem exceções JS. Zero configurações e emails reais usados. Revisão independente não encontrou correções materiais.

## Preparação de publicação e abertura externa — 22/11/2026
Corrigido 403 ao entrar por link de outro site: somente GET de navegação principal ao documento raiz pode passar sem o filtro de origem das APIs. APIs continuam exigindo origem/sessão/CSRF. Nove testes do conector/acesso local passaram, incluindo regressão que nega POST, iframe e host externo. Verificação HTTP contra serviço ativo: documento por navegação externa 200, API sob navegação externa 403. Exportador por lista explícita gerou 39 arquivos de código, sem runtime ou credenciais. CI criado somente para testes; nenhum deploy automático, GitHub remoto, banco ou autenticação de produção criado ainda.


## Piloto compartilhado — 22/11/2026
Testes SQL no novo Supabase confirmaram RLS, gravação por registro, concorrência e bloqueio de escrita direta; dados sintéticos revertidos por rollback. REST anônimo retornou 401. Interface simulada verificou login, alteração isolada, conflito com formulário preservado, saída e mobile sem overflow. Login real na página publicada ainda depende de validação do usuário.
