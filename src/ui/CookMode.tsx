import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { t } from '../i18n'
import { goBack } from './App'
import { Icon } from './components'
import { scaled } from './DishDetail'

export function CookMode({ id, servings }: { id: string; servings?: number }) {
  const dish = useLiveQuery(() => db.dishes.get(id), [id])
  const [step, setStep] = useState(0)
  const [showIngredients, setShowIngredients] = useState(false)

  // Keep the screen on while cooking (iOS 16.4+); re-acquire after the app was in the background.
  useEffect(() => {
    let lock: WakeLockSentinel | undefined
    const acquire = () => navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    acquire()
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release()
    }
  }, [])

  if (!dish) return null
  const steps = dish.steps
  const last = step >= steps.length - 1
  const factor = (servings ?? dish.servings) / (dish.servings || 1)

  return (
    <div className="cook">
      <header className="cook-head">
        <a className="icon-btn" href={`#/gerichte/${id}`} onClick={goBack} aria-label={t('cook.exit')}><Icon name="close" /></a>
        <span className="cook-title">{dish.name}</span>
        <button className="btn small" onClick={() => setShowIngredients(!showIngredients)} aria-expanded={showIngredients}>
          {t('dishes.ingredients')}
        </button>
      </header>

      {showIngredients ? (
        <ul className="ingredients cook-ingredients">
          {dish.ingredients.map((i, k) => (
            <li key={k}><span className="qty">{scaled(i, factor)}</span><span>{i.name}</span></li>
          ))}
        </ul>
      ) : (
        <div className="cook-step" aria-live="polite">
          <span className="cook-count">{t('cook.step', { n: step + 1, total: steps.length })}</span>
          <p>{steps[step]}</p>
        </div>
      )}

      <div className="cook-progress" aria-hidden="true">
        {steps.map((_, k) => <span key={k} className={k <= step ? 'done' : undefined} />)}
      </div>
      <footer className="cook-nav">
        <button className="btn big" onClick={() => setStep(step - 1)} disabled={step === 0}><Icon name="back" /> {t('cook.back')}</button>
        {last ? (
          <a className="btn big primary" href={`#/gerichte/${id}`} onClick={goBack}><Icon name="check" /> {t('cook.done')}</a>
        ) : (
          <button className="btn big primary" onClick={() => setStep(step + 1)}>{t('cook.next')} <Icon name="forward" /></button>
        )}
      </footer>
    </div>
  )
}
