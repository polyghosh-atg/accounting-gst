$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$b=@{expiry_date='';from_date='01-04-2024';to_date='26-10-2026';pid='';action_type='';submit='Search';csrf_zivaan_pro=$tok}
$r=Invoke-WebRequest "$base/report/inventory_product_added" -Method Post -Body $b -UseBasicParsing -WebSession $s -TimeoutSec 90
$html=$r.Content
$tb=[regex]::Match($html,'(?is)<tbody id="stock-value-body">(.*?)</tbody>').Groups[1].Value
Write-Output ("tbody len=" + $tb.Length)
$rows=[regex]::Matches($tb,'(?is)<tr\b([^>]*)>(.*?)</tr>')
Write-Output ("rows=" + $rows.Count)
foreach($rw in ($rows | Select-Object -First 10)){
  $tds=[regex]::Matches($rw.Groups[2].Value,'(?is)<td\b[^>]*>(.*?)</td>') | ForEach-Object { (($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) }
  Write-Output ("ROW :: " + ($tds -join ' | '))
}
foreach($pat in @('Notice','Warning','Fatal','Undefined')){
  $n=[regex]::Matches($html,$pat).Count
  if($n -gt 0){ Write-Output ("FOUND [$pat] x$n") }
}
