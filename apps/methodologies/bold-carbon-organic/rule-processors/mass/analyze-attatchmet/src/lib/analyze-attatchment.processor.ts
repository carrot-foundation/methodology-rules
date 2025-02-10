import { AnalyzeAttatchmentProcessor } from '@carrot-fndn/methodologies/bold/recycling/organic/processors';

export class MTRAttatchmentProcessor extends AnalyzeAttatchmentProcessor {
  constructor() {
    super([
      'MANIFESTO DE TRANSPORTE DE RESÍDUOS',
      'MTR n°',
      'Identificação do Gerador',
      'Identificação do Transportador',
      'Identificação do Destinador',
      'Nome do Motorista',
      'Placa do Veículo',
      'data da emissão',
      'data do transporte',
      'data do recebimento',
    ]);
  }
}
