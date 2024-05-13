resource "aws_kms_key" "lambda_artifacts_key" {
  description             = "This key is used to encrypt bucket objects"
  deletion_window_in_days = 10
}

resource "aws_lambda_permission" "allow_bucket" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = data.terraform_remote_state.aws_lambda.outputs.metadata_commit_lambda_arn
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.lambda_artifacts.arn
}

resource "aws_s3_bucket" "lambda_artifacts" {
  bucket = "${var.tfc_organization_name}-lambda-artifacts-${var.app_name}"
}

resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.lambda_artifacts.id

  lambda_function {
    lambda_function_arn = data.terraform_remote_state.aws_lambda.outputs.metadata_commit_lambda_arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.allow_bucket]
}

resource "aws_s3_bucket_server_side_encryption_configuration" "lambda_artifacts_encryption" {
  bucket = aws_s3_bucket.lambda_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.lambda_artifacts_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}
