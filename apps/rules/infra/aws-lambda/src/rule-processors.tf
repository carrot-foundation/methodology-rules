resource "aws_iam_policy" "rule_lambda_dlq_policy" {
  name        = "rule-lambda-dlq-policy"
  description = "Permission to send message to Lambda DLQ"
  policy      = data.aws_iam_policy_document.rule_lambda_dlq_policy_document.json
}

resource "aws_iam_policy" "rule_lambda_s3_policy" {
  name        = "rule-lambda-s3-policy"
  description = "Permission to access S3 objects"
  policy      = data.aws_iam_policy_document.rule_lambda_s3_policy_document.json
}

resource "aws_iam_policy" "rule_lambda_smaug_api_gateway_policy" {
  name        = "rule-smaug-api-gateway-policy"
  description = "Permission to request Smaug Api Gateway"
  policy      = data.aws_iam_policy_document.rule_lambda_smaug_api_gateway.json
}

resource "aws_iam_role" "rule_lambda_iam_role" {
  for_each = {
    for ruleName, ruleMetadata in local.rules : ruleName => ruleMetadata
  }

  name               = "${each.key}-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy_attachment" "rule_lambda_iam_role_basic_policy_attachment" {
  for_each = {
    for ruleName, ruleMetadata in local.rules : ruleName => ruleMetadata
  }

  role       = "${each.key}-role"
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "rule_lambda_iam_role_dlq_policy_attachment" {
  for_each = {
    for ruleName, ruleMetadata in local.rules : ruleName => ruleMetadata
  }

  role       = "${each.key}-role"
  policy_arn = aws_iam_policy.rule_lambda_dlq_policy.arn
}

resource "aws_iam_role_policy_attachment" "rule_lambda_iam_role_s3_policy_attachment" {
  for_each = {
    for ruleName, ruleMetadata in local.rules : ruleName => ruleMetadata
  }

  role       = "${each.key}-role"
  policy_arn = aws_iam_policy.rule_lambda_s3_policy.arn
}
resource "aws_iam_role_policy_attachment" "rule_lambda_iam_role_smaug_api_gateway_policy_attachment" {
  for_each = {
    for ruleName, ruleMetadata in local.rules : ruleName => ruleMetadata
  }

  role       = "${each.key}-role"
  policy_arn = aws_iam_policy.rule_lambda_smaug_api_gateway_policy.arn
}

resource "aws_sqs_queue" "rule_lambda_dead_letter_queue" {
  for_each = {
    for ruleName, ruleMetadata in local.rules : ruleName => ruleMetadata
  }

  name                      = "${each.key}-dlq"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_lambda_function" "rule_lambda_function" {
  for_each = {
    for ruleName, ruleMetadata in local.rules : ruleName => ruleMetadata
  }

  s3_bucket     = each.value.s3_bucket
  s3_key        = each.value.s3_key
  function_name = each.key
  role          = aws_iam_role.rule_lambda_iam_role[each.key].arn
  handler       = "main.handler"
  timeout       = 30
  dead_letter_config {
    target_arn = aws_sqs_queue.rule_lambda_dead_letter_queue[each.key].arn
  }

  runtime = "nodejs18.x"

  environment {
    variables = {
      SOURCE_CODE_VERSION  = each.value.commit_hash
      ARTIFACT_CHECKSUM    = each.value.file_checksum
      SOURCE_CODE_URL      = each.value.source_code_url
      DOCUMENT_BUCKET_NAME = var.document_bucket_name
      SENTRY_DSN           = local.sentry_dsn
    }
  }
}
