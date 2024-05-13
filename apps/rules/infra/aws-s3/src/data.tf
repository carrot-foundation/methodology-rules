data "terraform_remote_state" "aws_lambda" {
  backend = "remote"
  config = {
    organization = var.tfc_organization_name
    workspaces = {
      name = local.tfc_aws_lambda_workspace_name
    }
  }
}
