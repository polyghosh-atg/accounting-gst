$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/closing_stock" -Method Post -Body @{from_date='01-04-2024';to_date='26-10-2026';pid='';action_type='';submit='Search';csrf_zivaan_pro=$tok} -UseBasicParsing -WebSession $s -TimeoutSec 90
$html=$r.Content
$tb=[regex]::Match($html,'(?is)<table[^>]*id="stock-value-data"[^>]*>(.*?)</table>').Groups[1].Value
$tb | Out-File "E:\DEVELOP WITH AI\ACCOUNTING GST\data\parsed\closing_stock_table.html" -Encoding utf8
$body=[regex]::Match($tb,'(?is)<tbody[^>]*>(.*?)</tbody>').Groups[1].Value
$rows=[regex]::Matches($body,'(?is)<tr\b([^>]*)>(.*?)</tr>')
Write-Output ("BODY rows: " + $rows.Count + " table len=" + $tb.Length)
