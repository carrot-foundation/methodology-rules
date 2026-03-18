import { z } from 'zod';

export const NonEmptyStringSchema = z.string().nonempty();
export type NonEmptyString = z.infer<typeof NonEmptyStringSchema>;

export const PercentageStringSchema = z
  .string()
  .nonempty()
  .regex(/^(0|1|0\.\d+|1\.0+)$/);
export type PercentageString = z.infer<typeof PercentageStringSchema>;

export const UriSchema = z.url();
export type Uri = z.infer<typeof UriSchema>;

export const UrlSchema = z.url({
  protocol: /^https?$/,
  hostname: z.regexes.domain,
});
export type Url = z.infer<typeof UrlSchema>;
