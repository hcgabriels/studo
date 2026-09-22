import LegalLayout from "@/components/layout/LegalLayout";

const Termos = () => (
  <LegalLayout
    eyebrow="Termos"
    title="Termos de uso"
    updatedAt="setembro de 2026"
  >
    <p>
      Estes termos regulam o uso do <strong>Studoo</strong>, uma ferramenta de
      gestão para professores particulares de música. Ao criar uma conta, você
      concorda com o que está escrito aqui.
    </p>
    <p>
      Aviso curto e importante: o Studoo é um produto pago desde o início. Ao
      assinar, você contrata uma assinatura recorrente mensal ou anual, com
      cobrança no momento da contratação e garantia de reembolso por 14 dias.
    </p>

    <h2>1. Sobre o Studoo</h2>
    <p>
      O Studoo é um software acessado pelo navegador que ajuda você a organizar
      alunos, agenda de aulas, cobranças e relatórios de frequência. Não somos
      um marketplace, não intermediamos a relação entre você e seus alunos e
      não processamos pagamentos dos seus alunos — quem combina, cobra e recebe
      é você.
    </p>

    <h2>2. Cadastro e conta</h2>
    <p>
      Para usar o Studoo você precisa criar uma conta com email válido. Você é
      responsável por:
    </p>
    <ul>
      <li>Manter suas credenciais em segurança</li>
      <li>Garantir que os dados de alunos cadastrados sejam precisos</li>
      <li>Avisar imediatamente em caso de uso não autorizado da conta</li>
      <li>Ter idade e capacidade civil para contratar</li>
    </ul>

    <h2>3. Planos, preço e cobrança</h2>
    <ul>
      <li>
        O Studoo custa <strong>R$ 39/mês</strong> no plano mensal ou{" "}
        <strong>R$ 390/ano</strong> no plano anual.
      </li>
      <li>
        Não há plano gratuito nem teste grátis. A cobrança acontece no momento
        da assinatura.
      </li>
      <li>
        A cobrança, troca de forma de pagamento, emissão de faturas e
        cancelamento são processados pela Stripe, nossa provedora de
        pagamentos.
      </li>
    </ul>

    <h2>4. Garantia de reembolso e cancelamento</h2>
    <p>
      Você pode pedir reembolso em até <strong>14 dias</strong> após a
      assinatura. A garantia vale para o plano mensal e para o plano anual.
    </p>
    <p>
      Você pode cancelar a assinatura em Configurações. O cancelamento impede
      novas cobranças e mantém o acesso até o fim do período já pago, salvo se
      houver reembolso integral.
    </p>

    <h2>5. Mudanças de preço e funcionalidades</h2>
    <p>
      Funcionalidades podem mudar, ser adiadas ou removidas conforme o produto
      evolui. Mudanças relevantes de preço ou condições comerciais serão
      comunicadas pelo email cadastrado antes de entrarem em vigor para a sua
      próxima renovação.
    </p>

    <h2>6. Uso permitido</h2>
    <p>
      Você concorda em <strong>não</strong>:
    </p>
    <ul>
      <li>
        Usar o Studoo para atividades ilegais ou que violem direitos de
        terceiros
      </li>
      <li>Cadastrar dados de pessoas sem ter base legal para tratá-los</li>
      <li>Tentar acessar dados de outras contas</li>
      <li>
        Fazer engenharia reversa, scraping em massa ou ataques à
        infraestrutura
      </li>
      <li>Revender ou sublicenciar o acesso ao Studoo</li>
      <li>
        Usar as mensagens geradas pelo app para spam ou envio em massa não
        solicitado
      </li>
    </ul>

    <h2>7. Mensagens de WhatsApp</h2>
    <p>
      O Studoo <strong>não envia mensagens sozinho</strong>. Ele monta o texto
      (lembrete de aula, cobrança, resumo da aula) e abre o WhatsApp com esse
      texto pronto. Quem decide enviar, para quem e quando é você. A
      responsabilidade pelo conteúdo enviado e pelo cumprimento das regras do
      WhatsApp é sua.
    </p>

    <h2>8. Seus dados e os dados dos seus alunos</h2>
    <p>
      Os dados que você cadastra (nomes de alunos, telefones, valores de
      mensalidade etc.) <strong>pertencem a você</strong>. O Studoo apenas
      armazena e processa esses dados em seu nome, conforme nossa{" "}
      <a href="/privacidade">Política de Privacidade</a>.
    </p>
    <p>
      Perante a LGPD, você é o <strong>controlador</strong> dos dados dos seus
      alunos e o Studoo é <strong>operador</strong>. Cabe a você garantir base
      legal para o tratamento (normalmente a execução do contrato com o aluno
      ou o consentimento), informar os titulares e, no caso de alunos menores,
      obter o consentimento do responsável legal (Art. 14 da LGPD).
    </p>

    <h2>9. Disponibilidade</h2>
    <p>
      Trabalhamos para manter o serviço no ar, mas não oferecemos SLA formal,
      salvo contratação específica por escrito. Podemos pausar o serviço para
      manutenção, com aviso prévio sempre que possível.
    </p>

    <h2>10. Limitação de responsabilidade</h2>
    <p>
      O Studoo é fornecido &quot;como está&quot;, sem garantias de adequação a
      uma finalidade específica. Na máxima extensão permitida pela lei
      brasileira, não nos responsabilizamos por perdas indiretas, lucros
      cessantes, perda de clientes ou danos decorrentes de indisponibilidade,
      erro de cálculo, perda de dados ou uso indevido da ferramenta.
    </p>
    <p>
      Nada aqui afasta direitos que o Código de Defesa do Consumidor garante a
      você de forma indisponível.
    </p>

    <h2>11. Encerramento da conta</h2>
    <p>
      Você pode encerrar sua conta a qualquer momento. Para isso, use a opção
      de exclusão de conta no app ou escreva para{" "}
      <a href="mailto:contato@studoo.app">contato@studoo.app</a> — a exclusão é
      concluída em até 15 dias e apaga seus dados e os dados dos seus alunos,
      salvo o que a lei exigir guardar.
    </p>
    <p>
      Podemos suspender ou encerrar contas que violem estes termos ou que
      apresentem atividade fraudulenta, notificando você quando for possível.
      Também podemos descontinuar o Studoo — nesse caso, avisamos com
      antecedência razoável para você exportar seus dados.
    </p>

    <h2>12. Modificações destes termos</h2>
    <p>
      Podemos atualizar estes termos. Quando a mudança for relevante,
      avisaremos com pelo menos 30 dias de antecedência pelo email cadastrado.
      Continuar usando o serviço após esse prazo significa aceitar a nova
      versão.
    </p>

    <h2>13. Lei aplicável e foro</h2>
    <p>
      Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da
      comarca de São Paulo/SP para dirimir controvérsias, ressalvado o direito
      do consumidor de ajuizar ação no foro do seu domicílio.
    </p>

    <h2>14. Contato</h2>
    <p>
      Dúvidas sobre estes termos? Escreva para{" "}
      <a href="mailto:contato@studoo.app">contato@studoo.app</a>.
    </p>
  </LegalLayout>
);

export default Termos;
