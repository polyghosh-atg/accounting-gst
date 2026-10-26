'use client';

import { useState } from 'react';
import {
  addWarehouse, updateWarehouse, deleteWarehouse,
  addCategory, updateCategory, deleteCategory,
  deleteScrapProduct, addStock, updateStock, deleteStock,
} from '@/app/inventory/actions';
import { addProduct, updateProduct, deleteProduct } from '@/app/products/actions';
import { Modal, Btn, IconBtn, fieldCls } from '@/components/ui';

export type Warehouse = { id: number; name: string; code: string; description: string };
export type Category = { id: number; name: string; description: string; tax_id: string; tax_type: string };
export type Tax = { id: number; name: string };
export type Product = {
  id: number; name: string; description: string; category_id: string; hsn: string; markup: string;
  alert_qty: string; uom: string; manage_inventory: string; cost: string; selling_price: string; mrp: string; status: string;
};
export type Uom = { code: string; name: string };
export type StockRec = {
  id: number; warehouse: string; product: string; qty: string; unit: string;
  cost: string; sell_price: string; entry_type: string; entry_date: string;
};

type Kind = null | 'add' | 'edit' | 'delete';

function useModal() {
  const [kind, setKind] = useState<Kind>(null);
  return { kind, setKind, close: () => setKind(null) };
}

