$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/closing_stock" -UseBasicParsing -WebSession $s -TimeoutSec 40
$form=[regex]::Match($r.Content,'(?is)<form\b[^>]*id="saleReportForm"[^>]*>(.*?)</form>').Groups[1].Value
$form | Out-File "E:\DEVELOP WITH AI\ACCOUNTING GST\data\parsed\closing_stock_form.html" -Encoding utf8
Write-Output ("saved form len=" + $form.Length)
