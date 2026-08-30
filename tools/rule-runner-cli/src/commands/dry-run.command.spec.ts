import { Command } from '@commander-js/extra-typings';

import type { DryRunOptions } from './dry-run.command';

import { createDryRunSelection, parseDataSetName } from './dry-run.command';

const baseOptions: DryRunOptions = {
  allRules: false,
  cache: false,
  concurrency: 5,
  debug: false,
  documentId: 'document-123',
  json: false,
  methodologySlug: 'bold-carbon-organic',
  rulesScope: 'MassID',
  smaugUrl: 'https://smaug.example',
};

const commandWithSources = (
  sources: Partial<Record<keyof DryRunOptions, 'cli' | 'default'>> = {},
): Command => {
  const command = new Command('dry-run');

  for (const [key, source] of Object.entries(sources)) {
    command.setOptionValueWithSource(
      key,
      baseOptions[key as keyof DryRunOptions],
      source,
    );
  }

  return command;
};

describe('createDryRunSelection', () => {
  it('should select explicit local mode without treating default rulesScope as a mixed flag', () => {
    expect(
      createDryRunSelection(
        'libs/methodologies/bold/rule-processors/mass-id/local-rule',
        { ...baseOptions, dataSetName: 'TEST' },
        commandWithSources({ rulesScope: 'default' }),
      ),
    ).toEqual({
      dataSetName: 'TEST',
      mode: 'local',
      processorPath:
        'libs/methodologies/bold/rule-processors/mass-id/local-rule',
    });
  });

  it.each([
    'methodologySlug',
    'rulesScope',
    'ruleSlug',
    'allRules',
    'config',
  ] as const)('should reject explicitly supplied %s in local mode', (flag) => {
    expect(() =>
      createDryRunSelection(
        'libs/methodologies/bold/rule-processors/mass-id/local-rule',
        { ...baseOptions, dataSetName: 'TEST' },
        commandWithSources({ [flag]: 'cli' }),
      ),
    ).toThrow('cannot be used with an explicit processor path');
  });

  it.each(['PROD', 'PROD_SIMULATION', 'TEST'] as const)(
    'should retain canonical %s data-set names in local mode',
    (dataSetName) => {
      expect(
        createDryRunSelection(
          'libs/methodologies/bold/rule-processors/mass-id/local-rule',
          { ...baseOptions, dataSetName },
          commandWithSources({ rulesScope: 'default' }),
        ),
      ).toMatchObject({ dataSetName, mode: 'local' });
    },
  );

  it('should reject an explicitly supplied data-set name in registered mode', () => {
    expect(() =>
      createDryRunSelection(
        undefined,
        { ...baseOptions, allRules: true, dataSetName: 'TEST' },
        commandWithSources({ dataSetName: 'cli' }),
      ),
    ).toThrow('--data-set-name cannot be used in registered mode');
  });

  it('should reject a non-canonical data-set name in local mode', () => {
    expect(() => parseDataSetName('INVALID')).toThrow('--data-set-name');
  });
});
