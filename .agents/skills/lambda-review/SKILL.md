---
name: lambda-review
description: Use when reviewing rule Lambda request handling, Smaug signing and role assumption, S3 access, secret handling or document data privacy.
---

# Review Lambda trust boundaries

- Check that Lambda input and external document envelopes use the existing Zod contracts before
  document fields reach a rule. Unknown external input must be narrowed at the boundary.
- Check that snapshot and attachment reads use the established document and S3 helpers. Verify
  intended bucket, object and role scope. Preserve SigV4 signing for Smaug requests and the
  environment-mediated cross-account role selection.
- For unbound runs, check that discovery and staging go through Smaug. Do not add a direct
  connection to the underlying document service from a processor.
- Verify that infrastructure failures still reach the retry and dead-letter queue path. Report
  intended verification failures through the repository's result and finding APIs.
- Keep credentials, signed URLs and document payloads out of result messages, structured logs and
  fixtures. For a finding, report the affected file, violated boundary and remediation without
  copying production identifiers or payloads.
