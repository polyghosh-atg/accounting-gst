$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$hdr=@{'X-Requested-With'='XMLHttpRequest';'Referer'=$base}
$body="draw=1&start=0&length=20&search%5Bvalue%5D=&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&csrf_zivaan_pro=$tok"
$r=Invoke-WebRequest "$base/product/ajax_list" -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded' -Headers $hdr -UseBasicParsing -WebSession $s -TimeoutSec 60
$j=$r.Content|ConvertFrom-Json
$out=@()
foreach($row in $j.data){
  $wpid=[regex]::Match($row[0],'data-warehouse_product_id="(\d+)"').Groups[1].Value
  $prodId=[regex]::Match($row[0],'data-product_id="(\d+)"').Groups[1].Value
  $cells = $row | ForEach-Object { ((($_ -replace '<[^>]+>',' ' -replace '\s+',' ').Trim())) }
  $prod=($cells[2] -replace '\s+[A-Z]+$','')
  $out += [pscustomobject]@{ wp=$wpid; prodId=$prodId; wh=$cells[1]; prod=$prod; hsn=$cells[3]; qty=$cells[4]; batch=$cells[5]; uom=$cells[6]; alert=$cells[7]; cost=$cells[8]; tcost=$cells[9]; price=$cells[10]; tprice=$cells[11]; status=$cells[12] }
}
$out | ConvertTo-Json -Depth 3 | Out-File "E:\DEVELOP WITH AI\ACCOUNTING GST\data\parsed\warehouse_products.json" -Encoding utf8
$out | Format-Table prod, wh, qty, cost, tcost, price, tprice | Out-String | Write-Output
Write-Output ("saved " + $out.Count + " rows")
