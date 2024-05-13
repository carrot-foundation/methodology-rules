##########################
# Terraform Cloud
##########################
variable "tfc_project_name" {
  description = "Terraform Cloud project name"
  type        = string
}

variable "tfc_organization_name" {
  description = "Terraform Cloud organization name"
  type        = string
}

##########################
# Configuration
##########################
variable "workspace_name" {
  description = "Workspace name"
  type        = string
}

variable "app_name" {
  description = "App name"
  type        = string
}

variable "root_project_name" {
  description = "Root project name"
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
