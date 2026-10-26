$lines = Get-Content "E:\DEVELOP WITH AI\ACCOUNTING GST\accounting\lib\reports.ts"
for ($i=299; $i -le 309; $i++) {
  $l = $lines[$i]
  $n = $i + 1
  Write-Output "L$n :: $l"
}
