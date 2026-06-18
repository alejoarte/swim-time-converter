import { useTranslation } from 'react-i18next'
import type { Course } from '../lib/convert'
import { IconChevronDown, IconInfo, IconSwimmer } from './icons'

type CourseSelectorProps = {
  value: Course
  onChange: (course: Course) => void
  disabled?: boolean
  heading?: string
  name?: string
  showSourceHint?: boolean
}

const COURSES: { value: Course; descKey: 'scyDesc' | 'scmDesc' | 'lcmDesc' }[] = [
  { value: 'SCY', descKey: 'scyDesc' },
  { value: 'SCM', descKey: 'scmDesc' },
  { value: 'LCM', descKey: 'lcmDesc' },
]

export function CourseSelector({
  value,
  onChange,
  disabled,
  heading,
  name = 'source-course',
  showSourceHint = true,
}: CourseSelectorProps) {
  const { t } = useTranslation()
  const headingText = heading ?? t('course.headingDefault')

  return (
    <section className="course-selector">
      <label className="field-label" htmlFor={name}>
        {headingText}
      </label>
      <div className="course-select-wrap">
        <IconSwimmer className="course-select-icon" size={20} />
        <select
          id={name}
          name={name}
          className="course-select"
          value={value}
          onChange={(e) => onChange(e.target.value as Course)}
          disabled={disabled}
          aria-label={t('course.selectAria')}
        >
          {COURSES.map((course) => (
            <option key={course.value} value={course.value}>
              {course.value} – {t(`course.${course.descKey}`)}
            </option>
          ))}
        </select>
        <IconChevronDown className="course-select-chevron" size={18} />
      </div>
      {showSourceHint && (
        <p className="hint-inline">
          <IconInfo size={14} />
          <span>{t('course.sourceHint')}</span>
        </p>
      )}
    </section>
  )
}
