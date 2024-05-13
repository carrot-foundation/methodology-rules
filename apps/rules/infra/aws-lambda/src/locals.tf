locals {
  rules      = jsondecode(file("rules/${var.tfc_project_name}.json")).rules
  sentry_dsn = "https://0cb5561e0c28eff625e7fff043c6778c@o4506423325687808.ingest.us.sentry.io/4507223680811008"
}
