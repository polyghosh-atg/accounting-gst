Start-Sleep 12
$g = (Invoke-WebRequest "http://localhost:3100/reports/receivable" -UseBasicParsing -TimeoutSec 120).Content
Write-Output ("page 200, len=" + $g.Length)
Write-Output ("card Receivable: " + ($g.Contains('>Receivable<')))
Write-Output ("9 cols: " + ($g.Contains('GSTIN/UIN of Recipient') -and $g.Contains('Invoice Amount') -and $g.Contains('Receivable')))
Write-Output ("Vaidehi row + gstin: " + ($g.Contains('Vaidehi') -and $g.Contains('22AAAAA0000A1Z5')))
Write-Output ("Umair 98,23,314.00: " + ($g.Contains('98,23,314.00')))
Write-Output ("footer invoice 10,43,50,504.01: " + ($g.Contains('10,43,50,504.01')))
Write-Output ("Export only: " + ($g.Contains('Export') -and -not $g.Contains('>Print<') -and -not $g.Contains('>PDF<')))
$tds = [regex]::Matches($g, '<td[^>]*>(Vaidehi|Chinnasamy Ramasamy|Mr\. Umair|Doniyor|Pritesh|Ayanshi|karthik|saurabh|Dummy India|Anowar)\s*</td>') | ForEach-Object { $_.Groups[1].Value }
Write-Output ("row order: " + ($tds -join ' > '))
$e = Invoke-WebRequest "http://localhost:3100/reports/receivable/export" -UseBasicParsing -TimeoutSec 120
Write-Output ("export: " + $e.StatusCode + " " + $e.Headers['Content-Disposition'])
Write-Output "--- server errors ---"
Get-Content "E:\DEVELOP WITH AI\ACCOUNTING GST\accounting\server.log" | Select-String "Error|TypeError" | Select-Object -First 5
