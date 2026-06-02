# Copia arquivos estáticos para docs/ (GitHub Pages)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$docs = Join-Path $root "docs"
$jsDocs = Join-Path $docs "js"

New-Item -ItemType Directory -Force -Path $jsDocs | Out-Null

Copy-Item (Join-Path $root "index.html"), (Join-Path $root "comprador.html"), (Join-Path $root "admin.html") -Destination $docs -Force
Copy-Item (Join-Path $root "style.css"), (Join-Path $root "admin.css"), (Join-Path $root "home.css"), (Join-Path $root "favicon.svg") -Destination $docs -Force
Copy-Item (Join-Path $root "js\supabase-api.js"), (Join-Path $root "js\script.js"), (Join-Path $root "js\admin.js"), (Join-Path $root "js\public-config.js"), (Join-Path $root "js\home-links.js"), (Join-Path $root "js\help-faq.js"), (Join-Path $root "js\pix-config.js") -Destination $jsDocs -Force
Copy-Item (Join-Path $root "js\config.example.js") -Destination $jsDocs -Force

$config = Join-Path $root "js\config.js"
if (Test-Path $config) {
    Copy-Item $config (Join-Path $jsDocs "config.js") -Force
    Write-Host "docs/js/config.js atualizado."
} else {
    Write-Host "Aviso: js/config.js nao encontrado. Copie config.example.js antes do deploy."
}

Write-Host "docs/ sincronizado."
