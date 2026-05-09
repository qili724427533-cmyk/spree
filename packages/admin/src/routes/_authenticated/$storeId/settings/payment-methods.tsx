import { zodResolver } from '@hookform/resolvers/zod'
import type {
  PaymentMethod,
  PaymentMethodCreateParams,
  PaymentMethodDisplayOn,
  PaymentMethodUpdateParams,
} from '@spree/admin-sdk'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { adminClient } from '@/client'
import { Can } from '@/components/spree/can'
import { useConfirm } from '@/components/spree/confirm-dialog'
import { PreferencesForm } from '@/components/spree/preferences-form'
import { ResourceTable, resourceSearchSchema } from '@/components/spree/resource-table'
import { useRowClickBridge } from '@/components/spree/row-click-bridge'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  usePaymentMethod,
  usePaymentMethodTypes,
  useUpdatePaymentMethod,
} from '@/hooks/use-payment-methods'
import { Subject } from '@/lib/permissions'
import '@/tables/payment-methods'

const paymentMethodsSearchSchema = resourceSearchSchema.extend({
  edit: z.string().optional(),
  new: z.coerce.boolean().optional(),
})

export const Route = createFileRoute('/_authenticated/$storeId/settings/payment-methods')({
  validateSearch: paymentMethodsSearchSchema,
  component: PaymentMethodsPage,
})

const DISPLAY_ON_OPTIONS: { value: PaymentMethodDisplayOn; label: string }[] = [
  { value: 'both', label: 'Storefront + Admin' },
  { value: 'front_end', label: 'Storefront only' },
  { value: 'back_end', label: 'Admin only' },
]

function PaymentMethodsPage() {
  const search = Route.useSearch() as z.infer<typeof paymentMethodsSearchSchema>
  const navigate = useNavigate()

  const editId = search.edit
  const isCreating = !!search.new

  const closeSheet = () =>
    navigate({
      search: (prev: Record<string, unknown>) => {
        const { edit: _e, new: _n, ...rest } = prev
        return rest as never
      },
    })

  const openCreate = () =>
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, new: true }) as never })

  const openEdit = (id: string) =>
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, edit: id }) as never })

  useRowClickBridge('data-payment-method-id', openEdit)

  return (
    <>
      <ResourceTable<PaymentMethod>
        tableKey="payment-methods"
        queryKey="payment-methods"
        queryFn={(params) => adminClient.paymentMethods.list(params)}
        searchParams={search}
        actions={
          <Can I="create" a={Subject.PaymentMethod}>
            <Button size="sm" className="h-[2.125rem]" onClick={openCreate}>
              <PlusIcon className="size-4" />
              Add payment method
            </Button>
          </Can>
        }
      />

      {isCreating && <CreatePaymentMethodSheet open onOpenChange={(o) => !o && closeSheet()} />}
      {editId && (
        <EditPaymentMethodSheet id={editId} open onOpenChange={(o) => !o && closeSheet()} />
      )}
    </>
  )
}

const baseFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  display_on: z.enum(['both', 'front_end', 'back_end']),
  active: z.boolean(),
  auto_capture: z.boolean(),
  position: z.coerce.number().int().nonnegative().optional(),
})

const createFormSchema = baseFormSchema.extend({
  type: z.string().min(1, 'Pick a provider'),
})

type BaseFormValues = z.infer<typeof baseFormSchema>
type CreateFormValues = z.infer<typeof createFormSchema>

const BASE_DEFAULTS: BaseFormValues = {
  name: '',
  description: '',
  display_on: 'both',
  active: true,
  auto_capture: false,
  position: undefined,
}

const CREATE_DEFAULTS: CreateFormValues = { ...BASE_DEFAULTS, type: '' }

function valuesToCreateParams(v: CreateFormValues): PaymentMethodCreateParams {
  return {
    type: v.type,
    name: v.name,
    description: v.description?.length ? v.description : null,
    active: v.active,
    auto_capture: v.auto_capture,
    display_on: v.display_on,
    position: v.position,
  }
}

function valuesToUpdateParams(v: BaseFormValues): PaymentMethodUpdateParams {
  return {
    name: v.name,
    description: v.description?.length ? v.description : null,
    active: v.active,
    auto_capture: v.auto_capture,
    display_on: v.display_on,
    position: v.position,
  }
}

function CreatePaymentMethodSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreatePaymentMethod()
  const { data: typesResponse, isLoading: loadingTypes } = usePaymentMethodTypes()
  const providerTypes = typesResponse?.data ?? []

  const form = useForm<CreateFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createFormSchema) as any,
    defaultValues: CREATE_DEFAULTS,
  })

  async function onSubmit(values: CreateFormValues) {
    await createMutation.mutateAsync(valuesToCreateParams(values))
    form.reset(CREATE_DEFAULTS)
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset(CREATE_DEFAULTS)
        onOpenChange(next)
      }}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add payment method</SheetTitle>
          <SheetDescription>
            Pick a provider to register a new payment method. Provider-specific configuration is
            edited after the method is created.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <Field>
              <FieldLabel htmlFor="type">Provider</FieldLabel>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type" aria-invalid={!!form.formState.errors.type}>
                      <SelectValue placeholder={loadingTypes ? 'Loading…' : 'Select a provider'}>
                        {(value) =>
                          providerTypes.find((t) => t.type === value)?.label ?? (value as string)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {providerTypes.map((t) => (
                        <SelectItem key={t.type} value={t.type}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.type && (
                <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
              )}
            </Field>

            <PaymentMethodFormFields form={form} />
          </div>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creating…' : 'Create payment method'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function EditPaymentMethodSheet({
  id,
  open,
  onOpenChange,
}: {
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: paymentMethod, isLoading } = usePaymentMethod(id)
  const updateMutation = useUpdatePaymentMethod(id)
  const deleteMutation = useDeletePaymentMethod()
  const confirm = useConfirm()

  const form = useForm<BaseFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(baseFormSchema) as any,
    defaultValues: BASE_DEFAULTS,
  })
  const [preferences, setPreferences] = useState<Record<string, unknown>>({})
  // Snapshot of the preferences last loaded from the server. Derive the
  // dirty state by comparing JSON shape — avoids a separate flag that
  // can drift out of sync with the actual values.
  const originalPreferencesRef = useRef<string>('{}')
  // Track the loaded record so we don't clobber in-flight edits when the
  // cache invalidates after a save.
  const loadedIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!paymentMethod || paymentMethod.id === loadedIdRef.current) return
    form.reset({
      name: paymentMethod.name,
      description: paymentMethod.description ?? '',
      display_on: (paymentMethod.display_on as PaymentMethodDisplayOn) ?? 'both',
      active: paymentMethod.active,
      auto_capture: paymentMethod.auto_capture ?? false,
      position: paymentMethod.position ?? undefined,
    })
    const initialPreferences = (paymentMethod.preferences as Record<string, unknown>) ?? {}
    setPreferences(initialPreferences)
    originalPreferencesRef.current = JSON.stringify(initialPreferences)
    loadedIdRef.current = paymentMethod.id
  }, [paymentMethod, form])

  const preferencesDirty = useMemo(
    () => JSON.stringify(preferences) !== originalPreferencesRef.current,
    [preferences],
  )

  async function onSubmit(values: BaseFormValues) {
    const params = valuesToUpdateParams(values)
    if (preferencesDirty) params.preferences = preferences
    await updateMutation.mutateAsync(params)
    form.reset(values)
    originalPreferencesRef.current = JSON.stringify(preferences)
    onOpenChange(false)
  }

  async function onDelete() {
    const ok = await confirm({
      title: 'Delete payment method?',
      message: `${paymentMethod?.name ?? 'This payment method'} will be removed. Existing payments referencing it remain intact.`,
      variant: 'destructive',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await deleteMutation.mutateAsync(id)
    onOpenChange(false)
  }

  const providerLabel =
    paymentMethod?.type?.replace(/^Spree::PaymentMethod::/, '') ?? paymentMethod?.type

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{paymentMethod?.name ?? 'Edit payment method'}</SheetTitle>
          <SheetDescription>
            {providerLabel ? `Provider: ${providerLabel}` : 'Update name, visibility, or status.'}
          </SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <PaymentMethodFormFields form={form} />

              {paymentMethod?.preference_schema?.length ? (
                <div className="rounded-md border bg-muted/30 p-3">
                  <h3 className="mb-2 text-sm font-medium">Provider configuration</h3>
                  <PreferencesForm
                    schema={paymentMethod.preference_schema}
                    values={preferences}
                    onChange={setPreferences}
                    redactPasswords
                  />
                </div>
              ) : null}
            </div>
            <SheetFooter>
              <Can I="destroy" a={Subject.PaymentMethod}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  disabled={form.formState.isSubmitting || deleteMutation.isPending}
                  className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Delete
                </Button>
              </Can>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  form.formState.isSubmitting || (!form.formState.isDirty && !preferencesDirty)
                }
              >
                {form.formState.isSubmitting ? 'Saving…' : 'Save'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}

function PaymentMethodFormFields({
  form,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          placeholder="e.g. Credit card (Stripe)"
          {...form.register('name')}
          aria-invalid={!!form.formState.errors.name}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          rows={2}
          placeholder="Customer-facing description shown at checkout"
          {...form.register('description')}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="display_on">Visible on</FieldLabel>
        <Controller
          name="display_on"
          control={form.control}
          render={({ field }) => (
            <Select items={DISPLAY_ON_OPTIONS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="display_on">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_ON_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="position">Position</FieldLabel>
        <Input id="position" type="number" min={0} placeholder="0" {...form.register('position')} />
        <span className="text-xs text-muted-foreground">
          Lower numbers appear first in the checkout list.
        </span>
      </Field>

      <Field>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <FieldLabel htmlFor="active" className="cursor-pointer">
              Active
            </FieldLabel>
            <span className="text-xs text-muted-foreground">
              Inactive methods are hidden from checkout.
            </span>
          </div>
          <Controller
            name="active"
            control={form.control}
            render={({ field }) => (
              <Switch id="active" checked={!!field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </Field>

      <Field>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <FieldLabel htmlFor="auto_capture" className="cursor-pointer">
              Auto-capture
            </FieldLabel>
            <span className="text-xs text-muted-foreground">
              Capture funds automatically on authorization. When off, you must capture manually.
            </span>
          </div>
          <Controller
            name="auto_capture"
            control={form.control}
            render={({ field }) => (
              <Switch id="auto_capture" checked={!!field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </Field>
    </FieldGroup>
  )
}
