export function stubEntity(
  name: string,
  taxId: string,
): {
  name: { confidence: 'high'; parsed: string; rawMatch: string };
  taxId: { confidence: 'high'; parsed: string; rawMatch: string };
} {
  return {
    name: { confidence: 'high' as const, parsed: name, rawMatch: name },
    taxId: { confidence: 'high' as const, parsed: taxId, rawMatch: taxId },
  };
}

export function stubEntityWithAddress(
  name: string,
  taxId: string,
  address: string,
  city: string,
  state: string,
): ReturnType<typeof stubEntity> & {
  address: { confidence: 'high'; parsed: string; rawMatch: string };
  city: { confidence: 'high'; parsed: string; rawMatch: string };
  state: { confidence: 'high'; parsed: string; rawMatch: string };
} {
  return {
    ...stubEntity(name, taxId),
    address: {
      confidence: 'high' as const,
      parsed: address,
      rawMatch: address,
    },
    city: { confidence: 'high' as const, parsed: city, rawMatch: city },
    state: { confidence: 'high' as const, parsed: state, rawMatch: state },
  };
}

export function stubMtrEntity(
  name: string,
  taxId: string,
): {
  address: { confidence: 'low'; parsed: '' };
  city: { confidence: 'low'; parsed: '' };
  name: { confidence: 'high'; parsed: string; rawMatch: string };
  state: { confidence: 'low'; parsed: '' };
  taxId: { confidence: 'high'; parsed: string; rawMatch: string };
} {
  return {
    address: { confidence: 'low' as const, parsed: '' as const },
    city: { confidence: 'low' as const, parsed: '' as const },
    name: { confidence: 'high' as const, parsed: name, rawMatch: name },
    state: { confidence: 'low' as const, parsed: '' as const },
    taxId: { confidence: 'high' as const, parsed: taxId, rawMatch: taxId },
  };
}

export function stubMtrEntityWithHighAddress(
  name: string,
  taxId: string,
  address: string,
  city: string,
  state: string,
): {
  address: { confidence: 'high'; parsed: string };
  city: { confidence: 'high'; parsed: string };
  name: { confidence: 'high'; parsed: string; rawMatch: string };
  state: { confidence: 'high'; parsed: string };
  taxId: { confidence: 'high'; parsed: string; rawMatch: string };
} {
  return {
    address: { confidence: 'high' as const, parsed: address },
    city: { confidence: 'high' as const, parsed: city },
    name: { confidence: 'high' as const, parsed: name, rawMatch: name },
    state: { confidence: 'high' as const, parsed: state },
    taxId: { confidence: 'high' as const, parsed: taxId, rawMatch: taxId },
  };
}
