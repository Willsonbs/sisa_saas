import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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

      <article className="max-w-3xl mx-auto px-6 py-12 prose-legal">
        <h1 className="text-3xl font-bold text-[#3D3D2E] mb-1">Termos e Condições Gerais de Uso e Licenciamento</h1>
        <p className="text-sm text-[#6B6560] mb-8">Última atualização: 29/07/2026</p>

        <Section title="1. Quem somos">
          <p>
            O SISA ("Plataforma", "Sistema", "nós") é um serviço de software (SaaS) para gestão de salas clínicas,
            agendamento de atendimentos e controle de créditos entre profissionais de saúde e empresas/clínicas
            locatárias de salas.
          </p>
          <p>A Plataforma é operada por:</p>
          <p>
            <strong>Wilson Bernardes de Faria Santana</strong>, pessoa física, com endereço em Rua Albert Bruce Sabin,
            70, Universitário, Caruaru - PE, CEP 55016-535 ("Operador").
          </p>
          <p>Contato: willsonbs@gmail.com</p>
        </Section>

        <Section title="2. Aceite dos Termos">
          <p>
            Ao criar uma conta, acessar ou utilizar o SISA, você concorda integralmente com estes Termos e com a{" "}
            <Link href="/privacidade" className="text-[#7C5C4A] underline hover:no-underline">Política de Privacidade</Link>.
            Se não concordar, não utilize a Plataforma.
          </p>
          <p>
            Caso você esteja se cadastrando em nome de uma empresa/clínica ("Empresa"), você declara ter poderes para
            vincular essa empresa a estes Termos.
          </p>
        </Section>

        <Section title="3. Definições">
          <ul>
            <li><strong>Usuário</strong>: qualquer pessoa que acesse a Plataforma com uma conta (Empresa, Profissional, Recepção/Financeiro).</li>
            <li><strong>Empresa</strong>: pessoa física ou jurídica que cadastra e gerencia salas na Plataforma para locação a Profissionais.</li>
            <li><strong>Profissional</strong>: profissional de saúde (ou de áreas correlatas) que reserva salas para atendimento de seus próprios pacientes.</li>
            <li><strong>Paciente</strong>: pessoa atendida pelo Profissional, cujos dados básicos (nome, telefone) podem ser registrados na Plataforma pelo Profissional para fins de agendamento. O Paciente não é usuário da Plataforma e não possui conta.</li>
            <li><strong>Créditos</strong>: unidade de saldo utilizada pelo Profissional para reservar salas, adquirida via pagamento processado por terceiro (Stripe).</li>
          </ul>
        </Section>

        <Section title="4. Elegibilidade e Cadastro">
          <ul>
            <li>É necessário ter 18 anos ou mais e capacidade civil plena para se cadastrar.</li>
            <li>As informações fornecidas no cadastro (nome, e-mail, telefone, CPF/CNPJ, registro profissional) devem ser verdadeiras, completas e mantidas atualizadas.</li>
            <li>Cada Usuário é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta.</li>
            <li>Profissionais de saúde declaram possuir registro profissional válido no respectivo conselho de classe (quando aplicável) para o exercício da atividade anunciada na Plataforma.</li>
          </ul>
        </Section>

        <Section title="5. Licença de Uso">
          <p>
            Concedemos ao Usuário uma licença limitada, não exclusiva, intransferível e revogável para acessar e
            utilizar a Plataforma exclusivamente para os fins a que se destina (gestão de salas, agendamento e
            controle de créditos), enquanto durar sua relação contratual conosco.
          </p>
          <p>É vedado ao Usuário:</p>
          <ul>
            <li>Copiar, modificar, fazer engenharia reversa ou criar obras derivadas da Plataforma;</li>
            <li>Utilizar a Plataforma para fins ilícitos ou que violem direitos de terceiros;</li>
            <li>Revender, sublicenciar ou disponibilizar o acesso à Plataforma a terceiros não autorizados;</li>
            <li>Tentar acessar áreas, dados ou funcionalidades sem autorização, ou interferir na segurança/infraestrutura do serviço.</li>
          </ul>
        </Section>

        <Section title="6. Papéis e Responsabilidade sobre Dados de Pacientes">
          <p>O Profissional é o único responsável por:</p>
          <ul>
            <li>Obter o consentimento adequado do Paciente para registro de seus dados na Plataforma, quando exigido pela LGPD;</li>
            <li>Garantir a veracidade e a licitude dos dados de Pacientes inseridos;</li>
            <li>Utilizar os dados de Pacientes exclusivamente para os fins do atendimento agendado.</li>
          </ul>
          <p>
            Para fins da Lei Geral de Proteção de Dados (LGPD), em relação aos dados de Pacientes, o Profissional
            e/ou a Empresa atuam como <strong>Controladores</strong>, e o Operador da Plataforma atua como{" "}
            <strong>Operador</strong> (processador), tratando esses dados apenas conforme instruções dos Controladores
            e para viabilizar o funcionamento do serviço. Mais detalhes na{" "}
            <Link href="/privacidade" className="text-[#7C5C4A] underline hover:no-underline">Política de Privacidade</Link>.
          </p>
        </Section>

        <Section title="7. Planos, Pagamentos e Créditos">
          <ul>
            <li>O acesso a determinadas funcionalidades pode depender da contratação de um plano pago (Empresa) e/ou da compra de créditos (Profissional).</li>
            <li>Os pagamentos são processados por meio de provedor terceiro (Stripe), sujeitos aos termos desse provedor. O Operador não armazena dados completos de cartão de crédito.</li>
            <li>Créditos utilizados para reservar salas não são reembolsáveis, exceto conforme a política de cancelamento configurada pela Empresa e vigente no momento da reserva.</li>
            <li>Assinaturas de planos são renovadas automaticamente conforme a periodicidade contratada, podendo ser canceladas a qualquer momento, sem efeito retroativo sobre períodos já pagos.</li>
          </ul>
        </Section>

        <Section title="8. Disponibilidade do Serviço">
          <p>
            A Plataforma é fornecida em regime de "melhor esforço" ("as is"). Não garantimos disponibilidade
            ininterrupta e podemos realizar manutenções programadas ou emergenciais que resultem em indisponibilidade
            temporária. Buscaremos comunicar previamente interrupções programadas relevantes, quando possível.
          </p>
        </Section>

        <Section title="9. Propriedade Intelectual">
          <p>
            Todo o software, design, marca "SISA" e demais elementos da Plataforma são de propriedade do Operador ou
            de seus licenciadores, protegidos pela legislação de propriedade intelectual aplicável. Nada nestes Termos
            transfere qualquer direito de propriedade intelectual ao Usuário, além da licença de uso descrita na Seção 5.
          </p>
        </Section>

        <Section title="10. Limitação de Responsabilidade">
          <p>
            Na máxima extensão permitida pela lei, o Operador não será responsável por danos indiretos, lucros
            cessantes, ou perda de dados decorrentes do uso ou impossibilidade de uso da Plataforma, exceto nos casos
            de dolo ou culpa grave.
          </p>
          <p>
            O Operador não se responsabiliza pela relação contratual/clínica entre Profissional e Paciente, nem pela
            qualidade dos serviços de saúde prestados, que são de exclusiva responsabilidade do Profissional.
          </p>
        </Section>

        <Section title="11. Suspensão e Encerramento">
          <p>
            Podemos suspender ou encerrar o acesso de qualquer Usuário que viole estes Termos, mediante notificação,
            exceto em casos de violação grave ou risco à segurança da Plataforma ou de terceiros, quando a suspensão
            poderá ser imediata.
          </p>
          <p>
            O Usuário pode encerrar sua conta a qualquer momento, mediante solicitação de exclusão de conta,
            observado o disposto na Política de Privacidade quanto à retenção de dados quando exigida por lei.
          </p>
        </Section>

        <Section title="12. Alterações destes Termos">
          <p>
            Podemos alterar estes Termos a qualquer momento. Alterações relevantes serão comunicadas com antecedência
            razoável (ex: aviso na Plataforma ou por e-mail). O uso continuado após a alteração implica aceite dos
            novos Termos.
          </p>
        </Section>

        <Section title="13. Legislação Aplicável e Foro">
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de
            Caruaru - PE para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por mais privilegiado
            que seja.
          </p>
        </Section>

        <Section title="14. Contato">
          <p>Dúvidas sobre estes Termos: willsonbs@gmail.com</p>
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
