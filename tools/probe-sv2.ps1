$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$m.Groups[1].Value;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/stock_value" -UseBasicParsing -WebSession $s -TimeoutSec 40
$html=$r.Content
$c=[regex]::Match($html,'(?is)card-tools(.*?)card-body').Groups[1].Value
Write-Output ("CARD-TOOLS RAW: " + (($c -replace '\s+',' ').Trim().Substring(0,[Math]::Min(800,(($c -replace '\s+',' ').Trim()).Length))))
$tbl=[regex]::Match($html,'(?is)<table class="sticky[^>]*>(.*?)</table>').Groups[1].Value
if(-not $tbl){ $tbl=[regex]::Match($html,'(?is)<table\b[^>]*id="[^"]*"(.*?)</table>').Groups[0].Value }
$id=[regex]::Match($html,'<table\b([^>]*)>').Groups[1].Value
Write-Output ("TABLE TAG: " + $id)
$js=[regex]::Matches($html,'(?is)<script\b[^>]*>(.*?)</script>') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -match 'stock|Stock|DataTable|datatable' } | Select-Object -First 2
foreach($j in $js){ Write-Output ("JS: " + (($j -replace '\s+',' ').Trim().Substring(0,[Math]::Min(600,(($j -replace '\s+',' ').Trim()).Length)))) }
