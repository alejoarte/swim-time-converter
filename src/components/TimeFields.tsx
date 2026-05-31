import { useRef } from 'react'
import {
  getTimePartsError,
  normalizeTimeParts,
  type TimePart,
  type TimeParts,
} from '../lib/timeParse'

const ERROR_MESSAGES: Record<NonNullable<ReturnType<typeof getTimePartsError>>, string> = {
  empty: 'Enter at least one value',
  seconds_range: 'Seconds must be 00–59',
  hundredths_range: 'Hundredths must be 00–99',
  minutes_invalid: 'Minutes must be a number',
}

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
  const secondsRef = useRef<HTMLInputElement>(null)
  const hundredthsRef = useRef<HTMLInputElement>(null)

  const error = showErrors ? getTimePartsError(value) : null
  const errorMessage = error ? ERROR_MESSAGES[error] : null

  const handleChange = (part: TimePart, raw: string, maxLength: number) => {
    const next = digitsOnly(raw, maxLength)
    onChange(part, next)

    if (part === 'seconds' && next.length >= 2) {
      hundredthsRef.current?.focus()
    }
    if (part === 'hundredths' && next.length >= 2) {
      hundredthsRef.current?.blur()
    }
  }

  const handleBlur = () => {
    onNormalize(normalizeTimeParts(value))
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
        className="time-fields"
        role="group"
        aria-label="Swim time"
        aria-invalid={!!error}
      >
        <div className="time-field">
          <label className="time-field-label" htmlFor={`${idPrefix}-min`}>
            Min
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
            onBlur={handleBlur}
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
            Sec
          </label>
          <input
            ref={secondsRef}
            id={`${idPrefix}-sec`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="00"
            value={value.seconds}
            onChange={(e) => handleChange('seconds', e.target.value, 2)}
            onBlur={handleBlur}
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
            Hund
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
            onBlur={handleBlur}
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
