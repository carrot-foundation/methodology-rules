##########################
# Terraform Cloud
##########################
variable "tfc_project_name" {
  description = "Terraform Cloud project name"
  type        = string
}

##########################
# Configuration
##########################
variable "workspace_name" {
  description = "Workspace name"
  type        = string
}

variable "root_project_name" {
  description = "Root project name"
  type        = string
}

variable "app_name" {
  description = "App name"
  type        = string
}

##########################
# AWS
##########################
variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "aws_region" {
  description = "AWS Region"
  type        = string
}

variable "document_bucket_name" {
  description = "S3 bucket for reading methodology documents"
  type        = string
}

##########################
# Others
##########################

# TODO: The token will be placed with the doppler when the integration is done. (The token expires on June 9th UI)
variable "gh_octokit_token" {
  description = "Github token to create commits and push commits with Octokit"
  type        = string
  default     = "MISSING_GH_OCTOKIT_TOKEN"
}
