data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "rule_lambda_dlq_policy_document" {
  statement {
    effect    = "Allow"
    actions   = ["sqs:SendMessage"]
    resources = ["*"]
  }
}
data "aws_iam_policy_document" "rule_lambda_smaug_api_gateway" {
  statement {
    actions   = ["sts:AssumeRole"]
    effect    = "Allow"
    resources = ["arn:aws:iam::${var.aws_account_id}:role/aws-api-gateway-role"]
    sid       = "ApiGatewaySmaugAssumeRole"
  }
  version = "2012-10-17"
}

data "aws_iam_policy_document" "rule_lambda_s3_policy_document" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:GetObjectTagging",
    ]
    resources = ["arn:aws:s3:::*/*"] # TODO: only methodology bucket
  }

  statement {
    actions = [
      "kms:Decrypt",
    ]
    resources = ["arn:aws:kms:*:*:key/*"] # TODO: only specific key
  }
}
