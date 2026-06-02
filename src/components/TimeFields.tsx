import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getTimePartsError,
  normalizeTimeParts,
  type TimePart,
  type TimeParts,
} from '../lib/timeParse'

type TimeFieldsProps = {
  idPrefix: string
  value: TimeParts
  onChange: (part: TimePart, value: string) => void
  onNormalize: (parts: TimeParts) => void
  disabled?: boolean
  showErrors?: boolean
}

function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

export function TimeFields({
  idPrefix,
  value,
  onChange,
  onNormalize,
  disabled,
  showErrors,
}: TimeFieldsProps) {
  const { t } = useTranslation()
  const groupRef = useRef<HTMLDivElement>(null)
  const hundredthsRef = useRef<HTMLInputElement>(null)
  const latestPartsRef = useRef(value)
  latestPartsRef.current = value

  const error = showErrors ? getTimePartsError(value) : null
  const errorMessage = error ? t(`timeFields.errors.${error}`) : null

  const handleChange = (part: TimePart, raw: string, maxLength: number) => {
    const next = digitsOnly(raw, maxLength)
    latestPartsRef.current = { ...latestPartsRef.current, [part]: next }
    onChange(part, next)

    if (part === 'seconds' && next.length >= 2) {
      hundredthsRef.current?.focus()
    }
    if (part === 'hundredths' && next.length >= 2) {
      hundredthsRef.current?.blur()
    }
  }

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const nextTarget = e.relatedTarget
    if (nextTarget instanceof Node && groupRef.current?.contains(nextTarget)) {
      return
    }
    onNormalize(normalizeTimeParts(latestPartsRef.current))
  }

  const invalidSeconds =
    showErrors &&
    value.seconds.trim() !== '' &&
    (!/^\d+$/.test(value.seconds) || Number(value.seconds) >= 60)
  const invalidHundredths =
    showErrors &&
    value.hundredths.trim() !== '' &&
    (!/^\d+$/.test(value.hundredths) || Number(value.hundredths) > 99)
  const invalidMinutes =
    showErrors && value.minutes.trim() !== '' && !/^\d+$/.test(value.minutes)

  return (
    <div className="time-fields-wrap">
      <div
        ref={groupRef}
        className="time-fields"
        role="group"
        aria-label={t('timeFields.ariaLabel')}
        aria-invalid={!!error}
      >
        <div className="time-field">
          <label className="time-field-label" htmlFor={`${idPrefix}-min`}>
            {t('timeFields.min')}
          </label>
          <input
            id={`${idPrefix}-min`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            placeholder="0"
            value={value.minutes}
            onChange={(e) => handleChange('minutes', e.target.value, 3)}
            onBlur={handleFieldBlur}
            disabled={disabled}
            enterKeyHint="next"
            aria-invalid={invalidMinutes}
          />
        </div>
        <span className="time-sep" aria-hidden="true">
          :
        </span>
        <div className="time-field">
          <label className="time-field-label" htmlFor={`${idPrefix}-sec`}>
            {t('timeFields.sec')}
          </label>
          <input
            id={`${idPrefix}-sec`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="00"
            value={value.seconds}
            onChange={(e) => handleChange('seconds', e.target.value, 2)}
            onBlur={handleFieldBlur}
            disabled={disabled}
            enterKeyHint="next"
            aria-invalid={invalidSeconds}
          />
        </div>
        <span className="time-sep" aria-hidden="true">
          .
        </span>
        <div className="time-field">
          <label className="time-field-label" htmlFor={`${idPrefix}-hund`}>
            {t('timeFields.hund')}
          </label>
          <input
            ref={hundredthsRef}
            id={`${idPrefix}-hund`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="00"
            value={value.hundredths}
            onChange={(e) => handleChange('hundredths', e.target.value, 2)}
            onBlur={handleFieldBlur}
            disabled={disabled}
            enterKeyHint="done"
            aria-invalid={invalidHundredths}
          />
        </div>
      </div>
      {errorMessage && <span className="field-error">{errorMessage}</span>}
    </div>
  )
}
