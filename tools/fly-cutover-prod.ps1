param(
  [Parameter(Mandatory = $true)]
  [string]$AppName,

  [Parameter(Mandatory = $true)]
  [string]$FrontendUrl,

  [Parameter(Mandatory = $true)]
  [string]$GoogleClientId,

  [Parameter(Mandatory = $true)]
  [string]$GoogleClientSecret,

  [Parameter(Mandatory = $true)]
  [string]$GithubClientId,

  [Parameter(Mandatory = $true)]
  [string]$GithubClientSecret,

  [Parameter(Mandatory = $true)]
  [string]$SmtpHost,

  [Parameter(Mandatory = $true)]
  [string]$SmtpUser,

  [Parameter(Mandatory = $true)]
  [string]$SmtpPassword,

  [Parameter(Mandatory = $false)]
  [string]$SmtpPort = "587",

  [Parameter(Mandatory = $false)]
  [string]$EmailFrom = ""
)

$ErrorActionPreference = "Stop"

$appUrl = "https://$AppName.fly.dev"
if ([string]::IsNullOrWhiteSpace($EmailFrom)) {
  $EmailFrom = $SmtpUser
}

fly secrets set --app $AppName `
  NODE_ENV=production `
  APP_URL=$appUrl `
  FRONTEND_URL=$FrontendUrl `
  CORS_ORIGIN=$FrontendUrl `
  DEV_OAUTH_MOCK=false `
  DEV_EMAIL_FALLBACK=false `
  GOOGLE_CLIENT_ID=$GoogleClientId `
  GOOGLE_CLIENT_SECRET=$GoogleClientSecret `
  GOOGLE_CALLBACK_URL="$appUrl/api/auth/google/callback" `
  GITHUB_CLIENT_ID=$GithubClientId `
  GITHUB_CLIENT_SECRET=$GithubClientSecret `
  GITHUB_CALLBACK_URL="$appUrl/api/auth/github/callback" `
  SMTP_HOST=$SmtpHost `
  SMTP_PORT=$SmtpPort `
  SMTP_USER=$SmtpUser `
  SMTP_PASSWORD=$SmtpPassword `
  EMAIL_FROM=$EmailFrom

fly deploy --app $AppName --config fly.toml

Write-Host "Cutover complete for $AppName"
