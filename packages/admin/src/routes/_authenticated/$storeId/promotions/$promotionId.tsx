import type { PromotionAction, PromotionRule, ResourceTypeDefinition } from '@spree/admin-sdk'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DownloadIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Can } from '@/components/spree/can'
import { useConfirm } from '@/components/spree/confirm-dialog'
import { PageHeader } from '@/components/spree/page-header'
import { PreferencesForm } from '@/components/spree/preferences-form'
import { ResourceLayout } from '@/components/spree/resource-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useExport } from '@/hooks/use-export'
import {
  useCreatePromotionAction,
  useCreatePromotionRule,
  useDeletePromotion,
  useDeletePromotionAction,
  useDeletePromotionRule,
  usePromotion,
  usePromotionActions,
  usePromotionActionTypes,
  usePromotionCouponCodes,
  usePromotionRules,
  usePromotionRuleTypes,
  useUpdatePromotion,
  useUpdatePromotionAction,
  useUpdatePromotionRule,
} from '@/hooks/use-promotions'
import { Subject } from '@/lib/permissions'

export const Route = createFileRoute('/_authenticated/$storeId/promotions/$promotionId')({
  component: EditPromotionPage,
})

interface BasicsFormValues {
  name: string
  description: string
  starts_at: string
  expires_at: string
  usage_limit: number | undefined
  match_policy: 'all' | 'any'
  advertise: boolean
}

const MATCH_POLICY_OPTIONS = [
  { value: 'all', label: 'All rules must match' },
  { value: 'any', label: 'Any rule may match' },
] as const

