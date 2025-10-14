import '@testing-library/jest-dom/vitest'

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import {
  CategoryTabs,
  DEFAULT_CATEGORY_TABS,
  type CategoryTabDefinition,
} from '../src/components/CategoryTabs'
import type { CropCategory } from '../src/types'

const CATEGORY_DEFINITIONS: readonly CategoryTabDefinition[] = DEFAULT_CATEGORY_TABS
const LABELS = Object.fromEntries(
  CATEGORY_DEFINITIONS.map((tab) => [tab.key, tab.label] as const),
) as Record<CropCategory, string>

// @ts-expect-error fruit は選択肢から除外済み
const FRUIT_LABEL = LABELS.fruit ?? '果菜'

afterEach(() => {
  cleanup()
})

describe('CategoryTabs', () => {
  it('renders provided tabs without fruit and emits選択変更', async () => {
    const onChange = vi.fn()

    render(
      <CategoryTabs
        category="leaf"
        categories={CATEGORY_DEFINITIONS}
        onChange={onChange}
      />,
    )

    expect(screen.queryByRole('tab', { name: FRUIT_LABEL })).not.toBeInTheDocument()

    const tablist = screen.getByRole('tablist')
    expect(tablist).toHaveClass('flex-col')
    expect(tablist).toHaveClass('sm:flex-row')

    const tabButtons = screen.getAllByRole('tab')
    expect(tabButtons).toHaveLength(CATEGORY_DEFINITIONS.length)

    tabButtons.forEach((tab) => {
      expect(tab).toHaveClass('w-full')
      expect(tab).toHaveClass('sm:w-auto')
    })

    const [, rootTab] = tabButtons
    await userEvent.click(rootTab)

    if (onChange.mock.calls.length !== 1 || onChange.mock.calls[0]?.[0] !== 'root') {
      throw new Error('onChange should be called once with root')
    }

    CATEGORY_DEFINITIONS.forEach((tab) => {
      expect(screen.getByRole('tab', { name: tab.label })).toBeInTheDocument()
    })
  })

  it('moves focus and selection with arrow keys', async () => {
    const user = userEvent.setup()

    const Wrapper = () => {
      const [category, setCategory] = useState<CropCategory>('leaf')
      return (
        <CategoryTabs
          category={category}
          categories={CATEGORY_DEFINITIONS}
          onChange={setCategory}
        />
      )
    }

    const { getAllByRole, findAllByRole } = render(<Wrapper />)

    const tabCount = CATEGORY_DEFINITIONS.length
    const getTabs = () =>
      getAllByRole('tab').slice(-tabCount) as HTMLButtonElement[]
    const [firstTab] = getTabs()
    firstTab.focus()
    expect(firstTab).toHaveFocus()

    await user.keyboard('{ArrowRight}')

    const findActiveTab = async (name: string) => {
      const matches = await findAllByRole('tab', { name, selected: true })
      return matches[matches.length - 1] as HTMLButtonElement
    }

    const activeAfterRight = await findActiveTab(LABELS.root)
    const tabsAfterRight = getTabs()
    expect(activeAfterRight).toHaveFocus()
    expect(activeAfterRight).toHaveAttribute('tabIndex', '0')
    expect(tabsAfterRight[0]).toHaveAttribute('tabIndex', '-1')

    await user.keyboard('{ArrowLeft}')

    const activeAfterLeft = await findActiveTab(LABELS.leaf)
    expect(activeAfterLeft).toHaveFocus()
    expect(activeAfterLeft).toHaveAttribute('tabIndex', '0')
  })

  it('returns null when no categories provided', () => {
    const onChange = vi.fn()
    const { queryByRole } = render(
      <CategoryTabs category="leaf" categories={[]} onChange={onChange} />,
    )
    expect(queryByRole('tablist')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})
