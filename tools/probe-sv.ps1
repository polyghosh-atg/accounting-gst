$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$m.Groups[1].Value;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/stock_value" -UseBasicParsing -WebSession $s -TimeoutSec 40
$html=$r.Content
$cw=[regex]::Match($html,'(?is)content-wrapper(.*)$').Groups[1].Value
$boxes=[regex]::Matches($cw,'(?is)info-box-text">(.*?)</span>\s*<span class="info-box-number[^"]*">(.*?)</span>') | ForEach-Object { (($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) + ' = ' + (($_.Groups[2].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) }
Write-Output ("BOXES: " + ($boxes -join ' | '))
$title=[regex]::Match($cw,'(?is)card-title">(.*?)</h3>').Groups[1].Value
Write-Output ("TITLE: " + (($title -replace '<[^>]+>','' -replace '\s+',' ').Trim()))
$btns=[regex]::Matches($cw,'(?is)<button\b([^>]*)>(.*?)</button>') | ForEach-Object { $tx=((($_.Groups[2].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim())); if($tx -and $tx.Length -lt 40){"BTN: $tx"} } | Where-Object { $_ } | Select-Object -Unique
Write-Output ($btns -join ' | ')
$tbl=[regex]::Match($cw,'(?is)<table\b[^>]*>(.*?)</table>').Groups[1].Value
$ths=[regex]::Matches($tbl,'(?is)<th\b[^>]*>(.*?)</th>') | ForEach-Object { (($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) } | Where-Object { $_ }
Write-Output ("THS: " + ($ths -join ' | '))
$trs=[regex]::Matches($tbl,'(?is)<tr\b([^>]*)>(.*?)</tr>')
Write-Output ("TR count: " + $trs.Count)
$body=[regex]::Match($tbl,'(?is)<tbody>(.*?)</tbody>').Groups[1].Value
$rows=[regex]::Matches($body,'(?is)<tr\b([^>]*)>(.*?)</tr>')
Write-Output ("BODY rows: " + $rows.Count)
foreach($rw in ($rows | Select-Object -First 12)){
  $tds=[regex]::Matches($rw.Groups[2].Value,'(?is)<td\b[^>]*>(.*?)</td>') | ForEach-Object { (($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) }
  Write-Output ("ROW attrs=[" + $rw.Groups[1].Value.Trim() + "] :: " + ($tds -join ' | '))
}
$tf=[regex]::Match($tbl,'(?is)<tfoot>(.*?)</tfoot>').Groups[1].Value
Write-Output ("TFOOT: " + ((($tf -replace '<[^>]+>',' ' -replace '\s+',' ').Trim())))
