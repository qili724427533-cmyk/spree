import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { PageHeader } from '@/components/spree/page-header'
import { ResourceLayout } from '@/components/spree/resource-layout'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCreatePromotion } from '@/hooks/use-promotions'

export const Route = createFileRoute('/_authenticated/$storeId/promotions/new')({
  component: NewPromotionPage,
})

const formSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    kind: z.enum(['coupon_code', 'automatic']),
    code: z.string().optional(),
    multi_codes: z.boolean(),
    number_of_codes: z.coerce.number().int().positive().optional(),
    code_prefix: z.string().optional(),
    starts_at: z.string().optional(),
    expires_at: z.string().optional(),
    usage_limit: z.coerce.number().int().positive().optional(),
    match_policy: z.enum(['all', 'any']),
    advertise: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'coupon_code' && !v.multi_codes && !v.code?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['code'],
        message: 'Coupon promotions need a code (or enable multi-codes).',
      })
    }
    if (v.kind === 'coupon_code' && v.multi_codes && !v.number_of_codes) {
      ctx.addIssue({
        code: 'custom',
        path: ['number_of_codes'],
        message: 'How many codes should be generated?',
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

const KIND_OPTIONS = [
  { value: 'coupon_code', label: 'Coupon code' },
  { value: 'automatic', label: 'Automatic (no code)' },
] as const

const MATCH_POLICY_OPTIONS = [
  { value: 'all', label: 'All rules must match' },
  { value: 'any', label: 'Any rule may match' },
] as const

// Server expects a coherent set: automatic clears all coupon fields,
// single-code sets `code`, multi-code sets `number_of_codes` + optional
// prefix. Centralized so the create body stays flat.
function couponFieldsForKind(values: FormValues) {
  if (values.kind !== 'coupon_code') {
    return {
      kind: 'automatic' as const,
      code: null,
      multi_codes: false,
      number_of_codes: null,
      code_prefix: null,
    }
  }
  if (values.multi_codes) {
    return {
      kind: 'coupon_code' as const,
      code: null,
      multi_codes: true,
      number_of_codes: values.number_of_codes ?? null,
      code_prefix: values.code_prefix || null,
    }
  }
  return {
    kind: 'coupon_code' as const,
    code: values.code || null,
    multi_codes: false,
    number_of_codes: null,
    code_prefix: null,
  }
}

const DEFAULTS: FormValues = {
  name: '',
  description: '',
  kind: 'coupon_code',
  code: '',
  multi_codes: false,
  number_of_codes: undefined,
  code_prefix: '',
  starts_at: '',
  expires_at: '',
  usage_limit: undefined,
  match_policy: 'all',
  advertise: false,
}

function NewPromotionPage() {
  const navigate = useNavigate()
  const { storeId } = Route.useParams()
  const createMutation = useCreatePromotion()

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: DEFAULTS,
  })

  const kind = form.watch('kind')
  const multiCodes = form.watch('multi_codes')

  async function onSubmit(values: FormValues) {
    const promotion = await createMutation.mutateAsync({
      name: values.name,
      description: values.description?.length ? values.description : null,
      starts_at: values.starts_at || null,
      expires_at: values.expires_at || null,
      usage_limit: values.usage_limit ?? null,
      match_policy: values.match_policy,
      advertise: values.advertise,
      ...couponFieldsForKind(values),
    })
    navigate({
      to: '/$storeId/promotions/$promotionId',
      params: { storeId, promotionId: promotion.id },
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <ResourceLayout
        header={
          <PageHeader
            title="New promotion"
            backTo="promotions"
            actions={
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating…' : 'Create promotion'}
              </Button>
            }
          />
        }
        main={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Basics</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                      id="name"
                      placeholder="Summer Sale"
                      {...form.register('name')}
                      aria-invalid={!!form.formState.errors.name}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea
                      id="description"
                      rows={2}
                      placeholder="Internal description (optional)"
                      {...form.register('description')}
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trigger</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="kind">How is this promotion applied?</FieldLabel>
                    <Controller
                      name="kind"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          items={KIND_OPTIONS}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="kind">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {KIND_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>

                  {kind === 'coupon_code' && (
                    <>
                      <Field>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col">
                            <FieldLabel htmlFor="multi_codes" className="cursor-pointer">
                              Generate a batch of unique codes
                            </FieldLabel>
                            <span className="text-xs text-muted-foreground">
                              Useful for one-time-use codes — each customer redeems a different
                              code.
                            </span>
                          </div>
                          <Controller
                            name="multi_codes"
                            control={form.control}
                            render={({ field }) => (
                              <Switch
                                id="multi_codes"
                                checked={!!field.value}
                                onCheckedChange={field.onChange}
                              />
                            )}
                          />
                        </div>
                      </Field>

                      {!multiCodes ? (
                        <Field>
                          <FieldLabel htmlFor="code">Code</FieldLabel>
                          <Input
                            id="code"
                            placeholder="SUMMER2026"
                            {...form.register('code')}
                            aria-invalid={!!form.formState.errors.code}
                          />
                          {form.formState.errors.code && (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.code.message}
                            </p>
                          )}
                        </Field>
                      ) : (
                        <>
                          <Field>
                            <FieldLabel htmlFor="number_of_codes">Number of codes</FieldLabel>
                            <Input
                              id="number_of_codes"
                              type="number"
                              min={1}
                              placeholder="100"
                              {...form.register('number_of_codes')}
                              aria-invalid={!!form.formState.errors.number_of_codes}
                            />
                            {form.formState.errors.number_of_codes && (
                              <p className="text-sm text-destructive">
                                {form.formState.errors.number_of_codes.message}
                              </p>
                            )}
                          </Field>

                          <Field>
                            <FieldLabel htmlFor="code_prefix">Code prefix (optional)</FieldLabel>
                            <Input
                              id="code_prefix"
                              placeholder="VIP"
                              {...form.register('code_prefix')}
                            />
                            <span className="text-xs text-muted-foreground">
                              Each generated code will start with this prefix.
                            </span>
                          </Field>
                        </>
                      )}
                    </>
                  )}
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule & limits</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="starts_at">Starts</FieldLabel>
                      <Input id="starts_at" type="datetime-local" {...form.register('starts_at')} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="expires_at">Expires</FieldLabel>
                      <Input
                        id="expires_at"
                        type="datetime-local"
                        {...form.register('expires_at')}
                      />
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
                    <FieldLabel htmlFor="match_policy">
                      When promotion has multiple rules
                    </FieldLabel>
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
                          Advertise this promotion
                        </FieldLabel>
                        <span className="text-xs text-muted-foreground">
                          Surface it on the storefront when applicable.
                        </span>
                      </div>
                      <Controller
                        name="advertise"
                        control={form.control}
                        render={({ field }) => (
                          <Switch
                            id="advertise"
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
              You'll add actions and rules after the promotion is created.
            </p>
          </>
        }
      />
    </form>
  )
}
