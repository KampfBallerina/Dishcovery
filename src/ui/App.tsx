import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DROPBOX_APP_KEY } from '../config'
import { getMeta } from '../db'
import { t } from '../i18n'
import { Icon, Toaster, type IconName } from './components'
import { WeekScreen } from './WeekScreen'
import { DishesScreen } from './DishesScreen'
import { DishDetail } from './DishDetail'
import { DishEditor } from './DishEditor'
import { CookMode } from './CookMode'
import { ShoppingScreen } from './ShoppingScreen'
import { HouseholdScreen } from './HouseholdScreen'
import { HouseholdPrompts, Welcome } from './Onboarding'

// Each history entry carries its depth in the app, so "back" knows whether there is an in-app page to return to.
let depth = 0
let replacing = false
if (history.state?.depth == null) history.replaceState({ depth }, '')
else depth = history.state.depth

// Hash routes so GitHub Pages never has to know about client paths.
export const go = (path: string, replace = false) => {
  replacing = replace
  if (replace) location.replace('#' + path)
  else location.hash = path
}

/** Return to the page the user came from; fall back to a fixed page after a deep link. */
export const goBack = (e: { preventDefault(): void }) => {
  if (depth > 0) (e.preventDefault(), history.back())
}

function useRoute() {
  const read = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => {
      // Blur before the focused field unmounts: iOS only undoes its keyboard viewport shift on a real blur, else the fixed tab bar stays shifted.
      (document.activeElement as HTMLElement | null)?.blur?.()
      if (history.state?.depth == null) history.replaceState({ depth: replacing ? depth : ++depth }, '')
      else depth = history.state.depth
      replacing = false
      setRoute(read())
      window.scrollTo(0, 0)
    }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return route
}

const tabs: { path: string; icon: IconName; label: string }[] = [
  { path: 'woche', icon: 'week', label: t('tabs.week') },
  { path: 'gerichte', icon: 'plate', label: t('tabs.dishes') },
  { path: 'einkauf', icon: 'cart', label: t('tabs.shopping') },
]

export function App() {
  const [section = 'woche', id, sub, servings] = useRoute()
  const welcome = useLiveQuery(async () => !!DROPBOX_APP_KEY && !(await getMeta('auth')) && !(await getMeta('welcomeSkipped')))
  if (welcome === undefined) return null
  if (welcome) return <Welcome />

  if (section === 'gerichte' && id && sub === 'kochen') return <CookMode id={id} servings={Number(servings) || undefined} />

  let screen
  if (section === 'gerichte' && id === 'neu') screen = <DishEditor />
  else if (section === 'gerichte' && id && sub === 'bearbeiten') screen = <DishEditor id={id} />
  else if (section === 'gerichte' && id) screen = <DishDetail id={id} />
  else if (section === 'gerichte') screen = <DishesScreen />
  else if (section === 'einkauf') screen = <ShoppingScreen />
  else if (section === 'haushalt') screen = <HouseholdScreen />
  else screen = <WeekScreen />

  return (
    <>
      <main className="screen">{screen}</main>
      <nav className="tabbar" aria-label={t('tabs.label')}>
        {tabs.map((tab) => (
          <a key={tab.path} href={`#/${tab.path}`} aria-current={section === tab.path ? 'page' : undefined}>
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </a>
        ))}
      </nav>
      <HouseholdPrompts />
      <Toaster />
    </>
  )
}
