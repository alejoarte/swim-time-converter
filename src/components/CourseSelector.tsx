import type { Course } from '../lib/convert'

type CourseSelectorProps = {
  value: Course
  onChange: (course: Course) => void
  disabled?: boolean
  heading?: string
}

const COURSES: { value: Course; label: string; description: string }[] = [
  { value: 'SCY', label: 'SCY', description: 'Short Course Yards' },
  { value: 'SCM', label: 'SCM', description: 'Short Course Meters' },
  { value: 'LCM', label: 'LCM', description: 'Long Course Meters' },
]

export function CourseSelector({ value, onChange, disabled, heading = 'My times are in' }: CourseSelectorProps) {
  return (
    <section className="course-selector">
      <h2>{heading}</h2>
      <div className="course-options" role="radiogroup" aria-label="My times are in">
        {COURSES.map((course) => (
          <label key={course.value} className="course-option">
            <input
              type="radio"
              name="source-course"
              value={course.value}
              checked={value === course.value}
              onChange={() => onChange(course.value)}
              disabled={disabled}
            />
            <span className="course-label">{course.label}</span>
            <span className="course-desc">{course.description}</span>
          </label>
        ))}
      </div>
    </section>
  )
}
