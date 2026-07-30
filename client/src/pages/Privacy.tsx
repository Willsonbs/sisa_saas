import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#F5F3EF]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E8E4DF]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm text-[#6B6560] hover:text-[#3D3D2E] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#3D3D2E] mb-1">Política de Privacidade</h1>
        <p className="text-sm text-[#6B6560] mb-8">Última atualização: 29/07/2026</p>

        <p className="text-[#4A453F] leading-relaxed mb-8">
          Esta Política descreve como o SISA ("Plataforma") trata dados pessoais, em conformidade com a Lei Geral de
          Proteção de Dados (Lei nº 13.709/2018 - LGPD).
        </p>

        <Section title="1. Quem trata seus dados">
          <p>
            <strong>Wilson Bernardes de Faria Santana</strong>, pessoa física, com endereço em Rua Albert Bruce Sabin,
            70, Universitário, Caruaru - PE, CEP 55016-535, é o Operador responsável pela Plataforma.
          </p>
          <p><strong>Encarregado de Proteção de Dados (contato para questões de privacidade/LGPD):</strong> willsonbs@gmail.com</p>
        </Section>

        <Section title="2. Quando somos Controlador e quando somos Operador">
          <ul>
            <li>
              <strong>Dados de cadastro dos Usuários</strong> (Empresa, Profissional, Recepção/Financeiro) — nome,
              e-mail, telefone, CPF/CNPJ, registro profissional, dados de pagamento processados via Stripe: aqui a
              Plataforma atua como <strong>Controladora</strong>, definindo as finalidades e meios do tratamento.
            </li>
            <li>
              <strong>Dados de Pacientes</strong> inseridos pelo Profissional (nome, telefone, observações de
              atendimento) — aqui a Plataforma atua como <strong>Operadora</strong>, tratando os dados apenas para
              viabilizar o agendamento, conforme instruções do Profissional/Empresa, que são os Controladores dessa
              informação frente ao Paciente.
            </li>
          </ul>
        </Section>

        <Section title="3. Quais dados coletamos">
          <p className="font-medium text-[#3D3D2E]">3.1 Dados de Usuários (Controlador)</p>
          <ul>
            <li>Identificação: nome, e-mail, telefone, CPF/CNPJ, data de nascimento, gênero (quando informado).</li>
            <li>Profissionais: registro de classe profissional (ex: CRP, CRM), especialidade, biografia pública (opcional).</li>
            <li>Dados de acesso: senha (armazenada com hash, nunca em texto puro), histórico de login.</li>
            <li>Dados de uso: reservas realizadas, créditos, transações de pagamento (processadas pelo Stripe — não armazenamos dados completos de cartão).</li>
            <li>Dados técnicos: endereço IP e user-agent, coletados em ações sensíveis para fins de auditoria e segurança (ex: registro de acesso a dados de pacientes, tentativas de login).</li>
          </ul>
          <p className="font-medium text-[#3D3D2E] pt-2">3.2 Dados de Pacientes (Operadora)</p>
          <ul>
            <li>Nome e telefone de contato, inseridos pelo Profissional para fins de agendamento.</li>
            <li>Registros de consentimento (quando aplicável, ex: entrada em lista de espera), incluindo IP e data/hora do consentimento.</li>
          </ul>
          <p>
            Não coletamos diretamente dados de saúde (prontuário clínico, diagnóstico) — a Plataforma se limita a
            dados de agendamento. Qualquer informação clínica inserida em campos de observação é de responsabilidade
            e risco do Profissional que a inseriu.
          </p>
        </Section>

        <Section title="4. Finalidades do Tratamento">
          <ul>
            <li>Viabilizar o cadastro, autenticação e funcionamento das contas de Usuários.</li>
            <li>Processar reservas de salas, controle de créditos e cobranças.</li>
            <li>Enviar comunicações operacionais (lembretes de reserva, notificações do sistema).</li>
            <li>Cumprir obrigações legais e regulatórias (ex: registros fiscais de pagamento).</li>
            <li>Prevenir fraude e garantir a segurança da Plataforma (ex: bloqueio de tentativas de login, trilha de auditoria).</li>
            <li>Melhorar o serviço (métricas de uso agregadas).</li>
          </ul>
        </Section>

        <Section title="5. Compartilhamento de Dados (Operadores/Subcontratados)">
          <p>Utilizamos os seguintes prestadores de serviço para operar a Plataforma, que podem ter acesso a dados pessoais estritamente para essa finalidade:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#D8D0C8] text-left">
                  <th className="py-2 pr-4 font-medium text-[#3D3D2E]">Prestador</th>
                  <th className="py-2 pr-4 font-medium text-[#3D3D2E]">Finalidade</th>
                  <th className="py-2 font-medium text-[#3D3D2E]">Dados envolvidos</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#E8E4DF]">
                  <td className="py-2 pr-4">Supabase</td>
                  <td className="py-2 pr-4">Hospedagem do banco de dados</td>
                  <td className="py-2">Todos os dados armazenados na Plataforma</td>
                </tr>
                <tr className="border-b border-[#E8E4DF]">
                  <td className="py-2 pr-4">Railway</td>
                  <td className="py-2 pr-4">Hospedagem da aplicação (servidor)</td>
                  <td className="py-2">Dados em trânsito durante o uso da Plataforma</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Stripe</td>
                  <td className="py-2 pr-4">Processamento de pagamentos</td>
                  <td className="py-2">Dados de pagamento, nome, e-mail</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Não vendemos dados pessoais a terceiros. Podemos divulgar dados quando exigido por lei, ordem judicial ou
            autoridade competente.
          </p>
        </Section>

        <Section title="6. Segurança dos Dados">
          <ul>
            <li>Dados sensíveis de Pacientes (nome, telefone) são criptografados em repouso (AES-256-GCM) no banco de dados.</li>
            <li>Senhas são armazenadas com hash (bcrypt), nunca em texto puro.</li>
            <li>Mantemos trilha de auditoria de acessos a dados de Pacientes e ações administrativas sensíveis.</li>
            <li>Controle de acesso por papel (Empresa, Profissional, Recepção, Financeiro), restringindo cada Usuário aos dados necessários à sua função.</li>
            <li>Row-Level Security habilitado no banco de dados como camada adicional de proteção.</li>
          </ul>
          <p>
            Apesar dessas medidas, nenhum sistema é 100% livre de risco. Em caso de incidente de segurança que
            resulte em risco relevante aos titulares, comunicaremos a Autoridade Nacional de Proteção de Dados (ANPD)
            e os titulares afetados, conforme exigido pela LGPD.
          </p>
        </Section>

        <Section title="7. Retenção e Eliminação">
          <p>
            Mantemos os dados pessoais pelo tempo necessário às finalidades descritas nesta Política, ou pelo prazo
            exigido por obrigação legal (ex: dados fiscais). Após esse período, os dados são eliminados ou
            anonimizados, exceto quando a manutenção for exigida por lei ou para exercício regular de direitos em
            processo judicial/administrativo.
          </p>
          <p>Usuários podem solicitar a exclusão de sua conta a qualquer momento pelo contato informado na Seção 1.</p>
        </Section>

        <Section title="8. Direitos do Titular">
          <p>Nos termos do art. 18 da LGPD, o titular dos dados pode solicitar, mediante contato com o Encarregado (Seção 1):</p>
          <ul>
            <li>Confirmação da existência de tratamento;</li>
            <li>Acesso aos dados;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
            <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
            <li>Eliminação dos dados tratados com base em consentimento;</li>
            <li>Informação sobre entidades com as quais os dados foram compartilhados;</li>
            <li>Revogação do consentimento, quando aplicável.</li>
          </ul>
          <p>
            Pacientes cujos dados foram inseridos por um Profissional podem exercer esses direitos diretamente com o
            Profissional (Controlador) ou, subsidiariamente, entrando em contato conosco, que encaminharemos a
            solicitação ao Controlador responsável.
          </p>
        </Section>

        <Section title="9. Cookies e Tecnologias Similares">
          <p>
            A Plataforma pode utilizar cookies estritamente necessários ao funcionamento (ex: sessão de login) e,
            eventualmente, ferramentas de análise de uso agregada para melhoria do serviço. Não utilizamos cookies de
            publicidade de terceiros.
          </p>
        </Section>

        <Section title="10. Crianças e Adolescentes">
          <p>
            A Plataforma não se destina a menores de 18 anos como titulares de conta. Dados de Pacientes menores de
            idade podem ser inseridos pelo Profissional responsável pelo atendimento, sob a responsabilidade e
            consentimento do responsável legal do menor, conforme a LGPD.
          </p>
        </Section>

        <Section title="11. Alterações desta Política">
          <p>
            Podemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas com antecedência
            razoável. A data da última atualização consta no topo deste documento.
          </p>
        </Section>

        <Section title="12. Contato">
          <p>Dúvidas, solicitações ou reclamações sobre privacidade e tratamento de dados: willsonbs@gmail.com</p>
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-[#3D3D2E] mb-3">{title}</h2>
      <div className="space-y-3 text-[#4A453F] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
