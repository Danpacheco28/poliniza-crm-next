# Poliniza CRM — projeto independente

Este diretório é um novo aplicativo. Não configura nem modifica o CRM anterior.

## Limites de implantação
- Pasta própria: work/poliniza-crm-next.
- Dados demonstrativos e armazenamento próprios.
- Futuro repositório, endereço e projeto Supabase exclusivos, a definir.
- Nenhuma variável de ambiente, chave, sessão ou registro do projeto anterior é reutilizado.

## Escopo
Pipelines e etapas configuráveis, oportunidades e histórico, contatos, produtos, atividades e calendário, importação padronizada, três painéis por pipeline, metas e configurações. Comunicações e jornadas terão capacidades e dependências explicitadas; disparos reais dependem de serviços configurados.

A implementação começa pelo domínio e por uma interface operacional para validação. Uma base local de demonstração não constitui autenticação nem hospedagem de produção.

## Abrir e executar

Node.js 24 ou mais recente. Instale as dependências fixadas no lockfile:

```powershell
npm ci --ignore-scripts
npm start
```

Acesse http://127.0.0.1:4186. O servidor atende apenas neste computador. Para escolher outra porta, configure `POLINIZA_NEXT_PORT` antes de iniciar.

Nesta sessão o servidor foi iniciado em segundo plano, com PID registrado em `.runtime/server.pid`. Para pará-lo, confira que o PID pertence a este servidor e use `Stop-Process -Id <PID>`. Reiniciar o servidor não apaga o armazenamento do navegador.

## Funcionalidades implementadas

- Funil em quadro ou lista; busca; status aberto, ganho e perdido.
- Criação de pipelines, renomeação, criação/renomeação/reordenação de etapas e exclusões protegidas.
- Oportunidades: cadastro, edição, movimentação, transferência, ganho, perda com motivo, reabertura e histórico.
- Contatos: cadastro, edição e exclusão protegida quando vinculados.
- Produtos: cadastro, edição e exclusão; preço validado.
- Atividades: cadastro, edição, conclusão, cancelamento e calendário mensal.
- Relatórios de Operação, Comercial e Gestão, com pipeline explícito e filtros de período.
- Metas mensais por valor ou quantidade de encerramentos ganhos.
- Importação CSV para contatos e produtos: modelos, prévia, validação por linha, duplicados e confirmação.
- Jornadas locais: criar atividade após criação, mudança de etapa, transferência ou ganho de oportunidade; registro de execução para evitar repetir o mesmo evento.
- Responsáveis demonstrativos, tipos de atividade, backup JSON e exportação de resumo em CSV.

## Limites desta primeira versão

- Os dados estão em `localStorage`, chave exclusiva `poliniza-crm-next.demo.v1`. Não são compartilhados entre pessoas/computadores. Limpar os dados do navegador os remove. A exportação JSON serve como backup manual; restauração de backup ainda não tem interface.
- A equipe cadastrada não cria contas reais de login. Não existe controle de permissões de produção.
- Jornadas só reagem a alterações feitas pela aplicação aberta. Não há execução em servidor, temporizador persistente nem disparos de email/WhatsApp.
- Planilhas `.xlsx` devem ser salvas como CSV UTF-8; a leitura nativa de XLSX está pendente. O importador não atualiza contatos existentes: reconhece duplicados por email e os ignora. Sem email, nomes iguais não são considerados duplicados automaticamente.
- Produtos ainda não compõem itens, descontos ou quantidades em orçamentos.
- Organização é um campo textual do contato; gestão independente de organizações, campos personalizados, anexos e histórico de importações ainda não implementados.
- Campanhas de email, financeiro e gamificação ainda não foram implementados. WhatsApp está disponível como teste local manual, descrito abaixo.

## Critérios dos relatórios

