$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/receivable" -UseBasicParsing -WebSession $s -TimeoutSec 40
$html=$r.Content
$tb=[regex]::Match($html,'(?is)<tbody[^>]*>(.*?)</tbody>').Groups[1].Value
$rows=[regex]::Matches($tb,'(?is)<tr\b[^>]*>(.*?)</tr>')
foreach($rw in $rows){
  $tds=[regex]::Matches($rw.Groups[1].Value,'(?is)<td\b[^>]*>(.*?)</td>') | ForEach-Object { (($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) }
  $line = $tds -join ' | '
  if($line -match 'Pritesh|Total|Vaidehi|Anowar'){ Write-Output ("ROW :: " + $line) }
}
$tf=[regex]::Match($html,'(?is)<tfoot>(.*?)</tfoot>').Groups[1].Value
Write-Output ("TFOOT: " + ((($tf -replace '<[^>]+>',' ' -replace '\s+',' ').Trim())))
