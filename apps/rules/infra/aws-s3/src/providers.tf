provider "aws" {
  region              = var.aws_region
  allowed_account_ids = [var.aws_account_id]

  default_tags {
    tags = {
      "Terraform"   = "true"
      "RootProject" = var.root_project_name
      "Workspace"   = var.workspace_name
      "Project"     = var.tfc_project_name
      "App"         = var.app_name
    }
  }
}
