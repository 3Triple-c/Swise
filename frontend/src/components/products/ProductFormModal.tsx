import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Modal from "../shared/Modal";
import {
  useCreateProduct,
  useUpdateProduct,
  useCategories,
} from "../../hooks/useProducts";
import { extractError } from "../../lib/api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  reorderPoint: z.coerce.number().min(0).default(10),
  initialStock: z.coerce.number().min(0).default(0),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;


interface Props {
  isOpen: boolean;
  onClose: () => void;
  product?: any; // existing product for edit mode
}

export default function ProductFormModal({ isOpen, onClose, product }: Props) {
  const isEdit = !!product;
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema)});

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        barcode: product.barcode ?? "",
        categoryId: product.categoryId ?? "",
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        reorderPoint: product.reorderPoint,
        description: product.description ?? "",
      });
    } else {
      reset({
        costPrice: 0,
        sellingPrice: 0,
        reorderPoint: 10,
        initialStock: 0,
      });
    }
  }, [product, reset]);

  const onSubmit = (data: FormValues) => {
    const payload = { ...data, categoryId: data.categoryId || undefined };

    if (isEdit) {
      updateProduct.mutate(payload, {
        onSuccess: () => {
          reset();
          onClose();
        },
      });
    } else {
      createProduct.mutate(payload, {
        onSuccess: () => {
          reset();
          onClose();
        },
      });
    }
  };

  const mutation = isEdit ? updateProduct : createProduct;

  const Field = ({
    label,
    error,
    children,
  }: {
    label: string;
    error?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Product" : "Add Product"}
      size="lg"
    >
      {mutation.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {extractError(mutation.error)}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Product name *" error={errors.name?.message}>
          <input
            {...register("name")}
            placeholder="e.g. Blue Running Shoes"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU" error={errors.sku?.message}>
            <input
              {...register("sku")}
              placeholder="Auto-generated if blank"
              className={inputCls}
            />
          </Field>
          <Field label="Barcode" error={errors.barcode?.message}>
            <input
              {...register("barcode")}
              placeholder="EAN / UPC"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Category">
          <select {...register("categoryId")} className={inputCls}>
            <option value="">No category</option>
            {categories?.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Cost price (₦)" error={errors.costPrice?.message}>
            <input
              type="number"
              step="0.01"
              {...register("costPrice")}
              placeholder="0.00"
              className={inputCls}
            />
          </Field>
          <Field label="Selling price (₦)" error={errors.sellingPrice?.message}>
            <input
              type="number"
              step="0.01"
              {...register("sellingPrice")}
              placeholder="0.00"
              className={inputCls}
            />
          </Field>
          <Field label="Reorder point" error={errors.reorderPoint?.message}>
            <input
              type="number"
              {...register("reorderPoint")}
              placeholder="10"
              className={inputCls}
            />
          </Field>
        </div>

        {!isEdit && (
          <Field
            label="Initial stock quantity"
            error={errors.initialStock?.message}
          >
            <input
              type="number"
              {...register("initialStock")}
              placeholder="0"
              className={inputCls}
            />
          </Field>
        )}

        <Field label="Description">
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Optional product description"
            className={inputCls}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Add product"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
