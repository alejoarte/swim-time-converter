/* @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import i18n from './i18n'

const exportToExcelMock = vi.fn().mockResolvedValue(undefined)

vi.mock('./lib/exportExcel', () => ({
  exportToExcel: (...args: unknown[]) => exportToExcelMock(...args),
  exportTrainingZonesToExcel: vi.fn().mockResolvedValue(undefined),
}))

function renderApp() {
  return render(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
  )
}

describe('App manual conversion flow', () => {
  beforeEach(() => {
    exportToExcelMock.mockClear()
    window.localStorage.clear()
    window.history.replaceState({}, '', '/swim-time-converter/')
  })

  it('shows live conversion results after entering a valid time', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('checkbox', { name: /100 Free/i }))
    await user.type(screen.getByLabelText(/^Min$/i), '1')
    await user.type(screen.getByLabelText(/^Sec$/i), '02')
    await user.type(screen.getByLabelText(/^Hund$/i), '34')

    expect(await screen.findByRole('heading', { name: /Converted times/i })).toBeInTheDocument()
    expect(screen.getByText('1:10.80')).toBeInTheDocument()
  })

  it('exports results when Export to Excel is clicked', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('checkbox', { name: /100 Free/i }))
    await user.type(screen.getByLabelText(/^Min$/i), '1')
    await user.type(screen.getByLabelText(/^Sec$/i), '02')
    await user.type(screen.getByLabelText(/^Hund$/i), '34')

    await screen.findByRole('heading', { name: /Converted times/i })
    await user.click(screen.getByRole('button', { name: /Export to Excel/i }))

    await waitFor(() => {
      expect(exportToExcelMock).toHaveBeenCalledTimes(1)
    })
  })

  it('fills time fields when a meet time is pasted', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('checkbox', { name: /100 Free/i }))
    const secondsField = screen.getByLabelText(/^Sec$/i)
    await user.click(secondsField)
    await user.paste('1:02.34')

    expect(await screen.findByText('1:10.80')).toBeInTheDocument()
  })
})
