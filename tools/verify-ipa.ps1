$g = (Invoke-WebRequest "http://localhost:3100/reports/inventory_product_added?from=2024-04-01&to=2026-10-26" -UseBasicParsing -TimeoutSec 120).Content
Write-Output ("filter+card: " + ($g.Contains('Filter Report') -and $g.Contains('Inventory Product Added')))
Write-Output ("5 cols: " + ($g.Contains('Batch No') -and $g.Contains('Purchase value')))
Write-Output ("Export only: " + ($g.Contains('Export') -and -not $g.Contains('>Print<') -and -not $g.Contains('>PDF<')))
Write-Output ("empty-state (matches source): " + ($g.Contains('No products added through purchase in this range')))
$e = Invoke-WebRequest "http://localhost:3100/reports/inventory_product_added/export?from=2024-04-01&to=2026-10-26" -UseBasicParsing -TimeoutSec 120
Write-Output ("export: " + $e.StatusCode + " " + $e.Headers['Content-Disposition'])
