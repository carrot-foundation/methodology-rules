import { MassIDActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';

import { defineRuleFindings, SHARED_FINDINGS } from './rule-findings';

const TEST_MESSAGES = {
  ERROR: {
    INVALID_SUBJECT: 'The rule subject is invalid',
  },
  FAILED: {
    MASS_MISMATCH: (declaredMass: number, measuredMass: number) =>
      `Declared mass ${declaredMass} differs from measured mass ${measuredMass}`,
  },
};

const TEST_FINDINGS = defineRuleFindings('test-rule', TEST_MESSAGES, {
  'ERROR.INVALID_SUBJECT': { defaultOwner: 'CARROT' },
  'FAILED.MASS_MISMATCH': {
    defaultOwner: 'RECYCLER',
    dependsOnAccreditation: MassIDActorType.RECYCLER,
  },
});

describe('defineRuleFindings', () => {
  it('should expose every finding code prefixed by the rule slug', () => {
    expect(TEST_FINDINGS.codes).toEqual(
      new Set([
        'test-rule.ERROR.INVALID_SUBJECT',
        'test-rule.FAILED.MASS_MISMATCH',
      ]),
    );
  });

  it('should render a string message with a finding without dependsOnAccreditation', () => {
    expect(TEST_FINDINGS.render('ERROR.INVALID_SUBJECT')).toStrictEqual({
      finding: {
        code: 'test-rule.ERROR.INVALID_SUBJECT',
        defaultOwner: 'CARROT',
      },
      message: 'The rule subject is invalid',
    });
  });

  it('should render a function message with its arguments and dependsOnAccreditation', () => {
    const declaredMass = faker.number.int();
    const measuredMass = faker.number.int();

    expect(
      TEST_FINDINGS.render('FAILED.MASS_MISMATCH', declaredMass, measuredMass),
    ).toStrictEqual({
      finding: {
        code: 'test-rule.FAILED.MASS_MISMATCH',
        defaultOwner: 'RECYCLER',
        dependsOnAccreditation: MassIDActorType.RECYCLER,
      },
      message: `Declared mass ${declaredMass} differs from measured mass ${measuredMass}`,
    });
  });

  it('should return the finding of a key without rendering its message', () => {
    expect(TEST_FINDINGS.finding('FAILED.MASS_MISMATCH')).toStrictEqual(
      TEST_FINDINGS.render(
        'FAILED.MASS_MISMATCH',
        faker.number.int(),
        faker.number.int(),
      ).finding,
    );
  });

  it('should reject wrong render arguments at compile time', () => {
    // @ts-expect-error -- MASS_MISMATCH takes two numbers
    const rendered = TEST_FINDINGS.render('FAILED.MASS_MISMATCH', 'heavy', 1);

    // @ts-expect-error -- MASS_MISMATCH requires its arguments
    TEST_FINDINGS.render('FAILED.MASS_MISMATCH');

    // @ts-expect-error -- INVALID_SUBJECT takes no arguments
    TEST_FINDINGS.render('ERROR.INVALID_SUBJECT', 'unexpected');

    expect(rendered.message).toBe(
      'Declared mass heavy differs from measured mass 1',
    );
  });

  it('should return the rendered string message and its finding as a result', () => {
    expect(TEST_FINDINGS.result('ERROR.INVALID_SUBJECT')).toStrictEqual({
      resultComment: 'The rule subject is invalid',
      resultFindings: [TEST_FINDINGS.finding('ERROR.INVALID_SUBJECT')],
    });
  });

  it('should return the rendered function message and its finding as a result', () => {
    const declaredMass = faker.number.int();
    const measuredMass = faker.number.int();

    expect(
      TEST_FINDINGS.result('FAILED.MASS_MISMATCH', declaredMass, measuredMass),
    ).toStrictEqual({
      resultComment: `Declared mass ${declaredMass} differs from measured mass ${measuredMass}`,
      resultFindings: [TEST_FINDINGS.finding('FAILED.MASS_MISMATCH')],
    });
  });

  it('should reject wrong result arguments at compile time', () => {
    // @ts-expect-error -- MASS_MISMATCH takes two numbers
    const result = TEST_FINDINGS.result('FAILED.MASS_MISMATCH', 'heavy', 1);

    expect(result.resultComment).toBe(
      'Declared mass heavy differs from measured mass 1',
    );
  });

  it('should throw naming the message keys that have no metadata', () => {
    expect(() =>
      defineRuleFindings(
        'test-rule',
        TEST_MESSAGES,
        // @ts-expect-error -- FAILED.MASS_MISMATCH has no metadata
        { 'ERROR.INVALID_SUBJECT': { defaultOwner: 'CARROT' } },
      ),
    ).toThrow('missing [FAILED.MASS_MISMATCH], extra []');
  });

  it('should throw naming missing and extra keys when the messages keys are widened', () => {
    const widenedMessages: Record<string, Record<string, string>> = {
      ERROR: { INVALID_SUBJECT: 'The rule subject is invalid' },
    };

    expect(() =>
      defineRuleFindings('test-rule', widenedMessages, {
        'ERROR.UNKNOWN': { defaultOwner: 'CARROT' },
      }),
    ).toThrow('missing [ERROR.INVALID_SUBJECT], extra [ERROR.UNKNOWN]');
  });

  it('should throw when a key outside the messages reaches the findings at runtime', () => {
    expect(() =>
      // @ts-expect-error -- ERROR.UNKNOWN is not a message key
      TEST_FINDINGS.finding('ERROR.UNKNOWN'),
    ).toThrow('Unknown finding key "ERROR.UNKNOWN" for rule "test-rule"');
  });
});

describe('SHARED_FINDINGS', () => {
  it('should expose the shared finding codes', () => {
    expect(SHARED_FINDINGS.codes).toEqual(
      new Set(['shared.ERROR.DOCUMENT_NOT_LOADED']),
    );
  });

  it('should render the document not loaded finding', () => {
    const documentId = faker.string.uuid();

    expect(
      SHARED_FINDINGS.render('ERROR.DOCUMENT_NOT_LOADED', documentId),
    ).toStrictEqual({
      finding: {
        code: 'shared.ERROR.DOCUMENT_NOT_LOADED',
        defaultOwner: 'CARROT',
      },
      message: `Could not load the document with id ${documentId}`,
    });
  });
});
