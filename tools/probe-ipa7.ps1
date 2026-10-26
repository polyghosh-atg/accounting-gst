$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$tests = @(
  @{expiry='OMIT'; from='01-04-2024'; to='26-10-2026'},
  @{expiry='31-12-2030'; from='01-04-2024'; to='26-10-2026'},
  @{expiry=''; from=''; to='26-10-2026'}
)
foreach($t in $tests){
  $b=@{from_date=$t.from;to_date=$t.to;pid='';action_type='';submit='Search';csrf_zivaan_pro=$tok}
  if($t.expiry -ne 'OMIT'){ $b['expiry_date']=$t.expiry }
  $r=Invoke-WebRequest "$base/report/inventory_product_added" -Method Post -Body $b -UseBasicParsing -WebSession $s -TimeoutSec 90
  $tb=[regex]::Match($r.Content,'(?is)<table\b[^>]*id="stock-value-data"[^>]*>(.*?)</table>').Groups[1].Value
  $body=[regex]::Match($tb,'(?is)<tbody[^>]*>(.*?)</tbody>').Groups[1].Value
  $rows=[regex]::Matches($body,'(?is)<tr\b')
  Write-Output ("expiry=[$($t.expiry)] from=[$($t.from)] => bodylen=" + $body.Length + " rows=" + $rows.Count)
}
