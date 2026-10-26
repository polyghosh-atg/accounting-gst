$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$m.Groups[1].Value;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/customer_payment_due" -UseBasicParsing -WebSession $s -TimeoutSec 40
$html=$r.Content
Write-Output ("LEN: " + $html.Length)
$title=[regex]::Match($html,'(?is)<title>(.*?)</title>').Groups[1].Value.Trim()
Write-Output ("TITLE: " + $title)
$h1=[regex]::Match($html,'(?is)<h1[^>]*>(.*?)</h1>').Groups[1].Value
Write-Output ("H1: " + (($h1 -replace '<[^>]+>','' -replace '\s+',' ').Trim()))
$ths=[regex]::Matches($html,'(?is)<th\b[^>]*>(.*?)</th>') | ForEach-Object { (($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) } | Where-Object { $_ } | Select-Object -Unique
Write-Output ("THS: " + ($ths -join ' | '))
$f=[regex]::Matches($html,'(?is)<label\b[^>]*>(.*?)</label>|<(input|select|button|a)\b([^>]*)>') | ForEach-Object { if($_.Groups[1].Success){ $t=(($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()); if($t){"[LBL:$t]"} } else { $tag=$_.Groups[2].Value; $attrs=$_.Groups[3].Value; $n=[regex]::Match($attrs,'(name|id|class|href|type)="([^"]*)"'); if($n.Success){"<$tag "+$n.Groups[1].Value+"="+$n.Groups[2].Value+">"} } } | Where-Object { $_ } | Select-Object -Unique | Select-Object -First 60
Write-Output ("FORM: " + ($f -join ' '))
