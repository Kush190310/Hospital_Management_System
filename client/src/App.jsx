import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown,
  Clock3, HeartPulse, LayoutDashboard, LogOut, Menu, Plus, Search,
  Settings2, Stethoscope, Users, X,
} from 'lucide-react'
import './App.css'

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'The request could not be completed.')
    error.status = response.status
    throw error
  }
  return data
}

const today = new Date()
const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
const localDate = (date) => {
  const d = new Date(date)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
const dateKey = (date) => new Date(date).toISOString().slice(0, 10)
const formatDateOnly = (date, options = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  date ? new Date(`${dateKey(date)}T12:00:00Z`).toLocaleDateString(undefined, { ...options, timeZone: 'UTC' }) : '—'
const formatDate = (date, options = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  date ? new Date(date).toLocaleDateString(undefined, options) : '—'
const initials = (name = '') => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const avatarColors = ['lavender', 'mint', 'peach', 'blue', 'pink']

function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [page, setPage] = useState('Overview')
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [appError, setAppError] = useState('')
  const [patientDialog, setPatientDialog] = useState(null)
  const [appointmentDialog, setAppointmentDialog] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    api('/auth/me')
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch((error) => {
        if (error.status !== 401) setAppError(error.message)
      })
      .finally(() => setCheckingSession(false))
  }, [])

  const loadWorkspace = useCallback(async () => {
    if (!user) return
    try {
      const [patientData, appointmentData] = await Promise.all([
        api('/patients'),
        api('/appointments'),
      ])
      setPatients(patientData.patients)
      setAppointments(appointmentData.appointments)
      setAppError('')
    } catch (error) {
      setAppError(error.message)
    }
  }, [user])

  useEffect(() => {
    if (!user) return undefined
    let active = true
    Promise.all([api('/patients'), api('/appointments')])
      .then(([patientData, appointmentData]) => {
        if (!active) return
        setPatients(patientData.patients)
        setAppointments(appointmentData.appointments)
        setAppError('')
      })
      .catch((error) => {
        if (active) setAppError(error.message)
      })
    return () => { active = false }
  }, [user])

  const signOut = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
      setUser(null)
      setPatients([])
      setAppointments([])
    } catch (error) {
      setAppError(error.message)
    }
  }

  const savePatient = async (values, id) => {
    await api(id ? `/patients/${id}` : '/patients', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(values),
    })
    setPatientDialog(null)
    await loadWorkspace()
  }

  const deletePatient = async (patient) => {
    if (!window.confirm(`Delete ${patient.name}?`)) return
    try {
      await api(`/patients/${patient._id}`, { method: 'DELETE' })
      await loadWorkspace()
    } catch (error) {
      setAppError(error.message)
    }
  }

  const saveAppointment = async (values) => {
    await api('/appointments', { method: 'POST', body: JSON.stringify(values) })
    setAppointmentDialog(false)
    await loadWorkspace()
  }

  const updateAppointment = async (appointment, status) => {
    try {
      await api(`/appointments/${appointment._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      await loadWorkspace()
    } catch (error) {
      setAppError(error.message)
    }
  }

  const deleteAppointment = async (appointment) => {
    if (!window.confirm(`Delete the appointment for ${appointment.patient?.name || 'this patient'}?`)) return
    try {
      await api(`/appointments/${appointment._id}`, { method: 'DELETE' })
      await loadWorkspace()
    } catch (error) {
      setAppError(error.message)
    }
  }

  if (checkingSession) {
    return <div className="loading-screen"><div className="brand-mark"><HeartPulse /></div><span>Opening your workspace…</span></div>
  }

  if (!user) {
    return <AuthScreen onAuthenticated={(currentUser) => { setUser(currentUser); setAppError('') }} initialError={appError} />
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); setPage('Overview') }}>
          <span className="brand-mark"><HeartPulse size={22} strokeWidth={2.5} /></span>
          <span className="brand-name">wellnest<span>care, connected</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <NavItem icon={<LayoutDashboard />} label="Overview" active={page === 'Overview'} onClick={() => { setPage('Overview'); setMobileMenuOpen(false) }} />
          <NavItem icon={<CalendarDays />} label="Appointments" count={appointments.filter((item) => item.status === 'Scheduled').length} active={page === 'Appointments'} onClick={() => { setPage('Appointments'); setMobileMenuOpen(false) }} />
          <NavItem icon={<Users />} label="Patients" active={page === 'Patients'} onClick={() => { setPage('Patients'); setMobileMenuOpen(false) }} />
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><Stethoscope size={16} /></span>
            <strong>Care made simple</strong>
            <p>Your clinic, all in one place.</p>
          </div>
          <button className="profile-button" onClick={signOut}>
            <span className="profile-avatar">{initials(user.name)}</span>
            <span className="profile-copy"><strong>{user.name}</strong><small>Clinic administrator</small></span>
            <LogOut size={17} className="logout-icon" />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{page}</strong></div>
          <div className="topbar-right">
            <span className="top-date"><CalendarDays size={15} />{today.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
          </div>
        </header>

        <div className="page-content">
          {appError && <div className="alert-banner" role="alert"><span>{appError}</span><button aria-label="Dismiss" onClick={() => setAppError('')}><X size={16} /></button></div>}
          {page === 'Overview' && (
            <Overview
              user={user}
              patients={patients}
              appointments={appointments}
              onNewAppointment={() => setAppointmentDialog(true)}
              onAddPatient={() => setPatientDialog({})}
              onViewAppointments={() => setPage('Appointments')}
              onViewPatients={() => setPage('Patients')}
              onUpdateAppointment={updateAppointment}
            />
          )}
          {page === 'Patients' && (
            <PatientsPage
              patients={patients}
              onAdd={() => setPatientDialog({})}
              onEdit={(patient) => setPatientDialog(patient)}
              onDelete={deletePatient}
              onNewAppointment={() => setAppointmentDialog(true)}
            />
          )}
          {page === 'Appointments' && (
            <AppointmentsPage
              appointments={appointments}
              onAdd={() => setAppointmentDialog(true)}
              onUpdate={updateAppointment}
              onDelete={deleteAppointment}
            />
          )}
        </div>
      </main>

      {mobileMenuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
      {patientDialog && <PatientDialog patient={patientDialog._id ? patientDialog : null} onClose={() => setPatientDialog(null)} onSave={savePatient} />}
      {appointmentDialog && <AppointmentDialog patients={patients} onClose={() => setAppointmentDialog(false)} onSave={saveAppointment} />}
    </div>
  )
}

function NavItem({ icon, label, count, active, onClick }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span><span>{label}</span>
      {count > 0 && <span className="nav-count">{count}</span>}
    </button>
  )
}

function AuthScreen({ onAuthenticated, initialError }) {
  const [isSignup, setIsSignup] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError)
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api(`/auth/${isSignup ? 'signup' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({ ...(isSignup ? { name } : {}), email, password }),
      })
      onAuthenticated(result.user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <a className="brand brand-light" href="#home"><span className="brand-mark"><HeartPulse size={22} strokeWidth={2.5} /></span><span className="brand-name">wellnest<span>care, connected</span></span></a>
        <div className="story-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> A calmer way to care</span>
          <h1>Better care starts with <em>being connected.</em></h1>
          <p>One thoughtful workspace for the people and moments that matter most.</p>
        </div>
        <div className="story-footer"><div className="avatar-stack"><span>AL</span><span>JM</span><span>RK</span></div><div><strong>Made for teams who care</strong><small>People first. Always.</small></div></div>
        <div className="story-orb orb-one" /><div className="story-orb orb-two" />
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand"><span className="brand-mark"><HeartPulse size={22} /></span><span className="brand-name">wellnest</span></div>
          <span className="auth-overline">{isSignup ? 'GET STARTED' : 'WELCOME BACK'}</span>
          <h2>{isSignup ? 'Create your workspace' : 'Sign in to your workspace'}</h2>
          <p className="auth-subtitle">{isSignup ? 'Set up your clinic workspace in just a moment.' : 'Good to see you again. Let’s get you caught up.'}</p>
          <form onSubmit={submit} className="auth-form">
            {isSignup && <label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Alex Morgan" required minLength={2} maxLength={80} /></label>}
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@clinic.com" required /></label>
            <label>Password<input type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? 'At least 8 characters' : 'Enter your password'} required minLength={8} maxLength={72} /></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}<span aria-hidden="true">→</span></button>
          </form>
          <div className="auth-switch">{isSignup ? 'Already have a workspace?' : 'New to wellnest?'} <button onClick={() => { setIsSignup(!isSignup); setError('') }}>{isSignup ? 'Sign in' : 'Create an account'}</button></div>
          <p className="privacy-note"><span className="privacy-dot" /> Your workspace is private and secure.</p>
        </div>
      </section>
    </div>
  )
}