export function WarehouseButtons({ w }: { w: Warehouse }) {
  const { kind, setKind, close } = useModal();
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setKind('edit')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setKind('delete')} />
      </div>
      {kind === 'edit' && (
        <Modal title={`Edit ${w.name}`} onClose={close}>
          <form action={updateWarehouse} className="space-y-2.5">
            <input type="hidden" name="warehouse_id" value={w.id} />
            <input name="name" required defaultValue={w.name} placeholder="Name *" className={fieldCls} />
            <input name="code" defaultValue={w.code} placeholder="Code *" className={fieldCls} />
            <input name="description" defaultValue={w.description} placeholder="Description *" className={fieldCls} />
            <Btn type="submit" className="w-full">Save</Btn>
          </form>
        </Modal>
      )}
      {kind === 'delete' && (
        <Modal title={`Delete ${w.name}?`} onClose={close}>
          <form action={deleteWarehouse}>
            <input type="hidden" name="warehouse_id" value={w.id} />
            <p className="mb-3 text-sm text-slate-600">Remove this warehouse. Stock entries keep its name as plain text.</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddWarehouseButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>+ Add Warehouse</Btn>
      {open && (
        <Modal title="Add Warehouse" onClose={() => setOpen(false)}>
          <form action={addWarehouse} className="space-y-2.5">
            <input name="name" required placeholder="Name *" className={fieldCls} />
            <input name="code" placeholder="Code *" className={fieldCls} />
            <input name="description" placeholder="Description *" className={fieldCls} />
            <Btn type="submit" className="w-full">Add Warehouse</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function CategoryButtons({ c, taxes }: { c: Category; taxes: Tax[] }) {
  const { kind, setKind, close } = useModal();
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setKind('edit')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setKind('delete')} />
      </div>
      {kind === 'edit' && (
        <Modal title={`Edit ${c.name}`} onClose={close}>
          <form action={updateCategory} className="space-y-2.5">
            <input type="hidden" name="category_id" value={c.id} />
            <input name="name" required defaultValue={c.name} placeholder="Name *" className={fieldCls} />
            <input name="description" defaultValue={c.description} placeholder="Description *" className={fieldCls} />
            <select name="tax_id" defaultValue={c.tax_id || ''} className={fieldCls}>
              <option value="">Tax *</option>
              {taxes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select name="tax_type" defaultValue={c.tax_type === '1' ? '1' : '0'} className={fieldCls}>
              <option value="0">Exclusive</option><option value="1">Inclusive ?</option>
            </select>
            <Btn type="submit" className="w-full">Save</Btn>
          </form>
        </Modal>
      )}
      {kind === 'delete' && (
        <Modal title={`Delete ${c.name}?`} onClose={close}>
          <form action={deleteCategory}>
            <input type="hidden" name="category_id" value={c.id} />
            <p className="mb-3 text-sm text-slate-600">Remove this product category.</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddCategoryButton({ taxes }: { taxes: Tax[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>+ Add Category</Btn>
      {open && (
        <Modal title="Add Product Category" onClose={() => setOpen(false)}>
          <form action={addCategory} className="space-y-2.5">
            <input name="name" required placeholder="Name *" className={fieldCls} />
            <input name="description" placeholder="Description *" className={fieldCls} />
            <select name="tax_id" defaultValue="" className={fieldCls}>
              <option value="">Tax *</option>
              {taxes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select name="tax_type" defaultValue="0" className={fieldCls}>
              <option value="0">Exclusive</option><option value="1">Inclusive ?</option>
            </select>
            <Btn type="submit" className="w-full">Add Category</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

function ProductForm({ action, initial, categories, uoms, submitLabel }: {
  action: (f: FormData) => Promise<void>;
  initial?: Partial<Product>;
  categories: { id: number; name: string }[];
  uoms: Uom[];
  submitLabel: string;
}) {
  const v = (k: keyof Product) => (initial?.[k] as string) || '';
  return (
    <form action={action} className="space-y-2.5">
      {initial?.id ? <input type="hidden" name="product_id" value={initial.id} /> : null}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input name="name" required defaultValue={v('name')} placeholder="Product Name *" className={fieldCls} />
        <select name="category_id" defaultValue={v('category_id')} className={fieldCls}>
          <option value="">Product Category *</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input name="description" defaultValue={v('description')} placeholder="Description *" className={`${fieldCls} sm:col-span-2`} />
        <input name="hsn" defaultValue={v('hsn')} placeholder="HSN *" className={fieldCls} />
        <input name="markup" type="number" step="any" defaultValue={v('markup')} placeholder="Markup (%) *" className={fieldCls} />
        <input name="alert_qty" type="number" step="any" defaultValue={v('alert_qty')} placeholder="Alert Quantity *" className={fieldCls} />
        <select name="uom" defaultValue={v('uom') || 'PCS'} className={fieldCls}>
          {uoms.map((u) => <option key={u.code} value={u.code}>{u.name} ({u.code})</option>)}
        </select>
        <input name="cost" type="number" step="any" min="0" defaultValue={v('cost')} placeholder="Cost" className={fieldCls} />
        <input name="selling_price" type="number" step="any" min="0" defaultValue={v('selling_price')} placeholder="Selling Price" className={fieldCls} />
        <input name="mrp" type="number" step="any" min="0" defaultValue={v('mrp')} placeholder="MRP" className={fieldCls} />
        <select name="manage_inventory" defaultValue={v('manage_inventory') || 'Yes'} className={fieldCls}>
          <option>Yes</option><option>No</option>
        </select>
        <select name="status" defaultValue={v('status') || 'Active'} className={fieldCls}>
          <option>Active</option><option>Inactive</option>
        </select>
      </div>
      <Btn type="submit" className="w-full">{submitLabel}</Btn>
    </form>
  );
}

export function ProductButtons({ p, categories, uoms }: {
  p: Product; categories: { id: number; name: string }[]; uoms: Uom[];
}) {
  const { kind, setKind, close } = useModal();
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setKind('edit')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setKind('delete')} />
      </div>
      {kind === 'edit' && (
        <Modal title={`Edit ${p.name}`} onClose={close} wide>
          <ProductForm action={updateProduct} initial={p} categories={categories} uoms={uoms} submitLabel="Save Product" />
        </Modal>
      )}
      {kind === 'delete' && (
        <Modal title={`Delete ${p.name}?`} onClose={close}>
          <form action={deleteProduct}>
            <input type="hidden" name="product_id" value={p.id} />
            <p className="mb-3 text-sm text-slate-600">Remove this product. Stock and invoice lines keep its name as plain text.</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddProductButton({ categories, uoms }: { categories: { id: number; name: string }[]; uoms: Uom[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>+ Add Product</Btn>
      {open && (
        <Modal title="Add Product" onClose={() => setOpen(false)} wide>
          <ProductForm action={addProduct} categories={categories} uoms={uoms} submitLabel="Add Product" />
        </Modal>
      )}
    </>
  );
}

function StockForm({ action, initial, warehouses, products, submitLabel }: {
  action: (f: FormData) => Promise<void>;
  initial?: Partial<StockRec>;
  warehouses: string[];
  products: string[];
  submitLabel: string;
}) {
  const v = (k: keyof StockRec) => {
    const val = initial?.[k] as string;
    if (k === 'entry_date' && val) return String(val).slice(0, 10);
    return val || '';
  };
  return (
    <form action={action} className="space-y-2.5">
      {initial?.id ? <input type="hidden" name="stock_id" value={initial.id} /> : null}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <select name="warehouse" required defaultValue={v('warehouse')} className={fieldCls}>
          <option value="">Warehouse *</option>
          {warehouses.map((w) => <option key={w}>{w}</option>)}
        </select>
        <input name="product" required defaultValue={v('product')} placeholder="Product *" list="stock-products" className={fieldCls} />
        <input name="qty" type="number" step="any" min="0" required defaultValue={v('qty')} placeholder="Quantity *" className={fieldCls} />
        <input name="unit" defaultValue={v('unit')} placeholder="Unit" list="stock-units" className={fieldCls} />
        <input name="cost" type="number" step="any" min="0" defaultValue={v('cost')} placeholder="Cost (Rs)" className={fieldCls} />
        <input name="sell_price" type="number" step="any" min="0" defaultValue={v('sell_price')} placeholder="Selling Price (Rs)" className={fieldCls} />
        <select name="entry_type" defaultValue={v('entry_type') || 'IN'} className={fieldCls}>
          <option>IN</option><option>OUT</option>
        </select>
        <input name="entry_date" type="date" defaultValue={v('entry_date')} className={fieldCls} />
      </div>
      <datalist id="stock-products">{products.map((p) => <option key={p} value={p} />)}</datalist>
      <Btn type="submit" className="w-full">{submitLabel}</Btn>
    </form>
  );
}

export function StockButtons({ s, warehouses, products }: { s: StockRec; warehouses: string[]; products: string[] }) {
  const { kind, setKind, close } = useModal();
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <IconBtn icon="edit" label="Edit" tone="indigo" onClick={() => setKind('edit')} />
        <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setKind('delete')} />
      </div>
      {kind === 'edit' && (
        <Modal title="Edit Stock Entry" onClose={close} wide>
          <StockForm action={updateStock} initial={s} warehouses={warehouses} products={products} submitLabel="Save Entry" />
        </Modal>
      )}
      {kind === 'delete' && (
        <Modal title="Delete stock entry?" onClose={close}>
          <form action={deleteStock}>
            <input type="hidden" name="stock_id" value={s.id} />
            <p className="mb-3 text-sm text-slate-600">Remove {s.qty} × {s.product} ({s.warehouse}).</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}

export function AddStockButton({ warehouses, products }: { warehouses: string[]; products: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>+ Stock Entry</Btn>
      {open && (
        <Modal title="Stock Entry" onClose={() => setOpen(false)} wide>
          <StockForm action={addStock} warehouses={warehouses} products={products} submitLabel="Add Entry" />
        </Modal>
      )}
    </>
  );
}

export function DeleteScrapProduct({ id, name }: { id: number; name: string }) {
  const { kind, setKind, close } = useModal();
  return (
    <>
      <IconBtn icon="trash" label="Delete" tone="red" onClick={() => setKind('delete')} />
      {kind === 'delete' && (
        <Modal title={`Delete ${name}?`} onClose={close}>
          <form action={deleteScrapProduct}>
            <input type="hidden" name="scrap_product_id" value={id} />
            <p className="mb-3 text-sm text-slate-600">Remove this scrap product row.</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, delete</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}
