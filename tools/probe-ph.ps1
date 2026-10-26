$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$m.Groups[1].Value;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/product" -UseBasicParsing -WebSession $s -TimeoutSec 40
$tbl=[regex]::Match($r.Content,'(?is)<table\b[^>]*>(.*?)</table>').Groups[1].Value
$ths=[regex]::Matches($tbl,'(?is)<th\b[^>]*>(.*?)</th>') | ForEach-Object { (($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) } | Where-Object { $_ }
Write-Output ("PRODUCT THS: " + ($ths -join ' | '))