function Overview({ user, patients, appointments, onNewAppointment, onAddPatient, onViewAppointments, onViewPatients, onUpdateAppointment }) {
  const todayKey = localDate(today)
  const todaysAppointments = appointments.filter((item) => dateKey(item.date) === todayKey)
  const upcoming = appointments.filter((item) => dateKey(item.date) >= todayKey && item.status !== 'Cancelled').slice(0, 5)
  const completedThisMonth = appointments.filter((item) => {
    const [year, month] = dateKey(item.date).split('-').map(Number)
    return item.status === 'Completed' && month === today.getMonth() + 1 && year === today.getFullYear()
  }).length
  const weekData = useMemo(() => {
    const monday = new Date(dayStart)
    const offset = (monday.getDay() + 6) % 7
    monday.setDate(monday.getDate() - offset)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      return {
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        value: appointments.filter((item) => dateKey(item.date) === localDate(date)).length,
        isToday: localDate(date) === todayKey,
      }
    })
  }, [appointments, todayKey])
  const maxBars = Math.max(...weekData.map((item) => item.value), 4)

  return (
    <>
      <div className="welcome-row">
        <div><span className="page-kicker">{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span><h1>Good morning, {user.name.split(' ')[0]} <span className="wave">✳</span></h1><p>Here’s what’s happening at your clinic today.</p></div>
        <button className="button button-primary" onClick={onNewAppointment}><Plus size={17} /> New appointment</button>
      </div>

      <section className="stats-grid" aria-label="Clinic statistics">
        <StatCard icon={<Users />} label="Total patients" value={patients.length} note="In your care" tone="blue" trend="All records" />
        <StatCard icon={<CalendarDays />} label="Today’s appointments" value={todaysAppointments.length} note="On the schedule" tone="purple" trend="Today" />
        <StatCard icon={<Check />} label="Completed this month" value={completedThisMonth} note="Visits completed" tone="green" trend="This month" />
        <StatCard icon={<Activity />} label="Scheduled visits" value={appointments.filter((item) => item.status === 'Scheduled').length} note="Awaiting check-in" tone="orange" trend="Upcoming" />
      </section>

      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-heading"><div><h2>Appointment activity</h2><p>Your clinic at a glance</p></div><button className="period-button">This week <ChevronDown size={14} /></button></div>
          <div className="chart-summary"><strong>{appointments.length}</strong><span>total appointments</span><span className="chart-change"><ArrowUpRight size={14} /> Weekly view</span></div>
          <div className="chart" role="img" aria-label="Appointments this week by day">
            <div className="chart-y-labels"><span>{maxBars}</span><span>{Math.round(maxBars * .66)}</span><span>{Math.round(maxBars * .33)}</span><span>0</span></div>
            <div className="chart-plot">
              <div className="chart-gridline line-one" /><div className="chart-gridline line-two" /><div className="chart-gridline line-three" />
              {weekData.map((day) => <div className="chart-column" key={day.label}><div className={`chart-bar ${day.isToday ? 'today-bar' : ''}`} style={{ height: `${Math.max((day.value / maxBars) * 100, day.value ? 8 : 3)}%` }} title={`${day.value} appointment${day.value === 1 ? '' : 's'}`} /><span className={day.isToday ? 'day-today' : ''}>{day.label}</span></div>)}
            </div>
          </div>
        </section>
        <section className="panel upcoming-panel">
          <div className="panel-heading"><div><h2>Upcoming appointments</h2><p>Your next visits</p></div><button className="text-button" onClick={onViewAppointments}>View all <span>→</span></button></div>
          {upcoming.length ? <div className="upcoming-list">{upcoming.map((item, index) => <UpcomingItem key={item._id} appointment={item} index={index} onComplete={() => onUpdateAppointment(item, 'Completed')} />)}</div> : <EmptyState icon={<CalendarDays />} title="A little breathing room" text="No upcoming appointments yet." action="Schedule a visit" onClick={onNewAppointment} />}
        </section>
      </div>

      <section className="panel patients-panel">
        <div className="panel-heading"><div><h2>Recently added patients</h2><p>Your latest patient records</p></div><button className="text-button" onClick={onViewPatients}>All patients <span>→</span></button></div>
        {patients.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Patient</th><th>Contact</th><th>Blood group</th><th>Added</th></tr></thead><tbody>{patients.slice(0, 4).map((patient, index) => <tr key={patient._id}><td><div className="person-cell"><span className={`patient-avatar ${avatarColors[index % avatarColors.length]}`}>{initials(patient.name)}</span><span><strong>{patient.name}</strong><small>{patient.gender}</small></span></div></td><td><span className="contact-main">{patient.email || patient.phone}</span><small className="contact-sub">{patient.email ? patient.phone : 'Phone'}</small></td><td><span className="blood-tag">{patient.bloodGroup || 'Not set'}</span></td><td>{formatDate(patient.createdAt)}</td></tr>)}</tbody></table>        </div> : <EmptyState icon={<Users />} title="Your patient list starts here" text="Add a patient to keep their details in one easy-to-find place." action="Add a patient" onClick={onAddPatient} />}
      </section>
    </>
  )
}

