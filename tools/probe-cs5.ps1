$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/closing_stock" -Method Post -Body @{from_date='2024-04-01';to_date='2027-03-31';pid='';action_type='filter';csrf_zivaan_pro=$tok} -UseBasicParsing -WebSession $s -TimeoutSec 60
$html=$r.Content
$tb=[regex]::Match($html,'(?is)<table[^>]*id="stock-value-data"[^>]*>(.*?)</table>').Groups[1].Value
$tb | Out-File "E:\DEVELOP WITH AI\ACCOUNTING GST\data\parsed\closing_stock_table.html" -Encoding utf8
Write-Output ("saved table len=" + $tb.Length)
