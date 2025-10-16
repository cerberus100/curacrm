"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmSendDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  account: any;
  contacts: any[];
}

export function ConfirmSendDialog({ 
  open, 
  onConfirm, 
  onCancel, 
  account, 
  contacts 
}: ConfirmSendDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Submission to Practice</DialogTitle>
          <DialogDescription>
            Please review the details before sending this practice.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-3">
          <div className="border border-border rounded-lg p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-[color:var(--muted)] text-xs">Practice Name</p>
                <p className="font-semibold">{account.practiceName}</p>
              </div>
              <div>
                <p className="text-[color:var(--muted)] text-xs">Specialty</p>
                <p className="font-medium">{account.specialty}</p>
              </div>
              <div>
                <p className="text-[color:var(--muted)] text-xs">State</p>
                <p className="font-medium">{account.state}</p>
              </div>
              <div>
                <p className="text-[color:var(--muted)] text-xs">Contacts</p>
                <p className="font-medium">{contacts.length} contact(s)</p>
              </div>
              {account.npiOrg && (
                <div>
                  <p className="text-[color:var(--muted)] text-xs">NPI</p>
                  <p className="font-medium">{account.npiOrg}</p>
                </div>
              )}
              {account.phoneDisplay && (
                <div>
                  <p className="text-[color:var(--muted)] text-xs">Phone</p>
                  <p className="font-medium">{account.phoneDisplay}</p>
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-[color:var(--muted)]">
            <p>• This will create or update the practice in the system</p>
            <p>• The submission will be tracked with an idempotency key</p>
            <p>• You can view the result in the Submissions page</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Confirm & Send to Practice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
