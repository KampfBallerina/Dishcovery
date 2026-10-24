import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, save, type Ingredient } from '../db'
import { locale, t } from '../i18n'
import { fmtAmount } from '../logic/shopping'
import { Icon, Plate, TopBar } from './components'

export const scaled = (i: Ingredient, factor: number) =>
  [i.amount != null && fmtAmount(i.amount * factor), i.unit].filter(Boolean).join(' ')

export function DishDetail({ id }: { id: string }) {
  const dish = useLiveQuery(() => db.dishes.get(id), [id])
  const [servings, setServings] = useState<number>()
  if (dish === undefined) return null
  if (!dish || dish.deleted) return <TopBar title={t('dishes.gone')} back="#/gerichte" />

  const n = servings ?? dish.servings
  const factor = n / (dish.servings || 1)
  const edited = Math.max(0, ...Object.values(dish._ts))

  return (
    <article className="detail">
      <TopBar title="" back="#/gerichte">
        <button className="icon-btn" onClick={() => save(db.dishes, id, { favorite: !dish.favorite })} aria-pressed={dish.favorite} aria-label={t('dishes.favorite')}>
          <span className={dish.favorite ? 'fav' : undefined}><Icon name="heart" /></span>
        </button>
        <a className="icon-btn" href={`#/gerichte/${id}/bearbeiten`} aria-label={t('common.edit')}>
          <Icon name="edit" />
        </a>
      </TopBar>

      <div className="detail-hero">
        <Plate dish={dish} size={220} />
        <h1>{dish.name}</h1>
        {(dish.minutes || dish.tags.length > 0) && (
          <p className="muted">{[dish.minutes && t('dishes.minutes', { n: dish.minutes }), ...dish.tags].filter(Boolean).join(', ')}</p>
        )}
        <div className="detail-actions">
          {dish.steps.length > 0 && (
            <a className="btn primary" href={`#/gerichte/${id}/kochen`}>
              <Icon name="play" /> {t('cook.start')}
            </a>
          )}
          {dish.videoUrl && (
            <a className="btn" href={dish.videoUrl} target="_blank" rel="noreferrer">
              <Icon name="video" /> {t('dishes.video')}
            </a>
          )}
          {dish.sourceUrl && (
            <a className="btn" href={dish.sourceUrl} target="_blank" rel="noreferrer">
              <Icon name="link" /> {t('dishes.source')}
            </a>
          )}
        </div>
      </div>

      {dish.ingredients.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{t('dishes.ingredients')}</h2>
            <div className="stepper" role="group" aria-label={t('dishes.servings')}>
              <button className="icon-btn" onClick={() => setServings(Math.max(1, n - 1))} aria-label={t('dishes.lessServings')}><Icon name="minus" size={18} /></button>
              <span>{t('dishes.servingsN', { n })}</span>
              <button className="icon-btn" onClick={() => setServings(n + 1)} aria-label={t('dishes.moreServings')}><Icon name="plus" size={18} /></button>
            </div>
          </div>
          <ul className="ingredients">
            {dish.ingredients.map((i, k) => (
              <li key={k}>
                <span className="qty">{scaled(i, factor)}</span>
                <span>{i.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dish.steps.length > 0 && (
        <section>
          <h2>{t('dishes.steps')}</h2>
          <ol className="steps">
            {dish.steps.map((s, k) => <li key={k}>{s}</li>)}
          </ol>
        </section>
      )}

      {dish.notes && (
        <section>
          <h2>{t('dishes.notes')}</h2>
          <p className="notes">{dish.notes}</p>
        </section>
      )}

      {edited > 0 && (
        <p className="muted small edited">
          {t(dish.updatedBy ? 'dishes.editedBy' : 'dishes.edited', {
            name: dish.updatedBy ?? '',
            date: new Date(edited).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
          })}
        </p>
      )}
    </article>
  )
}
