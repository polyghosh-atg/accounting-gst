$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/closing_stock" -UseBasicParsing -WebSession $s -TimeoutSec 40
$html=$r.Content
$idx=$html.IndexOf('stock-value-body')
Write-Output ("body marker at " + $idx + " of " + $html.Length)
$seg=$html.Substring([Math]::Max(0,$idx-200), [Math]::Min(3000,$html.Length-$idx+200))
$seg | Out-File "E:\DEVELOP WITH AI\ACCOUNTING GST\data\parsed\closing_stock_seg.txt" -Encoding utf8
$js=[regex]::Matches($html,'(?is)<script\b[^>]*>(.*?)</script>') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -match 'stock-value-body|closing_stock|getClosing|loadReport|fetch' } | Select-Object -First 3
foreach($j in $js){ $t=(($j -replace '\s+',' ').Trim()); Write-Output ("JS: " + $t.Substring(0,[Math]::Min(1200,$t.Length))); Write-Output "=====" }
