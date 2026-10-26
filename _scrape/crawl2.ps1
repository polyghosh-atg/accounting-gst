$ProgressPreference='SilentlyContinue'
$base = 'https://vaksys.com/pro'
$out  = 'E:\DEVELOP WITH AI\ACCOUNTING GST\_scrape'

$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g = Invoke-WebRequest -Uri "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf = [regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest -Uri "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null

$routes = @(
 'customer/add','supplier/add','employee/add','warehouse/add','tax/add','discount/add','promotion/add',
 'product_core/add','product_category/add','item/add','expense_category/add','expense/add',
 'bank_account/add','cash_bank_entry/add','bank_statement/add','quotation/add','proforma_invoice/add',
 'purchase_order/add','transfer/add','scrap_entry/add','credit_debit_note/add','pdc_receive/add','pdc_payment/add',
 'email_template/add','whatsapp_template/add','auth/users/add','auth/user_roles/add',
 'sale/view/MjA0'
)

$res=@()
foreach ($r in $routes) {
  try { $resp = Invoke-WebRequest -Uri "$base/$r" -UseBasicParsing -WebSession $s -TimeoutSec 60 } catch { Write-Host "FAIL $r"; continue }
  $h = $resp.Content
  $forms=@()
  foreach ($f in [regex]::Matches($h,'(?is)<form\b([^>]*)>(.*?)</form>')) {
    $attrs=$f.Groups[1].Value; $inner=$f.Groups[2].Value
    $action=[regex]::Match($attrs,'action="([^"]*)"').Groups[1].Value
    $method=[regex]::Match($attrs,'method="([^"]*)"').Groups[1].Value
    $labels=@()
    # label + input pairs, in order
    foreach ($m in [regex]::Matches($inner,'(?is)<label\b[^>]*>(.*?)</label>|<(input|select|textarea)\b([^>]*)>')) {
      if ($m.Groups[1].Success) {
        $t = ($m.Groups[1].Value -replace '<[^>]+>','' -replace '&nbsp;',' ' -replace '\s+',' ').Trim()
        if ($t -and $t.Length -lt 60) { $labels += "[$t]" }
      } else {
        $a=$m.Groups[3].Value
        $n=[regex]::Match($a,'name="([^"]*)"').Groups[1].Value
        $req = if ($a -match 'required') {'*'} else {''}
        if ($n) { $labels += "$n$req" }
      }
    }
    $forms += [pscustomobject]@{ action=$action; method=$method; seq=($labels -join ' ') }
  }
  $res += [pscustomobject]@{ route=$r; forms=$forms }
  Write-Host "OK $r ($($forms.Count) forms)"
  Start-Sleep -Milliseconds 120
}
$res | ConvertTo-Json -Depth 5 | Set-Content "$out\addforms.json" -Encoding UTF8