function EditPromotionPage() {
  const { storeId, promotionId } = Route.useParams()
  const navigate = useNavigate()
  const { data: promotion, isLoading } = usePromotion(promotionId)
  const updateMutation = useUpdatePromotion(promotionId)
  const deleteMutation = useDeletePromotion()
  const confirm = useConfirm()

  const form = useForm<BasicsFormValues>({
    defaultValues: {
      name: '',
      description: '',
      starts_at: '',
      expires_at: '',
      usage_limit: undefined,
      match_policy: 'all',
      advertise: false,
    },
  })

  useEffect(() => {
    if (promotion) {
      form.reset({
        name: promotion.name,
        description: promotion.description ?? '',
        starts_at: promotion.starts_at ? promotion.starts_at.slice(0, 16) : '',
        expires_at: promotion.expires_at ? promotion.expires_at.slice(0, 16) : '',
        usage_limit: promotion.usage_limit ?? undefined,
        match_policy: promotion.match_policy,
        advertise: promotion.advertise,
      })
    }
  }, [promotion, form])

  async function onSubmit(values: BasicsFormValues) {
    await updateMutation.mutateAsync({
      name: values.name,
      description: values.description?.length ? values.description : null,
      starts_at: values.starts_at || null,
      expires_at: values.expires_at || null,
      usage_limit: values.usage_limit ?? null,
      match_policy: values.match_policy,
      advertise: values.advertise,
    })
  }

  async function onDelete() {
    const ok = await confirm({
      title: 'Delete promotion?',
      message: `${promotion?.name ?? 'This promotion'} will be removed permanently. Promotions referenced by completed orders cannot be deleted.`,
      variant: 'destructive',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await deleteMutation.mutateAsync(promotionId)
    navigate({ to: '/$storeId/promotions', params: { storeId } })
  }

  if (isLoading || !promotion) {
    return (
      <ResourceLayout
        header={<PageHeader title="Loading…" backTo="promotions" />}
        main={<div className="text-sm text-muted-foreground">Loading promotion…</div>}
      />
    )
  }

  return (
    <ResourceLayout
      header={
        <PageHeader
          title={promotion.name}
          backTo="promotions"
          actions={
            <div className="flex gap-2">
              <Can I="destroy" a={Subject.Promotion}>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  disabled={deleteMutation.isPending}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Delete
                </Button>
              </Can>
              <Button
                type="button"
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
                disabled={!form.formState.isDirty || form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          }
        />
      }
      main={
        <>
          <PromotionBasicsCard form={form} promotion={promotion} />
          <PromotionRulesCard promotionId={promotionId} matchPolicy={promotion.match_policy} />
          <PromotionActionsCard promotionId={promotionId} />
          {promotion.multi_codes && <PromotionCouponCodesCard promotionId={promotionId} />}
        </>
      }
    />
  )
}

// ============================================================================
// Basics
// ============================================================================

interface PromotionBasicsCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promotion: any
}

function PromotionBasicsCard({ form, promotion }: PromotionBasicsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basics</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" {...form.register('name')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea id="description" rows={2} {...form.register('description')} />
          </Field>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium">Trigger: </span>
            {promotion.kind === 'automatic' ? (
              <Badge variant="outline">Automatic</Badge>
            ) : promotion.multi_codes ? (
              <span>
                Multi-code coupon ({promotion.number_of_codes ?? 0} codes
                {promotion.code_prefix ? ` with prefix "${promotion.code_prefix}"` : ''})
              </span>
            ) : (
              <span>
                Single coupon code:{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  {promotion.code ?? '—'}
                </code>
              </span>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Trigger settings can't be changed after creation. Make a new promotion to change them.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="starts_at">Starts</FieldLabel>
              <Input id="starts_at" type="datetime-local" {...form.register('starts_at')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="expires_at">Expires</FieldLabel>
              <Input id="expires_at" type="datetime-local" {...form.register('expires_at')} />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="usage_limit">Usage limit</FieldLabel>
            <Input
              id="usage_limit"
              type="number"
              min={1}
              placeholder="Unlimited"
              {...form.register('usage_limit')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="match_policy">When promotion has multiple rules</FieldLabel>
            <Controller
              name="match_policy"
              control={form.control}
              render={({ field }) => (
                <Select
                  items={MATCH_POLICY_OPTIONS}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="match_policy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_POLICY_OPTIONS.map((o) => (
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
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col">
                <FieldLabel htmlFor="advertise" className="cursor-pointer">
                  Advertise on storefront
                </FieldLabel>
              </div>
              <Controller
                name="advertise"
                control={form.control}
                render={({ field }) => (
                  <Switch id="advertise" checked={!!field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Rules
// ============================================================================

function PromotionRulesCard({
  promotionId,
  matchPolicy,
}: {
  promotionId: string
  matchPolicy: 'all' | 'any'
}) {
  const { data: rulesData } = usePromotionRules(promotionId)
  const { data: typesData } = usePromotionRuleTypes()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const rules = rulesData?.data ?? []
  const types = typesData?.data ?? []
  const editing = rules.find((r) => r.id === editingId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rules</CardTitle>
        <p className="text-sm text-muted-foreground">
          Conditions that decide whether the promotion applies.{' '}
          {matchPolicy === 'all' ? 'All rules must match.' : 'Any rule may match.'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rules. Without rules, the promotion always qualifies (subject to schedule and usage
              limit).
            </p>
          ) : (
            rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                promotionId={promotionId}
                onEdit={() => setEditingId(rule.id)}
              />
            ))
          )}
          <Can I="create" a={Subject.PromotionRule}>
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              <PlusIcon className="size-4" />
              Add rule
            </Button>
          </Can>
        </div>

        {pickerOpen && (
          <RulePickerSheet
            promotionId={promotionId}
            types={types}
            open
            onOpenChange={(o) => !o && setPickerOpen(false)}
            onCreated={(id) => {
              setPickerOpen(false)
              setEditingId(id)
            }}
          />
        )}

        {editing && (
          <RuleEditSheet
            promotionId={promotionId}
            rule={editing}
            open
            onOpenChange={(o) => !o && setEditingId(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}

function RuleRow({
  rule,
  promotionId,
  onEdit,
}: {
  rule: PromotionRule
  promotionId: string
  onEdit: () => void
}) {
  const deleteMutation = useDeletePromotionRule(promotionId)
  const confirm = useConfirm()

  async function onDelete(e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await confirm({
      title: 'Remove rule?',
      message: 'This rule will be removed from the promotion.',
      variant: 'destructive',
      confirmLabel: 'Remove',
    })
    if (!ok) return
    deleteMutation.mutate(rule.id)
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center justify-between rounded-md border bg-card px-3 py-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium">{rule.label}</div>
        {Object.keys(rule.preferences ?? {}).length > 0 && (
          <div className="truncate text-xs text-muted-foreground">
            {Object.entries(rule.preferences as Record<string, unknown>)
              .map(([k, v]) => `${k}: ${formatPrefValue(v)}`)
              .join(' · ')}
          </div>
        )}
      </div>
      <Can I="destroy" a={Subject.PromotionRule}>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={onDelete}
          disabled={deleteMutation.isPending}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <TrashIcon className="size-4" />
        </Button>
      </Can>
    </button>
  )
}

function RulePickerSheet({
  promotionId,
  types,
  open,
  onOpenChange,
  onCreated,
}: {
  promotionId: string
  types: ResourceTypeDefinition[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}) {
  const [selected, setSelected] = useState<string>('')
  const createMutation = useCreatePromotionRule(promotionId)

  async function handleCreate() {
    if (!selected) return
    const rule = await createMutation.mutateAsync({ type: selected })
    onCreated(rule.id)
    setSelected('')
  }

  const selectedType = types.find((t) => t.type === selected)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add rule</SheetTitle>
          <SheetDescription>
            Pick a rule type. Configure its values after it's added.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
          {types.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setSelected(t.type)}
              className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                selected === t.type ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <span className="text-sm font-medium">{t.label}</span>
              {t.description && (
                <span className="text-xs text-muted-foreground">{t.description}</span>
              )}
            </button>
          ))}
        </div>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            disabled={!selected || createMutation.isPending}
          >
            {createMutation.isPending
              ? 'Adding…'
              : selectedType
                ? `Add ${selectedType.label}`
                : 'Add rule'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function RuleEditSheet({
  promotionId,
  rule,
  open,
  onOpenChange,
}: {
  promotionId: string
  rule: PromotionRule
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateMutation = useUpdatePromotionRule(promotionId, rule.id)
  const [values, setValues] = useState<Record<string, unknown>>(rule.preferences ?? {})

  useEffect(() => {
    setValues(rule.preferences ?? {})
  }, [rule])

  async function handleSave() {
    await updateMutation.mutateAsync({ preferences: values })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{rule.label}</SheetTitle>
          <SheetDescription>Tune the rule's parameters.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {rule.preference_schema?.length ? (
            <PreferencesForm schema={rule.preference_schema} values={values} onChange={setValues} />
          ) : (
            <p className="text-sm text-muted-foreground">
              This rule has no configurable options — its presence alone applies the constraint.
            </p>
          )}
        </div>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          {rule.preference_schema?.length ? (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// Actions
// ============================================================================

function PromotionActionsCard({ promotionId }: { promotionId: string }) {
  const { data: actionsData } = usePromotionActions(promotionId)
  const { data: typesData } = usePromotionActionTypes()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const actions = actionsData?.data ?? []
  const types = typesData?.data ?? []
  const editing = actions.find((a) => a.id === editingId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <p className="text-sm text-muted-foreground">What happens when the promotion qualifies.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No actions yet. A promotion without actions doesn't do anything when applied.
            </p>
          ) : (
            actions.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                promotionId={promotionId}
                onEdit={() => setEditingId(action.id)}
              />
            ))
          )}
          <Can I="create" a={Subject.PromotionAction}>
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              <PlusIcon className="size-4" />
              Add action
            </Button>
          </Can>
        </div>

        {pickerOpen && (
          <ActionPickerSheet
            promotionId={promotionId}
            types={types}
            open
            onOpenChange={(o) => !o && setPickerOpen(false)}
            onCreated={(id) => {
              setPickerOpen(false)
              setEditingId(id)
            }}
          />
        )}

        {editing && (
          <ActionEditSheet
            promotionId={promotionId}
            action={editing}
            open
            onOpenChange={(o) => !o && setEditingId(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}

function ActionRow({
  action,
  promotionId,
  onEdit,
}: {
  action: PromotionAction
  promotionId: string
  onEdit: () => void
}) {
  const deleteMutation = useDeletePromotionAction(promotionId)
  const confirm = useConfirm()

  async function onDelete(e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await confirm({
      title: 'Remove action?',
      message: 'This action will be removed from the promotion.',
      variant: 'destructive',
      confirmLabel: 'Remove',
    })
    if (!ok) return
    deleteMutation.mutate(action.id)
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center justify-between rounded-md border bg-card px-3 py-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium">{action.label}</div>
        {Object.keys(action.preferences ?? {}).length > 0 && (
          <div className="truncate text-xs text-muted-foreground">
            {Object.entries(action.preferences as Record<string, unknown>)
              .map(([k, v]) => `${k}: ${formatPrefValue(v)}`)
              .join(' · ')}
          </div>
        )}
      </div>
      <Can I="destroy" a={Subject.PromotionAction}>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={onDelete}
          disabled={deleteMutation.isPending}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <TrashIcon className="size-4" />
        </Button>
      </Can>
    </button>
  )
}

function ActionPickerSheet({
  promotionId,
  types,
  open,
  onOpenChange,
  onCreated,
}: {
  promotionId: string
  types: ResourceTypeDefinition[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}) {
  const [selected, setSelected] = useState<string>('')
  const createMutation = useCreatePromotionAction(promotionId)

  async function handleCreate() {
    if (!selected) return
    const action = await createMutation.mutateAsync({ type: selected })
    onCreated(action.id)
    setSelected('')
  }

  const selectedType = types.find((t) => t.type === selected)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add action</SheetTitle>
          <SheetDescription>Pick what should happen when the promotion qualifies.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
          {types.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setSelected(t.type)}
              className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                selected === t.type ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <span className="text-sm font-medium">{t.label}</span>
              {t.description && (
                <span className="text-xs text-muted-foreground">{t.description}</span>
              )}
            </button>
          ))}
        </div>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            disabled={!selected || createMutation.isPending}
          >
            {createMutation.isPending
              ? 'Adding…'
              : selectedType
                ? `Add ${selectedType.label}`
                : 'Add action'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function ActionEditSheet({
  promotionId,
  action,
  open,
  onOpenChange,
}: {
  promotionId: string
  action: PromotionAction
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateMutation = useUpdatePromotionAction(promotionId, action.id)
  const [values, setValues] = useState<Record<string, unknown>>(action.preferences ?? {})

  useEffect(() => {
    setValues(action.preferences ?? {})
  }, [action])

  async function handleSave() {
    await updateMutation.mutateAsync({ preferences: values })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{action.label}</SheetTitle>
          <SheetDescription>Configure the action's parameters.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {action.preference_schema?.length ? (
            <PreferencesForm
              schema={action.preference_schema}
              values={values}
              onChange={setValues}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              This action has no configurable options.
            </p>
          )}
        </div>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          {action.preference_schema?.length ? (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// Coupon codes (multi-codes only)
// ============================================================================

function PromotionCouponCodesCard({ promotionId }: { promotionId: string }) {
  const [page, setPage] = useState(1)
  const { data: codesData, isFetching } = usePromotionCouponCodes(promotionId, {
    limit: 50,
    page,
  })
  const codes = codesData?.data ?? []
  const totalCount = codesData?.meta?.count ?? codes.length
  const totalPages = codesData?.meta?.pages ?? 1

  const exportMutation = useExport()
  function handleExport() {
    exportMutation.mutate({
      type: 'Spree::Exports::CouponCodes',
      record_selection: 'filtered',
      search_params: { promotion_id_eq: promotionId },
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Coupon codes</CardTitle>
            <p className="text-sm text-muted-foreground">
              {totalCount > 0
                ? `${totalCount} auto-generated codes. Read-only; regenerate by changing the promotion's number-of-codes setting.`
                : "Auto-generated codes for this promotion. Codes are read-only; regenerate by changing the promotion's number-of-codes setting."}
            </p>
          </div>
          {totalCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={exportMutation.isPending}
            >
              <DownloadIcon className="size-4" />
              {exportMutation.isPending ? 'Exporting…' : 'Export CSV'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No codes generated yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {codes.map((c) => (
                <code
                  key={c.id}
                  className={`rounded border px-2 py-1 font-mono text-xs ${
                    c.state && c.state !== 'unused' ? 'text-muted-foreground line-through' : ''
                  }`}
                  title={c.state ?? undefined}
                >
                  {c.code}
                </code>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isFetching}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function formatPrefValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.length}]`
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}
