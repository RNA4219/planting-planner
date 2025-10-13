import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'

import { CategoryTabs } from '../src/components/CategoryTabs'
import type { CropCategory } from '../src/types'

const LABELS: Record<CropCategory, string> = {
  leaf: '葉菜',
  root: '根菜',
  flower: '花き',
}

// @ts-expect-error fruit は選択肢から除外済み
const FRUIT_LABEL = LABELS.fruit ?? '果菜'

describe('CategoryTabs', () => {
  it('renders three tabs without fruit and emits選択変更', async () => {
    const onChange = vi.fn()

    render(<CategoryTabs category="leaf" onChange={onChange} />)

    expect(screen.queryByRole('tab', { name: FRUIT_LABEL })).not.toBeInTheDocument()

    const tabButtons = screen.getAllByRole('tab')
    expect(tabButtons).toHaveLength(3)

    const [, rootTab] = tabButtons
    await userEvent.click(rootTab)

    if (onChange.mock.calls.length !== 1 || onChange.mock.calls[0]?.[0] !== 'root') {
      throw new Error('onChange should be called once with root')
    }

    (Object.values(LABELS) as string[]).forEach((label) => {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument()
    })
  })

  it('moves focus and selection with arrow keys', async () => {
    const user = userEvent.setup()

    const Wrapper = () => {
      const [category, setCategory] = useState<CropCategory>('leaf')
      return <CategoryTabs category={category} onChange={setCategory} />
    }

    const { getAllByRole, findAllByRole } = render(<Wrapper />)

    const tabCount = Object.keys(LABELS).length
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
})
