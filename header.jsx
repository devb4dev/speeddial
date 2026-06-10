"import { Link, NavLink } from \"react-router-dom\";
import { GraduationCap, Bell } from \"lucide-react\";
import { NAV } from \"@/constants/testIds\";

export default function Header() {
  return (
    <header className=\"sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-gray-200/60\">
      <div className=\"max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between\">
        <Link
          to=\"/\"
          data-testid={NAV.brand}
          className=\"flex items-center gap-2 group\"
        >
          <span className=\"w-9 h-9 rounded-md bg-[#8A1538] text-white grid place-items-center transition-colors group-hover:bg-[#70112d]\">
            <GraduationCap size={18} strokeWidth={2.2} />
          </span>
          <div className=\"leading-tight\">
            <div className=\"font-display font-extrabold text-lg tracking-tight\">
              OU&nbsp;Pulse
            </div>
            <div className=\"text-[10px] uppercase tracking-[0.22em] text-gray-500\">
              Osmania Exam Alerts
            </div>
          </div>
        </Link>

        <nav className=\"flex items-center gap-2 md:gap-6 text-sm\">
          <NavLink
            to=\"/\"
            data-testid={NAV.home}
            end
            className={({ isActive }) =>
              `px-2 py-1.5 transition-colors hover:text-[#8A1538] ${
                isActive ? \"text-[#8A1538] font-medium\" : \"text-gray-700\"
              }`
            }
          >
            Feed
          </NavLink>
          <NavLink
            to=\"/admin\"
            data-testid={NAV.admin}
            className={({ isActive }) =>
              `px-2 py-1.5 transition-colors hover:text-[#8A1538] ${
                isActive ? \"text-[#8A1538] font-medium\" : \"text-gray-700\"
              }`
            }
          >
            Admin
          </NavLink>
          <a
            href=\"#subscribe\"
            data-testid={NAV.subscribeTop}
            className=\"inline-flex items-center gap-1.5 rounded-md bg-[#8A1538] px-3 py-2 text-white text-xs font-medium tracking-wide transition-colors hover:bg-[#70112d]\"
          >
            <Bell size={14} />
            Get alerts
          </a>
        </nav>
      </div>
    </header>
  );
}
"
