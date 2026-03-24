import BigNumber from 'bignumber.js';
import { z } from 'zod';

export const BigNumberStringSchema = z
  .string()
  .nonempty()
  .refine(
    (v) => {
      try {
        return new BigNumber(v).isFinite();
      } catch {
        return false;
      }
    },
    { message: 'String must be a valid BigNumber' },
  );
export type BigNumberString = z.infer<typeof BigNumberStringSchema>;

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
  hostname: z.regexes.domain,
  protocol: /^https?$/,
});
export type Url = z.infer<typeof UrlSchema>;

export const DocumentIdSchema = z.string().nonempty();
export type DocumentId = z.infer<typeof DocumentIdSchema>;
