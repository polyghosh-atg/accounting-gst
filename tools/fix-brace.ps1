$f = "E:\DEVELOP WITH AI\ACCOUNTING GST\accounting\lib\reports.ts"
$lines = Get-Content $f
$out = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($i -eq 412) { $out += '    },' }
  $out += $lines[$i]
}
$out | Set-Content $f -Encoding utf8
Write-Output "brace inserted"
