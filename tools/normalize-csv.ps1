param(
  [string]$RawDir = "E:\DEVELOP WITH AI\ACCOUNTING GST\data\raw",
  [string]$CsvDir = "E:\DEVELOP WITH AI\ACCOUNTING GST\data\csv",
  [string]$SchemaDir = "E:\DEVELOP WITH AI\ACCOUNTING GST\data\schema"
)
$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
New-Item -ItemType Directory -Force -Path $CsvDir,$SchemaDir | Out-Null

$map=@{
 customer='customer'; supplier='supplier'; product_core='product'; product_category='product_category';
 warehouse='warehouse'; bank_account='bank_account'; expense='expense'; expense_category='expense_category';
 tax='tax'; discount='discount'; currency='currency'; item='item'; quotation='quotation';
 proforma_invoice='proforma_invoice'; purchase_order='purchase_order'; purchase='purchase'; sale='sale';
 sales_return='sales_return'; purchase_return='purchase_return'; transfer='transfer'; scrap_entry='scrap_entry';
 scrap_issue='scrap_issue'; scrap_receive='scrap_receive'; scrap_product='scrap_product';
 pdc_receive='pdc_receive'; pdc_payment='pdc_payment'; credit_debit_note='credit_debit_note';
 promotion='promotion'; email_template='email_template'; whatsapp_template='whatsapp_template';
 employee='employee'; department='department'; position='position'; attendance='attendance';
 holiday='holiday'; weekend='weekend'; deduction='deduction'; bonus='bonus'; tax_deduction='tax_deduction';
 advance_salary='advance_salary'; leave='leave'; payroll='payroll'; stock='stock';
 bank_statement='bank_statement'; cash_bank_entry='cash_bank_entry'
}

$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null

$manifest=@{}
foreach($m in $map.Keys){
  $p=Join-Path $RawDir "$m.json"
  if(-not (Test-Path $p)){ continue }
  $j=Get-Content $p -Raw | ConvertFrom-Json
  if(-not $j.data -or $j.data.Count -eq 0){ continue }
  # mode of row lengths
  $mode = ($j.data | ForEach-Object { $_.Count } | Group-Object | Sort-Object Count -Descending | Select-Object -First 1).Name
  try{ $h=(Invoke-WebRequest "$base/$($map[$m])" -UseBasicParsing -WebSession $s -TimeoutSec 60).Content }catch{ continue }
  $cands=@()
  foreach($t in [regex]::Matches($h,'(?is)<table\b([^>]*)>(.*?)</table>')){
    $attrs=$t.Groups[1].Value; $inner=$t.Groups[2].Value
    $heads=@([regex]::Matches($inner,'(?is)<thead[^>]*>(.*?)</thead>')|ForEach-Object{
        [regex]::Matches($_.Groups[1].Value,'(?is)<th[^>]*>(.*?)</th>')|ForEach-Object{($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()}
    } | Where-Object { $_ })
    if($heads.Count -eq 0){ continue }
    if($heads -contains 'PEOPLE'){ continue }  # nav/shortcut table, never data
    $isExample = $attrs -match 'id="example"'
    $cands += [pscustomobject]@{ heads=$heads; example=$isExample }
  }
  $pick = $cands | Where-Object { $_.example -and $_.heads.Count -eq [int]$mode } | Select-Object -First 1
  if(-not $pick){ $pick = $cands | Where-Object { $_.heads.Count -eq [int]$mode } | Select-Object -First 1 }
  if(-not $pick){ $pick = $cands | Sort-Object { [Math]::Abs($_.heads.Count-[int]$mode) } | Select-Object -First 1 }
  if(-not $pick){ continue }
  $heads=$pick.heads
  if($m -eq 'supplier' -and $heads.Count -eq 12){
    # ajax payload omits Website column (verified vs supplier/view pages)
    $heads = $heads | Where-Object { $_ -ne 'Website' }
  }
  if($m -eq 'product_core'){
    # condensed ajax grid (verified vs add-form + rows)
    $heads = @('Image','Name','UOM','ManageInv','HSN','Cost','SellingPrice','Price','Status','Action')
  }
  if($heads.Count -ne [int]$mode -and $heads.Count -ne [int]$mode - 1){
    # ajax payload width differs from page thead (condensed table) -> generic headers to avoid misalignment
    $heads = 1..([int]$mode) | ForEach-Object { "c$_" }
  }
  $manifest[$m]=$heads
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $SchemaDir "table-headers.json") -Encoding UTF8

foreach($m in $manifest.Keys){
  $j=Get-Content (Join-Path $RawDir "$m.json") -Raw | ConvertFrom-Json
  $heads=$manifest[$m]
  $rows=@()
  foreach($d in $j.data){
    $cells = @($d)
    # ajax rows often carry a leading control cell (checkbox) not present in thead
    if($cells.Count -eq $heads.Count + 1){
      $first = if($cells[0] -is [string]){ ($cells[0] -replace '<[^>]+>','' -replace '\s+',' ').Trim() } else { '' }
      if($first -eq ''){ $cells = $cells[1..($cells.Count-1)] }
    }
    $o=[ordered]@{}
    for($i=0;$i -lt $heads.Count;$i++){
      $v = if($i -lt $cells.Count){ $cells[$i] } else { '' }
      if($v -is [string]){ $v = ($v -replace '(?i)<br\s*/?>',' ' -replace '<[^>]+>',' ' -replace '&nbsp;',' ' -replace '\s+',' ').Trim() }
      $o[$heads[$i]]=$v
    }
    $rows += [pscustomobject]$o
  }
  $rows | Export-Csv -Path (Join-Path $CsvDir "$m.csv") -NoTypeInformation -Encoding UTF8
  Write-Host ("CSV {0,-22} rows={1} cols={2}" -f $m,$rows.Count,$heads.Count)
}
Write-Host "DONE -> $CsvDir"
