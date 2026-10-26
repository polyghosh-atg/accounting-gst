$j = Get-Content 'E:\DEVELOP WITH AI\ACCOUNTING GST\data\parsed\stock_all.json' -Raw | ConvertFrom-Json
$hits = @($j | Where-Object { $_.prod -match 'ttar' })
Write-Output ("Attar rows in source dump: " + $hits.Count)
foreach ($h in $hits) { Write-Output ($h.wh + " | " + $h.prod + " | " + $h.qty + " | " + $h.type + " | " + $h.date) }
Write-Output ("total rows: " + @($j).Count)
