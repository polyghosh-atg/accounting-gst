param(
  [string]$OutDir = "E:\DEVELOP WITH AI\ACCOUNTING GST\data\raw"
)
$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$hdr=@{'X-Requested-With'='XMLHttpRequest';'Referer'="$base/customer";'Accept'='application/json, text/javascript, */*; q=0.01'}

$mods=@('customer','supplier','product_core','product_category','warehouse','bank_account','expense','expense_category','tax','discount','currency','item','quotation','proforma_invoice','purchase_order','purchase','sale','sales_return','purchase_return','transfer','scrap_entry','scrap_issue','scrap_receive','scrap_product','pdc_receive','pdc_payment','credit_debit_note','promotion','email_template','whatsapp_template','employee','department','position','attendance','holiday','weekend','deduction','bonus','tax_deduction','advance_salary','leave','payroll','stock','bank_statement','cash_bank_entry')

$summary=@()
foreach($m in $mods){
  $ep="$m/ajax_list"
  try{
    $r=Invoke-WebRequest "$base/$ep" -Method Post -Body @{draw='1';start='0';length='100000';csrf_zivaan_pro=$csrf;'search[value]'='';'order[0][column]'='0';'order[0][dir]'='asc'} -Headers $hdr -UseBasicParsing -WebSession $s -TimeoutSec 120
    $r.Content | Set-Content (Join-Path $OutDir "$m.json") -Encoding UTF8
    $j=$r.Content|ConvertFrom-Json
    $summary += [pscustomobject]@{module=$m;rows=$j.recordsTotal;bytes=$r.Content.Length}
    Write-Host ("OK  {0,-22} rows={1}" -f $m,$j.recordsTotal)
  }catch{ Write-Host ("FAIL {0} : {1}" -f $m,$_.Exception.Message) }
}
$summary | ConvertTo-Json | Set-Content (Join-Path $OutDir "_summary.json") -Encoding UTF8

# HTML-table modules (users, roles) - these have no ajax_list
function Dump-Table($route,$file){
  $h=(Invoke-WebRequest "$base/$route" -UseBasicParsing -WebSession $s).Content
  $t=[regex]::Match($h,'(?is)<table\b[^>]*id="example1"[^>]*>(.*?)</table>')
  if(-not $t.Success){ Write-Host "no table $route"; return }
  $head=@([regex]::Matches($t.Groups[1].Value,'(?is)<thead.*?</thead>')|ForEach-Object{[regex]::Matches($_.Value,'(?is)<th[^>]*>(.*?)</th>')|ForEach-Object{($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()}})
  $rows=@()
  $body=[regex]::Match($t.Groups[1].Value,'(?is)<tbody[^>]*>(.*?)</tbody>')
  if($body.Success){
    foreach($tr in [regex]::Matches($body.Groups[1].Value,'(?is)<tr[^>]*>(.*?)</tr>')){
      $cells=[regex]::Matches($tr.Groups[1].Value,'(?is)<td[^>]*>(.*?)</td>')|ForEach-Object{($_.Groups[1].Value -replace '<[^>]+>','' -replace '&nbsp;',' ' -replace '\s+',' ').Trim()}
      if($cells.Count -gt 0){
        $o=[ordered]@{}
        for($i=0;$i -lt $head.Count -and $i -lt $cells.Count;$i++){ $o[$head[$i]]=$cells[$i] }
        $rows += [pscustomobject]$o
      }
    }
  }
  $rows | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $OutDir "$file.json") -Encoding UTF8
  Write-Host ("OK  {0,-22} rows={1} (html table)" -f $file,$rows.Count)
}
Dump-Table 'auth/users' 'users'
Dump-Table 'auth/user_roles' 'user_roles'

Write-Host "DONE -> $OutDir"
