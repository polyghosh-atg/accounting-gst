$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$m.Groups[1].Value;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/closing_stock" -UseBasicParsing -WebSession $s -TimeoutSec 40
$html=$r.Content
$cw=[regex]::Match($html,'(?is)content-wrapper(.*?)<!-- /.content-wrapper').Groups[1].Value
if(-not $cw){ $cw=[regex]::Match($html,'(?is)content-wrapper(.*)$').Groups[1].Value }
Write-Output ("CW len: " + $cw.Length)
$cards=[regex]::Matches($cw,'(?is)card-title">(.*?)</h3>')
Write-Output ("CARDS: " + (($cards | ForEach-Object { ((($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim())) }) -join ' | '))
$tbls=[regex]::Matches($cw,'(?is)<table\b([^>]*)>')
foreach($t in $tbls){ Write-Output ("TABLE: " + $t.Groups[1].Value.Trim()) }
$thead=[regex]::Match($cw,'(?is)<thead>(.*?)</thead>').Groups[1].Value
$trh=[regex]::Matches($thead,'(?is)<tr\b[^>]*>(.*?)</tr>')
Write-Output ("THEAD rows: " + $trh.Count)
foreach($tr in $trh){ $ths=[regex]::Matches($tr.Groups[1].Value,'(?is)<th\b[^>]*>(.*?)</th>') | ForEach-Object { ((($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim())) }; Write-Output ("HROW: " + ($ths -join ' | ')) }
$tb=[regex]::Match($cw,'(?is)<tbody[^>]*>(.*?)</tbody>').Groups[1].Value
Write-Output ("TBODY len: " + $tb.Length)
Write-Output ("TBODY text: " + ((($tb -replace '<[^>]+>',' ' -replace '\s+',' ').Trim().Substring(0,[Math]::Min(500,(($tb -replace '<[^>]+>',' ' -replace '\s+',' ').Trim()).Length)))))
$forms=[regex]::Matches($cw,'(?is)<(input|select)\b([^>]*)>') | ForEach-Object { $tag=$_.Groups[1].Value; $at=$_.Groups[2].Value; $n=[regex]::Match($at,'(name|id)="([^"]*)"').Groups[2].Value; "<$tag $n>" } | Where-Object { $_ -and $_ -notmatch 'hidden|search|checkbox' } | Select-Object -Unique | Select-Object -First 20
Write-Output ("FILTERS: " + ($forms -join ' '))
$js=[regex]::Matches($html,'(?is)<script\b[^>]*>(.*?)</script>') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -match 'closing|Closing' } | Select-Object -First 1
if($js){ $t=(($js -replace '\s+',' ').Trim()); Write-Output ("JS: " + $t.Substring(0,[Math]::Min(900,$t.Length))) }