function StatCard({ icon, label, value, note, tone, trend }) {
  return <article className="stat-card"><div className="stat-top"><span className={`stat-icon ${tone}`}>{icon}</span><span className="stat-trend">{trend}</span></div><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-foot"><span>{note}</span><span className="stat-foot-icon"><ArrowDownRight size={13} /></span></div></article>
}

function UpcomingItem({ appointment, index, onComplete }) {
  return (
    <div className="upcoming-item">
      <div className={`appointment-date date-tone-${index % 4}`}><strong>{formatDateOnly(appointment.date, { day: '2-digit' })}</strong><span>{formatDateOnly(appointment.date, { month: 'short' })}</span></div>
      <div className="upcoming-copy"><strong>{appointment.patient?.name || 'Patient'}</strong><span>{appointment.doctor} · {appointment.department}</span></div>
      <div className="upcoming-time"><Clock3 size={13} />{appointment.time}</div>
      {appointment.status === 'Scheduled' && <button className="complete-button" title="Mark completed" onClick={onComplete}><Check size={15} /></button>}
    </div>
  )
}

function EmptyState({ icon, title, text, action, onClick }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><strong>{title}</strong><p>{text}</p>{action && <button className="text-button" onClick={onClick}>{action} <span>→</span></button>}</div>
}

