import { EVENT_PRIVACY_SPEC } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/privacy-flags/constants';

import { MASS_ID_CATALOG } from './mass-id-catalog';

describe('MASS_ID_CATALOG', () => {
  it.each(MASS_ID_CATALOG.events)(
    'should list every attribute the privacy table names for $name',
    ({ attributes, name }) => {
      const privacyAttributeNames = [
        ...(EVENT_PRIVACY_SPEC.get(name)?.attributes.keys() ?? []),
      ];

      expect(privacyAttributeNames.length).toBeGreaterThan(0);
      expect(attributes.map((attribute) => attribute.name)).toStrictEqual(
        expect.arrayContaining(privacyAttributeNames),
      );
    },
  );
});
