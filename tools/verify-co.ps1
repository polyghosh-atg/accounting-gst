Start-Sleep 12
$g = (Invoke-WebRequest "http://localhost:3100/settings/company" -UseBasicParsing -TimeoutSec 120).Content
Write-Output ("page 200, len=" + $g.Length)
$tabs = @('Details','GST','Bank Details','Terms &amp; Condition','Terms & Condition','Logo &amp; Favicon','Signature','Currency','Prefix','Invoice Setting','Whatsapp Setting','UPI')
$missing = @($tabs | Where-Object { -not $g.Contains($_) })
Write-Output ("missing tabs: " + ($missing -join ','))
Write-Output ("values: company=" + ($g.Contains('Zivaan Solutions')) + " gstin=" + ($g.Contains('02BINPK2730F1ZN')) + " bank=" + ($g.Contains('Fidelity Bank Plc')) + " terms=" + ($g.Contains('Ahmedabad Jurisdiction')) + " whatsapp=" + ($g.Contains('938093647')) + " upi=" + ($g.Contains('abc@paytk')) + " instance=" + ($g.Contains('66A1100823B4C')))
Write-Output ("prefixes: PO=" + ($g.Contains('purchase_order_prefix')) + " CDN2000=" + ($g.Contains('2000')) + " sale_prefix=" + ($g.Contains('sale_prefix')))
Write-Output ("selects: country246=" + (([regex]::Matches($g,'United States').Count) -ge 1) + " file inputs=" + (([regex]::Matches($g,'type="file"').Count)))
Write-Output "--- server errors ---"
Get-Content "E:\DEVELOP WITH AI\ACCOUNTING GST\accounting\server.log" | Select-String "Error|TypeError" | Select-Object -First 5
