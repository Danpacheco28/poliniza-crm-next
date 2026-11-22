# WhatsApp Poliniza — decisão de integração

Data: 20/11/2026.

## Decisões confirmadas
- Novo Poliniza CRM, independente do CRM anterior.
- Número empresarial informado pelo usuário: +55 (61) 99444-9108.
- O usuário optou por conexão não oficial via sessão de WhatsApp Web, pareada por QR Code, e não pela API oficial.
- Nenhuma sessão foi conectada e nenhuma mensagem foi enviada.

## Proposta técnica
Conector Baileys em serviço Node separado, pareamento pelo usuário no próprio WhatsApp, sessão mantida no servidor e não entregue ao frontend. Interface Conversas no CRM acessa esse serviço através de backend autenticado. Credenciais de sessão ficam fora de arquivos públicos, repositório, relatórios e memória.

O servidor deve confirmar o número efetivamente pareado antes de habilitar o atendimento. Exibir conectado, aguardando QR, desconectado e reconexão; não mostrar conexão real antes de confirmação do serviço.

Primeiro teste: conectar o número e confirmar envio/recebimento manual com um contato de teste autorizado pelo usuário. Não executar campanhas, mensagens em lote ou disparos automáticos só pelo fato de conectar.

Execução escolhida: teste neste computador. Implementados conector local, interface Conversas, pareamento real por QR, confirmação do número, recebimento individual e envio manual de texto. O primeiro QR real foi gerado; pareamento e troca real de mensagens ainda aguardam validação pelo usuário. O backend mantém a sessão e conversas locais cifradas; a demonstração do CRM continua separada no navegador. Atendimento compartilhado e publicação exigem autenticação, permissões e persistência de produção próprias do novo projeto.

Validação: 24 testes automatizados passaram. Navegação desktop/mobile e envio com transporte simulado foram verificados, sem mensagem real enviada. O QR e as credenciais não são registrados em capturas ou documentação.

## Limites
Conexão não oficial pode cair e está sujeita a mudanças do WhatsApp e restrições da conta; não há garantia de permanência. A escolha do usuário foi registrada, sem contratação de serviço ou mudança na conta.
