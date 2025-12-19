// Common descriptions
const OTHER_WASTE = 'Outros resíduos não anteriormente especificados';
const EFFLUENT_TREATMENT_SLUDGE = 'Lodos do tratamento local de efluentes';
const UNSUITABLE_MATERIALS =
  'Materiais impróprios para consumo ou processamento';
const TEXTILES = 'Têxteis';
const PAPER_CARDBOARD = 'Papel e cartão';
const WASHING_CLEANING_SLUDGE = 'Lodos provenientes da lavagem e limpeza';
const WASTE_FROM_SCREENING = 'Resíduos retirados da fase de gradeamento';

export const WASTE_CLASSIFICATION_CODES = {
  BR: {
    '02 01 01': {
      CDM_CODE: '8.7B',
      description: WASHING_CLEANING_SLUDGE,
    },
    '02 01 02': {
      CDM_CODE: '8.3',
      description: 'Resíduos de tecidos animais',
    },
    '02 01 03': {
      CDM_CODE: '8.3',
      description: 'Resíduos de tecidos vegetais',
    },
    '02 01 04': {
      CDM_CODE: '8.6',
      description: 'Resíduos de plásticos (excluindo embalagens)',
    },
    '02 01 06': {
      CDM_CODE: '8.7D',
      description:
        'Fezes, urina e estrume de animais (incluindo palha suja), efluentes recolhidos separadamente e tratados noutro local',
    },
    '02 01 07': {
      CDM_CODE: '8.1',
      description: 'Resíduos silvícolas',
    },
    '02 02 01': {
      CDM_CODE: '8.7B',
      description: WASHING_CLEANING_SLUDGE,
    },
    '02 02 02': {
      CDM_CODE: '8.3',
      description:
        'Resíduos de tecidos animais e orgânico de processo (sebo, soro, ossos, sangue, etc.)',
    },
    '02 02 03': {
      CDM_CODE: '8.3',
      description: UNSUITABLE_MATERIALS,
    },
    '02 02 04': {
      CDM_CODE: '8.7C',
      description: EFFLUENT_TREATMENT_SLUDGE,
    },
    '02 02 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '02 03 01': {
      CDM_CODE: '8.7B',
      description:
        'Lodos de lavagem, limpeza, descasque, centrifugação e separação',
    },
    '02 03 04': {
      CDM_CODE: '8.3',
      description: UNSUITABLE_MATERIALS,
    },
    '02 03 05': {
      CDM_CODE: '8.7C',
      description: EFFLUENT_TREATMENT_SLUDGE,
    },
    '02 03 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '02 04 03': {
      CDM_CODE: '8.7C',
      description: EFFLUENT_TREATMENT_SLUDGE,
    },
    '02 04 04': {
      CDM_CODE: '8.7D',
      description: 'Vinhaça',
    },
    '02 04 05': {
      CDM_CODE: '8.7D',
      description: 'Bagaço de cana-de-açúcar',
    },
    '02 04 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '02 05 01': {
      CDM_CODE: '8.3',
      description: UNSUITABLE_MATERIALS,
    },
    '02 05 02': {
      CDM_CODE: '8.7C',
      description: EFFLUENT_TREATMENT_SLUDGE,
    },
    '02 05 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '02 06 01': {
      CDM_CODE: '8.3',
      description: UNSUITABLE_MATERIALS,
    },
    '02 06 03': {
      CDM_CODE: '8.7C',
      description: EFFLUENT_TREATMENT_SLUDGE,
    },
    '02 07 02': {
      CDM_CODE: '8.7D',
      description: 'Resíduos da destilação de álcool',
    },
    '02 07 04': {
      CDM_CODE: '8.3',
      description: UNSUITABLE_MATERIALS,
    },
    '02 07 05': {
      CDM_CODE: '8.7C',
      description: EFFLUENT_TREATMENT_SLUDGE,
    },
    '02 07 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '03 01 01': {
      CDM_CODE: '8.1',
      description: 'Resíduos do descasque da madeira',
    },
    '03 01 05': {
      CDM_CODE: '8.1',
      description:
        'Serragem, aparas, fitas de aplaiamento, madeira, aglomerados e folheados não abrangidos em 03 01 04',
    },
    '03 01 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '03 03 01': {
      CDM_CODE: '8.1',
      description: 'Resíduos do descasque de madeira e resíduos de madeira',
    },
    '03 03 02': {
      CDM_CODE: '8.7B',
      description:
        'Lodos da lixívia verde (provenientes da valorização da lixívia de cozimento ou licor negro)',
    },
    '03 03 05': {
      CDM_CODE: '8.7B',
      description:
        'Lodos de branqueamento, provenientes da reciclagem de papel',
    },
    '03 03 07': {
      CDM_CODE: '8.2',
      description:
        'Rejeitos mecanicamente separados da fabricação de pasta a partir de papel e papelão usado',
    },
    '03 03 08': {
      CDM_CODE: '8.2',
      description:
        'Resíduos da triagem de papel e papelão destinado a reciclagem',
    },
    '03 03 09': {
      CDM_CODE: '8.7B',
      description: 'Resíduos de lodos de cal',
    },
    '03 03 10': {
      CDM_CODE: '8.2',
      description:
        'Rejeitos de fibras e lodos de fibras, fillers e revestimentos, provenientes da separação mecânica',
    },
    '03 03 11': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 03 03 10',
    },
    '03 03 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '04 01 01': {
      CDM_CODE: '8.7D',
      description: 'Resíduos das operações de descarga e divisão de tripa',
    },
    '04 01 04': {
      CDM_CODE: '8.7D',
      description: 'Licores de curtimenta contendo cromo',
    },
    '04 01 05': {
      CDM_CODE: '8.7D',
      description: 'Licores de curtimenta sem cromo',
    },
    '04 01 06': {
      CDM_CODE: '8.7B',
      description:
        'Lodos, em especial do tratamento local de efluentes, contendo cromo',
    },
    '04 01 07': {
      CDM_CODE: '8.7B',
      description:
        'Lodos, em especial do tratamento local de efluentes, sem cromo',
    },
    '04 01 08': {
      CDM_CODE: '8.7D',
      description:
        'Aparas, serragem e pós de couro provenientes de couros curtidos ao cromo',
    },
    '04 01 09': {
      CDM_CODE: '8.7D',
      description: 'Resíduos da confecção e acabamentos',
    },
    '04 01 10': {
      CDM_CODE: '8.7B',
      description: 'Lodo do caleiro',
    },
    '04 01 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '04 02 09': {
      CDM_CODE: '8.4',
      description:
        'Resíduos de materiais têxteis (têxteis impregados, elastômeros, plastômeros)',
    },
    '04 02 10': {
      CDM_CODE: '8.7D',
      description:
        'Matéria orgânica de produtos naturais (por exemplo, gordura, cera)',
    },
    '04 02 15': {
      CDM_CODE: '8.7D',
      description: 'Resíduos dos acabamentos não abrangidos em 04 02 14',
    },
    '04 02 20': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 04 02 19',
    },
    '04 02 21': {
      CDM_CODE: '8.2',
      description: 'Resíduos de fibras têxteis não processadas',
    },
    '04 02 22': {
      CDM_CODE: '8.2',
      description: 'Resíduos de fibras têxteis processadas',
    },
    '04 02 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '05 01 10': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 05 01 09',
    },
    '05 06 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '05 07 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '06 02 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '06 03 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '06 04 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '06 05 03': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 06 05 02',
    },
    '06 07 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '06 09 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '06 11 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '07 01 12': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 07 01 11',
    },
    '07 01 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '07 02 12': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 07 02 11',
    },
    '07 02 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '07 03 12': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 07 03 11',
    },
    '07 03 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '07 04 12': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 07 04 11',
    },
    '07 04 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '07 05 12': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 07 05 11',
    },
    '07 05 14': {
      CDM_CODE: '8.7D',
      description: 'Resíduos sólidos não abrangidos em 07 05 13',
    },
    '07 05 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '07 06 12': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 07 06 11',
    },
    '07 06 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '07 07 12': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 07 07 11',
    },
    '07 07 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '08 01 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '08 02 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '08 03 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '08 04 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '09 01 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 01 21': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 10 01 20',
    },
    '10 01 23': {
      CDM_CODE: '8.7B',
      description:
        'Lodos aquosas provenientes da limpeza de caldeiras não abrangidas em 10 01 22',
    },
    '10 01 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 02 08': {
      CDM_CODE: '8.7D',
      description:
        'Resíduos sólidos do tratamento de gases não abrangidos em 10 02 07',
    },
    '10 02 15': {
      CDM_CODE: '8.7D',
      description: 'Outras lodos e tortas de filtro',
    },
    '10 02 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 03 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 04 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 05 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 06 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 08 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 09 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 10 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 11 20': {
      CDM_CODE: '8.7C',
      description:
        'Resíduos sólidos do tratamento local de efluentes não abrangidos em 10 11 19',
    },
    '10 11 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 12 13': {
      CDM_CODE: '8.7C',
      description: EFFLUENT_TREATMENT_SLUDGE,
    },
    '10 12 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '10 13 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '11 01 10': {
      CDM_CODE: '8.7D',
      description: 'Lodos e tortas de filtro não abrangidos em 11 01 09',
    },
    '11 01 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '11 02 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '11 05 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '12 01 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '15 01 01': {
      CDM_CODE: '8.2',
      description: 'Embalagens de papel e cartão',
    },
    '15 01 02': {
      CDM_CODE: '8.6',
      description: 'Embalagens de plástico',
    },
    '15 01 03': {
      CDM_CODE: '8.1',
      description: 'Embalagens de madeira',
    },
    '15 01 04': {
      CDM_CODE: '8.6',
      description: 'Embalagens de metal',
    },
    '15 01 05': {
      CDM_CODE: '8.6',
      description: 'Embalagens longa-vida',
    },
    '15 01 06': {
      CDM_CODE: '8.6',
      description: 'Misturas de embalagens',
    },
    '15 01 07': {
      CDM_CODE: '8.6',
      description: 'Embalagens de vidro',
    },
    '15 01 09': {
      CDM_CODE: '8.4',
      description: 'Embalagens têxteis',
    },
    '16 01 17': {
      CDM_CODE: '8.6',
      description: 'Sucatas metálicas ferrosas',
    },
    '16 01 18': {
      CDM_CODE: '8.6',
      description: 'Sucatas metálicas não ferrosas',
    },
    '16 01 19': {
      CDM_CODE: '8.6',
      description: 'Plástico',
    },
    '16 01 20': {
      CDM_CODE: '8.6',
      description: 'Vidro',
    },
    '16 01 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '16 03 06': {
      CDM_CODE: '8.7D',
      description: 'Resíduos orgânicos não abrangidos em 16 03 05',
    },
    '16 07 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '17 02 01': {
      CDM_CODE: '8.1',
      description: 'Madeira',
    },
    '17 02 02': {
      CDM_CODE: '8.6',
      description: 'Vidro',
    },
    '17 02 03': {
      CDM_CODE: '8.6',
      description: 'Plástico',
    },
    '17 04 01': {
      CDM_CODE: '8.6',
      description: 'Cobre, bronze e latão',
    },
    '17 04 02': {
      CDM_CODE: '8.6',
      description: 'Alumínio',
    },
    '17 04 03': {
      CDM_CODE: '8.6',
      description: 'Chumbo',
    },
    '17 04 04': {
      CDM_CODE: '8.6',
      description: 'Zinco',
    },
    '17 04 05': {
      CDM_CODE: '8.6',
      description: 'Ferro e aço',
    },
    '17 04 06': {
      CDM_CODE: '8.6',
      description: 'Estanho',
    },
    '17 04 07': {
      CDM_CODE: '8.6',
      description: 'Mistura de sucatas',
    },
    '17 04 12': {
      CDM_CODE: '8.6',
      description: 'Magnésio',
    },
    '17 04 13': {
      CDM_CODE: '8.6',
      description: 'Níquel',
    },
    '17 05 04': {
      CDM_CODE: '8.6',
      description: 'Solos e rochas não abrangidos em 17 05 03',
    },
    '17 05 06': {
      CDM_CODE: '8.7D',
      description: 'Lodos de dragagem não abrangidas em 17 05 05',
    },
    '17 05 08': {
      CDM_CODE: '8.6',
      description:
        'Britas de linhas de ferroviárias  não abrangidos em 17 05 07',
    },
    '17 06 04': {
      CDM_CODE: '8.6',
      description:
        'Materiais de isolamento não abrangidos em 17 06 01 e 17 06 03',
    },
    '17 09 04': {
      CDM_CODE: '8.6',
      description:
        'Mistura de resíduos de construção e demolição não abrangidos em 17 09 01, 17 09 02 e 17 09 03',
    },
    '19 01 02': {
      CDM_CODE: '8.6',
      description: 'Materiais ferrosos removidos das cinzas',
    },
    '19 01 12': {
      CDM_CODE: '8.6',
      description: 'Cinzas e escórias não abrangidas em 19 01 11',
    },
    '19 01 18': {
      CDM_CODE: '8.6',
      description: 'Resíduos de pirólise não abrangidos em 19 01 17',
    },
    '19 01 19': {
      CDM_CODE: '8.6',
      description: 'Areias de leitos fluidizados',
    },
    '19 01 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '19 02 03': {
      CDM_CODE: '8.7D',
      description:
        'Misturas de resíduos contendo apenas resíduos não perigosos',
    },
    '19 02 06': {
      CDM_CODE: '8.7D',
      description:
        'Lodos de tratamento físico-químico não abrangidas em 19 02 05',
    },
    '19 02 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '19 03 05': {
      CDM_CODE: '8.6',
      description: 'Resíduos estabilizados não abrangidos em 19 03 04',
    },
    '19 03 07': {
      CDM_CODE: '8.6',
      description: 'Resíduos solidificados não abrangidos em 19 03 06',
    },
    '19 04 01': {
      CDM_CODE: '8.6',
      description: 'Resíduos vitrificados',
    },
    '19 05 01': {
      CDM_CODE: '8.7D',
      description: 'Fração não compostada de resíduos urbanos e equiparados',
    },
    '19 05 02': {
      CDM_CODE: '8.7D',
      description: 'Fração não compostada de resíduos animais e vegetais',
    },
    '19 05 03': {
      CDM_CODE: '8.7D',
      description: 'Composto fora de especificação',
    },
    '19 05 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '19 06 03': {
      CDM_CODE: '8.7C',
      description:
        'Lodo do tratamento anaeróbio de resíduos urbanos e equiparados',
    },
    '19 06 04': {
      CDM_CODE: '8.7C',
      description:
        'Lamas e lodos de digestores de tratamento anaeróbio de resíduos urbanos e equiparados',
    },
    '19 06 05': {
      CDM_CODE: '8.7B',
      description:
        'Lodo do tratamento anaeróbio de resíduos animais e vegetais',
    },
    '19 06 06': {
      CDM_CODE: '8.7B',
      description:
        'Lamas e lodos de digestores de tratamento anaeróbio de resíduos animais e vegetais',
    },
    '19 06 99': {
      CDM_CODE: '8.7B',
      description: OTHER_WASTE,
    },
    '19 07 02': {
      CDM_CODE: '8.7D',
      description:
        '(*) Lixiviados ou líquidos percolados de aterros contendo substâncias perigosas',
    },
    '19 07 03': {
      CDM_CODE: '8.7D',
      description:
        'Lixiviados ou líquidos percolados de aterros não abrangidos em 19 07 02',
    },
    '19 08 01': {
      CDM_CODE: '8.7D',
      description: WASTE_FROM_SCREENING,
    },
    '19 08 02': {
      CDM_CODE: '8.6',
      description: 'Resíduos do desarenamento',
    },
    '19 08 05': {
      CDM_CODE: '8.7C',
      description: 'Lodos do tratamento de efluentes urbanos',
    },
    '19 08 09': {
      CDM_CODE: '8.7B',
      description:
        'Misturas de gorduras e óleos, da separação óleo/água, contendo apenas óleos e gorduras alimentares',
    },
    '19 08 12': {
      CDM_CODE: '8.7D',
      description:
        'Lodos do tratamento biológico de efluentes industriais não abrangidas em 19 08 11',
    },
    '19 08 14': {
      CDM_CODE: '8.7D',
      description:
        'Lodos de outros tratamentos de efluentes industriais não abrangidas em 19 08 13',
    },
    '19 08 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '19 09 01': {
      CDM_CODE: '8.7D',
      description: WASTE_FROM_SCREENING,
    },
    '19 09 04': {
      CDM_CODE: '8.6',
      description: 'Carvão ativado usado',
    },
    '19 09 05': {
      CDM_CODE: '8.6',
      description: 'Resíduos de troca iônica, saturadas ou usadas',
    },
    '19 09 06': {
      CDM_CODE: '8.7D',
      description: 'Soluções e lodos da regeneração de colunas de troca iônica',
    },
    '19 09 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '19 10 01': {
      CDM_CODE: '8.6',
      description: 'Resíduos de ferro ou aço',
    },
    '19 10 02': {
      CDM_CODE: '8.7D',
      description: 'Resíduos não ferrosos',
    },
    '19 10 06': {
      CDM_CODE: '8.7D',
      description: 'Outras frações não abrangidas em 19 10 05',
    },
    '19 11 06': {
      CDM_CODE: '8.7C',
      description:
        'Lodos do tratamento local de efluentes não abrangidas em 19 11 05',
    },
    '19 11 99': {
      CDM_CODE: '8.7D',
      description: OTHER_WASTE,
    },
    '19 12 01': {
      CDM_CODE: '8.2',
      description: PAPER_CARDBOARD,
    },
    '19 12 02': {
      CDM_CODE: '8.6',
      description: 'Metais ferrosos',
    },
    '19 12 03': {
      CDM_CODE: '8.6',
      description: 'Metais não ferrosos',
    },
    '19 12 04': {
      CDM_CODE: '8.6',
      description: 'Plásticos',
    },
    '19 12 05': {
      CDM_CODE: '8.6',
      description: 'Vidro',
    },
    '19 12 07': {
      CDM_CODE: '8.1',
      description: 'Madeira não abrangida em 19 12 06',
    },
    '19 12 08': {
      CDM_CODE: '8.4',
      description: TEXTILES,
    },
    '19 12 09': {
      CDM_CODE: '8.6',
      description: 'Substâncias minerais (por exemplo, areia, rochas)',
    },
    '19 12 10': {
      CDM_CODE: '8.7D',
      description: 'Resíduos combustíveis (combustíveis derivados de resíduos)',
    },
    '19 12 11': {
      CDM_CODE: '8.6',
      description: 'Borrachas',
    },
    '19 12 13': {
      CDM_CODE: '8.7D',
      description:
        'Outros resíduos (incluindo misturas de materiais) do tratamento mecânico de resíduos não abrangidos em 19 12 12',
    },
    '19 13 02': {
      CDM_CODE: '8.7D',
      description:
        'Resíduos sólidos da descontaminação de solos não abrangidos em 19 13 01',
    },
    '19 13 04': {
      CDM_CODE: '8.7D',
      description:
        'Lodos da descontaminação de solos não abrangidas em 19 13 03',
    },
    '19 13 06': {
      CDM_CODE: '8.7D',
      description:
        'Lodos da descontaminação de águas freáticas não abrangidas em 19 13 05',
    },
    '19 13 08': {
      CDM_CODE: '8.7D',
      description:
        'Resíduos líquidos aquosos e concentrados aquosos da descontaminação de águas freáticas não abrangidos em 19 13 07',
    },
    '20 01 01': {
      CDM_CODE: '8.2',
      description: PAPER_CARDBOARD,
    },
    '20 01 02': {
      CDM_CODE: '8.6',
      description: 'Vidro',
    },
    '20 01 08': {
      CDM_CODE: '8.3',
      // TODO: Update in the future to include the correct description, it was changed due the EloVerde issues.
      description: 'Resíduos biodegradáveis de cozinha e cantinas',
    },
    '20 01 10': {
      CDM_CODE: '8.4',
      description: 'Roupas',
    },
    '20 01 11': {
      CDM_CODE: '8.4',
      description: TEXTILES,
    },
    '20 01 25': {
      CDM_CODE: '8.3',
      description: 'Óleos e gorduras alimentares',
    },
    '20 01 38': {
      CDM_CODE: '8.1',
      description: 'Madeira não abrangida em 20 01 37',
    },
    '20 01 39': {
      CDM_CODE: '8.6',
      description: 'Plásticos',
    },
    '20 01 40': {
      CDM_CODE: '8.6',
      description: 'Metais',
    },
    '20 01 99': {
      CDM_CODE: '8.7D',
      description: 'Outras frações não anteriormente especificadas',
    },
    '20 02 01': {
      CDM_CODE: '8.5',
      description:
        'Resíduos de varrição, limpeza de logradouros e vias públicas e outros serviços de limpeza urbana biodegradáveis',
    },
    '20 02 02': {
      CDM_CODE: '8.6',
      description: 'Terras e pedras',
    },
    '20 02 03': {
      CDM_CODE: '8.6',
      description:
        'Outros resíduos de varrição, limpeza de logradouros e vias públicas e outros serviços de limpeza urbana não biodegradáveis',
    },
    '20 03 01': {
      CDM_CODE: '8.7D',
      description:
        'Outros resíduos urbanos e equiparados, incluindo misturas de resíduos',
    },
    '20 03 02': {
      CDM_CODE: '8.3',
      description: 'Resíduos de mercados públicos e feiras',
    },
    '20 03 03': {
      CDM_CODE: '8.7D',
      description:
        'Resíduos da limpeza de ruas e de galerias de drenagem pluvial',
    },
    '20 03 04': {
      CDM_CODE: '8.7C',
      description: 'Lodos de fossas sépticas',
    },
    '20 03 06': {
      CDM_CODE: '8.7C',
      description: 'Resíduos da limpeza de esgotos, bueiros e bocas-de-lobo',
    },
    '20 03 99': {
      CDM_CODE: '8.7D',
      description:
        'Resíduos urbanos e equiparados não anteriormente especificados',
    },
  },
} as const;
