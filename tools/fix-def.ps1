$f = "E:\DEVELOP WITH AI\ACCOUNTING GST\accounting\lib\reports.ts"
$lines = Get-Content $f
$new = @(
'      fetch: async (f) => {',
'        const r = await pool.query(',
'          `SELECT w.product, SUM(w.qty) qty, SUM(w.qty*w.cost) purchase_value,',
"             MAX(COALESCE(pr.mrp,0)) mrp, SUM(w.qty)*MAX(COALESCE(pr.mrp,0)) sale_value",
"           FROM warehouse_products w LEFT JOIN products pr ON pr.name ILIKE w.product || '%'",
'           GROUP BY w.product ORDER BY w.product`);',
"        const rows = filterQ(r.rows, f, ['product']).map((x) => ({",
"          product: String(x.product ?? ''),",
"          qty: String(x.qty ?? '0'),",
"          purchase_value: String(x.purchase_value ?? '0'),",
"          sale_value: Number(x.mrp) > 0 ? String(x.sale_value ?? '0') : 'Please update selling price',",
'        }));',
'        const tq = rows.reduce((a, x) => a + (parseFloat(x.qty) || 0), 0);',
'        const tp = rows.reduce((a, x) => a + (parseFloat(x.purchase_value) || 0), 0);',
'        const ts = rows.reduce((a, x) => a + (parseFloat(x.sale_value) || 0), 0);',
'        const rd = (n: number) => String(Math.round(n * 100) / 100);',
"        rows.push({ product: 'Total', qty: rd(tq), purchase_value: rd(tp), sale_value: rd(ts) });",
'        return rows;',
'      },'
)
$before = $lines[0..298]
$after = $lines[309..($lines.Count - 1)]
($before + $new + $after) | Set-Content $f -Encoding utf8
Write-Output "replaced lines 300-309"
