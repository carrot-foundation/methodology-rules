import { faker } from '@faker-js/faker';

export const stubEnumValue = <T>(enumType: T): T[keyof T] => {
  const enumValues = Object.values(
    enumType as unknown as Record<string, number | string>,
  ) as unknown as Array<T[keyof T]>;

  return faker.helpers.arrayElement(enumValues);
};
