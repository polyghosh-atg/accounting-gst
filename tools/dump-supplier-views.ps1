$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$RawDir='E:\DEVELOP WITH AI\ACCOUNTING GST\data\raw'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$md=Join-Path $RawDir 'details\supplier'
New-Item -ItemType Directory -Force -Path $md | Out-Null
$j=Get-Content (Join-Path $RawDir 'supplier.json') -Raw | ConvertFrom-Json
$ids=@()
foreach($row in $j.data){ foreach($cell in $row){ foreach($m in [regex]::Matches("$cell",'supplier/view/([A-Za-z0-9+/=]+)')){ if($ids -notcontains $m.Groups[1].Value){$ids+=$m.Groups[1].Value} } } }
"ids: $($ids.Count)"
foreach($id in $ids){
  $fp=Join-Path $md (($id -replace '[+/=]','_')+'.html')
  if((Test-Path $fp) -and ((Get-Item $fp).Length -gt 5000)){ continue }
  try{ (Invoke-WebRequest "$base/supplier/view/$id" -UseBasicParsing -WebSession $s -TimeoutSec 60).Content|Set-Content $fp -Encoding UTF8; Write-Host "OK $id" }catch{ Write-Host "FAIL $id" }
  Start-Sleep -Milliseconds 120
}
