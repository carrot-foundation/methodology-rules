export const getMethodologySlug = (): string =>
  String(process.env['METHODOLOGY_SLUG'] ?? ''); // TODO: implement the best way to get methodology slug https://app.clickup.com/t/3005225/CARROT-714
