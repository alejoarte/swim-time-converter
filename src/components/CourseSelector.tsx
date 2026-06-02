import { useTranslation } from 'react-i18next'
import type { Course } from '../lib/convert'

type CourseSelectorProps = {
  value: Course
  onChange: (course: Course) => void
  disabled?: boolean
  heading?: string
  name?: string
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
}: CourseSelectorProps) {
  const { t } = useTranslation()
  const headingText = heading ?? t('course.headingDefault')

  return (
    <section className="course-selector">
      <h2>{headingText}</h2>
      <div className="course-options" role="radiogroup" aria-label={headingText}>
        {COURSES.map((course) => (
          <label key={course.value} className="course-option">
            <input
              type="radio"
              name={name}
              value={course.value}
              checked={value === course.value}
              onChange={() => onChange(course.value)}
              disabled={disabled}
            />
            <span className="course-label">{course.value}</span>
            <span className="course-desc">{t(`course.${course.descKey}`)}</span>
          </label>
        ))}
      </div>
    </section>
  )
}
