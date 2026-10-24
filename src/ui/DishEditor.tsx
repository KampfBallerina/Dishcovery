import { useEffect, useState, type FormEvent } from 'react'
import { db, getMeta, save, type Dish, type Ingredient } from '../db'
import { t } from '../i18n'
import { addPhoto } from '../photo'
import { go } from './App'
import { Icon, Plate, TopBar } from './components'
import { knownIngredients, knownTags, useDishes } from './data'

const SUGGESTED_TAGS = ['vegetarisch', 'vegan', 'schnell', 'leicht', 'deftig', 'Ofen', 'Suppe', 'Salat']

interface Form {
  name: string
  photo?: string
  videoUrl: string
  sourceUrl: string
  ingredients: { amount: string; unit: string; name: string }[]
  steps: string
  servings: string
  minutes: string
  tags: string[]
  notes: string
}

const toForm = (d?: Dish): Form => ({
  name: d?.name ?? '',
  photo: d?.photo,
  videoUrl: d?.videoUrl ?? '',
  sourceUrl: d?.sourceUrl ?? '',
  ingredients: [...(d?.ingredients ?? []).map((i) => ({ amount: i.amount?.toString().replace('.', ',') ?? '', unit: i.unit ?? '', name: i.name })), { amount: '', unit: '', name: '' }],
  steps: d?.steps.join('\n') ?? '',
  servings: String(d?.servings ?? 2),
  minutes: d?.minutes?.toString() ?? '',
  tags: d?.tags ?? [],
  notes: d?.notes ?? '',
})

const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}
const url = (s: string) => (/^https?:\/\/\S+$/i.test(s.trim()) ? s.trim() : undefined)

