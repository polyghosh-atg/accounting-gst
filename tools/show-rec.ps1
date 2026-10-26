$l = Get-Content 'E:\DEVELOP WITH AI\ACCOUNTING GST\accounting\lib\reports.ts'
for ($k = 104; $k -lt 118; $k++) { Write-Output ('L' + ($k + 1) + ' :: ' + $l[$k]) }