- Vendas, ganhos e perdas contam **eventos de encerramento** dentro do período, atribuídos ao pipeline do evento. Reabertura preserva esse histórico; novo fechamento gera outro evento. Não são apresentados como número de negócios únicos.
- Em aberto e valor em aberto são **estoque atual**, sem recorte pela data de criação. As legendas explicitam essa diferença.
- Conversão = eventos ganhos ÷ (eventos ganhos + eventos perdidos); ticket = valor dos ganhos ÷ eventos ganhos. Denominador zero aparece como `—`.
- Criadas usa data de criação da atividade. Realizadas usa conclusão. Agendadas e atrasadas usam vencimento no período e estado pendente.
- Transferência de oportunidade preserva atividades no pipeline original. Não há transferência implícita de atividade ou reatribuição de eventos antigos.
- Origem das oportunidades na Gestão representa a carteira atualmente vinculada ao pipeline, em todos os status e sem o recorte do período. Essa regra aparece no título secundário.
- Previsão = soma simples dos valores atualmente abertos, sem ponderação por probabilidade.

## Testes

```powershell
node --test tests/domain.test.mjs tests/imports.test.mjs
```

Consulte `VALIDACAO.md` para o resultado dos testes de regras e navegação desta entrega.

## Próximo passo para produção

Provisionar repositório, hospedagem, banco e autenticação exclusivos; substituir persistência local por API com permissões no servidor; migrar regras e validações para essa camada; testar concorrência, restauração, importação com massa controlada e isolamento entre usuários. Configurar provedores de comunicação e execução de jornadas em fila somente depois. Nenhum serviço do CRM anterior foi reutilizado.

Os cards de oportunidades incluem status com bolinha e texto e um + para atividade, anotação, agendamento de email ou WhatsApp. Os dois últimos criam tarefas vinculadas; não enviam mensagens enquanto os provedores estiverem desconectados.

## WhatsApp — teste local manual

Abra **Conversas → Conexão → Gerar QR** e escaneie pelo menu Dispositivos conectados do WhatsApp. O serviço só habilita o envio após confirmar o número empresarial configurado. Abrir uma conversa não envia mensagem; o envio exige o botão Enviar. A conexão não executa os blocos WhatsApp das automações nem os agendamentos dos cards.

O conector usa Baileys 7.0.0-rc14, qrcode 1.5.4 e pino 9.6.0. A sessão e os textos recebidos ficam cifrados em `.runtime/whatsapp-private`, com chave local no mesmo diretório. Essa pasta é privada, ignorada pelo Git e não servida por HTTP: não publique nem compartilhe seu conteúdo. A proteção local por cookie e CSRF não substitui autenticação e permissões para produção.

O teste recebe novas mensagens individuais e envia texto manualmente; não importa o histórico completo, grupos ou anexos. Não há vínculo automático com leads nesta etapa. O computador e o serviço Node precisam permanecer ligados; o pareamento inicial depende da confirmação pelo celular. Reiniciar exige abrir novamente a conexão pela interface. QR gerado não significa número conectado. Validação real de envio e recebimento depende do pareamento e de um teste manual autorizado.

## Editor visual de automações

A área antes chamada Jornadas agora aparece como **Automações**. A rota #jornadas continua válida para preservar os links.

- Crie uma automação e configure o evento de entrada e seu pipeline.
- Clique nos blocos da biblioteca ou arraste-os para o espaço do fluxo.
- Clique no bloco para editar; use as setas ou arraste sobre outro bloco para alterar a ordem; remova pelo ×.
- Configurações são salvas no navegador. Qualquer edição pausa a automação, que volta a rascunho até nova ativação.
- Atividade cria uma tarefa por oportunidade/evento/bloco; repetições do mesmo evento não duplicam a tarefa.
- Temporizador soma dias às datas das próximas atividades. Todas as tarefas são criadas no evento de entrada, com as datas calculadas. Não é uma espera assíncrona nem uma execução em servidor.
- Email, WhatsApp, Dividir, Duplicar, Compartilhar, Webhook, Transferir e Produto permitem preparar configurações visuais. Ainda não executam; sua presença bloqueia a ativação local. Condições não ramificam o fluxo nesta versão.
- Jornadas antigas de uma atividade são exibidas e executadas sem apagar seus dados ou histórico.

Teste de automações: `node --test tests/automations.test.mjs`. Testes do projeto: `npm test`. O roteiro de navegador específico está em tests/browser-automations.cjs.