export function DishEditor({ id }: { id?: string }) {
  const [form, setForm] = useState<Form>()
  const [tagInput, setTagInput] = useState('')
  const all = useDishes() ?? []

  useEffect(() => {
    if (id) db.dishes.get(id).then((d) => setForm(toForm(d)))
    else setForm(toForm())
  }, [id])
  if (!form) return null

  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch })
  const setIng = (k: number, patch: Partial<Form['ingredients'][number]>) => {
    const ingredients = form.ingredients.map((i, j) => (j === k ? { ...i, ...patch } : i))
    // Always keep one empty row to type into.
    if (ingredients[ingredients.length - 1].name) ingredients.push({ amount: '', unit: '', name: '' })
    set({ ingredients })
  }
  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '')
    if (tag && !form.tags.includes(tag)) set({ tags: [...form.tags, tag] })
    setTagInput('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const dishId = id ?? crypto.randomUUID()
    const patch: Partial<Dish> = {
      name: form.name.trim(),
      photo: form.photo,
      videoUrl: url(form.videoUrl),
      sourceUrl: url(form.sourceUrl),
      ingredients: form.ingredients
        .filter((i) => i.name.trim())
        .map((i): Ingredient => ({ name: i.name.trim(), amount: num(i.amount), unit: i.unit.trim() || undefined })),
      steps: form.steps.split('\n').map((s) => s.trim()).filter(Boolean),
      servings: num(form.servings) ?? 2,
      minutes: num(form.minutes),
      tags: form.tags,
      notes: form.notes.trim() || undefined,
      updatedBy: await getMeta<string>('userName'),
    }
    if (!id) patch.favorite = false
    await save(db.dishes, dishId, patch)
    go(`/gerichte/${dishId}`)
  }

  const remove = async () => {
    if (!id || !confirm(t('editor.deleteConfirm', { name: form.name }))) return
    await save(db.dishes, id, { deleted: true })
    go('/gerichte')
  }

  const ingredientNames = knownIngredients(all)
  const tagOptions = [...new Set([...knownTags(all), ...SUGGESTED_TAGS])].filter((tg) => !form.tags.includes(tg))

  return (
    <form className="editor" onSubmit={submit}>
      <TopBar title={id ? t('editor.edit') : t('editor.new')} back={id ? `#/gerichte/${id}` : '#/gerichte'} />

      <label className="photo-pick">
        <Plate dish={form.photo || form.name ? ({ name: form.name || '?', photo: form.photo } as Dish) : undefined} size={140} />
        <span className="btn small"><Icon name="camera" size={18} /> {form.photo ? t('editor.changePhoto') : t('editor.addPhoto')}</span>
        <input type="file" accept="image/*" className="visually-hidden" onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) set({ photo: await addPhoto(file) })
        }} />
      </label>

      <label className="field">
        <span>{t('editor.name')}</span>
        <input required value={form.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" />
      </label>

      <div className="field-row">
        <label className="field">
          <span>{t('dishes.servings')}</span>
          <input inputMode="numeric" value={form.servings} onChange={(e) => set({ servings: e.target.value })} />
        </label>
        <label className="field">
          <span>{t('editor.minutes')}</span>
          <input inputMode="numeric" value={form.minutes} onChange={(e) => set({ minutes: e.target.value })} />
        </label>
      </div>

      <fieldset className="field">
        <legend>{t('dishes.ingredients')}</legend>
        <datalist id="ingredient-names">{ingredientNames.map((n) => <option key={n} value={n} />)}</datalist>
        {form.ingredients.map((i, k) => (
          <div className="ing-row" key={k}>
            <input aria-label={t('editor.amount')} placeholder={t('editor.amount')} inputMode="decimal" value={i.amount} onChange={(e) => setIng(k, { amount: e.target.value })} />
            <input aria-label={t('editor.unit')} placeholder={t('editor.unit')} value={i.unit} onChange={(e) => setIng(k, { unit: e.target.value })} />
            <input aria-label={t('editor.ingredient')} placeholder={t('editor.ingredient')} list="ingredient-names" value={i.name} onChange={(e) => setIng(k, { name: e.target.value })} />
            {k < form.ingredients.length - 1 && (
              <button type="button" className="icon-btn" aria-label={t('editor.removeIngredient')} onClick={() => set({ ingredients: form.ingredients.filter((_, j) => j !== k) })}>
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        ))}
      </fieldset>

      <label className="field">
        <span>{t('dishes.steps')}</span>
        <small className="muted">{t('editor.stepsHint')}</small>
        <textarea rows={7} value={form.steps} onChange={(e) => set({ steps: e.target.value })} />
      </label>

      <fieldset className="field">
        <legend>{t('editor.tags')}</legend>
        <div className="chips">
          {form.tags.map((tg) => (
            <button type="button" key={tg} className="chip" aria-pressed="true" onClick={() => set({ tags: form.tags.filter((x) => x !== tg) })} aria-label={t('editor.removeTag', { tag: tg })}>
              {tg} <Icon name="close" size={14} />
            </button>
          ))}
        </div>
        <datalist id="tag-options">{tagOptions.map((tg) => <option key={tg} value={tg} />)}</datalist>
        <input list="tag-options" placeholder={t('editor.tagPlaceholder')} value={tagInput} aria-label={t('editor.tags')}
          onChange={(e) => (e.target.value.endsWith(',') ? addTag(e.target.value) : setTagInput(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(tagInput))}
          onBlur={() => addTag(tagInput)} />
        <div className="chips">
          {tagOptions.slice(0, 8).map((tg) => (
            <button type="button" key={tg} className="chip ghost" onClick={() => addTag(tg)}>
              <Icon name="plus" size={14} /> {tg}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>{t('editor.video')}</span>
        <input type="url" inputMode="url" placeholder="https://" value={form.videoUrl} onChange={(e) => set({ videoUrl: e.target.value })} />
      </label>
      <label className="field">
        <span>{t('editor.source')}</span>
        <input type="url" inputMode="url" placeholder="https://" value={form.sourceUrl} onChange={(e) => set({ sourceUrl: e.target.value })} />
      </label>
      <label className="field">
        <span>{t('dishes.notes')}</span>
        <textarea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>

      <div className="editor-actions">
        <button className="btn primary" type="submit"><Icon name="check" /> {t('common.save')}</button>
        {id && <button className="btn danger" type="button" onClick={remove}><Icon name="trash" /> {t('editor.delete')}</button>}
      </div>
    </form>
  )
}
