'use client';

import { useState } from 'react';
import { Modal, Btn } from '@/components/ui';
import { clearLogs } from '../actions';

export function ClearLogsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn tone="danger" onClick={() => setOpen(true)}>Clear Logs</Btn>
      {open && (
        <Modal title="Clear history logs?" onClose={() => setOpen(false)}>
          <form action={clearLogs}>
            <p className="mb-3 text-sm text-slate-600">Delete all activity history. This cannot be undone.</p>
            <Btn type="submit" tone="danger" className="w-full">Yes, clear all</Btn>
          </form>
        </Modal>
      )}
    </>
  );
}
