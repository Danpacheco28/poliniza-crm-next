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


## Formulários públicos — 22/11/2026
Área Formulários com criação/edição, pipeline/etapa, pausa, link público e código para incorporar no site. Nome, organização, telefone, email e interesse obrigatórios; dificuldade e prazo opcionais. Envio cria contato e oportunidade aberta no Supabase sem depender de serviço local. Reaproveita contatos e negócios abertos do mesmo formulário, preserva detalhes existentes, registra campanha/respostas no histórico. Veja FORMULARIOS.md para instalação, limites e testes. Sem envios automáticos ou inscrição em marketing.

## Modelos e email por etapa — piloto local
Na área **Email local**, use **Novo modelo** para salvar nome, assunto e mensagem. Campos `{{nome}}` e `{{empresa}}` serão personalizados. PNG, JPG e WebP são aceitos: até três imagens de 512 KB cada, inseridas depois do texto. A biblioteca fica cifrada no computador, fora do repositório. Ao compor, selecione um modelo, informe os dados necessários, edite se quiser e revise antes de confirmar o envio real.

Em **Envio ao entrar em uma etapa**, conecte uma conta administradora do CRM novo. A senha e a sessão desse administrador não são gravadas no disco; após reiniciar o conector, entre novamente. Crie uma regra, escolha pipeline, etapa e modelo. A regra começa pausada. A opção de incluir oportunidades criadas diretamente na etapa também começa desligada. Salvar uma regra guarda uma cópia do modelo e cancela sua fila antiga; edições posteriores do modelo precisam ser reaplicadas à regra.

Para enviar automaticamente, ative a regra e confirme **Iniciar serviço**. A cada 30 segundos o conector verifica a fila compartilhada, com intervalo mínimo de um minuto entre envios e teto do piloto de 100 tentativas por 24 horas. Não envia retroativamente para negócios que já estavam na etapa antes da ativação. Oportunidades precisam estar abertas, ainda na etapa e vinculadas a um contato com email. Nomes ou empresas ausentes impedem personalização e envio. Regras separadas podem gerar mensagens separadas para a mesma entrada: evite regras duplicadas.

Computador e conector precisam ficar ligados, com Gmail autorizado e internet. Reiniciar o serviço sempre pausa o processamento e exige nova entrada e confirmação de início. Envios incertos ou interrompidos em processamento não são repetidos automaticamente: confira a pasta Enviados no Gmail. O histórico distingue fila, processamento, aceite pelo Gmail, falha e cancelamento. Aceite não comprova entrega, leitura ou abertura. As jornadas visuais de WhatsApp e blocos de email antigos continuam em planejamento; o envio funcional por etapa é configurado nesta área Email.

Instalação: aplicar `supabase/migrations/202611220004_stage_email.sql` somente no projeto novo, e executar `supabase/tests/stage-email.sql` como transação com rollback. Nenhuma regra é criada ou ativada pela migração. O CRM anterior permanece separado.

## Usuários e acessos
Acesse **Usuários** no menu, ou **Configurações → Gerenciar usuários**, no CRM online. Administradores podem criar contas com nome, email, perfil (Membro ou Administrador) e senha inicial de 12 a 128 caracteres. A conta é confirmada administrativamente para uso interno; não há envio de convite por email. Compartilhe as instruções e a senha inicial por canal privado. A pessoa deve trocar a senha no primeiro acesso, antes de carregar os registros comerciais. A biblioteca de dados comerciais não é copiada nem apagada na criação de usuário. Novas contas também recebem um cadastro de responsável comercial; nomes completos evitam homônimos.

Perfis: membros trabalham com os registros compartilhados e podem trocar a própria senha; administradores também gerenciam usuários e configurações. A tela permite editar nome de exibição e perfil, desativar e reativar. Desativar bloqueia as operações de banco mesmo com uma sessão Auth ainda válida e preserva o histórico e o responsável comercial. Não há exclusão permanente de conta nesta tela. Alterações no próprio perfil/acesso dependem de outro administrador. Regras de email de administradores desativados ou rebaixados são pausadas; filas pendentes correspondentes são canceladas.

Implementação: migração `202611220005_users.sql` e Edge Function `manage-users`, implantadas somente no projeto novo. A função usa as variáveis internas do Supabase, verifica o token com Auth getUser e valida perfil e acesso ativo no banco; nenhuma chave de servidor é distribuída ao navegador. A opção de verificação JWT legada fica desligada, pois o handler faz a validação explícita compatível com os tokens atuais. O cadastro público continua desativado. Testes de autorização da função usam clientes simulados; SQL de permissões em `supabase/tests/users.sql` roda em transação com rollback. Nunca grave ou publique senhas ou sessões.

Correção de permissões do servidor: aplicar também `202611220006_user_service_permissions.sql`. O papel interno `service_role` precisa consultar `crm_members` e atualizar somente `must_change_password` na conclusão da primeira troca. As permissões de `anon` e `authenticated` não são ampliadas. Falhas de consulta do servidor retornam erro de disponibilidade, separado de uma conta desativada. O teste SQL inclui o papel real do servidor para detectar ausência desses grants.

## Recuperação de acesso sem email
Quando uma pessoa não conseguir entrar e o envio de recuperação ainda não estiver configurado, um administrador pode usar **Usuários → Redefinir senha** ao lado de outro usuário ativo. Defina e confirme uma nova senha inicial com pelo menos 12 caracteres; compartilhe-a por canal privado e informe o endereço exato do CRM novo. A pessoa entra com a senha inicial e deve escolher sua senha pessoal antes de acessar os dados. Não envia email e não apaga contatos, negócios nem atribuições. O próprio administrador usa Alterar minha senha; a redefinição de outra conta é validada no servidor e auditada sem registrar a senha. Aplicar migração `202611230001_password_reset.sql` e atualizar a função `manage-users`.

## 23/11/2026 — Atividades e calendário
Unificados em #atividades com alternância Calendário/Lista; #calendario permanece como alias. Calendário Mês/Semana/Dia, navegação, seleção de data, cores por tipo e status escrito, detalhes/edição/conclusão e agendamento por dia. Filtros compartilhados e isolamento por pipeline. No celular, mês vira agenda vertical de dias com atividades e hoje. Sem migração SQL ou alteração de integrações.
Validação: testes de datas locais, ano bissexto, navegação, filtros/pipeline/cancelamento e tipos; navegador com dados fictícios isolados verificou filtros, edição, conclusão, semana, alias e ausência de erros. Nenhum registro real foi usado ou alterado.
