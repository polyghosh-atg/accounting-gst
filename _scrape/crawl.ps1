$ProgressPreference='SilentlyContinue'
$base = 'https://vaksys.com/pro'
$out  = 'E:\DEVELOP WITH AI\ACCOUNTING GST\_scrape'

$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g = Invoke-WebRequest -Uri "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf = [regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest -Uri "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null

$routes = @(
 'auth/dashboard','auth/users','auth/user_roles',
 'customer','supplier','employee','warehouse','currency','tax','discount','promotion',
 'product','product_category','product_core','item','custom_field',
 'sale/add','sales_return','quotation','proforma_invoice','credit_debit_note','pdc_receive','pdc_payment',
 'purchase','purchase/add','purchase_order','purchase_return','transfer','stock_entry','scrap_product','scrap_entry','scrap_issue','scrap_receive',
 'expense','expense_category','bank_account','bank_statement','cash_bank_entry',
 'report/sale','report/purchase','report/product','report/product_sale','report/product_purchase','report/stock','report/stock_value','report/closing_stock','report/ledger','report/receivable','report/payable','report/customer_payment_due','report/supplier_payment_due','report/gstr1','report/gstr2','report/hsn_sale','report/hsn_purchase','report/expense','report/sales_return','report/purchase_return','report/inventory_product_added',
 'settings','email_template','whatsapp_template'
)

$results = @()
foreach ($r in $routes) {
  $url = "$base/$r"
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -WebSession $s -MaximumRedirection 5 -TimeoutSec 60
    $h = $resp.Content
  } catch { Write-Host "FAIL $r : $($_.Exception.Message)"; continue }

  $title = [regex]::Match($h,'(?is)<title>(.*?)</title>').Groups[1].Value.Trim()

  # content area only (after breadcrumb / before footer) - fallback full
  $body = $h

  # forms
  $forms = @()
  foreach ($f in [regex]::Matches($body,'(?is)<form\b([^>]*)>(.*?)</form>')) {
    $attrs = $f.Groups[1].Value
    $inner = $f.Groups[2].Value
    $action = [regex]::Match($attrs,'action="([^"]*)"').Groups[1].Value
    $method = [regex]::Match($attrs,'method="([^"]*)"').Groups[1].Value
    $fields = @()
    foreach ($i in [regex]::Matches($inner,'(?is)<(input|select|textarea)\b([^>]*)>')) {
      $tag = $i.Groups[1].Value.ToLower(); $a = $i.Groups[2].Value
      $n = [regex]::Match($a,'name="([^"]*)"').Groups[1].Value
      $t = [regex]::Match($a,'type="([^"]*)"').Groups[1].Value
      if (-not $t) { $t = $tag }
      if ($n) { $fields += "$n($t)" }
    }
    $forms += [pscustomobject]@{ action=$action; method=$method; fields=($fields -join ', ') }
  }

  # tables
  $tables = @()
  foreach ($t in [regex]::Matches($body,'(?is)<table\b([^>]*)>(.*?)</table>')) {
    $a = $t.Groups[1].Value; $inner = $t.Groups[2].Value
    $id = [regex]::Match($a,'id="([^"]*)"').Groups[1].Value
    $ths = [regex]::Matches($inner,'(?is)<th\b[^>]*>(.*?)</th>') | ForEach-Object { ($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim() } | Where-Object { $_ }
    $rows = ([regex]::Matches($inner,'(?is)<tr\b')).Count
    if ($ths.Count -gt 0) { $tables += [pscustomobject]@{ id=$id; rows=$rows; headers=($ths -join ' | ') } }
  }

  # ajax / fetch urls in inline scripts
  $inline = ([regex]::Matches($body,'(?is)<script\b[^>]*>(.*?)</script>') | ForEach-Object { $_.Groups[1].Value }) -join "`n"
  $ajax = [regex]::Matches($inline,'(?i)(?:url\s*:\s*["'']|fetch\(\s*["'']|\$\.(?:get|post)\(\s*["''])([^"''\s]+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique

  # headings
  $heads = [regex]::Matches($body,'(?is)<h[1-4]\b[^>]*>(.*?)</h[1-4]>') | ForEach-Object { ($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim() } | Where-Object { $_ -and $_.Length -lt 80 } | Select-Object -Unique

  $results += [pscustomobject]@{
    route = $r; status = $resp.StatusCode; title = $title
    headings = ($heads -join ' ; ')
    forms = $forms
    tables = $tables
    ajax = ($ajax -join ' , ')
  }
  Write-Host ("OK {0}  forms={1} tables={2} ajax={3}" -f $r,$forms.Count,$tables.Count,$ajax.Count)
  Start-Sleep -Milliseconds 150
}

$results | ConvertTo-Json -Depth 6 | Set-Content "$out\routes.json" -Encoding UTF8
Write-Host "DONE routes: $($results.Count)"
