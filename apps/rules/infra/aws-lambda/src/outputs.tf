
output "rules_config" {
  value = local.rules
}

output "metadata_commit_lambda_arn" {
  value = aws_lambda_function.metadata_commit.arn
}
