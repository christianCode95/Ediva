export default function CourseModuleCard({
  module,
  isCompleted = false,
  status,
  children,
}) {
  return (
    <li
      className={'learning-module' + (isCompleted ? ' is-completed' : '')}
      id={'module-' + module.number}
    >
      <div className="learning-module-info">
        <span className="learning-module-number" aria-hidden="true">
          {String(module.number).padStart(2, '0')}
        </span>
        <div>
          <h3 id={'module-heading-' + module.number} tabIndex="-1">{module.title}</h3>
          {status && <p>{status}</p>}
        </div>
      </div>
      {children}
    </li>
  )
}
