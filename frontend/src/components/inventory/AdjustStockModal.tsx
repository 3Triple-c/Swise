import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../shared/Modal';
import { useAdjustStock } from '../../hooks/useInventory';
import { useLocations } from '../../hooks/useInventory';
import { extractError } from '../../lib/api';

const MOVEMENT_TYPES = [
  { value: 'ADJUSTMENT', label: 'Manual Adjustment' },
  { value: 'DAMAGE',     label: 'Damage / Write-off' },
  { value: 'RETURN',     label: 'Customer Return' },
];

const schema = z.object({
  locationId: z.string().min(1, 'Select a location'),
  quantityDelta: z.number().refine((v) => v !== 0, 'Quantity cannot be zero'),
  type: z.enum(['ADJUSTMENT', 'DAMAGE', 'RETURN']),
  notes: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: { id: string; name: string; sku: string } | null;
}

export default function AdjustStockModal({ isOpen, onClose, product }: Props) {
  const { data: locations } = useLocations();
  const adjust = useAdjustStock();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'ADJUSTMENT' },
  });

  const delta = watch('quantityDelta');

  const onSubmit = (data: FormValues) => {
    if (!product) return;
    adjust.mutate(
      { ...data, productId: product.id },
      { onSuccess: () => { reset(); onClose(); } },
    );
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Adjust Stock — ${product?.name ?? ''}`}>
      {adjust.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {extractError(adjust.error)}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
          <select {...register('locationId')} className={inputCls}>
            <option value="">Select location</option>
            {locations?.map((l: any) => (
              <option key={l.id} value={l.id}>{l.name}{l.isDefault ? ' (default)' : ''}</option>
            ))}
          </select>
          {errors.locationId && <p className="mt-1 text-xs text-red-600">{errors.locationId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity change *</label>
          <input
            type="number"
            {...register('quantityDelta')}
            placeholder="e.g. +50 to add, -10 to remove"
            className={inputCls}
          />
          {delta && Number(delta) !== 0 && (
            <p className={`mt-1 text-xs font-medium ${Number(delta) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Number(delta) > 0 ? `Adding ${delta} units` : `Removing ${Math.abs(Number(delta))} units`}
            </p>
          )}
          {errors.quantityDelta && <p className="mt-1 text-xs text-red-600">{errors.quantityDelta.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
          <select {...register('type')} className={inputCls}>
            {MOVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea {...register('notes')} rows={2} placeholder="Optional — reason or reference" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch number</label>
            <input {...register('batchNumber')} placeholder="Optional" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry date</label>
            <input type="date" {...register('expiryDate')} className={inputCls} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={adjust.isPending}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {adjust.isPending ? 'Saving…' : 'Save adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