function PatientsPage({ patients, onAdd, onEdit, onDelete, onNewAppointment }) {
  const [search, setSearch] = useState('')
  const filtered = patients.filter((patient) => `${patient.name} ${patient.email} ${patient.phone}`.toLowerCase().includes(search.toLowerCase()))
  return (
    <>
      <div className="welcome-row page-title-row"><div><span className="page-kicker">YOUR CLINIC</span><h1>Patients</h1><p>Keep every patient detail close at hand.</p></div><button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add patient</button></div>
      <section className="panel listing-panel">
        <div className="list-toolbar"><div><h2>All patients <span className="count-pill">{patients.length}</span></h2><p>Patient records in your workspace</p></div><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients" /></label></div>
        {filtered.length ? <div className="table-scroll"><table className="data-table patient-list-table"><thead><tr><th>Patient</th><th>Contact</th><th>Date of birth</th><th>Blood group</th><th>Added</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((patient, index) => <tr key={patient._id}><td><div className="person-cell"><span className={`patient-avatar ${avatarColors[index % avatarColors.length]}`}>{initials(patient.name)}</span><span><strong>{patient.name}</strong><small>{patient.gender}</small></span></div></td><td><span className="contact-main">{patient.email || patient.phone}</span><small className="contact-sub">{patient.email ? patient.phone : 'Phone'}</small></td><td>{formatDateOnly(patient.dateOfBirth)}</td><td><span className="blood-tag">{patient.bloodGroup || 'Not set'}</span></td><td>{formatDate(patient.createdAt)}</td><td><div className="row-actions"><button title="Schedule appointment" onClick={onNewAppointment}><CalendarDays size={15} /></button><button title="Edit patient" onClick={() => onEdit(patient)}><Settings2 size={15} /></button><button title="Delete patient" onClick={() => onDelete(patient)}><X size={15} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon={<Users />} title={search ? 'No patients found' : 'No patient records yet'} text={search ? 'Try another name, email or phone number.' : 'Add your first patient to start keeping track of care.'} action={search ? null : 'Add a patient'} onClick={onAdd} />}
      </section>
    </>
  )
}

function AppointmentsPage({ appointments, onAdd, onUpdate, onDelete }) {
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Scheduled', 'Checked in', 'Completed', 'Cancelled']
  const visible = filter === 'All' ? appointments : appointments.filter((appointment) => appointment.status === filter)
  return (
    <>
      <div className="welcome-row page-title-row"><div><span className="page-kicker">YOUR CLINIC</span><h1>Appointments</h1><p>Every visit, thoughtfully organized.</p></div><button className="button button-primary" onClick={onAdd}><Plus size={17} /> New appointment</button></div>
      <section className="panel listing-panel">
        <div className="list-toolbar appointment-toolbar"><div><h2>All appointments <span className="count-pill">{visible.length}</span></h2><p>Your clinic schedule and visit history</p></div><div className="filter-tabs" role="tablist" aria-label="Filter appointments">{filters.map((item) => <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
        {visible.length ? <div className="table-scroll"><table className="data-table appointment-table"><thead><tr><th>Patient</th><th>Date & time</th><th>Provider</th><th>Department</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map((appointment, index) => <tr key={appointment._id}><td><div className="person-cell"><span className={`patient-avatar ${avatarColors[index % avatarColors.length]}`}>{initials(appointment.patient?.name || 'P')}</span><span><strong>{appointment.patient?.name || 'Deleted patient'}</strong><small>{appointment.patient?.phone || '—'}</small></span></div></td><td><span className="contact-main">{formatDateOnly(appointment.date)}</span><small className="contact-sub">{appointment.time}</small></td><td>{appointment.doctor}</td><td>{appointment.department}</td><td><StatusSelect appointment={appointment} onChange={(status) => onUpdate(appointment, status)} /></td><td><div className="row-actions"><button title="Delete appointment" onClick={() => onDelete(appointment)}><X size={15} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon={<CalendarDays />} title={filter === 'All' ? 'Your schedule is open' : `No ${filter.toLowerCase()} visits`} text="New appointments will appear here as soon as they’re booked." action="Schedule an appointment" onClick={onAdd} />}
      </section>
    </>
  )
}

function StatusSelect({ appointment, onChange }) {
  return <select className={`status-select status-${appointment.status.toLowerCase().replace(' ', '-')}`} value={appointment.status} onChange={(event) => onChange(event.target.value)} aria-label={`Status for ${appointment.patient?.name || 'appointment'}`}><option>Scheduled</option><option>Checked in</option><option>Completed</option><option>Cancelled</option></select>
}

function PatientDialog({ patient, onClose, onSave }) {
  const [values, setValues] = useState({
    name: patient?.name || '',
    email: patient?.email || '',
    phone: patient?.phone || '',
    dateOfBirth: patient?.dateOfBirth ? dateKey(patient.dateOfBirth) : '',
    gender: patient?.gender || 'Female',
    bloodGroup: patient?.bloodGroup || '',
    address: patient?.address || '',
    notes: patient?.notes || '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const setField = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave(values, patient?._id)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={patient ? 'Edit patient' : 'Add a patient'} subtitle="A few details to help your team provide thoughtful care." onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <div className="form-grid">
          <label className="field-span">Full name<input value={values.name} onChange={setField('name')} placeholder="Patient’s full name" required minLength={2} maxLength={100} /></label>
          <label>Email address <span className="optional-label">Optional</span><input type="email" value={values.email} onChange={setField('email')} placeholder="name@example.com" /></label>
          <label>Phone number<input type="tel" value={values.phone} onChange={setField('phone')} placeholder="+1 (555) 000-0000" required minLength={5} /></label>
          <label>Date of birth<input type="date" value={values.dateOfBirth} onChange={setField('dateOfBirth')} required max={localDate(today)} /></label>
          <label>Gender<select value={values.gender} onChange={setField('gender')}><option>Female</option><option>Male</option><option>Non-binary</option><option>Other</option></select></label>
          <label>Blood group <span className="optional-label">Optional</span><select value={values.bloodGroup} onChange={setField('bloodGroup')}><option value="">Not set</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group}>{group}</option>)}</select></label>
          <label className="field-span">Address <span className="optional-label">Optional</span><input value={values.address} onChange={setField('address')} placeholder="Street address" maxLength={200} /></label>
          <label className="field-span">Care notes <span className="optional-label">Optional</span><textarea rows="3" value={values.notes} onChange={setField('notes')} placeholder="Anything your care team should know?" maxLength={1000} /></label>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : patient ? 'Save changes' : 'Add patient'}</button></div>
      </form>
    </Modal>
  )
}

function AppointmentDialog({ patients, onClose, onSave }) {
  const [values, setValues] = useState({
    patient: '', doctor: '', department: 'General medicine',
    date: localDate(today), time: '09:00', reason: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const setField = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave(values)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Schedule an appointment" subtitle="Add a visit to your clinic schedule." onClose={onClose}>
      {patients.length ? <form className="dialog-form" onSubmit={submit}>
        <div className="form-grid">
          <label className="field-span">Patient<select value={values.patient} onChange={setField('patient')} required><option value="">Select a patient</option>{patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name}</option>)}</select></label>
          <label>Provider<input value={values.doctor} onChange={setField('doctor')} placeholder="Dr. Morgan Lee" required minLength={2} maxLength={100} /></label>
          <label>Department<select value={values.department} onChange={setField('department')}><option>General medicine</option><option>Cardiology</option><option>Dermatology</option><option>Neurology</option><option>Orthopedics</option><option>Pediatrics</option><option>Other</option></select></label>
          <label>Date<input type="date" value={values.date} onChange={setField('date')} required min={localDate(today)} /></label>
          <label>Time<input type="time" value={values.time} onChange={setField('time')} required /></label>
          <label className="field-span">Visit reason <span className="optional-label">Optional</span><textarea rows="3" value={values.reason} onChange={setField('reason')} placeholder="What brings them in today?" maxLength={300} /></label>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Scheduling…' : 'Schedule visit'}</button></div>
      </form> : <EmptyState icon={<Users />} title="Add a patient first" text="Appointments need to be connected to a patient record." action="Got it" onClick={onClose} />}
    </Modal>
  )
}

function Modal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-heading"><div><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></header>{children}</section></div>
}

export default App
