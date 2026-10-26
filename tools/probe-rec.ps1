$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/receivable" -UseBasicParsing -WebSession $s -TimeoutSec 40
$html=$r.Content
$cw=[regex]::Match($html,'(?is)content-wrapper(.*)$').Groups[1].Value
$cards=[regex]::Matches($cw,'(?is)card-title">(.*?)</h3>') | ForEach-Object { ((($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim())) }
Write-Output ("CARDS: " + ($cards -join ' | '))
$boxes=[regex]::Matches($cw,'(?is)info-box-text">(.*?)</span>\s*<span class="info-box-number[^"]*">(.*?)</span>') | ForEach-Object { (($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) + ' = ' + (($_.Groups[2].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) }
Write-Output ("BOXES: " + ($boxes -join ' | '))
$tools=[regex]::Match($cw,'(?is)card-tools(.*?)card-body').Groups[1].Value
$tw=(($tools -replace '\s+',' ').Trim())
Write-Output ("TOOLS Export: " + ($tw -match 'Export') + " | Print commented: " + ($tw -match '<!--'))
$tbl=[regex]::Match($cw,'(?is)<table\b[^>]*id="[^"]*"[^>]*>(.*?)</table>').Groups[1].Value
$ths=[regex]::Matches($tbl,'(?is)<th\b[^>]*>(.*?)</th>') | ForEach-Object { (($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) } | Where-Object { $_ }
Write-Output ("THS: " + ($ths -join ' | '))
$body=[regex]::Match($tbl,'(?is)<tbody[^>]*>(.*?)</tbody>').Groups[1].Value
$rows=[regex]::Matches($body,'(?is)<tr\b([^>]*)>(.*?)</tr>')
Write-Output ("BODY rows: " + $rows.Count)
foreach($rw in ($rows | Select-Object -First 14)){
  $tds=[regex]::Matches($rw.Groups[2].Value,'(?is)<td\b[^>]*>(.*?)</td>') | ForEach-Object { (($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) }
  Write-Output ("ROW [" + $rw.Groups[1].Value.Trim() + "] :: " + ($tds -join ' | '))
}
$tf=[regex]::Match($tbl,'(?is)<tfoot>(.*?)</tfoot>').Groups[1].Value
if($tf){ Write-Output ("TFOOT: " + ((($tf -replace '<[^>]+>',' ' -replace '\s+',' ').Trim()))) } else { Write-Output "TFOOT: none" }
$forms=[regex]::Matches($cw,'(?is)<(input|select)\b([^>]*)>') | ForEach-Object { $tag=$_.Groups[1].Value; $at=$_.Groups[2].Value; $n=[regex]::Match($at,'(name|id)="([^"]*)"').Groups[2].Value; if($n -and $n -notmatch '^(search)'){"<$tag $n>"} } | Where-Object { $_ } | Select-Object -Unique | Select-Object -First 12
Write-Output ("FILTERS: " + ($forms -join ' '))
