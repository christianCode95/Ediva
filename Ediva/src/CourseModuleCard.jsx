export default function CourseModuleCard({
  module,
  isCompleted = false,
  isUnlocked = true,
  isActive = false,
  status,
  children,
}) {
  return (
    <li
      className={'learning-module' + (isCompleted ? ' is-completed' : '') + (!isUnlocked ? ' is-locked' : '')}
      id={'module-' + module.number}
      aria-current={isActive ? 'step' : undefined}
    >
      <div className="learning-module-info">
        <span className="learning-module-number" aria-hidden="true">
          {String(module.number).padStart(2, '0')}
        </span>
        <div>
          <h3 id={'module-heading-' + module.number} tabIndex="-1">{module.title}</h3>
          <p>{status}</p>
        </div>
      </div>
      {children}
    </li>
  )
}