A entrada de Automações é uma lista por pipeline, com busca, filtro de status e ações Editar, Ativar/Pausar e Excluir. Editar abre o editor visual existente; Voltar à lista retorna à relação. Nova automação abre o editor após cadastrar a entrada. Recarregar a página retorna à lista, preservando os fluxos salvos.

## Gmail local — autorização própria do CRM
Abra Email → Conectar / configurar. O guia em public/gmail-setup.html explica como criar um projeto Google Cloud, ativar Gmail API, configurar público de teste e cliente OAuth do tipo Aplicativo para computador, baixar o JSON e importar pelo formulário local. Não use a conexão do Gmail do chat como autorização do CRM. Não envie arquivos de credenciais pelo chat ou repositório.
O servidor usa OAuth com PKCE, state temporário e vínculo HttpOnly à janela; solicita openid/email/gmail.send/gmail.readonly. Somente a conta empresarial prevista é aceita. A permissão de leitura concedida pelo Google é ampla; a aplicação consulta somente conversas iniciadas por emails enviados nesta área, limitadas às conversas dos últimos 20 registros confirmados. Configuração, tokens e mensagens ficam cifrados em .runtime/gmail-private e nunca são servidos por HTTP. A chave permanece local junto dos arquivos: essa proteção não substitui controle de acesso do computador ou autenticação de produção.
Envio é individual, texto simples, sem anexos: Revisar envio → Confirmar e enviar. O histórico distingue aceitação pelo Gmail de envio não confirmado; falhas não provocam reenvio automático. Consulte Enviados no Gmail antes de tentar novamente se houver incerteza. Nenhuma confirmação de entrega ou abertura, campanha, descadastro automático, sincronização geral da caixa ou criação de leads foi implementada. Respostas são consultadas manualmente. Blocos de email nas automações continuam como planejamento.
Aplicativos externos em modo de teste podem perder a autorização após sete dias; reconecte pela interface quando necessário. Este cliente para computador serve ao teste local. Publicação para outros clientes exige projeto e fluxo OAuth de produção adequados, com verificação quando aplicável.
Nesta entrega a configuração Google ainda depende do usuário; conexão e envio real não estão validados.

Se Escolher arquivo não abrir na janela automatizada, use a área Arraste o arquivo JSON para cá no mesmo diálogo. Abra Downloads pelo Explorador do Windows e arraste somente o JSON do cliente OAuth; o conteúdo não é exibido e segue para o armazenamento cifrado do serviço local.


# Piloto Poliniza CRM novo

Projeto independente: interface GitHub Pages e novo Supabase com login, RLS, associação explícita de usuários e gravações atômicas por registro. O CRM anterior permanece preservado; seus dados reais ainda não foram migrados.

Repositório: https://github.com/Danpacheco28/poliniza-crm-next
Página prevista: https://danpacheco28.github.io/poliniza-crm-next/

## Acesso e dados

Contas são criadas no Supabase Auth e vinculadas em crm_members. Responsáveis comerciais não são contas de acesso. Recuperação usa email do Supabase e depende do serviço de envio configurado. Edições concorrentes exigem atualizar a base e revisar o formulário; o aplicativo confirma salvamento após resposta do servidor.

## Sem VPS nesta etapa

Email e WhatsApp abrem o serviço local em http://127.0.0.1:4186/. Computador e processo Node precisam estar ligados. Mensagens locais não são vinculadas automaticamente aos registros online. Gmail ainda precisa de autorização; campanhas e rastreamento de abertura não estão habilitados.

## Publicação e segurança

Executar npm ci --ignore-scripts, npm test e npm run build:pages. O workflow pages.yml publica .site com origem GitHub Actions. deploy/public-cloud.json contém somente URL e chave publicável. Autorização depende das políticas do banco. Nunca publicar chaves secretas, OAuth, sessões, conversas ou .runtime.

node scripts/prepare-release.mjs exporta somente código permitido para .release, com manifesto e detecção de padrões de segredos. Não é backup de dados reais.

## Migração pendente

Antes de substituir o CRM anterior: preservar e conferir backup, mapear registros e vínculos, testar importação e totais, validar acessos e definir retorno. Não apagar nem sobrescrever o ambiente anterior nesta etapa.
