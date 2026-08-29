import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import ameMark from './assets/ame-mark.png'
import Directory from './pages/Directory'
import Graveyard from './pages/Graveyard'
import People from './pages/People'
import Simulate from './pages/Simulate'
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
            <img className="mark" src={ameMark} alt="Accelerate ME" width={48} height={41} />
            <span>
              Founder OS
              <small>by Accelerate ME</small>
            </span>
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end>
              Directory
            </NavLink>
            <NavLink to="/people">People</NavLink>
            <NavLink to="/ask">Ask Founder OS</NavLink>
            <NavLink to="/graveyard">Graveyard</NavLink>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<Directory />} />
          <Route path="/people" element={<People />} />
          <Route path="/ask" element={<Simulate />} />
          <Route path="/graveyard" element={<Graveyard />} />
          <Route path="/grave/:id" element={<StartupDetail />} />
          <Route path="/dashboard/:id" element={<StartupDashboard />} />
          <Route path="/bury" element={<SubmitStartup />} />
          <Route path="/talent" element={<TalentDatabase />} />
          <Route path="/team" element={<Team />} />
        </Routes>

        <footer className="footer">
          Founder OS by Accelerate ME — twelve years of cohorts, alumni and mentors. Every answer is
          matched against that database. Nothing here leaves your browser.
        </footer>
      </div>
    </HashRouter>
  )
}
