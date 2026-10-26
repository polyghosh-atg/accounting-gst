$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/inventory_product_added" -UseBasicParsing -WebSession $s -TimeoutSec 40
$html=$r.Content
$ajax=[regex]::Matches($html,'(?is)url\s*:\s*"([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
Write-Output ("URLS: " + ($ajax -join ' | '))
