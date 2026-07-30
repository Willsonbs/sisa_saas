> ⚠️ **AVISO IMPORTANTE**: este é um rascunho inicial preparado para revisão. Não substitui a análise de um advogado especializado em LGPD. Recomendo revisão jurídica antes de publicar, especialmente por envolver dados de pacientes (contexto de saúde).

# Política de Privacidade — SISA

**Última atualização:** 29/07/2026

Esta Política descreve como o SISA ("Plataforma") trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).

## 1. Quem trata seus dados

**Wilson Bernardes de Faria Santana**, pessoa física, com endereço em Rua Albert Bruce Sabin, 70, Universitário, Caruaru - PE, CEP 55016-535, é o Operador responsável pela Plataforma.

**Encarregado de Proteção de Dados (contato para questões de privacidade/LGPD):** willsonbs@gmail.com

## 2. Papéis: quando somos Controlador e quando somos Operador

- **Dados de cadastro dos Usuários** (Empresa, Profissional, Recepção/Financeiro) — nome, e-mail, telefone, CPF/CNPJ, registro profissional, dados de pagamento processados via Stripe: aqui a Plataforma atua como **Controladora**, definindo as finalidades e meios do tratamento.
- **Dados de Pacientes** inseridos pelo Profissional (nome, telefone, observações de atendimento) — aqui a Plataforma atua como **Operadora**, tratando os dados apenas para viabilizar o agendamento, conforme instruções do Profissional/Empresa, que são os Controladores dessa informação frente ao Paciente.

## 3. Quais dados coletamos

### 3.1 Dados de Usuários (Controlador)
- Identificação: nome, e-mail, telefone, CPF/CNPJ, data de nascimento, gênero (quando informado).
- Profissionais: registro de classe profissional (ex: CRP, CRM), especialidade, biografia pública (opcional).
- Dados de acesso: senha (armazenada com hash, nunca em texto puro), histórico de login.
- Dados de uso: reservas realizadas, créditos, transações de pagamento (processadas pelo Stripe — não armazenamos dados completos de cartão).
- Dados técnicos: endereço IP e user-agent, coletados em ações sensíveis para fins de auditoria e segurança (ex: registro de acesso a dados de pacientes, tentativas de login).

### 3.2 Dados de Pacientes (Operadora)
- Nome e telefone de contato, inseridos pelo Profissional para fins de agendamento.
- Registros de consentimento (quando aplicável, ex: entrada em lista de espera), incluindo IP e data/hora do consentimento.

Não coletamos diretamente dados de saúde (prontuário clínico, diagnóstico) — a Plataforma se limita a dados de agendamento. Qualquer informação clínica inserida em campos de observação é de responsabilidade e risco do Profissional que a inseriu.

## 4. Finalidades do Tratamento

- Viabilizar o cadastro, autenticação e funcionamento das contas de Usuários.
- Processar reservas de salas, controle de créditos e cobranças.
- Enviar comunicações operacionais (lembretes de reserva, notificações do sistema).
- Cumprir obrigações legais e regulatórias (ex: registros fiscais de pagamento).
- Prevenir fraude e garantir a segurança da Plataforma (ex: bloqueio de tentativas de login, trilha de auditoria).
- Melhorar o serviço (métricas de uso agregadas).

## 5. Compartilhamento de Dados (Operadores/Subcontratados)

Utilizamos os seguintes prestadores de serviço para operar a Plataforma, que podem ter acesso a dados pessoais estritamente para essa finalidade:

| Prestador | Finalidade | Dados envolvidos |
|---|---|---|
| Supabase | Hospedagem do banco de dados | Todos os dados armazenados na Plataforma |
| Railway | Hospedagem da aplicação (servidor) | Dados em trânsito durante o uso da Plataforma |
| Stripe | Processamento de pagamentos | Dados de pagamento, nome, e-mail |

Não vendemos dados pessoais a terceiros. Podemos divulgar dados quando exigido por lei, ordem judicial ou autoridade competente.

## 6. Segurança dos Dados

- Dados sensíveis de Pacientes (nome, telefone) são criptografados em repouso (AES-256-GCM) no banco de dados.
- Senhas são armazenadas com hash (bcrypt), nunca em texto puro.
- Mantemos trilha de auditoria de acessos a dados de Pacientes e ações administrativas sensíveis.
- Controle de acesso por papel (Empresa, Profissional, Recepção, Financeiro), restringindo cada Usuário aos dados necessários à sua função.
- Row-Level Security habilitado no banco de dados como camada adicional de proteção.

Apesar dessas medidas, nenhum sistema é 100% livre de risco. Em caso de incidente de segurança que resulte em risco relevante aos titulares, comunicaremos a Autoridade Nacional de Proteção de Dados (ANPD) e os titulares afetados, conforme exigido pela LGPD.

## 7. Retenção e Eliminação

Mantemos os dados pessoais pelo tempo necessário às finalidades descritas nesta Política, ou pelo prazo exigido por obrigação legal (ex: dados fiscais). Após esse período, os dados são eliminados ou anonimizados, exceto quando a manutenção for exigida por lei ou para exercício regular de direitos em processo judicial/administrativo.

Usuários podem solicitar a exclusão de sua conta a qualquer momento pelo contato informado na Seção 1.

## 8. Direitos do Titular

Nos termos do art. 18 da LGPD, o titular dos dados pode solicitar, mediante contato com o Encarregado (Seção 1):

- Confirmação da existência de tratamento;
- Acesso aos dados;
- Correção de dados incompletos, inexatos ou desatualizados;
- Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;
- Portabilidade dos dados a outro fornecedor de serviço;
- Eliminação dos dados tratados com base em consentimento;
- Informação sobre entidades com as quais os dados foram compartilhados;
- Revogação do consentimento, quando aplicável.

Pacientes cujos dados foram inseridos por um Profissional podem exercer esses direitos diretamente com o Profissional (Controlador) ou, subsidiariamente, entrando em contato conosco, que encaminharemos a solicitação ao Controlador responsável.

## 9. Cookies e Tecnologias Similares

A Plataforma pode utilizar cookies estritamente necessários ao funcionamento (ex: sessão de login) e, eventualmente, ferramentas de análise de uso agregada para melhoria do serviço. Não utilizamos cookies de publicidade de terceiros.

## 10. Crianças e Adolescentes

A Plataforma não se destina a menores de 18 anos como titulares de conta. Dados de Pacientes menores de idade podem ser inseridos pelo Profissional responsável pelo atendimento, sob a responsabilidade e consentimento do responsável legal do menor, conforme a LGPD.

## 11. Alterações desta Política

Podemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas com antecedência razoável. A data da última atualização consta no topo deste documento.

## 12. Contato

Dúvidas, solicitações ou reclamações sobre privacidade e tratamento de dados: willsonbs@gmail.com
