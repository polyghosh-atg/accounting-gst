$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$m.Groups[1].Value;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/product" -UseBasicParsing -WebSession $s -TimeoutSec 40
$html=$r.Content
$links=[regex]::Matches($html,'(href="[^"]*(?:stock|ledger|history|movement)[^"]*")') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique | Select-Object -First 15
Write-Output ("STOCK LINKS: " + ($links -join ' | '))
$ledger=[regex]::Matches($html,'(?is)(stock_ledger|product_ledger|stock_register|quantity_detail)[^<]{0,120}')
foreach($l in ($ledger | Select-Object -First 5)){ Write-Output ("CTX: " + ((($l.Value -replace '<[^>]+>',' ' -replace '\s+',' ').Trim()))) }
