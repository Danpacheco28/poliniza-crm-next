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
