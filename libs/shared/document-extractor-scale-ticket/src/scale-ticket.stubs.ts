export const stubLayout1TicketText = (): string =>
  [
    'Ticket de pesagem',
    '1234567',
    'Placa Veiculo',
    'ABC1D23',
    'Pesagem Inicial:',
    '15000',
    'kg',
    'Pesagem Final:',
    '10000',
    'kg',
    'Data / Hora: 01/02/2025 08:00',
    'Data / Hora: 01/02/2025 09:00',
    'Transportadora: 12',
    'TRANSPORTES TESTE LTDA',
    'Peso Líquido: 5000',
    'kg',
  ].join('\n');

export const stubPesagemManualText = ({
  gross,
  net,
  tare,
}: {
  gross?: string;
  net?: string;
  tare?: string;
}): string =>
  [
    'PESAGEM MANUAL',
    '12345',
    'Transportadora',
    'TRANSPORTES TESTE',
    'Placa',
    'ABC1D23',
    'Peso Bruto (A)',
    '(Carregado)',
    gross,
    'Peso Líquido (A-B)',
    net,
    'Tara (B)',
    'Tara Pesada',
    'Tara Informada',
    '(Descarregado)',
    tare,
    'Motivo da pesagem em manual:',
    'Data:',
    '01/02/25',
  ]
    .filter((line) => line !== undefined)
    .join('\n');

export const stubToledoGuardianText = ({
  firstWeighing,
  net,
  secondWeighing,
}: {
  firstWeighing?: string;
  net?: string;
  secondWeighing?: string;
}): string =>
  [
    'Guardian',
    'Ticket de pesagem Documentos',
    'TICKET DE PESAGEM',
    '0001234',
    'Ticket Encerrado',
    'Placa do Veiculo',
    'ABC1D23',
    'Pre-Entrada',
    'Pesagem Inicial',
    'Pesagem Final',
    'Data / Hora: 01/02/2025 08:00:00',
    'Data / Hora: 01/02/2025 09:00:00',
    'Peso:',
    firstWeighing,
    'Peso:',
    secondWeighing,
    'Peso Liquido',
    'Fator Correcao',
    'Liq. Corrigido',
    'Fator Conversao',
    'Liq. Convertido',
    'Diferencas Origem',
    net,
    '0',
    net,
    '0,00000',
    '0 kg (0%)',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
