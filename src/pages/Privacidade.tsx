import LegalLayout from "@/components/layout/LegalLayout";

const Privacidade = () => (
  <LegalLayout
    eyebrow="Privacidade"
    title="Política de privacidade"
    updatedAt="agosto de 2026"
  >
    <p>
      Esta política descreve como o <strong>Studoo</strong> coleta, usa e
      protege dados pessoais. Vale tanto para você (professor) quanto para os
      alunos que você cadastra.
    </p>
    <p>
      O Studoo está em beta e é gratuito. Escrevemos aqui o que o app{" "}
      <strong>realmente faz hoje</strong> — não o que a gente pretende fazer.
      Quando o produto mudar, esta página muda junto.
    </p>

    <h2>1. Quem é quem</h2>
    <p>
      O <strong>Studoo</strong> é o controlador dos dados de cadastro dos
      professores (quem cria conta e usa o app). Quando você cadastra dados dos
      seus alunos, <strong>você é o controlador</strong> desses dados e o
      Studoo é apenas o <strong>operador</strong>, tratando em seu nome e
      seguindo suas instruções.
    </p>

    <h2>2. Dados que coletamos</h2>
    <h3>Do professor</h3>
    <ul>
      <li>Nome e email</li>
      <li>
        Senha (guardada como hash pelo serviço de autenticação — nunca em texto
        puro)
      </li>
      <li>
        Chave PIX, CPF/CNPJ e endereço, se você preencher — usados nos recibos
        e no texto das cobranças
      </li>
      <li>
        Configurações de uso: política de faltas, folgas e bloqueios de agenda
      </li>
      <li>
        Registros técnicos gerados pelo provedor de autenticação e pela
        hospedagem (IP, user-agent, data e hora de acesso)
      </li>
    </ul>
    <h3>Dos alunos, cadastrados por você</h3>
    <ul>
      <li>Nome, instrumento, telefone e email</li>
      <li>Data de nascimento (opcional)</li>
      <li>Valor de mensalidade, dia e horário de aula</li>
      <li>Histórico de aulas, presenças, faltas, pacotes e cobranças</li>
      <li>
        Anotações de aula e lição que você escrever sobre o aluno
      </li>
      <li>
        <strong>Texto das mensagens de WhatsApp</strong> que você dispara pelo
        app — veja a seção 4
      </li>
    </ul>
    <p>
      Não coletamos dados de cartão de crédito, porque não há cobrança.
    </p>

    <h2>3. Como usamos</h2>
    <ul>
      <li>Prestar o serviço: alunos, agenda, cobranças e relatórios</li>
      <li>
        Enviar emails de conta (confirmação de cadastro e redefinição de senha)
      </li>
      <li>
        Manter o histórico de mensagens que você enviou, pra você consultar
        depois
      </li>
      <li>Corrigir erros e manter o serviço no ar</li>
      <li>Cumprir obrigações legais</li>
    </ul>
    <p>
      <strong>Não vendemos dados.</strong> Não usamos dados de alunos para
      anúncios nem para treinar modelos de inteligência artificial.
    </p>

    <h2>4. WhatsApp: o app não manda nada sozinho</h2>
    <p>
      Isso é importante e muita gente entende errado: o Studoo{" "}
      <strong>não envia mensagens automaticamente</strong>. Ele monta o texto
      (lembrete de aula, cobrança, resumo da aula, parabéns) e abre o WhatsApp
      já com esse texto. Quem aperta o enviar é você.
    </p>
    <p>
      Quando isso acontece, o Studoo <strong>guarda o texto enviado</strong>,
      o telefone de destino, o tipo da mensagem e a data — pra montar o
      histórico do aluno. Se você usa o modelo de cobrança e tem chave PIX
      cadastrada, <strong>a chave PIX faz parte desse texto</strong> e fica
      salva junto com a mensagem.
    </p>
    <p>
      O Studoo não tem acesso à sua conta do WhatsApp, não lê suas conversas e
      não sabe se a mensagem foi realmente enviada.
    </p>

    <h2>5. Base legal (LGPD)</h2>
    <ul>
      <li>
        <strong>Execução do contrato</strong> — para prestar o serviço a você
        (Art. 7º, V)
      </li>
      <li>
        <strong>Legítimo interesse</strong> — segurança da conta e correção de
        falhas (Art. 7º, IX)
      </li>
      <li>
        <strong>Cumprimento de obrigação legal</strong> — quando a lei exigir
        (Art. 7º, II)
      </li>
    </ul>
    <p>
      Para os dados dos seus alunos, quem define a base legal é você, como
      controlador.
    </p>

    <h2>6. Com quem compartilhamos</h2>
    <p>
      Não vendemos nem repassamos dados para terceiros. Usamos apenas os
      seguintes operadores (subprocessadores) para fazer o serviço funcionar:
    </p>
    <ul>
      <li>
        <strong>Supabase</strong> — banco de dados, autenticação e emails de
        conta. É onde os dados ficam armazenados.
      </li>
      <li>
        <strong>Provedor de hospedagem do site</strong> — entrega as páginas do
        Studoo no seu navegador e mantém registros de acesso.
      </li>
    </ul>
    <p>
      Também podemos compartilhar dados quando houver ordem judicial ou
      requisição legal válida.
    </p>

    <h3>Transferência internacional</h3>
    <p>
      A infraestrutura desses fornecedores pode estar{" "}
      <strong>fora do Brasil</strong>. Nesse caso, há transferência
      internacional de dados nos termos do Art. 33 da LGPD, e ela acontece para
      permitir a execução do contrato com você. Se essa lista de fornecedores
      mudar, atualizamos esta página.
    </p>

    <h2>7. Seus direitos</h2>
    <p>Pela LGPD, você pode a qualquer momento:</p>
    <ul>
      <li>Confirmar quais dados temos sobre você</li>
      <li>Acessar e exportar seus dados</li>
      <li>Corrigir dados incorretos ou desatualizados</li>
      <li>Pedir a exclusão da conta e dos dados</li>
      <li>Pedir informação sobre com quem compartilhamos</li>
      <li>Reclamar à ANPD ou aos órgãos de defesa do consumidor</li>
    </ul>
    <p>Na prática, o caminho é este:</p>
    <ul>
      <li>
        <strong>Exportação</strong> — o app tem exportação em CSV das suas
        listas (alunos, cobranças, relatórios). Precisando de algo além disso,
        peça por email.
      </li>
      <li>
        <strong>Exclusão da conta</strong> — pela opção de excluir conta dentro
        do app ou por email. A exclusão apaga sua conta e os dados de alunos
        vinculados a ela.
      </li>
      <li>
        <strong>Qualquer outro pedido</strong> — escreva para{" "}
        <a href="mailto:contato@studoo.app">contato@studoo.app</a>. Respondemos
        em até 15 dias.
      </li>
    </ul>
    <p>
      Se um aluno seu exercer um desses direitos com a gente, vamos encaminhar
      o pedido para você, que é o controlador dos dados dele.
    </p>

    <h2>8. Retenção</h2>
    <ul>
      <li>
        <strong>Conta ativa</strong> — mantemos os dados enquanto a conta
        existir
      </li>
      <li>
        <strong>Conta excluída</strong> — apagamos os dados em até 15 dias após
        o pedido, incluindo cópias operacionais
      </li>
      <li>
        <strong>Dados que a lei manda guardar</strong> — mantidos pelo prazo
        legal, mesmo após a exclusão
      </li>
    </ul>

    <h2>9. Segurança</h2>
    <ul>
      <li>Tráfego criptografado por HTTPS/TLS</li>
      <li>Senhas guardadas como hash pelo serviço de autenticação</li>
      <li>
        Row-Level Security no banco: cada professor só enxerga os próprios
        dados
      </li>
      <li>Acesso ao banco restrito por credenciais e chaves de serviço</li>
    </ul>
    <p>
      Nenhum sistema é 100% seguro, ainda mais um beta. Se acontecer um
      incidente que afete dados pessoais, notificamos a ANPD e os titulares
      afetados no prazo da LGPD.
    </p>

    <h2>10. Cookies</h2>
    <p>
      Usamos apenas armazenamento e cookies{" "}
      <strong>estritamente necessários</strong> para o funcionamento: manter
      você logado e lembrar a preferência de tema. Não usamos cookies de
      publicidade nem rastreamento entre sites.
    </p>

    <h2>11. Crianças e adolescentes</h2>
    <p>
      O Studoo é feito para professores adultos. Se você cadastra um aluno
      criança ou adolescente, <strong>você é responsável</strong> por ter o
      consentimento específico e destacado do pai, mãe ou responsável legal,
      conforme o Art. 14 da LGPD, e por cadastrar apenas os dados necessários
      para dar a aula.
    </p>

    <h2>12. Alterações</h2>
    <p>
      Esta política pode mudar conforme o produto evolui. Mudanças relevantes
      são comunicadas pelo email cadastrado com 30 dias de antecedência.
    </p>

    <h2>13. Contato</h2>
    <p>
      Para qualquer assunto de privacidade, incluindo pedidos de titular,
      escreva para{" "}
      <a href="mailto:contato@studoo.app">contato@studoo.app</a>.
    </p>
  </LegalLayout>
);

export default Privacidade;
