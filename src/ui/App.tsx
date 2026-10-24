import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { Icon, type IconName } from './components'
import { WeekScreen } from './WeekScreen'
import { DishesScreen } from './DishesScreen'
import { DishDetail } from './DishDetail'
import { DishEditor } from './DishEditor'
import { CookMode } from './CookMode'
import { ShoppingScreen } from './ShoppingScreen'
import { SettingsScreen } from './SettingsScreen'

// Hash routes so GitHub Pages never has to know about client paths.
export const go = (path: string) => (location.hash = path)

function useRoute() {
  const read = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => {
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
  const [section = 'woche', id, sub] = useRoute()

  if (section === 'gerichte' && id && sub === 'kochen') return <CookMode id={id} />

  let screen
  if (section === 'gerichte' && id === 'neu') screen = <DishEditor />
  else if (section === 'gerichte' && id && sub === 'bearbeiten') screen = <DishEditor id={id} />
  else if (section === 'gerichte' && id) screen = <DishDetail id={id} />
  else if (section === 'gerichte') screen = <DishesScreen />
  else if (section === 'einkauf') screen = <ShoppingScreen />
  else if (section === 'einstellungen') screen = <SettingsScreen />
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
    </>
  )
}
