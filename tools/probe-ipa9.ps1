$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
foreach($prodId in @('82','178','1','2')){
  $b=@{expiry_date='';from_date='01-04-2024';to_date='26-10-2026';pid=$prodId;action_type='';submit='Search';csrf_zivaan_pro=$tok}
  $r=Invoke-WebRequest "$base/report/inventory_product_added" -Method Post -Body $b -UseBasicParsing -WebSession $s -TimeoutSec 90
  $tb=[regex]::Match($r.Content,'(?is)<table\b[^>]*id="stock-value-data"[^>]*>(.*?)</table>').Groups[1].Value
  $body=[regex]::Match($tb,'(?is)<tbody[^>]*>(.*?)</tbody>').Groups[1].Value
  Write-Output ("prodId=$prodId => bodylen=" + $body.Length)
}
