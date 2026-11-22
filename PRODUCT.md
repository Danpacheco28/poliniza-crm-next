# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Equipes comerciais que acompanham contatos, oportunidades, atividades e resultados. A identidade da empresa será Poliniza, confirmada pelo usuário em 20/11/2026.

## Product Purpose
Criar outro CRM independente com base no levantamento autenticado do Funil de Vendas. O usuário confirmou pipelines, contatos, atividades, relatórios e configurações como escopo inicial.

## Operating Context
Uso em navegador, português brasileiro, valores em reais. Referência funcional: ../../output/funildevendas-rea/RELATORIO.md. Pipeline e período devem estar explícitos nos relatórios; cada pipeline mantém estatísticas separadas.

## Capabilities and Constraints
Projeto novo: não alterar work/crm-funil, o repositório CRM anterior, sua publicação nem seu Supabase. Nenhum segredo ou dado comercial do CRM anterior será copiado. Primeiro ambiente com dados sintéticos identificados; banco e autenticação de produção novos ainda não provisionados. Integrações reais dependem de provedores e credenciais próprios.

## Brand Commitments
Poliniza. Identidade já fornecida: púrpura e dourado, aplicados com moderação, e emblema original disponibilizado pelo usuário. O aplicativo anterior teve essa identidade aprovada; este é um produto independente sob a mesma marca.

## Evidence on Hand
Relatório funcional e evidências locais do Funil de Vendas. Emblema em C:/Users/Administrador/Desktop/Emblema dourado sobre fundo púrpura.png. Não usar registros de clientes reais como dados demonstrativos.

## Product Principles
- A ação comercial diária deve ser fácil de encontrar.
- Pipeline e histórico são dimensões explícitas.
- Dados de demonstração devem ser identificados.
- Controles disponíveis devem realizar o que anunciam.
- O projeto anterior permanece preservado.

## Visual Automation Editor

O usuário pediu um editor semelhante à referência enviada: biblioteca lateral de ações e sequência de blocos coloridos conectados, dentro da identidade Poliniza. A área aparece como Automações, mantendo a rota histórica #jornadas. Entrada, inclusão, edição, reordenação e exclusão de blocos, zoom e seleção de fluxos por pipeline são locais. Modificar um fluxo pausa sua execução até revisão e ativação explícita.

Disponível: múltiplas atividades locais e temporizadores que somam dias às datas das atividades seguintes. As atividades são criadas no evento de entrada; não há espera assíncrona nem processamento em servidor. Eventos repetidos não duplicam atividades já registradas. Compatibilidade com jornadas antigas de uma ação deve ser preservada.

Somente planejamento: email, WhatsApp, dividir/condições, duplicar, compartilhar, webhook, transferir e produto. Configurações desses blocos persistem, mas eles não executam. A presença de qualquer um deles impede ativar o fluxo localmente. O editor é sequencial e não apresenta ramificações como funcionais.

## Conversas — teste local
WhatsApp individual por QR, confirmação do número e envio manual de texto. Conversas reais são persistidas cifradas no serviço local, separadas dos dados demonstrativos do CRM. Sem campanhas, criação automática de leads ou execução de blocos WhatsApp nas automações. Pareamento e troca real de mensagens aguardam validação pelo usuário; não há autenticação multiusuário de produção.

## Entrada de Automações
Lista por pipeline com busca por nome, filtro de status, gatilho, atualização, blocos e ações Editar, Ativar/Pausar e Excluir. Editar abre o fluxo colorido existente; Voltar à lista retorna à gestão. Recarregar e navegar novamente abre a lista. Criar abre o editor após cadastrar a entrada. Nenhuma mudança no motor ou nos limites de execução.

## Email local
Área Email com conexão Gmail via autorização OAuth própria do aplicativo, importação local de JSON de cliente para computador, confirmação de conta, envio individual em texto após revisão e confirmação, histórico local cifrado e consulta manual de respostas de conversas iniciadas pelo CRM (últimos 20 envios confirmados). Sem importação de toda a caixa. Gmail concede permissão ampla de leitura, explicada antes da autorização. Nenhum email é enviado ao conectar. Sem campanhas, rastreamento de entrega/abertura, vínculo automático ao pipeline ou criação de leads nesta etapa. Configuração Google e validação real pendentes.


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
