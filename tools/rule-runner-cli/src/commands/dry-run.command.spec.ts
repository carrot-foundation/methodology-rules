import { Command } from '@commander-js/extra-typings';
import fs from 'node:fs';
import path from 'node:path';

import type { DryRunOptions } from './dry-run.command';

import {
  createDryRunSelection,
  dryRunCommand,
  parseDataSetName,
} from './dry-run.command';

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
  it('should keep an explicit processor path in registered mode when methodologySlug is explicit', () => {
    const processorPath =
      'libs/methodologies/bold/rule-processors/mass-id/document-manifest-data';

    expect(
      createDryRunSelection(
        processorPath,
        baseOptions,
        commandWithSources({ methodologySlug: 'cli' }),
      ),
    ).toEqual({
      allRules: false,
      methodologySlug: 'bold-carbon-organic',
      mode: 'registered',
      processorPath,
      ruleSlug: 'document-manifest-data',
      rulesScope: 'MassID',
    });
  });

  it('should preserve an explicit registered rule slug over the processor directory name', () => {
    const processorPath =
      'libs/methodologies/bold/rule-processors/mass-id/document-manifest-data';

    expect(
      createDryRunSelection(
        processorPath,
        { ...baseOptions, ruleSlug: 'weighing' },
        commandWithSources({ methodologySlug: 'cli', ruleSlug: 'cli' }),
      ),
    ).toMatchObject({ ruleSlug: 'weighing' });
  });

  it('should reject an explicit methodologySlug combined with local data-set-name', () => {
    expect(() =>
      createDryRunSelection(
        'libs/methodologies/bold/rule-processors/mass-id/local-rule',
        { ...baseOptions, dataSetName: 'TEST' },
        commandWithSources({ methodologySlug: 'cli' }),
      ),
    ).toThrow(
      '--methodology-slug cannot be used with an explicit processor path',
    );
  });

  it('should reject --all-rules combined with an explicit registered processor path', () => {
    const command = commandWithSources({ methodologySlug: 'cli' });

    command.setOptionValueWithSource('allRules', true, 'cli');

    expect(() =>
      createDryRunSelection(
        'libs/methodologies/bold/rule-processors/mass-id/document-manifest-data',
        { ...baseOptions, allRules: true },
        command,
      ),
    ).toThrow('--all-rules cannot be used with an explicit processor path');
  });

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

describe('dryRunCommand', () => {
  it('should describe the document ID as a MassID document ID', () => {
    const documentIdOption = dryRunCommand.options.find(
      (option) => option.long === '--document-id',
    );

    expect(documentIdOption).toBeDefined();
    expect(documentIdOption?.description).toBe('MassID document ID');
  });

  it('should document executable local and registered processor-path commands', () => {
    const readme = fs.readFileSync(
      path.resolve(process.cwd(), '../../README.md'),
      'utf8',
    );

    expect(readme).toContain(
      'pnpm run-rule dry-run libs/methodologies/bold/rule-processors/mass-id/privacy-flags --data-set-name TEST',
    );
    expect(readme).toContain(
      'pnpm run-rule dry-run libs/methodologies/bold/rule-processors/mass-id/document-manifest-data --methodology-slug bold-carbon-organic',
    );
    expect(readme).not.toContain('pnpm run-rule -- dry-run');
  });
});
