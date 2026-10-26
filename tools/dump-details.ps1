param(
  [string]$RawDir = "E:\DEVELOP WITH AI\ACCOUNTING GST\data\raw"
)
$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$DetailDir=Join-Path $RawDir 'details'
New-Item -ItemType Directory -Force -Path $DetailDir | Out-Null
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null

function Get-Ids($mod,$linkRe){
  $p=Join-Path $RawDir "$mod.json"
  if(-not (Test-Path $p)){ return @() }
  $j=Get-Content $p -Raw | ConvertFrom-Json
  $ids=@()
  foreach($row in $j.data){
    foreach($cell in $row){
      foreach($m in [regex]::Matches("$cell","$linkRe")){
        $id=$m.Groups[1].Value
        if($id -and $ids -notcontains $id){ $ids+=$id }
      }
    }
  }
  return $ids
}

$jobs=@(
  @{mod='sale';re='sale/view/([A-Za-z0-9+/=]+)'},
  @{mod='purchase';re='purchase/view/([A-Za-z0-9+/=]+)'},
  @{mod='quotation';re='quotation/view/([A-Za-z0-9+/=]+)'},
  @{mod='proforma_invoice';re='proforma_invoice/view/([A-Za-z0-9+/=]+)'},
  @{mod='transfer';re='transfer/view/([A-Za-z0-9+/=]+)'},
  @{mod='sales_return';re='sales_return/view/([A-Za-z0-9+/=]+)'},
  @{mod='purchase_return';re='purchase_return/view/([A-Za-z0-9+/=]+)'},
  @{mod='customer';re='customer/view/([A-Za-z0-9+/=]+)'},
  @{mod='expense';re='expense/view/([A-Za-z0-9+/=]+)'}
)
$manifest=@{}
foreach($jb in $jobs){
  $ids=Get-Ids $jb.mod $jb.re
  $manifest[$jb.mod]=$ids.Count
  Write-Host "$($jb.mod): $($ids.Count) ids"
  $md=Join-Path $DetailDir $jb.mod
  New-Item -ItemType Directory -Force -Path $md | Out-Null
  $n=0
  foreach($id in $ids){
    $n++
    $safe=$id -replace '[+/=]','_'
    $fp=Join-Path $md "$safe.html"
    if((Test-Path $fp) -and ((Get-Item $fp).Length -gt 5000)){ continue }
    $route=$jb.mod -replace '_core$',''
    try{
      $r=Invoke-WebRequest "$base/$route/view/$id" -UseBasicParsing -WebSession $s -TimeoutSec 60
      $r.Content|Set-Content $fp -Encoding UTF8
    }catch{ Write-Host "  FAIL $($jb.mod)/$id" }
    if($n%25 -eq 0){ Write-Host "  $($jb.mod) $n/$($ids.Count)" }
    Start-Sleep -Milliseconds 120
  }
  Write-Host "DONE $($jb.mod) $n"
}
$manifest|ConvertTo-Json|Set-Content (Join-Path $DetailDir '_manifest.json') -Encoding UTF8
