export const LAYOUT_1_SCALE_TICKET_PATTERNS = {
  finalDateTime: /Data \/ Hora:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/,
  finalWeight: /Pesagem Final:\s*([\d.,]+)\s*(kg)/i,
  initialDateTime: /Data \/ Hora:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/,
  initialWeight: /Pesagem Inicial:\s*([\d.,]+)\s*(kg)/i,
  netWeight: /Peso L[ií]quido:\s*([\d.,]+)\s*(kg)/i,
  ticketNumber: /Ticket de pesagem\s+(\d+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  transporter: /Transportadora:\s*(\d+)\s*-?\s*([\s\S]+?)(?=Peso|$)/i,
  vehiclePlate: /Placa Ve[ií]culo\s+([A-Z0-9]+)/i,
} as const;
