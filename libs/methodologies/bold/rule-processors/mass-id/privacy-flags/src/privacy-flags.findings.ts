import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './privacy-flags.constants';
import { ruleDefinition } from './privacy-flags.rule-definition';

export const PRIVACY_FLAGS_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  { REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired },
  {
    'REVIEW_REQUIRED.ACTOR_IS_PUBLIC': {
      category: 'PRIVACY',
      defaultOwner: 'INTEGRATOR',
      description:
        'O evento de ator não declara "isPublic" com o valor esperado.',
      guidance:
        'Envie o evento de ator com o valor de "isPublic" exigido para o rótulo.',
      title: 'Visibilidade do ator incorreta',
    },
    'REVIEW_REQUIRED.ATTRIBUTE_IS_PUBLIC': {
      category: 'PRIVACY',
      defaultOwner: 'INTEGRATOR',
      description:
        'Um atributo do evento não declara "isPublic" com o valor esperado.',
      guidance: 'Envie o atributo com o valor de "isPublic" exigido.',
      title: 'Visibilidade do atributo incorreta',
    },
    'REVIEW_REQUIRED.ATTRIBUTE_SENSITIVE': {
      category: 'PRIVACY',
      defaultOwner: 'INTEGRATOR',
      description:
        'Um atributo do evento não declara "sensitive" com o valor esperado.',
      guidance: 'Envie o atributo com o valor de "sensitive" exigido.',
      title: 'Sensibilidade do atributo incorreta',
    },
    'REVIEW_REQUIRED.EVENT_IS_PUBLIC': {
      category: 'PRIVACY',
      defaultOwner: 'INTEGRATOR',
      description: 'O evento não declara "isPublic" com o valor esperado.',
      guidance: 'Envie o evento com o valor de "isPublic" exigido.',
      title: 'Visibilidade do evento incorreta',
    },
    'REVIEW_REQUIRED.EVENT_PRESERVE_SENSITIVE_DATA': {
      category: 'PRIVACY',
      defaultOwner: 'INTEGRATOR',
      description:
        'O evento usado pelo participante não declara "preserveSensitiveData" com o valor esperado.',
      guidance:
        'Envie o evento com o valor de "preserveSensitiveData" exigido para o participante.',
      title: 'Preservação de dados sensíveis incorreta',
    },
    'REVIEW_REQUIRED.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING': {
      category: 'PRIVACY',
      defaultOwner: 'INTEGRATOR',
      description:
        'O participante tem visibilidade privada, mas nenhum evento declara "preserveSensitiveData" como verdadeiro.',
      guidance:
        'Declare "preserveSensitiveData" como verdadeiro em um evento do participante.',
      title: 'Participante privado sem preservação de dados',
    },
  },
);
