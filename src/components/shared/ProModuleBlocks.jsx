import ModuleShell from './ModuleShell';

export function DashboardAvancadoBlock() {
  return (
    <ModuleShell
      title="Indicadores avançados"
      subtitle="Comparativos semanais, ticket médio e projeção de faturamento."
      stats={[
        { label: 'Ticket médio', value: 'R$ —' },
        { label: 'vs. semana anterior', value: '—%' },
        { label: 'Taxa no-show', value: '—%' },
        { label: 'Projeção mês', value: 'R$ —' },
      ]}
      sections={[
        { title: 'Gráfico de faturamento', placeholder: 'Linha 30 dias + comparativo.' },
        { title: 'Ranking barbeiros', placeholder: 'Performance por profissional.' },
      ]}
    />
  );
}

export function AgendaInteligenteBlock() {
  return (
    <ModuleShell
      title="Agenda Inteligente"
      subtitle="Lista de espera, recorrentes, encaixe automático e sugestão de horários."
      sections={[
        { title: 'Lista de espera', placeholder: 'Fila por serviço/barbeiro com notificação.' },
        { title: 'Agendamentos recorrentes', placeholder: 'Cliente marca todo mês no mesmo horário.' },
        { title: 'Encaixe inteligente', placeholder: 'Preenche buracos após cancelamento.' },
      ]}
      actions={[{ label: 'Ativar lista de espera' }]}
    />
  );
}

export function FinanceiroInteligenteBlock() {
  return (
    <ModuleShell
      title="Financeiro Inteligente"
      subtitle="Gráficos, exportação e visão consolidada do mês."
      stats={[
        { label: 'Margem estimada', value: '—%' },
        { label: 'Despesas fixas', value: 'R$ —' },
        { label: 'Meta mês', value: 'R$ —' },
      ]}
      sections={[
        { title: 'Gráficos', placeholder: 'Entradas x saídas, categorias, tendência.' },
        { title: 'Exportar', placeholder: 'CSV/PDF para contador.' },
      ]}
    />
  );
}

export function EstoqueInteligenteBlock() {
  return (
    <ModuleShell
      title="Estoque Inteligente"
      subtitle="Alertas preditivos, movimentações e sugestão de compra."
      sections={[
        { title: 'Alertas', placeholder: 'Produtos abaixo do mínimo + previsão de ruptura.' },
        { title: 'Movimentações', placeholder: 'Histórico auditável por usuário.' },
      ]}
    />
  );
}

export function FidelidadeAvancadaBlock() {
  return (
    <ModuleShell
      title="Pacotes e combos avançados"
      subtitle="Assinaturas mensais, níveis de fidelidade e campanhas."
      sections={[
        { title: 'Pacotes recorrentes', placeholder: 'Cobrança mensal integrada ao financeiro.' },
        { title: 'Níveis VIP', placeholder: 'Bronze, Prata, Ouro com benefícios.' },
      ]}
    />
  );
}

export function PersonalizacaoBlock() {
  return (
    <ModuleShell
      title="Personalização da marca"
      subtitle="Cor primária, QR por cadeira e identidade visual."
      sections={[
        { title: 'Cor primária', placeholder: 'Seletor de cor + preview ao vivo.' },
        { title: 'QR Code por cadeira', placeholder: 'QR por profissional para agendamento rápido.' },
      ]}
    />
  );
}

export function WhatsAppAutomaticoBlock() {
  return (
    <ModuleShell
      title="WhatsApp Automático"
      subtitle="Confirmação, lembrete 24h e pós-atendimento."
      sections={[
        { title: 'Templates', placeholder: 'Mensagens personalizáveis por evento.' },
        { title: 'Agendamento de envios', placeholder: 'Lembrete automático antes do horário.' },
      ]}
      actions={[{ label: 'Conectar WhatsApp Business API' }]}
    />
  );
}

export function GorjetaDigitalBlock() {
  return (
    <ModuleShell
      title="Gorjeta Digital"
      subtitle="PIX ou cartão após o atendimento, direto para o barbeiro."
      sections={[{ title: 'Fluxo pós-atendimento', placeholder: 'Link/QR enviado ao cliente após checkout.' }]}
    />
  );
}

export function QrCodeCadeiraBlock() {
  return (
    <ModuleShell
      title="QR Code na cadeira"
      subtitle="Cliente escaneia e agenda com o profissional da cadeira."
      sections={[{ title: 'Gerar QR por profissional', placeholder: 'PDF para impressão nas cadeiras.' }]}
    />
  );
}

export function ComissaoPlusBlock() {
  return (
    <ModuleShell
      title="Comissões no Financeiro"
      subtitle="Integração com folha de pagamento e extrato por barbeiro."
      sections={[{ title: 'Resumo mensal', placeholder: 'Comissões calculadas a partir dos atendimentos.' }]}
    />
  );
}
