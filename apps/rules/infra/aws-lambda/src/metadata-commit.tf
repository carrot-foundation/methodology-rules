resource "aws_iam_policy" "metadata_commit_lambda_dlq" {
  name        = "rule-metadata-commit-lambda-dlq"
  description = "Permission to send message to Lambda DLQ"
  policy      = data.aws_iam_policy_document.rule_lambda_dlq_policy_document.json
}

resource "aws_iam_policy" "metadata_commit_lambda_s3" {
  name        = "rule-metadata-commit-lambda-s3"
  description = "Permission to access S3 objects"
  policy      = data.aws_iam_policy_document.rule_lambda_s3_policy_document.json
}

resource "aws_iam_role" "metadata_commit_lambda" {
  name               = "rule-metadata-commit-lambda"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy_attachment" "metadata_commit_lambda_basic" {
  role       = aws_iam_role.metadata_commit_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "metadata_commit_lambda_dlq_policy_attachment" {
  role       = aws_iam_role.metadata_commit_lambda.name
  policy_arn = aws_iam_policy.metadata_commit_lambda_dlq.arn
}

resource "aws_iam_role_policy_attachment" "metadata_commit_lambda_s3_policy_attachment" {
  role       = aws_iam_role.metadata_commit_lambda.name
  policy_arn = aws_iam_policy.metadata_commit_lambda_s3.arn
}

resource "aws_sqs_queue" "metadata_commit_lambda_dead_letter_queue" {
  name                      = "rule-metadata-commit-dlq"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_lambda_function" "metadata_commit" {
  s3_bucket     = "elrond-${var.tfc_project_name}-lambda-artifacts-rules"
  s3_key        = "rules-metadata-commit.zip"
  function_name = "rules-metadata-commit"
  role          = aws_iam_role.metadata_commit_lambda.arn
  handler       = "main.handler"
  timeout       = 30

  dead_letter_config {
    target_arn = aws_sqs_queue.metadata_commit_lambda_dead_letter_queue.arn
  }

  runtime = "nodejs18.x"

  environment {
    variables = {
      GH_OWNER         = "carrot-foundation",
      GH_REPO          = "audit-rules",
      ENVIRONMENT      = var.tfc_project_name,
      REFERENCE_BRANCH = "main",
      GH_OCTOKIT_TOKEN = var.gh_octokit_token
    }
  }
}
