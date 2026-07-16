import React from 'react';
import { CheckCircle2, XCircle, Building2, MapPin, Mail, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SupplierApprovalDialog({ supplier, onApprove, onReject, onClose }) {
  if (!supplier) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">New Supplier Added</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Review and approve or reject this supplier</p>
              </div>
            </div>
          </div>

          {/* Supplier info */}
          <div className="px-6 py-4 space-y-3">
            <div className="bg-muted/40 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="w-4 h-4 text-primary" />
                {supplier.name}
              </div>
              {supplier.country && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />{supplier.country}
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />{supplier.email}
                </div>
              )}
              {supplier.product_categories && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Tag className="w-3.5 h-3.5" />{supplier.product_categories}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Approved suppliers are available in Quotations, Samples, and Documents.
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-5 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={onReject}
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Reject
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onApprove}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}