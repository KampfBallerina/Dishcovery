import { useState } from 'react'
import { t } from '../i18n'
import { Chip, Icon, Plate, TopBar } from './components'
import { knownTags, useDishes, useLastEaten, weeksSince } from './data'

export function DishesScreen() {
  const dishes = useDishes()
  const lastEaten = useLastEaten()
  const [q, setQ] = useState('')
  const [favorites, setFavorites] = useState(false)
  const [tag, setTag] = useState<string>()
  const [longAgo, setLongAgo] = useState(false)
  if (!dishes) return null

  const needle = q.toLowerCase()
  let list = dishes.filter(
    (d) =>
      (!favorites || d.favorite) &&
      (!tag || d.tags.includes(tag)) &&
      (!needle || d.name.toLowerCase().includes(needle) || d.ingredients.some((i) => i.name.toLowerCase().includes(needle))),
  )
  if (longAgo) list = [...list].sort((a, b) => (lastEaten(a) ?? '').localeCompare(lastEaten(b) ?? ''))

  return (
    <>
      <TopBar title={t('dishes.title')}>
        <a className="icon-btn" href="#/gerichte/neu" aria-label={t('dishes.new')}>
          <Icon name="plus" />
        </a>
      </TopBar>

      {dishes.length === 0 ? (
        <div className="empty-state">
          <Plate size={120} />
          <p>{t('dishes.empty')}</p>
          <a className="btn primary" href="#/gerichte/neu">
            <Icon name="plus" /> {t('dishes.new')}
          </a>
        </div>
      ) : (
        <>
          <div className="list-tools">
            <label className="search">
              <Icon name="search" size={18} />
              <input type="search" placeholder={t('dishes.search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('dishes.search')} />
            </label>
            <div className="chips scroll">
              <Chip on={favorites} onClick={() => setFavorites(!favorites)}>{t('dishes.favorites')}</Chip>
              <Chip on={longAgo} onClick={() => setLongAgo(!longAgo)}>{t('dishes.longAgo')}</Chip>
              {knownTags(dishes).slice(0, 10).map((tg) => (
                <Chip key={tg} on={tag === tg} onClick={() => setTag(tag === tg ? undefined : tg)}>{tg}</Chip>
              ))}
            </div>
          </div>
          <ul className="dish-list">
            {list.map((d) => {
              const last = lastEaten(d)
              const weeks = last ? weeksSince(last) : undefined
              const meta = [d.minutes && t('dishes.minutes', { n: d.minutes }), ...d.tags.slice(0, 2)].filter(Boolean).join(', ')
              return (
                <li key={d.id}>
                  <a href={`#/gerichte/${d.id}`}>
                    <Plate dish={d} size={60} />
                    <span className="dish-text">
                      <span className="dish-name">
                        {d.name}
                        {d.favorite && <span className="fav" aria-label={t('dishes.favorite')}><Icon name="heart" size={14} /></span>}
                      </span>
                      {meta && <small>{meta}</small>}
                      {(weeks === undefined || weeks >= 6) && (
                        <small className="long-ago">{weeks === undefined ? t('dishes.never') : t('dishes.weeksAgo', { n: weeks })}</small>
                      )}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
          {!list.length && <p className="empty-hint">{t('dishes.noMatch')}</p>}
        </>
      )}
    </>
  )
}
