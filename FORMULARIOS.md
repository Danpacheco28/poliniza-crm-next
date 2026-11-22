# Formulários de captação

O formulário público funciona sem login e sem o computador da Poliniza ligado. O destino padrão inicial é **Leads do site → Leads**. O CRM anterior não é alterado.

## Usar nos anúncios

Abra **Formulários** no CRM publicado. Copie o link do formulário e use como destino do anúncio ou de um botão no site. Inclua parâmetros UTM para identificar origem, mídia e campanha. Não coloque dados pessoais na URL.

## Inserir no site

Em **Formulários → Colocar dentro do site**, copie o código e cole em um bloco HTML na página desejada. O script cria um iframe responsivo, ajusta sua altura e repassa UTMs, gclid/fbclid quando presentes. O editor do site precisa permitir script de módulo e iframe do domínio GitHub Pages. Nenhum DNS precisa ser alterado.

## O que é criado

Nome, organização, telefone/WhatsApp e email são obrigatórios. A pergunta “O que sua empresa procura?” também é obrigatória; dificuldade atual e prazo são opcionais. A autorização cobre contato sobre a solicitação, sem inscrição automática em marketing.

Cada preenchimento válido cria contato, oportunidade aberta de valor zero e histórico numa transação. Email ou telefone conhecidos reaproveitam o contato sem sobrescrever os dados existentes. Se já existir oportunidade aberta do mesmo contato, formulário e pipeline, registra novo histórico sem duplicar a oportunidade. Não transfere negócios existentes nem envia mensagens.

As respostas e os dados de campanha aparecem nas anotações/histórico da oportunidade. No CRM, clique **Atualizar base** para carregar os recebimentos.

## Configuração

Administradores podem criar/editar formulários, alterar título/apresentação, escolher pipeline e etapa ou pausar recebimentos. A leitura pública retorna apenas título/apresentação; o visitante não pode ler tabelas comerciais, escolher outro destino nem editar contatos existentes.

## Limites do piloto

Validação no banco, campo antirrobô, idempotência e até 10 envios/minuto e 200/24h por formulário. Isso não equivale a um CAPTCHA nem impede todo spam. Para escalar campanhas, evoluir para CAPTCHA validado no servidor, limitação por origem e observabilidade. Publicar aviso de privacidade adequado ao uso dos dados no site da empresa. Não há mensagens automáticas, agenda de atendimento prometida ou garantia de envio de campanha.

Migração: `supabase/migrations/202611220002_lead_forms.sql`, somente no Supabase novo. Teste transacional com rollback: `supabase/tests/lead-forms.sql`.


## Consulta de CNPJ — 22/11/2026
Nos cadastros manuais de Contatos e Oportunidades → Novo/Editar, CNPJ opcional com botão Buscar empresa usa BrasilAPI no navegador, sem chave ou VPS. Razão social, fantasia, endereço, CNAE, situação e contatos públicos são sugestões editáveis. A consulta preenche somente campos vazios e mantém nome, email e telefone da pessoa. Contatos públicos da empresa têm campos próprios. CNPJ e dados empresariais persistem na base compartilhada; valores podem ser corrigidos ou apagados no cadastro. Sem consulta em lote. Validação numérica/alfanumérica, cache de sessão de dez minutos e intervalo mínimo de dois segundos. Falhas permitem cadastro manual. Não é consulta oficial em tempo real nem verificação de titularidade.


## Escopo corrigido pelo usuário — 22/11/2026
O formulário público voltou ao formato anterior, sem CNPJ ou dados cadastrais empresariais adicionais. CNPJ e Buscar empresa ficam somente no cadastro manual de contatos e oportunidades. Dados da empresa na oportunidade são editáveis, persistem no próprio negócio e não sobrescrevem o contato vinculado. A empresa aparece no card e pode existir sem contato vinculado. Registros anteriores de empresa foram preservados.


## Escopo corrigido pelo usuário — 22/11/2026
O formulário público voltou ao formato anterior, sem CNPJ ou dados cadastrais empresariais adicionais. CNPJ e Buscar empresa ficam somente no cadastro manual de contatos e oportunidades. Dados da empresa na oportunidade são editáveis, persistem no próprio negócio e não sobrescrevem o contato vinculado. A empresa aparece no card e pode existir sem contato vinculado. Registros anteriores de empresa foram preservados.
