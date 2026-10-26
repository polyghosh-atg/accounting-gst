$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$m.Groups[1].Value;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/customer_payment_due" -UseBasicParsing -WebSession $s -TimeoutSec 40
$html=$r.Content
$cw=[regex]::Match($html,'(?is)content-wrapper(.*)$').Groups[1].Value
if(-not $cw){ $cw=$html }
$sec=[regex]::Matches($cw,'(?is)<div class="card[^"]*"[^>]*>(.*?)</div>\s*</div>\s*</div>') | ForEach-Object { $_.Groups[1].Value } | Select-Object -First 3
Write-Output "=== CARDS: $($sec.Count)"
$i=0
foreach($s2 in $sec){
  $i++
  $t=(($s2 -replace '<[^>]+>',' ' -replace '\s+',' ').Trim())
  Write-Output ("--- card $i (" + $s2.Length + " chars): " + $t.Substring(0,[Math]::Min(900,$t.Length)))
}
$btns=[regex]::Matches($cw,'(?is)<(button|a)\b([^>]*)>(.*?)</\1>') | ForEach-Object { $tag=$_.Groups[1].Value; $at=$_.Groups[2].Value; $tx=((($_.Groups[3].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim())); if($tx -and $tx.Length -lt 60 -and $tx -notmatch '^(PEOPLE|ACCOUNT|Dashboard|POS|Sale|Purchase)'){ "<$tag $at> $tx" } } | Where-Object { $_ } | Select-Object -Unique | Select-Object -First 25
Write-Output "=== BUTTONS:"
$btns | ForEach-Object { Write-Output $_ }
