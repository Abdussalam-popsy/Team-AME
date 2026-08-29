import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import Graveyard from './pages/Graveyard'
import StartupDashboard from './pages/StartupDashboard'
import StartupDetail from './pages/StartupDetail'
import SubmitStartup from './pages/SubmitStartup'
import TalentDatabase from './pages/TalentDatabase'
import Team from './pages/Team'

export default function App() {
  return (
    <HashRouter>
      <div className="shell">
        <header className="masthead">
          <NavLink to="/" className="brand">
            <span className="mark">🪦</span>
            <span>
              Startup Graveyard
              <small>by Accelerate Me</small>
            </span>
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end>
              Graveyard
            </NavLink>
            <NavLink to="/talent">Directory</NavLink>
            <NavLink to="/bury">Bury an idea</NavLink>
            <NavLink to="/team">Team</NavLink>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<Graveyard />} />
          <Route path="/grave/:id" element={<StartupDetail />} />
          <Route path="/dashboard/:id" element={<StartupDashboard />} />
          <Route path="/bury" element={<SubmitStartup />} />
          <Route path="/talent" element={<TalentDatabase />} />
          <Route path="/team" element={<Team />} />
        </Routes>

        <footer className="footer">
          Accelerate Me — student-led accelerator, 12 years of cohorts, alumni and mentors.
          Founder OS matches every grave against that database. Nothing here leaves your browser.
        </footer>
      </div>
    </HashRouter>
  )
}
