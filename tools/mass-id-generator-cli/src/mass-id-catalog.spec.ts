import { EVENT_PRIVACY_SPEC } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/privacy-flags/constants';

import { MASS_ID_CATALOG } from './mass-id-catalog';

describe('MASS_ID_CATALOG', () => {
  it.each([...EVENT_PRIVACY_SPEC])(
    'should list every attribute the privacy table names for %s',
    (eventName, { attributes: privacyAttributes }) => {
      const attributeNames = MASS_ID_CATALOG.events
        .find(({ name }) => name === eventName)
        ?.attributes.map(({ name }) => name);

      expect(attributeNames).toBeDefined();
      expect(attributeNames).toStrictEqual(
        expect.arrayContaining([...privacyAttributes.keys()]),
      );
    },
  );
});
